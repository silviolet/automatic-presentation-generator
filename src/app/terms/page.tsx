import Link from "next/link";

export const metadata = {
  title: "Terms of Service | SlideNarrator AI",
};

export default function TermsPage() {
  return (
    <main className="py-16 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-4xl font-bold mb-6 text-blue-600">Terms of Service</h1>
        <p className="text-gray-600 mb-10">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <p className="mb-8 text-gray-700">
          By accessing and using SlideNarrator AI, you agree to be bound by these Terms
          of Service. If you do not agree to all the terms and conditions, you may not
          use the service.
        </p>

        <section className="space-y-8 text-gray-800">
          <div>
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">1. Account Terms</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum eget
              purus porttitor, ultricies felis sed, varius eros. Mauris suscipit
              convallis justo, sed posuere est dignissim sit amet.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">2. Use of Service</h2>
            <p>
              Integer lacinia risus ac nulla egestas, sed porttitor dolor vestibulum.
              Curabitur blandit eros quis lorem interdum, ac feugiat ligula rhoncus.
              Sed ultricies, nisl in tristique malesuada, justo elit aliquam nunc,
              vitae porta ipsum felis vitae mauris.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">3. Payments & Refunds</h2>
            <p>
              Morbi at purus sed libero varius dapibus. Nunc tincidunt ex sed odio
              gravida, in luctus justo luctus. Pellentesque tristique est a feugiat
              commodo. Suspendisse potenti.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">4. Termination</h2>
            <p>
              Ut sit amet ullamcorper urna, vitae hendrerit mi. Integer bibendum,
              ligula a feugiat suscipit, erat erat fermentum erat, ac dignissim purus
              arcu non massa. Nam commodo vulputate leo.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">5. Disclaimers & Limitation of Liability</h2>
            <p>
              Phasellus eget aliquam velit, id tincidunt lacus. Curabitur eu arcu ac
              nulla ullamcorper volutpat. Nam dapibus egestas feugiat. Nulla facilisi.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-blue-600 mb-2">6. Governing Law</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac
              fringilla sapien, sit amet fermentum neque. Sed imperdiet ligula sit amet
              ligula suscipit, a scelerisque libero fermentum.
            </p>
          </div>
        </section>

        <div className="pt-10">
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}