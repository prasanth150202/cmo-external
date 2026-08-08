"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { setTokens } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ agency_name: "", email: "", password: "", timezone: "UTC" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/auth/signup", form);
      setTokens(data.access_token, data.refresh_token);
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Signup failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">CMO Dashboard</h1>
          <p className="text-slate-400 mt-2">Create your agency account</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl p-8 space-y-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {error && <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Agency Name</label>
            <input
              value={form.agency_name} onChange={set("agency_name")} required
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              placeholder="Acme Digital"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Work Email</label>
            <input
              type="email" value={form.email} onChange={set("email")} required
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              placeholder="you@agency.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password" value={form.password} onChange={set("password")} required minLength={8}
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              placeholder="Min 8 characters"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--brand)" }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
          <p className="text-center text-slate-500 text-sm">
            Have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
