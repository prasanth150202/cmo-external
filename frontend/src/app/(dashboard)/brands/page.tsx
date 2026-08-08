"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Link2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import PlatformFilter, { type Platform } from "@/components/PlatformFilter";
import SearchableSelect from "@/components/SearchableSelect";
import { usePersistedState } from "@/lib/usePersistedState";

const PLATFORMS = ["META", "GOOGLE"];
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];
const INDUSTRIES = ["E-Commerce", "D2C / Consumer", "SaaS", "EdTech", "FinTech", "HealthTech", "Real Estate", "Agency", "Lead Gen", "Others"];

const EMPTY_FORM = { name: "", color: "#6366f1", industry: "E-Commerce", target_roas: "3.0", monthly_budget_cap: "0", currency: "INR", logo_url: "", website_url: "" };

type BrandFormState = typeof EMPTY_FORM;

function BrandForm({ form, setForm, onSubmit, submitLabel, onCancel }: {
  form: BrandFormState;
  setForm: (f: BrandFormState) => void;
  onSubmit: () => void;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="p-7 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl space-y-5">
      <h2 className="text-lg font-medium text-slate-200">{submitLabel === "Create Brand" ? "New Brand" : "Edit Brand"}</h2>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Brand Name *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Digifyce, Client X"
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Industry</label>
          <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium">
            {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Target ROAS</label>
          <input type="number" value={form.target_roas} onChange={e => setForm({ ...form, target_roas: e.target.value })} step="0.1"
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium" />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Monthly Budget Cap (₹)</label>
          <input type="number" value={form.monthly_budget_cap} onChange={e => setForm({ ...form, monthly_budget_cap: e.target.value })}
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium" />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Currency</label>
          <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium">
            {["INR", "USD", "GBP", "EUR", "AED"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Website URL</label>
          <input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })}
            placeholder="https://yoursite.com"
            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2 block">Logo URL</label>
          <div className="flex items-center gap-4">
            <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })}
              placeholder="https://cdn.yoursite.com/logo.png"
              className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-medium" />
            {form.logo_url && (
              <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden bg-black/30 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.logo_url} alt="Logo preview" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-3 block">Brand Color</label>
        <div className="flex gap-2">
          {COLORS.map(c => (
            <button key={c} onClick={() => setForm({ ...form, color: c })}
              className={`w-8 h-8 rounded-full transition-all ${form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "hover:scale-110"}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={onSubmit}
          className="px-8 py-3 bg-indigo-500 text-white rounded-xl font-medium text-sm hover:bg-indigo-600 transition-all">
          {submitLabel}
        </button>
        <button onClick={onCancel}
          className="px-8 py-3 border border-white/10 text-slate-400 rounded-xl font-medium text-sm hover:bg-white/5 transition-all">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [platformFilter, setPlatformFilter] = usePersistedState<Platform>("cmo_platform_filter", "");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [accountForm, setAccountForm] = useState({ platform: "META", account_id: "", account_name: "" });
  const [metaAccounts, setMetaAccounts] = useState<{ account_id: string; name: string }[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<{ customer_id: string; descriptive_name?: string }[]>([]);
  const [googleAccountsLoading, setGoogleAccountsLoading] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/brands");
      setBrands(data);
    } catch { showToast("Failed to load brands", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBrands(); }, []);

  // Pre-fetch platform accounts when platform selector changes
  useEffect(() => {
    if (accountForm.platform === "META" && metaAccounts.length === 0) {
      api.get("/oauth/meta/accounts")
        .then(({ data }) => setMetaAccounts(data.accounts || []))
        .catch(() => {});
    }
    if (accountForm.platform === "GOOGLE" && googleAccounts.length === 0) {
      setGoogleAccountsLoading(true);
      api.get("/oauth/google/accounts")
        .then(({ data }) => setGoogleAccounts(data.accounts || []))
        .catch(() => {})
        .finally(() => setGoogleAccountsLoading(false));
    }
  }, [accountForm.platform]);

  const handleCreateBrand = async () => {
    if (!form.name.trim()) return showToast("Brand name is required", "error");
    try {
      await api.post("/brands", { ...form, target_roas: parseFloat(form.target_roas), monthly_budget_cap: parseFloat(form.monthly_budget_cap) });
      showToast(`Brand "${form.name}" created!`);
      setShowCreate(false);
      setForm({ ...EMPTY_FORM });
      fetchBrands();
    } catch (err) { showToast(getApiErrorMessage(err, "Failed to create brand"), "error"); }
  };

  const handleUpdateBrand = async () => {
    if (!form.name.trim()) return showToast("Brand name is required", "error");
    if (!editingBrand) return;
    try {
      await api.put(`/brands/${editingBrand.id}`, { ...form, target_roas: parseFloat(form.target_roas), monthly_budget_cap: parseFloat(form.monthly_budget_cap) });
      showToast(`Brand "${form.name}" updated!`);
      setShowEdit(false);
      setEditingBrand(null);
      setForm({ ...EMPTY_FORM });
      fetchBrands();
    } catch (err) { showToast(getApiErrorMessage(err, "Failed to update brand"), "error"); }
  };

  const handleDeleteBrand = async (id: string, name: string) => {
    if (!confirm(`Delete brand "${name}" and all its account mappings?`)) return;
    try {
      await api.delete(`/brands/${id}`);
      showToast(`Brand "${name}" deleted`);
      fetchBrands();
    } catch { showToast("Failed to delete brand", "error"); }
  };

  const handleMapAccount = async (brandId: string) => {
    if (!accountForm.account_id.trim()) return showToast("Account ID is required", "error");
    try {
      await api.post(`/brands/${brandId}/accounts`, accountForm);
      showToast(`Account ${accountForm.account_id} mapped!`);
      setAccountForm({ platform: "META", account_id: "", account_name: "" });
      fetchBrands();
    } catch { showToast("Failed to map account (may already exist)", "error"); }
  };

  const handleRemoveAccount = async (brandId: string, accountId: string) => {
    try {
      await api.delete(`/brands/${brandId}/accounts/${accountId}`);
      showToast("Account unmapped");
      fetchBrands();
    } catch { showToast("Failed to remove account", "error"); }
  };

  const filteredBrands = platformFilter
    ? brands.filter((b: any) => b.accounts?.some((a: any) => a.platform === platformFilter))
    : brands;

  return (
    <div className="p-8 space-y-8">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${
              toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
            }`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <p className="text-sm font-medium">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-medium text-white">🏷️ Brand Manager</h1>
          <p className="text-slate-500 mt-1">Create brands and map Meta/Google ad accounts under each</p>
        </div>
        <div className="flex items-center gap-3">
          <PlatformFilter value={platformFilter} onChange={setPlatformFilter} />
          <button onClick={() => { setShowCreate(!showCreate); setShowEdit(false); }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-medium text-sm hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" /> Add Brand
          </button>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <BrandForm form={form} setForm={setForm} onSubmit={handleCreateBrand} submitLabel="Create Brand" onCancel={() => setShowCreate(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Form */}
      <AnimatePresence>
        {showEdit && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <BrandForm form={form} setForm={setForm} onSubmit={handleUpdateBrand} submitLabel="Update Brand" onCancel={() => setShowEdit(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brands List */}
      {loading ? (
        <div className="py-20 text-center text-slate-500">Loading brands...</div>
      ) : brands.length === 0 ? (
        <div className="py-24 border border-dashed border-white/5 rounded-3xl flex flex-col items-center text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-indigo-400" />
          </div>
          <p className="font-medium">No brands yet</p>
          <p className="text-sm mt-1">Click "Add Brand" to create your first brand</p>
        </div>
      ) : filteredBrands.length === 0 ? (
        <div className="py-24 border border-dashed border-white/5 rounded-3xl flex flex-col items-center text-slate-500">
          <p className="font-medium">No brands with a {platformFilter === "META" ? "Meta" : "Google"} account</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBrands.map((brand: any) => (
            <div key={brand.id} className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
              {/* Brand Row */}
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-medium text-lg shadow-lg shrink-0 overflow-hidden"
                    style={{ backgroundColor: brand.color || "#6366f1" }}>
                    {brand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white">{brand.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {brand.industry || "—"} · Target ROAS: <span className="text-indigo-400 font-medium">{brand.target_roas || "—"}x</span> ·{" "}
                      {brand.accounts?.length || 0} account{brand.accounts?.length !== 1 ? "s" : ""} mapped
                      {brand.website_url && (
                        <> · <a href={brand.website_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">{brand.website_url.replace(/^https?:\/\//, "")}</a></>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedBrand(expandedBrand === brand.id ? null : brand.id)}
                    className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/5 transition-all font-medium">
                    <Link2 className="w-4 h-4" />
                    Manage Accounts
                    {expandedBrand === brand.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => { setShowEdit(true); setShowCreate(false); setEditingBrand(brand); setForm({ name: brand.name, color: brand.color || "#6366f1", industry: brand.industry || "E-Commerce", target_roas: String(brand.target_roas || "3.0"), monthly_budget_cap: String(brand.monthly_budget_cap || "0"), currency: brand.currency || "INR", logo_url: brand.logo_url || "", website_url: brand.website_url || "" }); }}
                    className="p-2 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/10 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L19 7 17 5l1.375-2.375z"/></svg>
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(brand.id, brand.name)}
                    className="p-2 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Account Management */}
              <AnimatePresence>
                {expandedBrand === brand.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-6 pb-6 border-t border-white/5 pt-5 space-y-5">
                      {/* Mapped Accounts */}
                      {brand.accounts?.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-3">Mapped Accounts</p>
                          {brand.accounts.map((acct: any) => (
                            <div key={acct.id} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-medium bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg">{acct.platform}</span>
                                <div>
                                  <p className="font-medium text-slate-200 text-sm">{acct.account_name || `Account ${acct.account_id}`}</p>
                                  <p className="text-xs font-mono text-slate-500">act_{acct.account_id}</p>
                                </div>
                              </div>
                              <button onClick={() => handleRemoveAccount(brand.id, acct.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">No accounts mapped yet.</p>
                      )}

                      {/* Add Account Form */}
                      <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-4">
                        <p className="text-xs font-medium uppercase tracking-widest text-indigo-400">+ Map New Account</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5 block">Platform</label>
                            <select value={accountForm.platform}
                              onChange={e => { setAccountForm({ ...accountForm, platform: e.target.value, account_id: "", account_name: "" }); }}
                              className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-indigo-500">
                              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5 block">Account ID *</label>
                            {accountForm.platform === "META" && metaAccounts.length > 0 ? (
                              <SearchableSelect
                                placeholder="Select account"
                                value={accountForm.account_id}
                                options={metaAccounts.map(a => ({ value: a.account_id, label: `${a.name} (${a.account_id})` }))}
                                onChange={val => {
                                  const acct = metaAccounts.find(a => a.account_id === val);
                                  setAccountForm({ ...accountForm, account_id: val, account_name: acct?.name || "" });
                                }} />
                            ) : accountForm.platform === "GOOGLE" ? (
                              googleAccountsLoading ? (
                                <div className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-slate-500 text-sm animate-pulse">
                                  Loading accounts...
                                </div>
                              ) : googleAccounts.length > 0 ? (
                                <SearchableSelect
                                  placeholder="Select account"
                                  value={accountForm.account_id}
                                  options={googleAccounts.map(a => ({
                                    value: a.customer_id,
                                    label: a.descriptive_name ? `${a.descriptive_name} (${a.customer_id})` : a.customer_id,
                                  }))}
                                  onChange={val => {
                                    const acct = googleAccounts.find(a => a.customer_id === val);
                                    setAccountForm({ ...accountForm, account_id: val, account_name: acct?.descriptive_name || `Account ${val}` });
                                  }} />
                              ) : (
                                <input placeholder="e.g. 123-456-7890"
                                  value={accountForm.account_id}
                                  onChange={e => setAccountForm({ ...accountForm, account_id: e.target.value })}
                                  className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-indigo-500" />
                              )
                            ) : (
                              <input placeholder="e.g. 123456789"
                                value={accountForm.account_id}
                                onChange={e => setAccountForm({ ...accountForm, account_id: e.target.value })}
                                className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-indigo-500" />
                            )}
                          </div>
                          <div>
                            <label className="text-[10px] font-medium uppercase tracking-wider text-slate-500 mb-1.5 block">Account Label</label>
                            <input placeholder="e.g. Main Performance"
                              value={accountForm.account_name}
                              onChange={e => setAccountForm({ ...accountForm, account_name: e.target.value })}
                              className="w-full px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder-slate-700 focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                        <button onClick={() => handleMapAccount(brand.id)}
                          className="w-full py-2.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl font-medium text-sm hover:bg-indigo-500/30 transition-all">
                          Map Account to {brand.name}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
