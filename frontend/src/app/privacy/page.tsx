export const metadata = { title: "Privacy Policy — CMO Dashboard" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
    <div className="text-slate-400 text-sm leading-relaxed space-y-3">{children}</div>
  </section>
);

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen px-4 py-16" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: August 2026 · Digifyce ("we", "us")</p>

        <Section title="1. Who we are">
          <p>
            CMO Dashboard is an ad operations platform built by Digifyce, a digital marketing agency. It lets
            agency owners connect their own Meta Ads and Google Ads accounts to view campaign performance —
            spend, revenue, ROAS, conversions — in one place.
          </p>
        </Section>

        <Section title="2. What we collect">
          <p>When you create an account, we collect your name, work email, and agency name.</p>
          <p>
            When you connect a Meta or Google Ads account, we receive an OAuth access token (and, for Google,
            a refresh token) from that platform. We use this token exclusively to pull campaign performance
            metrics — spend, revenue, impressions, clicks, conversions, and campaign names — for the accounts
            you explicitly authorize.
          </p>
          <p>
            We do not collect or store any personal information about your ad platforms' end users (the people
            who saw or clicked your ads). We only handle account-level and campaign-level performance numbers.
          </p>
        </Section>

        <Section title="3. How we use your data">
          <p>Your data is used solely to display your own advertising performance back to you on your dashboard. Specifically, we use it to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Show spend, revenue, ROAS, and conversion metrics per brand and campaign</li>
            <li>Automatically classify campaigns as Sales or Lead Gen based on their conversion goals</li>
            <li>Generate rule-based budget suggestions (e.g. flagging underperforming campaigns)</li>
          </ul>
          <p>
            We do not sell your data, share it with third parties for advertising or marketing purposes, or use
            it to train machine learning models. Data from one agency (tenant) is never visible to another —
            every account is isolated.
          </p>
        </Section>

        <Section title="4. How we protect your data">
          <ul className="list-disc pl-5 space-y-1">
            <li>OAuth tokens are encrypted (AES-256) before being stored — they are never stored in plaintext</li>
            <li>All traffic between your browser and our servers is encrypted via HTTPS/TLS</li>
            <li>Passwords are hashed, never stored in plaintext</li>
            <li>Access to your account is scoped by tenant — no cross-agency data access is possible</li>
          </ul>
        </Section>

        <Section title="5. Data retention & deletion">
          <p>
            We retain your connected-account data for as long as your account remains active and the platform
            connection stays authorized. If you disconnect a Meta or Google Ads account, we stop syncing new
            data for it. If you close your account, your data is deleted from our systems.
          </p>
          <p>
            You can disconnect any connected ad platform at any time from Settings, which immediately revokes
            our access to pull further data from that account.
          </p>
        </Section>

        <Section title="6. Third-party services">
          <p>
            We use Google Ads API and Meta Marketing API to retrieve the performance data you authorize. Our
            use of information received from Google APIs adheres to the{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>
            You can review, disconnect, or delete your connected platform data at any time from your account
            Settings. To request full account deletion, contact us using the details below.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>Questions about this policy? Reach us at <a href="mailto:digifycecbe@gmail.com" className="text-indigo-400 hover:underline">digifycecbe@gmail.com</a>.</p>
        </Section>
      </div>
    </div>
  );
}
