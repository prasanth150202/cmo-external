"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  ArrowRight, Check, Eye, RefreshCw, Link2, BarChart2,
} from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

const CHART_DATA = [
  { v: 22 }, { v: 28 }, { v: 25 }, { v: 34 }, { v: 31 }, { v: 40 },
  { v: 38 }, { v: 48 }, { v: 45 }, { v: 56 }, { v: 52 }, { v: 64 },
];

const FEATURES = [
  {
    n: "01",
    title: "Connect once, see everything",
    desc: "Link your Meta Ads and Google Ads accounts and pull real campaign performance into one dashboard — no more tab-switching between ad platforms.",
  },
  {
    n: "02",
    title: "Sales & lead gen, tracked correctly",
    desc: "Campaigns are automatically classified by their actual conversion goal, so ROAS shows for revenue campaigns and cost-per-lead shows for lead gen — not one misleading metric for both.",
  },
  {
    n: "03",
    title: "Every brand, one view",
    desc: "Group ad accounts under brands, compare spend and performance across clients, and drill into campaign-level detail without leaving the dashboard.",
  },
  {
    n: "04",
    title: "Your data, isolated and secure",
    desc: "Every agency's data is fully isolated. OAuth tokens are encrypted at rest, and your ad performance data is never shared, sold, or used for anything beyond your own dashboard.",
  },
];

const STEPS = [
  {
    n: "01",
    icon: Link2,
    title: "Connect your accounts",
    desc: "Sign up and link Meta Ads and/or Google Ads through their secure OAuth flow. Your ad platform credentials are never shared with us.",
  },
  {
    n: "02",
    icon: RefreshCw,
    title: "We classify & sync",
    desc: "Campaigns are automatically classified by conversion goal and synced on a schedule, so every metric lands under the right brand.",
  },
  {
    n: "03",
    icon: BarChart2,
    title: "See one clear dashboard",
    desc: "Spend, revenue, ROAS, and leads for every brand — organized, comparable, and ready to report on.",
  },
];

