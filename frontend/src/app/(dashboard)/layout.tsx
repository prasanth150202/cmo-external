"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Tag, BarChart2, FileText, Settings, Zap, LogOut, TrendingUp } from "lucide-react";
import { isAuthenticated, clearTokens } from "@/lib/auth";
import api from "@/lib/api";
import { User } from "@/lib/types";

const NAV = [
  { href: "/overview",   icon: LayoutDashboard, label: "Overview" },
  { href: "/brands",     icon: Tag,             label: "Brand Manager" },
  { href: "/analytics",  icon: BarChart2,        label: "Analytics" },
  { href: "/campaigns",  icon: TrendingUp,       label: "Campaigns" },
  { href: "/reports",    icon: FileText,         label: "Reports" },
  { href: "/settings",   icon: Settings,         label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    api.get<User>("/auth/me").then(r => setUser(r.data)).catch(() => {
      clearTokens(); router.replace("/login");
    });
  }, [router]);

  function handleLogout() { clearTokens(); router.push("/login"); }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 flex flex-col shadow-sm z-50"
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
        {/* Logo */}
        <div className="p-6" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="text-white fill-current w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-white tracking-tight">CMO Dashboard</p>
              <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-widest">
                {user?.email?.split("@")[0] || "Agency"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}>
                <Icon className={`w-4 h-4 shrink-0 ${active ? "text-indigo-400" : "text-slate-500 group-hover:text-white"}`} />
                {label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
