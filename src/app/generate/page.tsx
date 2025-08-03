"use client";

import { useState } from "react";

export default function GeneratePage() {
  const [profile, setProfile] = useState("Default profile");
  const [profiles, setProfiles] = useState(["Default profile"]);
  const [model, setModel] = useState("F5-TTS");
  const [slides, setSlides] = useState<File | null>(null);
  const [script, setScript] = useState("");
  const [generateScript, setGenerateScript] = useState(false);
  const [scriptGenerator, setScriptGenerator] = useState("Gemma");
  const [referenceAudio, setReferenceAudio] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [subtitles, setSubtitles] = useState(false);
  const [speechSpeed, setSpeechSpeed] = useState(1);

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
    // Submit logic here
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
              <label className="block font-semibold mb-1">Script *</label>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="border rounded px-3 py-2 w-full"
                rows={4}
              />
            </div>
          )}

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
