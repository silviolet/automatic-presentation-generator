"use client";

import { useState, useEffect} from "react";
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
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState("Default profile");
  const [profiles, setProfiles] = useState(["Default profile"]);
  const [model, setModel] = useState("F5-TTS");
  const [slides, setSlides] = useState<File | null>(null);
  const [scriptFile, setScriptFile] = useState<File | null>(null);

  const [generateScript, setGenerateScript] = useState(false);
  const [scriptGenerator, setScriptGenerator] = useState("Gemma");
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [subtitles, setSubtitles] = useState(false);
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
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Prevent rendering form until auth is checked
  if (!authChecked) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <p className="text-lg text-gray-500">Checking authentication...</p>
      </div>
    );
  }
  const handleAddProfile = () => {
    const newProfile = prompt("Enter new profile name:");
    if (newProfile && !profiles.includes(newProfile)) {
      setProfiles([...profiles, newProfile]);
      setProfile(newProfile);
    }
  };

  const handleDeleteProfile = () => {
    if (profile === "Default profile") return;
    setProfiles(profiles.filter((p) => p !== profile));
    setProfile("Default profile");
  };

  const handleSaveProfile = () => {
    alert(`Profile '${profile}' saved.`);
  };

  const handleRecord = () => {
    setRecording(!recording);
    // Stub: implement recording logic here
  };

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
          <div>
            <label className="block font-semibold mb-1">Profile *</label>
            <div className="flex flex-wrap gap-2">
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="border rounded px-3 py-2 flex-grow"
              >
                {profiles.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button type="button" onClick={handleAddProfile} className="bg-blue-500 text-white px-3 py-1 rounded">Add</button>
              <button type="button" onClick={handleDeleteProfile} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
              <button type="button" onClick={handleSaveProfile} className="bg-green-600 text-white px-3 py-1 rounded">Save</button>
            </div>
          </div>

          {!generateScript ? (
            <div>
              <label className="block font-semibold mb-1">Model *</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option>F5-TTS</option>
                <option>OpenVoice</option>
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
                  className={`px-4 py-2 rounded text-white ${recording ? "bg-red-600" : "bg-blue-600"}`}
                >
                  {recording ? "Stop" : "Record"}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block font-semibold mb-1">Email Address for Output</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              placeholder="you@example.com"
              required
            />
          </div>
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
            <button type="submit" className="bg-green-600 text-white px-8 py-3 rounded text-lg font-semibold shadow hover:bg-green-700 transition">
              Generate
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
