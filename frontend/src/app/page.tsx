"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap, BarChart2, Link2, Shield, TrendingUp, ArrowRight, CheckCircle2,
  Lock, Layers, Eye, RefreshCw, Users,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

const FEATURES = [
  {
    icon: Link2,
    title: "Connect once, see everything",
    desc: "Link your Meta Ads and Google Ads accounts and pull real campaign performance into one dashboard — no more tab-switching between ad platforms.",
  },
  {
    icon: TrendingUp,
    title: "Sales & Lead Gen, tracked correctly",
    desc: "Campaigns are automatically classified by their actual conversion goal, so ROAS shows for revenue campaigns and cost-per-lead shows for lead gen — not one misleading metric for both.",
  },
  {
    icon: BarChart2,
    title: "Every brand, one view",
    desc: "Group ad accounts under brands, compare spend and performance across clients, and drill into campaign-level detail without leaving the dashboard.",
  },
  {
    icon: Shield,
    title: "Your data, isolated and secure",
    desc: "Every agency's data is fully isolated. OAuth tokens are encrypted at rest, and your ad performance data is never shared, sold, or used for anything beyond your own dashboard.",
  },
];

const STEPS = [
  {
    icon: Link2,
    title: "Connect your accounts",
    desc: "Sign up and link Meta Ads and/or Google Ads through their secure OAuth flow. Your ad platform credentials are never shared with us.",
  },
  {
    icon: RefreshCw,
    title: "We classify & sync",
    desc: "Campaigns are automatically classified by conversion goal and synced on a schedule, so every metric lands under the right brand.",
  },
  {
    icon: BarChart2,
    title: "See one clear dashboard",
    desc: "Spend, revenue, ROAS, and leads for every brand — organized, comparable, and ready to report on.",
  },
];

const SECURITY_POINTS = [
  { icon: Eye, title: "Read-only access", desc: "We only request read scopes from Meta and Google. CMO Dashboard cannot create, edit, or delete your campaigns, ads, or budgets." },
  { icon: Lock, title: "Encrypted tokens", desc: "OAuth access and refresh tokens are encrypted at rest and are never exposed to the browser." },
  { icon: Layers, title: "Isolated per agency", desc: "Every agency's data lives in its own isolated space. Nothing is ever shared or visible across accounts." },
  { icon: CheckCircle2, title: "Revoke anytime", desc: "Disconnect a platform from Settings, or revoke access directly from your Google or Meta account security settings, at any time." },
];

