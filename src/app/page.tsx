import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      {/* Header Section */}
      <section className="text-center py-20 px-4">
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
          Welcome to <span className="text-blue-600">SlideNarrator AI</span>
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto text-gray-600">
          Instantly convert your PowerPoint slides into narrated videos using AI-generated voice and script.
        </p>
        <div className="mt-8">
          <Link
            href="/generate"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-semibold transition"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10 text-center">
          <div className="p-6 border border-blue-100 rounded-lg shadow hover:shadow-lg transition bg-white">
            <h3 className="text-xl font-semibold mb-3 text-blue-600">Upload Your Slides</h3>
            <p className="text-gray-600">
              Select a PowerPoint file and we’ll convert it into clean, readable images.
            </p>
          </div>

          <div className="p-6 border border-blue-100 rounded-lg shadow hover:shadow-lg transition bg-white">
            <h3 className="text-xl font-semibold mb-3 text-blue-600">Auto-Generate Narration</h3>
            <p className="text-gray-600">
              Let AI generate a high-quality, human-like voiceover and lecture-style script.
            </p>
          </div>

          <div className="p-6 border border-blue-100 rounded-lg shadow hover:shadow-lg transition bg-white">
            <h3 className="text-xl font-semibold mb-3 text-blue-600">Create Video</h3>
            <p className="text-gray-600">
              Combine slides and voiceover into a professional-looking narrated video in minutes.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}