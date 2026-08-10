"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, BarChart2, Link2, Shield, TrendingUp, ArrowRight } from "lucide-react";
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

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) router.replace("/overview");
  }, [router]);

  return (
    <div style={{ background: "var(--bg)" }} className="min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="text-white font-medium tracking-tight">CMO Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link href="/signup" className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-xl transition-all shadow-md shadow-indigo-500/20">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <span className="inline-block text-[11px] font-medium uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1.5 mb-6">
          Built by Digifyce for agencies
        </span>
        <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-tight">
          One dashboard for every<br className="hidden md:block" /> client's ad performance
        </h1>
        <p className="text-slate-400 text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
          CMO Dashboard connects to your Meta Ads and Google Ads accounts and turns scattered campaign data
          into one clear view — spend, revenue, ROAS, and leads, organized by brand.
        </p>
        <div className="flex items-center justify-center gap-3 mt-9">
          <Link href="/signup" className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="text-slate-300 hover:text-white font-medium px-7 py-3.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all">
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-7 bg-white/5 border border-white/5 rounded-3xl">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                <Icon className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <div className="p-12 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl">
          <h2 className="text-2xl font-semibold text-white mb-3">Ready to see your campaigns in one place?</h2>
          <p className="text-slate-400 mb-7">Connect your first ad account in a couple of minutes.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
            Create Your Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-slate-600 text-sm">© 2026 Digifyce. All rights reserved.</p>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/privacy" className="text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-slate-500 hover:text-slate-300 transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
