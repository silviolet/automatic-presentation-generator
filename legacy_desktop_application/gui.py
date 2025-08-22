import os
import fitz
import subprocess
import html
import tkinter as tk
from tkinter import *
from tkinter import filedialog, messagebox, simpledialog
import json
import threading
import sounddevice as sd
import wave
import torch
from transformers import pipeline
from openai import OpenAI
client = OpenAI(api_key="YOUR_API_KEY")  # Replace with your OpenAI API key
INDEXTTS_DIR = r"F:\index\index-tts"
PROFILE_PATH = "profiles.json"
LIBREOFFICE_PATH = r"C:\Program Files\LibreOffice\program\soffice.exe"
global is_processing
is_processing = False
def choose_file(label_var, filetypes):
    path = filedialog.askopenfilename(filetypes=filetypes)
    if path:
        label_var.set(path)

def process():
    try:
        global is_processing
        is_processing = True
        slide_count_label.pack()
        slide_count_label.update()
        slide_count = 0
        reference_path = reference_var.get()
        ppt_path = ppt_var.get()
        script_path = script_var.get()
        final_video_path = output_path_var.get()
        user_speed=speed_var.get()
        model = model_var.get()
        if not reference_path or not ppt_path or not script_path or not user_speed or not final_video_path or not model:
            messagebox.showerror("Error", "Please select all required files.")
            return
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
                    messagebox.showerror("Error", f"IndexTTS failed on slide {i+1}:\n{result.stderr}")
                    return
            slide_count += 1
            slide_count_var.set(f"Slides Processed: {slide_count}")

        img_paths = convert_ppt_to_images(ppt_path, "output_images")
        video_output_dir = os.path.join(output_dir, "videos")
        os.makedirs(video_output_dir, exist_ok=True)
        if use_subtitles_var.get():
            srt_path = os.path.join(output_dir, "temp_subtitle.srt")
        video_paths = []
        for i, image_path in enumerate(img_paths):
            audio_path = os.path.join(output_dir, f'{i}.wav')
            video_path = os.path.join(video_output_dir, f'slide_{i}.mp4')
            video_paths.append(video_path)
            if use_subtitles_var.get():
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

        messagebox.showinfo("Success", f"Video created: {final_video_path}")
        for f in os.listdir(output_dir):
            if f.endswith(".wav") or f.endswith(".png"):
                os.remove(os.path.join(output_dir, f))

        ppt_basename = os.path.splitext(os.path.basename(ppt_path))[0]
        pdf_path = os.path.join("output_images", f"{ppt_basename}.pdf")
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
        if use_subtitles_var.get() and os.path.exists(srt_path):
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

    except Exception as e:
        messagebox.showerror("Error", str(e))
    finally:
        is_processing = False
        slide_count = 0
        slide_count_var.set("Slides Processed: 0")
        slide_count_label.pack_forget()

def process_script():
    try:
        global is_processing
        is_processing = True
        slide_count_label.pack()
        slide_count_label.update()
        slide_count = 0

        ppt_path = ppt_var.get()
        script_path = script_var.get()
        openai_var = use_openai_var.get()

        if not ppt_path:
            messagebox.showerror("Error", "Please select a PowerPoint file.")
            return

        if not script_path:
            default_name = "auto_generated_script.txt"
            script_path = os.path.join("output_images", default_name)
            script_var.set(script_path)

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
            slide_count_var.set(f"Slides Processed: {slide_count}")

        with open(script_path, "w", encoding="utf-8") as f:
            f.writelines(slides_script)

        messagebox.showinfo("Success", f"Script created: {script_path}")

    except Exception as e:
        messagebox.showerror("Error", str(e))
    finally:
        is_processing = False
        slide_count = 0
        slide_count_var.set("Slides Processed: 0")
        slide_count_label.pack_forget()
def start_processing_thread():
    global is_processing
    if is_processing:
        messagebox.showwarning("Warning", "Generation is already in progress.")
        return
    threading.Thread(target=process, daemon=True).start()
def start_processing_script_thread():
    global is_processing
    if is_processing:
        messagebox.showwarning("Warning", "Generation is already in progress.")
        return
    threading.Thread(target=process_script, daemon=True).start()
        
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

def record_audio():
    duration = 10  # seconds
    fs = 44100    # sample rate

    messagebox.showinfo("Recording", f"Recording for {duration} seconds when this prompt is closed... ")

    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()

    filename = "user_recorded_reference.wav"
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(fs)
        wf.writeframes(recording.tobytes())

    reference_var.set(filename)
    messagebox.showinfo("Done", f"Audio saved as: {filename}")

def load_profiles():
    if os.path.exists(PROFILE_PATH):
        with open(PROFILE_PATH, "r") as f:
            data = json.load(f)
            if data:
                return data
    return {"Default": ""}

def save_profiles(profiles_dict):
    with open(PROFILE_PATH, "w") as f:
        json.dump(profiles_dict, f)

def refresh_profile_menu():
    menu = profile_menu["menu"]
    menu.delete(0, "end")
    for profile in profiles.keys():
        menu.add_command(label=profile, command=lambda value=profile: profile_var.set(value))

def on_profile_selected(*args):
    selected = profile_var.get()
    if selected in profiles:
        reference_var.set(profiles[selected])

def save_current_profile():
    selected = profile_var.get()
    ref = reference_var.get()
    if not selected or not ref:
        messagebox.showerror("Error", "No profile or reference audio selected.")
        return
    profiles[selected] = ref
    save_profiles(profiles)
    messagebox.showinfo("Saved", f"Saved reference audio for profile: {selected}")