const BRAND_ROWS = [
  { name: "Nova Beauty", pct: 92 },
  { name: "UrbanFit Studio", pct: 71 },
  { name: "Bright Realty", pct: 54 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) router.replace("/overview");
  }, [router]);

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "rgba(15,17,23,0.75)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="text-white font-medium tracking-tight">CMO Dashboard</span>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link href="/signup" className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-xl transition-all shadow-md shadow-indigo-500/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-28 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[640px] h-[640px] rounded-full bg-indigo-500/10 blur-[120px]" />

        <div className="relative grid lg:grid-cols-2 gap-14 items-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.5 }}>
            <span className="inline-block text-[11px] font-medium uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5 mb-6">
              Built by Digifyce for agencies
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-tight">
              One dashboard for every client&apos;s ad performance
            </h1>
            <p className="text-slate-400 text-lg mt-6 leading-relaxed">
              CMO Dashboard connects to your Meta Ads and Google Ads accounts and turns scattered campaign data
              into one clear view — spend, revenue, ROAS, and leads, organized by brand.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link href="/signup" className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="text-slate-300 hover:text-white font-medium px-7 py-3.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all">
                Sign In
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-8 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-indigo-400" /> Encrypted OAuth tokens</span>
              <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-indigo-400" /> Read-only access</span>
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-indigo-400" /> Data isolated per agency</span>
            </div>
          </motion.div>

          {/* Product preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/40" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <span className="text-[11px] text-slate-500 ml-2 font-mono">reports.digifyce.com/overview</span>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Spend", value: "₹18.4L" },
                    { label: "Revenue", value: "₹52.6L" },
                    { label: "ROAS", value: "2.9x" },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl p-3.5" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">{label}</p>
                      <p className="text-white font-semibold text-lg mt-1">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">Spend by brand</p>
                  {BRAND_ROWS.map((b, i) => (
                    <div key={b.name} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-28 shrink-0 truncate">{b.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg)" }}>
                        <motion.div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ opacity: 1 - i * 0.22 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${b.pct}%` }}
                          transition={{ duration: 0.8, delay: 0.4 + i * 0.15, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute -z-10 -bottom-8 -right-8 w-56 h-56 rounded-full bg-indigo-500/10 blur-[80px]" />
          </motion.div>
        </div>
      </section>

      {/* What is this app */}
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto px-6 pb-24"
      >
        <div className="p-8 bg-white/5 border border-white/5 rounded-3xl">
          <h2 className="text-white font-medium text-lg mb-3">What is CMO Dashboard?</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            CMO Dashboard is an ad reporting tool for marketing agencies, built by Digifyce. After you sign in,
            you connect your own Meta Ads and/or Google Ads accounts via OAuth. The app then reads your campaign
            performance data — spend, revenue, impressions, clicks, and conversions — directly from those
            platforms&apos; own APIs, and displays it back to you in a single dashboard, organized by client
            brand. It does not create, edit, or delete any campaigns, ads, or budgets — access is read-only.
            Your data is never shared with other users or sold to third parties; see our{" "}
            <Link href="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link> for details.
          </p>
        </div>
      </motion.section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-28 scroll-mt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-12">
          <span className="text-[11px] font-medium uppercase tracking-widest text-indigo-400">Features</span>
          <h2 className="text-3xl font-semibold text-white tracking-tight mt-3">Everything a growth agency needs, in one place</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="p-7 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/[0.07] hover:border-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                <Icon className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 pb-28 scroll-mt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }} className="text-center mb-14">
          <span className="text-[11px] font-medium uppercase tracking-widest text-indigo-400">How it works</span>
          <h2 className="text-3xl font-semibold text-white tracking-tight mt-3">From sign-up to insight in three steps</h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-6 left-[16.5%] right-[16.5%] h-px bg-white/10" />
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative text-center"
            >
              <div className="relative mx-auto w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-5">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">{i + 1}. {title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="max-w-5xl mx-auto px-6 pb-28 scroll-mt-20">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }}
          className="rounded-3xl p-10 md:p-12"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-widest text-emerald-400">Security & privacy</span>
          </div>
          <h2 className="text-3xl font-semibold text-white tracking-tight mb-10">Your ad accounts, your data — we just read it</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            {SECURITY_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-white font-medium mb-1">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA band */}
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-6 pb-28 text-center"
      >
        <div className="p-12 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
            <Users className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-3">Ready to see your campaigns in one place?</h2>
          <p className="text-slate-400 mb-7">Connect your first ad account in a couple of minutes.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
            Create Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white fill-current" />
              </div>
              <span className="text-white font-medium tracking-tight text-sm">CMO Dashboard</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">Ad performance reporting for growth agencies, built by Digifyce.</p>
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium mb-4">Product</p>
            <div className="flex flex-col gap-2.5 text-sm text-slate-500">
              <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
              <a href="#security" className="hover:text-slate-300 transition-colors">Security</a>
              <Link href="/signup" className="hover:text-slate-300 transition-colors">Get Started</Link>
              <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
            </div>
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium mb-4">Legal</p>
            <div className="flex flex-col gap-2.5 text-sm text-slate-500">
              <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            </div>
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium mb-4">Company</p>
            <div className="flex flex-col gap-2.5 text-sm text-slate-500">
              <span>Digifyce</span>
              <a href="mailto:digifycecbe@gmail.com" className="hover:text-slate-300 transition-colors">digifycecbe@gmail.com</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-slate-600 text-sm">© 2026 Digifyce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
