"use client";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

export default function SettingsPage() {
  const [status, setStatus] = useState({ meta: false, google: false });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const metaFromUrl = params.get("meta") === "connected";
    const googleFromUrl = params.get("google") === "connected";
    if (metaFromUrl)   showToast("Meta Ads connected successfully!");
    if (googleFromUrl) showToast("Google Ads connected successfully!");

    async function check() {
      const [meta, google] = await Promise.allSettled([
        api.get("/oauth/meta/status"),
        api.get("/oauth/google/status"),
      ]);
      setStatus({
        meta: metaFromUrl || (meta.status === "fulfilled" && meta.value.data.connected),
        google: googleFromUrl || (google.status === "fulfilled" && google.value.data.connected),
      });
      setLoading(false);
    }
    check();
  }, []);

  async function connect(platform: "meta" | "google") {
    try {
      const { data } = await api.get(`/oauth/${platform}/connect`);
      window.location.href = data.url;
    } catch { showToast(`Failed to start ${platform} OAuth`, "error"); }
  }

  async function disconnect(platform: "meta" | "google") {
    try {
      await api.delete(`/oauth/${platform}/disconnect`);
      setStatus(s => ({ ...s, [platform]: false }));
      showToast(`${platform === "meta" ? "Meta" : "Google"} disconnected`);
    } catch { showToast("Failed to disconnect", "error"); }
  }

  const PLATFORMS = [
    {
      key: "meta" as const,
      name: "Meta Ads",
      sub: "Facebook & Instagram Ads",
      icon: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-600 shadow-md shadow-blue-600/20">
          <span className="text-white font-bold text-base">f</span>
        </div>
      ),
      envKeys: ["META_CLIENT_ID", "META_CLIENT_SECRET"],
    },
    {
      key: "google" as const,
      name: "Google Ads",
      sub: "Search, Display & Shopping",
      icon: (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-md">
          <span className="text-blue-600 font-bold text-base">G</span>
        </div>
      ),
      envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN"],
    },
  ];

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${
              toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <p className="text-sm font-medium">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-medium text-white">⚙️ Settings</h1>
        <p className="text-slate-500 mt-1">Connect your ad platforms to start pulling performance data</p>
      </div>

      {/* Connected Platforms */}
      <div className="p-7 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-5">
        <h2 className="text-lg font-medium text-slate-200">Connected Ad Platforms</h2>
        <p className="text-slate-500 text-sm">Connect your ad platforms so we can pull performance data for your brands.</p>

        <div className="space-y-4">
          {PLATFORMS.map(({ key, name, sub, icon }) => (
            <div key={key} className="flex items-center justify-between p-5 bg-black/20 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                {icon}
                <div>
                  <p className="text-white font-medium">{name}</p>
                  <p className="text-slate-500 text-xs">{sub}</p>
                </div>
                {!loading && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ml-2 ${
                    status[key] ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-500"
                  }`}>
                    {status[key] ? "Connected" : "Not connected"}
                  </span>
                )}
              </div>
              {loading ? (
                <div className="w-20 h-8 bg-white/5 rounded-xl animate-pulse" />
              ) : status[key] ? (
                <button onClick={() => disconnect(key)}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => connect(key)}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-all shadow-md shadow-indigo-500/20">
                  <Link2 className="w-3.5 h-3.5" /> Connect
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