def add_profile():
    new_name = simpledialog.askstring("New Profile", "Enter new profile name:")
    if not new_name:
        return
    if new_name in profiles:
        messagebox.showwarning("Exists", "Profile already exists.")
        return
    profiles[new_name] = ""
    save_profiles(profiles)
    refresh_profile_menu()
    profile_var.set(new_name)

def delete_profile():
    selected = profile_var.get()
    if selected not in profiles:
        messagebox.showerror("Error", "No profile selected.")
        return
    if messagebox.askyesno("Confirm", f"Delete profile '{selected}'?"):
        del profiles[selected]
        save_profiles(profiles)
        refresh_profile_menu()
        profile_var.set(next(iter(profiles), "Default"))

#Repurposed from OpenAI API documentation
def create_file(file_path):
  with open(file_path, "rb") as file_content:
    result = client.files.create(
        file=file_content,
        purpose="vision",
    )
    return result.id


# Main GUI setup
default_profile = "Default"
profiles = load_profiles()
if not profiles:
    profiles = {default_profile: ""}
    save_profiles(profiles)
root = tk.Tk()
root.title("Slide Narration Generator")
profile_var = tk.StringVar()
if default_profile in profiles:
    profile_var.set(default_profile)
else:
    profile_var.set(next(iter(profiles)))


reference_var = tk.StringVar()
ppt_var = tk.StringVar()
script_var = tk.StringVar()
speed_var = tk.DoubleVar(value=1.0)  # Default speed is 1.0
slide_count_var = tk.StringVar(value="Slides Processed: 0")
output_path_var = tk.StringVar(value="final_video.mp4")
use_subtitles_var = tk.BooleanVar(value=False)
use_openai_var = tk.BooleanVar(value=True)
on_profile_selected()
tk.Label(root, text="TTS Model").pack()
radio_frame = tk.Frame(root)
radio_frame.pack()
model_var = tk.StringVar(root, "F5-TTS") 
values = {"F5-TTS" : "F5-TTS", 
        "OpenVoice" : "OpenVoice",
        "IndexTTS" : "IndexTTS"} 
for (text, value) in values.items(): 
    Radiobutton(radio_frame, text = text, variable = model_var, 
        value = value).pack(side = LEFT, ipady = 5) 

tk.Label(root, text="Profiles").pack()
profile_var.trace("w", on_profile_selected)
profile_menu = tk.OptionMenu(root, profile_var, *profiles.keys())
profile_menu.pack()

profile_button_frame = tk.Frame(root)
profile_button_frame.pack(pady=(5, 10))
tk.Button(profile_button_frame, text="Add Profile", command=add_profile).pack(side=LEFT, padx=5)
tk.Button(profile_button_frame, text="Delete Profile", command=delete_profile).pack(side=LEFT, padx=5)
tk.Button(profile_button_frame, text="Save Ref to Profile", command=save_current_profile).pack(side=LEFT, padx=5)
tk.Label(root, text="Reference Speaker Audio").pack()
tk.Entry(root, textvariable=reference_var, width=60).pack()
audio_frame = tk.Frame(root)
audio_frame.pack()
tk.Button(audio_frame, text="Browse", command=lambda: choose_file(reference_var, [("Audio Files", "*.m4a *.wav")])).pack(side=LEFT,padx=(0, 10))
tk.Button(audio_frame, text="Record Audio", command=record_audio, fg="red").pack(side=LEFT)
tk.Label(root, text="PowerPoint Slides").pack()
tk.Entry(root, textvariable=ppt_var, width=60).pack()
script_frame = tk.Frame(root)
script_frame.pack()
tk.Button(script_frame, text="Browse", command=lambda: choose_file(ppt_var, [("PowerPoint Files", "*.pptx")])).pack(side=LEFT,padx=(0, 10))
tk.Button(script_frame, text="Generate Script", command=start_processing_script_thread, fg="blue").pack(side=LEFT)
tk.Label(root, text="Script File").pack()
tk.Entry(root, textvariable=script_var, width=60).pack()
tk.Button(root, text="Browse", command=lambda: choose_file(script_var, [("Text Files", "*.txt")])).pack()
tk.Label(root, text="Video Output Path").pack()
tk.Entry(root, textvariable=output_path_var, width=60).pack()
tk.Button(root, text="Browse", command=lambda: output_path_var.set(filedialog.asksaveasfilename(defaultextension=".mp4", filetypes=[("MP4 Video", "*.mp4")]))).pack()
tk.Label(root, text="Speech Speed").pack()
tk.Scale(root, from_=0.1, to=4.0, resolution=0.05, orient=tk.HORIZONTAL, variable=speed_var).pack()
tk.Checkbutton(root, text="Subtitles", variable=use_subtitles_var).pack()
tk.Checkbutton(root, text="OpenAI Script Generation", variable=use_openai_var).pack()
tk.Button(root, text="Generate Video", command=start_processing_thread, bg="green", fg="white").pack(pady=10)
slide_count_label = tk.Label(root, textvariable=slide_count_var)
slide_count_label.pack_forget()

root.mainloop()
"""
@article{gemma_2025,
    title={Gemma 3},
    url={https://goo.gle/Gemma3Report},
    publisher={Kaggle},
    author={Gemma Team},
    year={2025}
}
"""