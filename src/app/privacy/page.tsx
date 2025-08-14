import Link from "next/link";

export const metadata = {
  title: "Privacy | SlideNarrator AI",
};

export default function PrivacyPage() {
  return (
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-4xl font-bold mb-6 text-blue-600">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last updated: 2025-08-14</p>

        <section className="space-y-6 text-gray-800">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac nibh a ex
            sagittis suscipit. Cras quis velit nec lorem faucibus porta.
          </p>

          <h2 className="text-2xl font-semibold text-blue-600">1) Information We Collect</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet
            fermentum erat. Vestibulum ante ipsum primis in faucibus orci luctus et
            ultrices posuere cubilia curae; Etiam vel magna nec sapien tempor suscipit.
          </p>

          <h2 className="text-2xl font-semibold text-blue-600">2) How We Use Information</h2>
          <p>
            Vestibulum condimentum sapien at sapien tempor, a vestibulum libero
            imperdiet. Curabitur a ligula ac odio mattis pretium. Nulla facilisi.
          </p>

          <h2 className="text-2xl font-semibold text-blue-600">3) Sharing of Information</h2>
          <p>
            Phasellus non turpis ac odio vulputate dictum. Integer sit amet justo nec
            ligula imperdiet posuere. Mauris nec pulvinar lacus.
          </p>

          <h2 className="text-2xl font-semibold text-blue-600">4) Data Retention</h2>
          <p>
            Suspendisse vitae est quis nibh finibus posuere. Vivamus at eros in sapien
            vehicula dapibus. Curabitur dictum quam sed lectus pretium luctus.
          </p>

          <h2 className="text-2xl font-semibold text-blue-600">5) Security</h2>
          <p>
            Morbi at luctus est. Vestibulum non felis vel mauris finibus finibus.
            Pellentesque nec nisl a est consequat bibendum sit amet sit amet sapien.
          </p>

          <h2 className="text-2xl font-semibold text-blue-600">6) Changes to This Policy</h2>
          <p>
            Aliquam erat volutpat. Suspendisse id volutpat velit. Donec gravida
            condimentum ante, sed posuere metus tincidunt nec.
          </p>

          <h2 className="text-2xl font-semibold text-blue-600">7) Contact Us</h2>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer sed nisi
            ut sapien tincidunt varius. Suspendisse potenti.
          </p>

          <div className="pt-8">
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </div>
  );
}