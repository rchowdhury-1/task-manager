import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="font-mono text-[11px] text-tertiary mb-10">v0.1 &middot; Last updated May 2026</p>

        <div className="prose-sm space-y-8 text-[15px] leading-relaxed text-secondary">
          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">1. Acceptance</h2>
            <p>By accessing or using Personal OS, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">2. Use of Service</h2>
            <p>Personal OS is a personal productivity tool. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">3. Free Trial</h2>
            <p>New accounts receive a 90-day free trial with full access to all features. After the trial period, continued access may require a paid subscription.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">4. User Content</h2>
            <p>You retain ownership of all content you create within Personal OS (tasks, habits, notes, etc.). We do not claim any rights to your data.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">5. AI Features</h2>
            <p>AI features are powered by third-party models. Commands you send to the AI assistant are processed by OpenAI. We do not use your data to train models. AI usage is subject to daily limits.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">6. Termination</h2>
            <p>You may delete your account at any time. We reserve the right to suspend accounts that violate these terms or abuse the service.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">7. Disclaimers</h2>
            <p>Personal OS is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for any loss of data or damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-[18px] font-semibold text-primary mb-2">8. Contact</h2>
            <p>For questions about these terms, reach out via the GitHub repository or email.</p>
          </section>

          <div className="border-t border-border pt-6 mt-12">
            <p className="text-[13px] text-tertiary italic">
              This document is a v0.1 placeholder. Full Terms of Service will be reviewed by legal counsel before public launch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
