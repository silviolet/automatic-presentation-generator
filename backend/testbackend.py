import os
import uuid
import threading
import queue
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import fitz
import subprocess
import html
import sounddevice as sd
import torch
from transformers import pipeline
from openai import OpenAI
from typing import Optional
from dotenv import load_dotenv
import smtplib
from email.message import EmailMessage
import requests
# === Init ===
app = FastAPI()

load_dotenv()
# === Global Variables ===
INDEXTTS_DIR = r"F:\index\index-tts"
PROFILE_PATH = "profiles.json"
LIBREOFFICE_PATH = r"C:\Program Files\LibreOffice\program\soffice.exe"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)
# === CORS Config ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Job Queue ===
job_queue = queue.Queue()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# === Job Processor ===
def process_job(job):
    print(f"Processing job for {job['email']}")
    print("Model:", job["model"])
    print("Slides path:", job["slides_path"])
    print("Reference path:", job["reference_path"])
    print("Script path:", job["script_path"])
    if job["generate_script"]:
        process_script(job)
    else: 
        process(job)

# === Worker Thread ===
def worker():
    print("Background worker started")
    while True:
        job = job_queue.get()
        if job is None:
            break
        try:
            process_job(job)
        except Exception as e:
            print(f"Error processing job: {e}")
        job_queue.task_done()

# Start background thread
threading.Thread(target=worker, daemon=True).start()
# === MAIN LOGIC ===
def process(job):
    try:
        global is_processing
        is_processing = True
        slide_count = 0
        reference_path = job["reference_path"]
        ppt_path = job["slides_path"]
        script_path = job["script_path"]
        final_video_path = os.path.join("outputs", f"{job['id']}_output.mp4")
        user_speed=job["speech_speed"]
        model = job["model"]
        if model == "OpenVoice":
            from openvoice import se_extractor
            from openvoice.api import BaseSpeakerTTS, ToneColorConverter
            ckpt_base = 'checkpoints/base_speakers/EN'
            ckpt_converter = 'checkpoints/converter'
            device="cuda:0" if torch.cuda.is_available() else "cpu"

            base_speaker_tts = BaseSpeakerTTS(f'{ckpt_base}/config.json', device=device)
            base_speaker_tts.load_ckpt(f'{ckpt_base}/checkpoint.pth')

            tone_color_converter = ToneColorConverter(f'{ckpt_converter}/config.json', device=device)
            tone_color_converter.load_ckpt(f'{ckpt_converter}/checkpoint.pth')
            source_se = torch.load(f'{ckpt_base}/en_default_se.pth').to(device)
            target_se, audio_name = se_extractor.get_se(reference_path, tone_color_converter, target_dir='processed', vad=True)
        elif model == "F5-TTS":
            from f5_tts.api import F5TTS
            f5tts = F5TTS()
        output_dir = 'outputs'
        os.makedirs(output_dir, exist_ok=True)

        with open(script_path, "r", encoding="utf-8") as fo:
            slides = fo.read().split("#ENDSLIDE#")

        for i, part in enumerate(slides):
            text = part.strip()
            if not text:
                text = "No narration provided for this slide"
            out_wav = os.path.join(output_dir, f'{i}.wav')
            if model == "OpenVoice":
                src_path = f'{output_dir}/tmp.wav'
                base_speaker_tts.tts(text, src_path, speaker='default', language='English', speed=user_speed)

                tone_color_converter.convert(
                    audio_src_path=src_path,
                    src_se=source_se,
                    tgt_se=target_se,
                    output_path=out_wav,
                    message="@MyShell"
                )
            elif model == "F5-TTS":
                out_img = os.path.join(output_dir, f'{i}.png')
                if os.path.exists(out_wav):
                    os.remove(out_wav)
                f5tts.infer(
                    ref_file=reference_path,
                    ref_text="",
                    gen_text=text,
                    file_wave=out_wav,
                    file_spec=out_img,
                    speed=user_speed,
                    seed=None,
                )
            elif model == "IndexTTS":
                out_wav = os.path.abspath(os.path.join(output_dir, f'{i}.wav'))
                abs_config = os.path.join(INDEXTTS_DIR, "checkpoints", "config.yaml")
                abs_model_dir = os.path.join(INDEXTTS_DIR, "checkpoints")
                if reference_path.lower().endswith(".m4a"):
                    ref_wav = os.path.splitext(reference_path)[0] + "_converted.wav"
                    if not os.path.exists(ref_wav):
                        subprocess.run([
                            "ffmpeg", "-y", "-i", reference_path,
                            "-ar", "22050", "-ac", "1",  # Mono, 22.05kHz
                            ref_wav
                        ])
                else:
                    ref_wav = reference_path

                flat_text = " ".join(text.splitlines()).strip()
                cmd = [
                    "conda", "run", "-n", "index-tts", "indextts",
                    flat_text,
                    "--voice", ref_wav,
                    "--model_dir", abs_model_dir,
                    "--config", abs_config,
                    "--output", out_wav,
                    "--force"
                ]
                result = subprocess.run(cmd, capture_output=True, text=True)
                print("STDOUT:\n", result.stdout)
                print("STDERR:", result.stderr)
                if result.returncode != 0:
                    print("Error generating audio for slide", i)
                    print("Error", f"IndexTTS failed on slide {i+1}:\n{result.stderr}")
                    return
            slide_count += 1
            print(f"Slides Processed: {slide_count}")

        img_paths = convert_ppt_to_images(ppt_path, "output_images")
        video_output_dir = os.path.join(output_dir, "videos")
        os.makedirs(video_output_dir, exist_ok=True)
        if job["subtitles"]:
            srt_path = os.path.join(output_dir, "temp_subtitle.srt")
        video_paths = []
        for i, image_path in enumerate(img_paths):
            audio_path = os.path.join(output_dir, f'{i}.wav')
            video_path = os.path.join(video_output_dir, f'slide_{i}.mp4')
            video_paths.append(video_path)
            if job["subtitles"]:
                subtitle_text = slides[i].strip().replace("\n", " ")
                subtitle_text = html.escape(subtitle_text)  # match slide text and remove newlines
                subtitles_filter = f"subtitles={srt_path.replace(os.sep, '/')}"
                with open(srt_path, 'w', encoding='utf-8') as srt_file:
                    srt_file.write("1\n")
                    srt_file.write("00:00:00,000 --> 01:00:00,000\n")
                    srt_file.write(f"{subtitle_text}\n")
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", image_path,
                    "-i", audio_path,
                    "-shortest",
                    "-vf", f"{subtitles_filter},scale=trunc(iw/2)*2:trunc(ih/2)*2",
                    "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k",
                    "-pix_fmt", "yuv420p", "-tune", "stillimage",
                    video_path
                ]
            else:
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-loop", "1", "-i", image_path,
                    "-i", audio_path, "-shortest",
                    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
                    "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k",
                    "-pix_fmt", "yuv420p", "-tune", "stillimage", video_path
                ]
            result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
            print("STDOUT:\n", result.stdout)
            print("STDERR:\n", result.stderr)

        concat_list_path = os.path.join(video_output_dir, "concat_list.txt")
        with open(concat_list_path, "w") as f:
            for video in video_paths:
                f.write(f"file '{os.path.basename(video)}'\n")

        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_list_path, "-c", "copy", final_video_path
        ])

        print("Success" + f"Video created: {final_video_path}")
        for f in os.listdir(output_dir):
            if f.endswith(".wav") or f.endswith(".png"):
                os.remove(os.path.join(output_dir, f))

        ppt_basename = os.path.splitext(os.path.basename(ppt_path))[0]
        pdf_path = os.path.join("output_images", f"{ppt_basename}.pdf")
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if job["subtitles"] and os.path.exists(srt_path):
            os.remove(srt_path)
        slide_image_dir = os.path.join("output_images", "slides_as_images")
        if os.path.exists(slide_image_dir):
            for f in os.listdir(slide_image_dir):
                os.remove(os.path.join(slide_image_dir, f))
            os.rmdir(slide_image_dir)
        if (model == "OpenVoice"):
            del base_speaker_tts
            del tone_color_converter
            del source_se
            del target_se
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        concat_file = os.path.join(video_output_dir, "concat_list.txt")
        if os.path.exists(concat_file):
            os.remove(concat_file)
        send_email_with_attachment(
                to_email=job["email"],
                subject="Your narrated video is ready!",
                body="Attached is your generated lecture video.",
                attachment_path=final_video_path
            )
        print(f"Sent video to {job['email']}")
    except Exception as e:
        print("Error" + str(e))
    finally:
        is_processing = False
        slide_count = 0

