import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-page text-primary">
      <div className="max-w-[720px] mx-auto px-5 py-16 md:py-24">
        <Link
          href="/"
          className="font-mono text-[11px] tracking-[0.12em] uppercase text-tertiary hover:text-accent transition-colors"
        >
          &larr; Back to Personal OS
        </Link>

        <h1 className="text-[32px] md:text-[44px] font-semibold leading-[1.02] tracking-display text-primary mt-8 mb-4">
          Privacy Policy
        </h1>
        <p className="font-mono text-[11px] text-tertiary mb-10">v0.1 &middot; Last updated May 2026</p>

        <div className="prose-sm space-y-8 text-[15px] leading-relaxed text-secondary">
          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">1. Data We Collect</h2>
            <p>We collect your email address, name (optional), and the content you create within the app (tasks, habits, day rules, recurring tasks). We also log AI usage metadata (token counts, costs) but do not store the content of your AI conversations long-term.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">2. How We Use Your Data</h2>
            <p>Your data is used solely to provide the Personal OS service. We do not sell, share, or monetize your personal data. Analytics are limited to aggregate usage metrics for service improvement.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">3. Third-Party Services</h2>
            <p>AI features are processed by OpenAI. When you use the AI command bar, your prompt and relevant task context are sent to OpenAI&rsquo;s API. OpenAI does not use API data for model training. See OpenAI&rsquo;s privacy policy for details.</p>
            <p>The app is hosted on Vercel. The database is hosted on Neon (PostgreSQL).</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">4. Data Storage</h2>
            <p>Your data is stored in a PostgreSQL database hosted by Neon. Passwords are hashed using bcrypt. Authentication uses JWT tokens stored in httpOnly cookies.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">5. Data Deletion</h2>
            <p>You may request deletion of your account and all associated data at any time. All user data is cascade-deleted when an account is removed.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">6. Cookies</h2>
            <p>We use a single httpOnly authentication cookie (<code className="text-[13px] bg-surface-raised px-1.5 py-0.5 rounded">pos-token</code>) and a localStorage entry for theme preference. No tracking cookies or third-party analytics are used.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">7. Contact</h2>
            <p>For privacy-related questions, reach out via the GitHub repository or email.</p>
          </section>

          <div className="border-t border-border pt-6 mt-12">
            <p className="text-[13px] text-tertiary italic">
              This document is a v0.1 placeholder. Full Privacy Policy will be reviewed by legal counsel before public launch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