const SECURITY_POINTS = [
  { title: "Read-only access", desc: "We only request read scopes from Meta and Google. CMO Dashboard cannot create, edit, or delete your campaigns, ads, or budgets." },
  { title: "Encrypted tokens", desc: "OAuth access and refresh tokens are encrypted at rest and are never exposed to the browser." },
  { title: "Isolated per agency", desc: "Every agency's data lives in its own isolated space. Nothing is ever shared or visible across accounts." },
  { title: "Revoke anytime", desc: "Disconnect a platform from Settings, or revoke access directly from your Google or Meta account security settings, at any time." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) router.replace("/overview");
  }, [router]);

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen overflow-x-hidden font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(15,17,23,0.8)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="w-7 h-7" />
            <span className="text-white tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>CMO Dashboard</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-slate-400 hover:text-white text-[13px] font-medium transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-medium px-4 py-2 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative max-w-6xl mx-auto px-6 pt-24 pb-32"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          backgroundPosition: "-14px -14px",
          maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
        }}
      >
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.5 }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400 mb-5">
              Built by Digifyce for agencies
            </p>
            <h1
              className="text-[2.5rem] md:text-[3.25rem] text-white leading-[1.1] tracking-tight"
              style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}
            >
              One dashboard for every client&apos;s
              <br />
              <em className="italic text-indigo-400">ad performance</em>
            </h1>
            <p className="text-slate-400 text-lg mt-7 leading-relaxed max-w-lg">
              CMO Dashboard connects to your Meta Ads and Google Ads accounts and turns scattered campaign data
              into one clear view — spend, revenue, ROAS, and leads, organized by brand.
            </p>
            <div className="flex flex-wrap items-center gap-6 mt-10">
              <Link href="/signup" className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-6 py-3 rounded-lg transition-colors">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium border-b border-transparent hover:border-slate-500 transition-colors pb-0.5">
                Sign In
              </Link>
            </div>
            <p className="text-[13px] text-slate-500 mt-10">
              Encrypted OAuth tokens · Read-only access · Data isolated per agency
            </p>
          </motion.div>

          {/* Abstract product art */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative h-[360px] hidden lg:block"
          >
            <div className="absolute inset-0 rounded-2xl" style={{ border: "1px solid var(--border)", background: "linear-gradient(180deg, rgba(99,102,241,0.06), transparent 70%)" }} />
            <div className="absolute inset-x-0 bottom-0 h-[70%]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={CHART_DATA} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#818cf8" strokeWidth={2} fill="url(#heroFill)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}
              className="absolute top-8 left-6 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium text-white"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Link2 className="w-3.5 h-3.5 text-indigo-400" /> Meta + Google, one view
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.68 }}
              className="absolute top-24 right-2 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium text-white"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-400" /> Spend → revenue → ROAS
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.86 }}
              className="absolute bottom-10 left-10 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium text-white"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-400" /> Read-only, always
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What is this app */}
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto px-6 pb-28"
      >
        <div className="pl-7 relative">
          <div className="absolute left-0 top-1 bottom-1 w-px bg-indigo-500/40" />
          <h2 className="text-white text-xl mb-3" style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>What is CMO Dashboard?</h2>
          <p className="text-slate-400 text-[15px] leading-relaxed">
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
      <section id="features" className="max-w-4xl mx-auto px-6 pb-32 scroll-mt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }} className="mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400 mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl text-white tracking-tight" style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>
            Everything a growth agency needs
          </h2>
        </motion.div>
        <div>
          {FEATURES.map(({ n, title, desc }, i) => (
            <motion.div
              key={title}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="grid grid-cols-[3.5rem_1fr] md:grid-cols-[5rem_1fr] gap-x-4 py-8"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span className="text-slate-600 text-2xl" style={{ fontFamily: "var(--font-serif)" }}>{n}</span>
              <div>
                <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
                <p className="text-slate-400 text-[15px] leading-relaxed max-w-xl">{desc}</p>
              </div>
            </motion.div>
          ))}
          <div style={{ borderTop: "1px solid var(--border)" }} />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-5xl mx-auto px-6 pb-32 scroll-mt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }} className="mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400 mb-3">How it works</p>
          <h2 className="text-3xl md:text-4xl text-white tracking-tight" style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>
            From sign-up to insight in three steps
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
          {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={fadeUp}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="pt-6"
              style={{ borderTop: "2px solid rgba(99,102,241,0.55)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-slate-600 text-2xl" style={{ fontFamily: "var(--font-serif)" }}>{n}</span>
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-[15px] leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section id="security" className="max-w-5xl mx-auto px-6 pb-32 scroll-mt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }}
          className="grid md:grid-cols-[0.9fr_1.1fr] gap-12 md:gap-16"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-3">Security & privacy</p>
            <h2 className="text-3xl md:text-4xl text-white tracking-tight leading-[1.1]" style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>
              Your ad accounts, your data — we just read it
            </h2>
            <p className="text-slate-400 text-[15px] leading-relaxed mt-5 max-w-sm">
              CMO Dashboard is built read-only from the ground up. Nothing about your campaigns can be changed
              through it, by design.
            </p>
          </div>
          <div>
            {SECURITY_POINTS.map(({ title, desc }, i) => (
              <div key={title} className="flex gap-4 py-5" style={{ borderTop: i === 0 ? "1px solid var(--border)" : "1px solid var(--border)" }}>
                <Check className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                <div>
                  <h3 className="text-white font-medium mb-1">{title}</h3>
                  <p className="text-slate-400 text-[15px] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)" }} />
          </div>
        </motion.div>
      </section>

      {/* CTA band */}
      <motion.section
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto px-6 pb-28"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 py-14" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-3xl md:text-[2.5rem] text-white tracking-tight leading-tight max-w-lg" style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}>
            Ready to see your campaigns in one place?
          </h2>
          <Link href="/signup" className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-6 py-3.5 rounded-lg transition-colors shrink-0">
            Create Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.section>

      {/* Footer */}
      <footer>
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="" className="w-6 h-6" />
              <span className="text-white text-sm" style={{ fontFamily: "var(--font-serif)" }}>CMO Dashboard</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">Ad performance reporting for growth agencies, built by Digifyce.</p>
          </div>
          <div>
            <p className="text-slate-300 text-[13px] font-medium mb-4">Product</p>
            <div className="flex flex-col gap-2.5 text-[13px] text-slate-500">
              <a href="#features" className="hover:text-slate-300 transition-colors">Features</a>
              <a href="#security" className="hover:text-slate-300 transition-colors">Security</a>
              <Link href="/signup" className="hover:text-slate-300 transition-colors">Get Started</Link>
              <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
            </div>
          </div>
          <div>
            <p className="text-slate-300 text-[13px] font-medium mb-4">Legal</p>
            <div className="flex flex-col gap-2.5 text-[13px] text-slate-500">
              <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            </div>
          </div>
          <div>
            <p className="text-slate-300 text-[13px] font-medium mb-4">Company</p>
            <div className="flex flex-col gap-2.5 text-[13px] text-slate-500">
              <span>Digifyce</span>
              <a href="mailto:digifycecbe@gmail.com" className="hover:text-slate-300 transition-colors">digifycecbe@gmail.com</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-6" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-slate-600 text-sm">© 2026 Digifyce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