def process_script(job):
    try:
        global is_processing
        is_processing = True
        slide_count = 0

        ppt_path = job["slides_path"]
        openai_var = job["script_generator"] == "OpenAI"

        script_path = os.path.join("output_images", f"{job['id']}_script.txt")

        image_paths = convert_ppt_to_images(ppt_path, "output_images")

        if not openai_var:
            pipe = pipeline(
                "image-text-to-text",
                model="google/gemma-3-4b-it",
                device="cpu",
                torch_dtype=torch.bfloat16
            )
            system_prompt = {
                "role": "system",
                "content": [{"type": "text", "text": "You are a lecturer that gives lectures to a class. Do not add actions or emojis to your responses. Do not format your responses with markdown. Answer in line-by-line format. Do not greet the user or say 'Okay, let's take a look!'. Just provide the lecture content based on the slide."}]
            }

        slides_script = []

        for i, image_path in enumerate(image_paths):
            if not openai_var:
                messages = [
                    system_prompt,
                    {
                        "role": "user",
                        "content": [
                            {"type": "image", "image": image_path},
                            {"type": "text", "text": "Provide a short lecture based on this slide."}
                        ]
                    }
                ]
                output = pipe(text=messages, max_new_tokens=200)
                text = output[0]["generated_text"][-1]["content"] if isinstance(output[0]["generated_text"][-1], dict) else output[0]["generated_text"]
            else:
                messages = [
                    {
                        "role": "system",
                        "content": [
                            {"type": "input_text", "text": "You are a lecturer that gives lectures to a class. Do not add actions or emojis to your responses. Do not format your responses with markdown. Answer in line-by-line format. Do not greet the user or say 'Okay, let's take a look!'. Just provide the lecture content based on the slide."}
                        ]
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "input_text",
                                "text": "Provide a short lecture based on this slide."
                            },
                            {
                                "type": "input_image",
                                "file_id": create_file(image_path),
                            },
                        ]
                    }
                ]
                response = client.responses.create(
                    model="gpt-4.1",
                    input=messages
                )
                text = response.output_text
            print(text)
            slides_script.append(text.strip())
            if i < len(image_paths) - 1: #because the last slide does not have a #ENDSLIDE#
                slides_script.append("\n#ENDSLIDE#\n")
            slide_count += 1
            print(f"Slides Processed: {slide_count}")

        with open(script_path, "w", encoding="utf-8") as f:
            f.writelines(slides_script)

        print(f"Success: Script created: {script_path}")
        send_email_with_attachment(
                to_email=job["email"],
                subject="Your lecture script is ready!",
                body="Attached is your generated script.",
                attachment_path=script_path
            )
        print(f"Sent script to {job['email']}")
    except Exception as e:
        print("Error" +  str(e))
    finally:
        is_processing = False
        slide_count = 0
        
