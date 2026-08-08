"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Link2, ArrowRight, PartyPopper, SkipForward } from "lucide-react";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { isAuthenticated } from "@/lib/auth";
import SearchableSelect from "@/components/SearchableSelect";

const STEPS = ["Connect Platforms", "Create Brand", "Map Account", "Done"];

const INDUSTRIES = ["E-Commerce", "D2C / Consumer", "SaaS", "EdTech", "FinTech", "HealthTech", "Real Estate", "Agency", "Lead Gen", "Others"];
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

function StepShell({ step, title, subtitle, children }: { step: number; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-xl">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                i < step ? "bg-indigo-500 text-white" : i === step ? "bg-indigo-500/20 text-indigo-400 border-2 border-indigo-500" : "bg-white/5 text-slate-600"
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? "bg-indigo-500" : "bg-white/10"}`} />}
            </div>
          ))}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">{title}</h1>
          <p className="text-slate-400 mt-2 text-sm">{subtitle}</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // Step 0 — platform connection status
  const [status, setStatus] = useState({ meta: false, google: false });
  const [statusLoading, setStatusLoading] = useState(true);

  // Step 1 — brand creation
  const [brandForm, setBrandForm] = useState({ name: "", industry: "E-Commerce", color: COLORS[0], target_roas: "3.0" });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");

  // Step 2 — account mapping
  const [accountPlatform, setAccountPlatform] = useState<"META" | "GOOGLE" | "">("");
  const [metaAccounts, setMetaAccounts] = useState<{ account_id: string; name: string }[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<{ customer_id: string; descriptive_name?: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [mapping, setMapping] = useState(false);

  const checkStatus = async () => {
    setStatusLoading(true);
    const [meta, google] = await Promise.allSettled([
      api.get("/oauth/meta/status"),
      api.get("/oauth/google/status"),
    ]);
    const params = new URLSearchParams(window.location.search);
    setStatus({
      meta: params.get("meta") === "connected" || (meta.status === "fulfilled" && meta.value.data.connected),
      google: params.get("google") === "connected" || (google.status === "fulfilled" && google.value.data.connected),
    });
    setStatusLoading(false);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectPlatform(platform: "meta" | "google") {
    try {
      const { data } = await api.get(`/oauth/${platform}/connect?return_to=onboarding`);
      window.location.href = data.url;
    } catch {
      setError(`Failed to start ${platform} connection`);
    }
  }

  async function createBrand() {
    if (!brandForm.name.trim()) return setError("Brand name is required");
    setError(""); setBrandSaving(true);
    try {
      const { data } = await api.post("/brands", {
        ...brandForm,
        target_roas: parseFloat(brandForm.target_roas),
        monthly_budget_cap: 0,
        currency: "INR",
      });
      setBrandId(data.id);
      setBrandName(data.name);
      setStep(2);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create brand"));
    } finally {
      setBrandSaving(false);
    }
  }

  useEffect(() => {
    if (step !== 2 || !accountPlatform) return;
    if (accountPlatform === "META" && metaAccounts.length === 0) {
      setAccountsLoading(true);
      api.get("/oauth/meta/accounts").then(({ data }) => setMetaAccounts(data.accounts || [])).catch(() => {}).finally(() => setAccountsLoading(false));
    }
    if (accountPlatform === "GOOGLE" && googleAccounts.length === 0) {
      setAccountsLoading(true);
      api.get("/oauth/google/accounts").then(({ data }) => setGoogleAccounts(data.accounts || [])).catch(() => {}).finally(() => setAccountsLoading(false));
    }
  }, [step, accountPlatform]); // eslint-disable-line react-hooks/exhaustive-deps

  async function mapAccount() {
    if (!brandId || !accountPlatform || !selectedAccountId) return;
    setError(""); setMapping(true);
    try {
      const list = accountPlatform === "META" ? metaAccounts : googleAccounts;
      const acct: any = list.find((a: any) => (a.account_id ?? a.customer_id) === selectedAccountId);
      const account_name = accountPlatform === "META" ? acct?.name : (acct?.descriptive_name || `Account ${selectedAccountId}`);
      await api.post(`/brands/${brandId}/accounts`, {
        platform: accountPlatform,
        account_id: selectedAccountId,
        account_name,
      });
      setStep(3);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to map account (it may already be mapped elsewhere)"));
    } finally {
      setMapping(false);
    }
  }

  const connectedPlatformOptions = [
    ...(status.meta ? [{ key: "META" as const, label: "Meta" }] : []),
    ...(status.google ? [{ key: "GOOGLE" as const, label: "Google" }] : []),
  ];

  // ── Step 0: Connect Platforms ──
  if (step === 0) {
    return (
      <StepShell step={0} title="Connect your ad platforms" subtitle="Link Meta and/or Google Ads so we can start pulling performance data.">
        {error && <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-3 mb-5">{error}</div>}
        <div className="space-y-4">
          {[
            { key: "meta" as const, name: "Meta Ads", sub: "Facebook & Instagram Ads",
              icon: <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600 shadow-md shadow-blue-600/20"><span className="text-white font-bold text-base">f</span></div> },
            { key: "google" as const, name: "Google Ads", sub: "Search, Display & Shopping",
              icon: <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-md"><span className="text-blue-600 font-bold text-base">G</span></div> },
          ].map(({ key, name, sub, icon }) => (
            <div key={key} className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                {icon}
                <div>
                  <p className="text-white font-medium">{name}</p>
                  <p className="text-slate-500 text-xs">{sub}</p>
                </div>
              </div>
              {statusLoading ? (
                <div className="w-24 h-8 bg-white/5 rounded-xl animate-pulse" />
              ) : status[key] ? (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium"><CheckCircle className="w-4 h-4" /> Connected</span>
              ) : (
                <button onClick={() => connectPlatform(key)}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
                  <Link2 className="w-3.5 h-3.5" /> Connect
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-8">
          <button onClick={() => router.push("/overview")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            <SkipForward className="w-3.5 h-3.5" /> Skip for now
          </button>
          <button onClick={() => setStep(1)} disabled={!status.meta && !status.google}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </StepShell>
    );
  }

  // ── Step 1: Create Brand ──
  if (step === 1) {
    return (
      <StepShell step={1} title="Create your first brand" subtitle="A brand groups the ad accounts you want to track together.">
        {error && <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-3 mb-5">{error}</div>}
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Brand Name *</label>
            <input value={brandForm.name} onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
              placeholder="e.g. Digifyce, Client X" autoFocus
              className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Industry</label>
              <select value={brandForm.industry} onChange={e => setBrandForm({ ...brandForm, industry: e.target.value })}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium">
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Target ROAS</label>
              <input type="number" step="0.1" value={brandForm.target_roas} onChange={e => setBrandForm({ ...brandForm, target_roas: e.target.value })}
                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-3 block">Brand Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setBrandForm({ ...brandForm, color: c })}
                  className={`w-8 h-8 rounded-full transition-all ${brandForm.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-8">
          <button onClick={() => setStep(0)} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">Back</button>
          <button onClick={createBrand} disabled={brandSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-all disabled:opacity-50">
            {brandSaving ? "Creating..." : "Continue"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </StepShell>
    );
  }

  // ── Step 2: Map Account ──
  if (step === 2) {
    const accountOptions = accountPlatform === "META"
      ? metaAccounts.map(a => ({ value: a.account_id, label: `${a.name} (${a.account_id})` }))
      : accountPlatform === "GOOGLE"
        ? googleAccounts.map(a => ({ value: a.customer_id, label: a.descriptive_name ? `${a.descriptive_name} (${a.customer_id})` : a.customer_id }))
        : [];

    return (
      <StepShell step={2} title={`Connect an account to ${brandName}`} subtitle="Pick which ad account's data should feed this brand's dashboard.">
        {error && <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-3 mb-5">{error}</div>}
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Platform</label>
            <div className="flex gap-2">
              {connectedPlatformOptions.map(({ key, label }) => (
                <button key={key} onClick={() => { setAccountPlatform(key); setSelectedAccountId(""); }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    accountPlatform === key ? "bg-indigo-500 border-indigo-500 text-white" : "border-white/10 text-slate-400 hover:bg-white/5"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {accountPlatform && (
            <div>
              <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Account</label>
              {accountsLoading ? (
                <div className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-slate-500 text-sm animate-pulse">Loading accounts...</div>
              ) : accountOptions.length > 0 ? (
                <SearchableSelect placeholder="Select account" value={selectedAccountId} onChange={setSelectedAccountId} options={accountOptions} />
              ) : (
                <p className="text-sm text-slate-500 px-1">No accounts found for this platform.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-8">
          <button onClick={() => router.push("/overview")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            <SkipForward className="w-3.5 h-3.5" /> Skip for now
          </button>
          <button onClick={mapAccount} disabled={!selectedAccountId || mapping}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-all disabled:opacity-40">
            {mapping ? "Connecting..." : "Continue"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </StepShell>
    );
  }

  // ── Step 3: Done ──
  return (
    <StepShell step={3} title="You're all set!" subtitle="We're pulling in your historical data now — it'll show up on the dashboard within a minute or two.">
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
          <PartyPopper className="w-8 h-8 text-indigo-400" />
        </div>
        <p className="text-slate-400 text-sm max-w-sm">
          {brandName ? `${brandName} is set up and syncing.` : "Your account is ready."} You can connect more brands and accounts anytime from Brand Manager.
        </p>
        <button onClick={() => router.push("/overview")}
          className="mt-8 flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </StepShell>
  );
}
