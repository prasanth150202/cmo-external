export const metadata = { title: "Terms of Service — CMO Dashboard" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
    <div className="text-slate-400 text-sm leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen px-4 py-16" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: August 2026 · Digifyce ("we", "us")</p>

        <Section title="1. Acceptance of terms">
          <p>
            By creating an account and using CMO Dashboard, you agree to these Terms of Service. If you're
            using the platform on behalf of an agency or company, you're agreeing on its behalf and confirming
            you have the authority to do so.
          </p>
        </Section>

        <Section title="2. What the service does">
          <p>
            CMO Dashboard lets you connect your Meta Ads and Google Ads accounts via OAuth to view campaign
            performance data — spend, revenue, ROAS, conversions — across your brands in one dashboard. In its
            current phase, the platform is read-only: it does not create, modify, or delete campaigns, ad
            groups, budgets, or bids on your connected ad accounts.
          </p>
        </Section>

        <Section title="3. Your account">
          <p>
            You're responsible for keeping your login credentials secure and for all activity under your
            account. You must provide accurate information when signing up and connecting ad platform accounts.
          </p>
          <p>
            You may only connect ad accounts you own or are authorized to access. Connecting an account you
            don't have permission to access is a violation of these terms and of the connected platform's own
            terms (Meta, Google).
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the platform to access, scrape, or store data you're not authorized to see</li>
            <li>Attempt to circumvent tenant isolation or access another agency's data</li>
            <li>Reverse engineer, resell, or use the platform to build a competing product</li>
            <li>Use the platform in a way that violates Meta's or Google's own API terms</li>
          </ul>
        </Section>

        <Section title="5. Data and privacy">
          <p>
            Our collection and use of your data, including OAuth-connected platform data, is described in our{" "}
            <a href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</a>. By using the
            service, you also agree to that policy.
          </p>
        </Section>

        <Section title="6. Availability and changes">
          <p>
            We aim to keep the service available and reliable, but we don't guarantee uninterrupted access.
            Features may change, be added, or be removed as the product evolves — particularly during this
            early phase of the platform.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            You can stop using the service and disconnect your ad accounts at any time from Settings. We may
            suspend or terminate accounts that violate these terms, misuse connected platform data, or attempt
            unauthorized access to other tenants' data.
          </p>
        </Section>

        <Section title="8. Disclaimer">
          <p>
            The service is provided "as is." Performance data shown is pulled directly from Meta and Google's
            own reporting APIs — we don't guarantee its accuracy beyond what those platforms report, and figures
            may be subject to each platform's own reporting delays or later attribution changes.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>Questions about these terms? Reach us at <a href="mailto:digifycecbe@gmail.com" className="text-indigo-400 hover:underline">digifycecbe@gmail.com</a>.</p>
        </Section>
      </div>
    </div>
  );
}