def convert_ppt_to_images(ppt_path, output_dir, soffice_path=LIBREOFFICE_PATH):
    os.makedirs(output_dir, exist_ok=True)
    command = [
        soffice_path, '--headless',
        '--convert-to', 'pdf',
        '--outdir', os.path.abspath(output_dir),
        os.path.abspath(ppt_path)
    ]
    clean_env = dict(os.environ)
    clean_env.pop("PYTHONHASHSEED", None)
    result = subprocess.run(command, capture_output=True, text=True, env=clean_env)
    print("STDOUT:\n", result.stdout)
    print("STDERR:\n", result.stderr)
    ppt_basename = os.path.splitext(os.path.basename(ppt_path))[0]
    pdf_path = os.path.join(output_dir, f"{ppt_basename}.pdf")

    image_output_dir = os.path.join(output_dir, "slides_as_images")
    os.makedirs(image_output_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    image_paths = []

    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=300)
        image_path = os.path.join(image_output_dir, f"slide_{i+1}.png")
        pix.save(image_path)
        image_paths.append(image_path)

    return image_paths

#Repurposed from OpenAI API documentation
def create_file(file_path):
  with open(file_path, "rb") as file_content:
    result = client.files.create(
        file=file_content,
        purpose="vision",
    )
    return result.id

def send_email_with_attachment(to_email, subject, body, attachment_path):
    msg = EmailMessage()
    msg["From"] = os.getenv("GMAIL_USER")
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    with open(attachment_path, "rb") as f:
        data = f.read()
        msg.add_attachment(data, maintype="video", subtype="mp4", filename=os.path.basename(attachment_path))

    with smtplib.SMTP("smtp.gmail.com", 587) as smtp:
        smtp.starttls()
        smtp.login(os.getenv("GMAIL_USER"), os.getenv("GMAIL_PASS"))
        smtp.send_message(msg)

# === API Endpoint ===
@app.post("/generate")
async def generate_presentation(
    profile: str = Form(...),
    model: str = Form(...),
    generateScript: str = Form(...),
    scriptFile: Optional[UploadFile] = File(None),
    scriptGenerator: Optional[str] = Form(None),
    subtitles: Optional[str] = Form(None),
    speechSpeed: Optional[str] = Form(None),
    slides: UploadFile = File(...),
    referenceAudio: Optional[UploadFile] = File(None),
    email: str = Form(...)
):
    generateScript = generateScript.lower() == "true"
    job_id = str(uuid.uuid4())
    job_dir = os.path.join(UPLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    ref_path = None
    script_path = None

    slides_path = os.path.join(job_dir, slides.filename)
    if not generateScript:
        if referenceAudio is None:
            ref_path = None
            raise ValueError("Reference audio is required when not generating video.")
        ref_path = os.path.join(job_dir, referenceAudio.filename)
        with open(ref_path, "wb") as f:
            f.write(await referenceAudio.read())
    if not generateScript:
        script_path = os.path.join(job_dir, scriptFile.filename)
        with open(script_path, "wb") as f:
            f.write(await scriptFile.read())

    with open(slides_path, "wb") as f:
        f.write(await slides.read())
    subtitles = subtitles.lower() == "true" if subtitles else False
    speechSpeed = float(speechSpeed) if speechSpeed else 1.0
    job_data = {
        "id": job_id,
        "profile": profile,
        "model": model,
        "generate_script": generateScript,
        "script_generator": scriptGenerator,
        "subtitles": subtitles,
        "speech_speed": speechSpeed,
        "email": email,
        "slides_path": slides_path,
        "reference_path": ref_path,
        "script_path": script_path
    }

    job_queue.put(job_data)
    return {"status": "ok", "message": f"Job queued for {email}"}

