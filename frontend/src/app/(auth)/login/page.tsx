"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { setTokens } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/errors";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post("/api/v1/auth/login", { email, password });
      setTokens(data.access_token, data.refresh_token);

      // Send anyone who never finished setup back to onboarding instead of
      // dropping them on an empty dashboard.
      try {
        const brands = await axios.get("/api/v1/brands", {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        router.push(Array.isArray(brands.data) && brands.data.length > 0 ? "/overview" : "/onboarding");
      } catch {
        router.push("/overview");
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">CMO Dashboard</h1>
          <p className="text-slate-400 mt-2">Sign in to your agency account</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl p-8 space-y-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {error && <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              placeholder="you@agency.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full px-4 py-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: "var(--brand)" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <p className="text-center text-slate-500 text-sm">
            No account?{" "}
            <Link href="/signup" className="text-indigo-400 hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
