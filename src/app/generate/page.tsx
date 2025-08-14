"use client";

import { useState, useEffect, useRef} from "react";
import { useRouter } from "next/navigation";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export default function GeneratePage() {
  const router = useRouter();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState("Default profile");
  const [profiles, setProfiles] = useState(["Default profile"]);
  const [model, setModel] = useState("F5-TTS");
  const [slides, setSlides] = useState<File | null>(null);
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [generateScript, setGenerateScript] = useState(false);
  const [scriptGenerator, setScriptGenerator] = useState("Gemma");
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [subtitles, setSubtitles] = useState(false);
  const [scriptAvailable, setScriptAvailable] = useState(false);
  const [lectureAvailable, setLectureAvailable] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState(1);
  const [email, setEmail] = useState("");
  useEffect(() => {
    // Ensure Firebase is initialized
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // Check auth state
    const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login"); // redirect to login
      } else {
        setAuthChecked(true); // allow page to render
        setEmail(user.email || ""); // pre-fill email if available
        user.getIdToken().then(setIdToken).catch(err => {
          console.error("Failed to get ID token:", err);
          setIdToken(null);});
      }
    });

    return () => unsubscribe();
  }, [router]);

  // optional: cleanup if user leaves page mid-recording
  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } finally {
        cleanupStream();
      }
    };
  }, []);

  useEffect(() => {
    if (!authChecked || !email) return;

    fetch(`http://localhost:8000/outputs?email=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${idToken}` }
      })
      .then(res => res.json())
      .then(data => {
        if(!data){
          setScriptAvailable(false);
          setLectureAvailable(false);
        }
        else {
          setScriptAvailable(data.files.script != null);
          setLectureAvailable(data.files.video != null);
          console.log(data.files.script != null, data.files.video != null);
        }
        console.log("Backend response:", data);
      })
      .catch(err => {
        console.error("Error fetching outputs:", err);
      });
  }, [authChecked, email]);
  
  // Prevent rendering form until auth is checked
  if (!authChecked) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-lg text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  function getSupportedMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4" // some Safari versions
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported?.(t)) return t;
    }
    return ""; // let browser pick
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
        const ext =
          blob.type.includes("ogg") ? "ogg" :
          blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `recording_${Date.now()}.${ext}`, { type: blob.type });

        setReferenceAudio(file); // <-- your existing state
        cleanupStream();
        setRecording(false);
        setSecondsLeft(0);
      };

      mr.start(); // start recording
      setRecording(true);
      setSecondsLeft(10);

      // tick countdown
      tickTimerRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          const next = s - 1;
          return next >= 0 ? next : 0;
        });
      }, 1000);

      // hard stop at 10s
      stopTimerRef.current = window.setTimeout(() => {
        if (mr.state !== "inactive") mr.stop();
      }, 10_000);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Could not access microphone.");
      setRecording(false);
      setSecondsLeft(0);
      cleanupStream();
    }
  }

  function stopRecordingEarly() {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  }

  function cleanupStream() {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }

  const handleRecord = async () => {
    if (recording) {
      stopRecordingEarly();
    } else {
      await startRecording();
    }
  };
  async function download(fileType: "script" | "video") {
    if (!idToken) return;
    const url = `http://localhost:8000/download?email=${encodeURIComponent(email)}&file_type=${fileType}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    if (!res.ok) {
      console.error("Download failed:", await res.text());
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileType === "script" ? `${email}_script.txt` : `${email}_output.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    // Additional checks for required files
    if (!slides) {
      alert("Please select slides.");
      return;
    }

    if (!generateScript && !referenceAudio) {
      alert("Please select reference audio.");
      return;
    }

    if (!generateScript && !scriptFile) {
      alert("Please upload a script file.");
      return;
    }

    alert(`Outputs will be sent to: ${email}`);

    // Prepare form data
    const formData = new FormData();
    // Always required
    formData.append("profile", profile);
    formData.append("model", model);
    formData.append("generateScript", generateScript.toString());
    formData.append("email", email);
    formData.append("slides", slides);

    // Optional field – only add if value exists
    if (scriptGenerator) {
      formData.append("scriptGenerator", scriptGenerator);
    }

    // Script handling
    if (generateScript) {
      // Do not append scriptFile, referenceAudio, subtitles, speechSpeed
      // They're optional or not relevant in this mode
    } else {
      // Script file required
      if (scriptFile) {
        formData.append("scriptFile", scriptFile);
      } else {
        alert("Please upload a script file.");
        return;
      }

      // Reference audio required
      if (referenceAudio) {
        formData.append("referenceAudio", referenceAudio);
      } else {
        alert("Please select reference audio.");
        return;
      }

      // Only append these if relevant
      formData.append("subtitles", subtitles.toString());
      formData.append("speechSpeed", speechSpeed.toString());
    }
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    fetch("http://localhost:8000/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken ?? ""}` },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Backend response:", data);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to generate.");
      });
  };
  
  return (
    <section className="py-16 px-4 bg-blue-50">
      <div className="max-w-4xl mx-auto p-8 bg-white shadow-xl rounded-2xl border border-blue-100">
        <h1 className="text-4xl font-bold mb-6 text-center text-blue-600">Generate Presentation</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {!generateScript ? (
            <div>
              <label className="block font-semibold mb-1">Model *</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option>F5-TTS</option>
                {/*<option>OpenVoice</option> don't use for the time being, low quality and buggy*/}
                <option>IndexTTS</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-semibold mb-1">Model *</label>
              <select
                value={scriptGenerator}
                onChange={(e) => setScriptGenerator(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option>Gemma</option>
                <option>OpenAI</option>
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1">PowerPoint Slides *</label>
            <input
              type="file"
              accept=".ppt,.pptx"
              onChange={(e) => setSlides(e.target.files?.[0] || null)}
              className="border rounded px-3 py-2 w-full"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={generateScript}
              onChange={(e) => setGenerateScript(e.target.checked)}
              className="mr-2"
            />
            <label className="font-semibold">Generate Script?</label>
          </div>

          {!generateScript && (
            <div>
              <label className="block font-semibold mb-1">Script File * (Use #ENDSLIDE# to denote slide end)</label>
              <input
                type="file"
                accept=".txt"
                onChange={(e) => setScriptFile(e.target.files?.[0] || null)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
          )}
          {!generateScript && (
            <div>
              <label className="block font-semibold mb-1">Reference Speaker Audio *</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setReferenceAudio(e.target.files?.[0] || null)}
                  className="border rounded px-3 py-2 w-full"
                />
                <button
                  type="button"
                  onClick={handleRecord}
                  className={`cursor-pointer px-4 py-2 rounded text-white ${recording ? "bg-red-600 hover:bg-red-700 transition" : "bg-blue-600 hover:bg-blue-700 transition"}`}
                >
                  {recording ? `Stop (${secondsLeft || 0}s)` : "Record 10s"}
                </button>
              </div>
            </div>
          )}
          {!generateScript && (
            <div>
              <label className="block font-semibold mb-1">Subtitles</label>
              <select
                value={subtitles ? "Yes" : "No"}
                onChange={(e) => setSubtitles(e.target.value === "Yes")}
                className="border rounded px-3 py-2 w-full"
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
          )}
          {!generateScript && (
            <div>
              <label className="block font-semibold mb-1">Speech Speed</label>
              <input
                type="number"
                min="0.5"
                max="2"
                step="0.1"
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
          )}
          <div className="pt-4 text-center">
            <button type="submit" className="cursor-pointer bg-green-600 text-white px-8 py-3 rounded text-lg font-semibold shadow hover:bg-green-700 transition">
              Generate
            </button>
          </div>
          <label className="block font-semibold mb-1">Downloads</label>

          <div className="flex justify-between w-full">
            {scriptAvailable && (
              <button
                type="button"
                onClick={() => download("script")}
                className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded text-lg font-semibold shadow hover:bg-blue-700 transition"
              >
                Download Script
              </button>
            )}
            {lectureAvailable && (
              <button
                type="button"
                onClick={() => download("video")}
                className="cursor-pointer bg-blue-600 text-white px-8 py-3 rounded text-lg font-semibold shadow hover:bg-blue-700 transition"
              >
                Download Lecture
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
