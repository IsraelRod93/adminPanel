"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, BarChart3, Users, Star, Wallet, ImageIcon,
  Trash2, ShieldCheck, ShieldOff, Eye, EyeOff, Check, TrendingUp,
  ArrowUpRight, UserCheck, Activity, Play, X, ChevronLeft, ChevronRight,
  Download, Loader2, Heart,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  bot_start: number; first_message: number; warning_shown: number;
  limit_reached: number; payment_intent: number; payment_completed: number;
  referral_join: number;
  total_users: number; users_this_week: number; users_today: number;
  paid_users: number; free_users: number;
  total_companions: number; active_companions: number;
  active_ai: number; active_human: number; total_ai: number; total_human: number;
  total_stars: number; stars_this_week: number;
  total_sales: number; sales_this_week: number;
  top_companions: { name: string; photo_url: string; revenue_stars: number; sales_count: number; chat_users: number }[];
  daily_revenue: { day: string; stars: number; sales: number }[];
  health?: { expired_active_subs: number; active_no_expiry: number; stuck_purchases: number; deleted_companions: number };
}

interface CompanionRow {
  id: string; name: string; type: string; status: string; verified: boolean;
  tagline: string | null; description: string | null; age: number | null;
  location: string | null; photo_url: string; created_at: string; vault_items: number;
}

interface ContentItem {
  id: string; type: string; title: string | null; price: number;
  file_url: string | null; thumbnail_url?: string | null;
  created_at: string; approved: boolean;
  companion_name: string; companion_id: string;
}

interface PayoutRow {
  id: string; companion_name: string; amount_stars: number;
  amount_mxn: string; mp_email: string | null; clabe: string | null;
  status: string; created_at: string;
}

interface PayoutTotals { count: number; total_stars: number; total_mxn: string; }

type Tab = 'overview' | 'companions' | 'content' | 'payouts';

// ── Helpers ────────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${accent ?? 'text-white'}`}>{value.toLocaleString()}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{text}</span>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function AuraSecretAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  // Companions
  const [companions, setCompanions] = useState<CompanionRow[]>([]);
  const [companionsLoading, setCompanionsLoading] = useState(false);
  const [compFilter, setCompFilter] = useState<'all' | 'ai' | 'human'>('all');

  // Content
  const [content, setContent] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState('');
  const [showApproved, setShowApproved] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Payouts
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [payoutTotals, setPayoutTotals] = useState<PayoutTotals | null>(null);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');

  const lightboxRef = useRef<HTMLDivElement>(null);

  // ── Fetch helpers ────────────────────────────────────────────────────────────

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const res = await fetch('/api/aurasecret/analytics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadCompanions = useCallback(async () => {
    setCompanionsLoading(true);
    try {
      const res = await fetch('/api/aurasecret/companions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCompanions(data.companions);
    } finally {
      setCompanionsLoading(false);
    }
  }, []);

  const loadContent = useCallback(async () => {
    setContentLoading(true);
    setContentError('');
    try {
      const res = await fetch('/api/aurasecret/content');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContent(data.items);
    } catch (err) {
      setContentError(err instanceof Error ? err.message : 'Error');
    } finally {
      setContentLoading(false);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const res = await fetch('/api/aurasecret/payouts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayouts(data.pending);
      setPayoutTotals(data.totals);
    } finally {
      setPayoutsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') loadAnalytics();
    if (activeTab === 'companions') loadCompanions();
    if (activeTab === 'content') loadContent();
    if (activeTab === 'payouts') loadPayouts();
  }, [activeTab, loadAnalytics, loadCompanions, loadContent, loadPayouts]);

  // Lightbox keyboard
  useEffect(() => {
    const visible = content.filter((i) => showApproved || !i.approved);
    function onKey(e: KeyboardEvent) {
      if (lightboxIdx === null) return;
      if (e.key === 'ArrowRight') setLightboxIdx((p) => Math.min((p ?? 0) + 1, visible.length - 1));
      if (e.key === 'ArrowLeft') setLightboxIdx((p) => Math.max((p ?? 0) - 1, 0));
      if (e.key === 'Escape') setLightboxIdx(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, content, showApproved]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function approveItem(itemId: string) {
    await fetch('/api/aurasecret/content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    setContent((prev) => prev.map((i) => (i.id === itemId ? { ...i, approved: true } : i)));
  }

  async function deleteItem(itemId: string) {
    if (!confirm('¿Eliminar este item?')) return;
    await fetch('/api/aurasecret/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId }),
    });
    setContent((prev) => prev.filter((i) => i.id !== itemId));
  }

  async function bulkApprove() {
    await fetch('/api/aurasecret/content', { method: 'POST' });
    setContent((prev) => prev.map((i) => ({ ...i, approved: true })));
  }

  async function toggleVerified(companionId: string, current: boolean) {
    await fetch('/api/aurasecret/companions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companionId, verified: !current }),
    });
    setCompanions((prev) => prev.map((c) => (c.id === companionId ? { ...c, verified: !current } : c)));
  }

  async function toggleStatus(companionId: string, current: string) {
    const next = current === 'active' ? 'pending' : 'active';
    await fetch('/api/aurasecret/companions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companionId, status: next }),
    });
    setCompanions((prev) => prev.map((c) => (c.id === companionId ? { ...c, status: next } : c)));
  }

  async function deleteCompanion(companionId: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}?`)) return;
    await fetch('/api/aurasecret/companions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companionId }),
    });
    setCompanions((prev) => prev.filter((c) => c.id !== companionId));
  }

  async function markPayoutDone(id: string) {
    await fetch('/api/aurasecret/payouts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withdrawalId: id, status: 'completed' }),
    });
    setPayouts((prev) => prev.filter((p) => p.id !== id));
    setPayoutMsg('Retiro marcado como completado');
    setTimeout(() => setPayoutMsg(''), 3000);
  }

  async function exportSpeiCsv() {
    const res = await fetch('/api/aurasecret/payouts', { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `retiros-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    await loadPayouts();
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredContent = content.filter((i) => showApproved || !i.approved);
  const filteredCompanions = companions.filter((c) =>
    compFilter === 'all' ? true : c.type === compFilter,
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',   label: 'Overview',   icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'content',    label: 'Contenido',  icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'companions', label: 'Creadoras',  icon: <Users className="w-4 h-4" /> },
    { id: 'payouts',    label: 'Pagos',      icon: <Wallet className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="h-5 w-px bg-zinc-700" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span className="font-semibold text-white">AuraSecret</span>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Analytics</h2>
              <button onClick={loadAnalytics} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
                <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {analyticsError && <p className="text-red-400 text-sm">{analyticsError}</p>}

            {analyticsLoading && !analytics && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            {analytics && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Kpi label="Usuarios totales" value={analytics.total_users} sub={`+${analytics.users_today} hoy`} />
                  <Kpi label="Pagados" value={analytics.paid_users} sub={`${analytics.free_users} gratis`} accent="text-violet-400" />
                  <Kpi label="Stars (total)" value={analytics.total_stars.toLocaleString()} sub={`+${analytics.stars_this_week} esta semana`} accent="text-amber-400" />
                  <Kpi label="Ventas" value={analytics.total_sales} sub={`+${analytics.sales_this_week} esta semana`} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Kpi label="Companions activos" value={analytics.active_companions} sub={`de ${analytics.total_companions} totales`} />
                  <Kpi label="AI activas" value={analytics.active_ai} sub={`${analytics.total_ai} total`} accent="text-sky-400" />
                  <Kpi label="Humanos activos" value={analytics.active_human} sub={`${analytics.total_human} total`} accent="text-pink-400" />
                  <Kpi label="Referidos" value={analytics.referral_join} />
                </div>

                {/* Revenue chart */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">Revenue últimos 7 días</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={analytics.daily_revenue}>
                      <defs>
                        <linearGradient id="starsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                        labelStyle={{ color: '#e4e4e7' }}
                        itemStyle={{ color: '#a78bfa' }}
                      />
                      <Area type="monotone" dataKey="stars" stroke="#7c3aed" fill="url(#starsGrad)" strokeWidth={2} name="Stars" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Funnel */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">Funnel de conversión</h3>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: 'Bot start',        value: analytics.bot_start },
                      { label: 'Primer mensaje',    value: analytics.first_message },
                      { label: 'Warning mostrado',  value: analytics.warning_shown },
                      { label: 'Límite alcanzado',  value: analytics.limit_reached },
                      { label: 'Intent de pago',    value: analytics.payment_intent },
                      { label: 'Pago completado',   value: analytics.payment_completed },
                    ].map(({ label, value }) => {
                      const pct = analytics.bot_start > 0 ? Math.round((value / analytics.bot_start) * 100) : 0;
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 w-36 shrink-0">{label}</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-600 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-zinc-300 w-20 text-right">{value.toLocaleString()} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top companions */}
                {analytics.top_companions.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-3">Top Creadoras</h3>
                    <div className="flex flex-col divide-y divide-zinc-800">
                      {analytics.top_companions.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-3 py-2.5">
                          <span className="text-xs text-zinc-500 w-5">{i + 1}</span>
                          {c.photo_url ? (
                            <img src={c.photo_url} className="w-8 h-8 rounded-full object-cover" alt={c.name} />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">{c.name[0]}</div>
                          )}
                          <span className="flex-1 text-sm text-white font-medium">{c.name}</span>
                          <span className="text-xs text-zinc-400">{c.chat_users} chats</span>
                          <span className="text-xs text-amber-400 font-medium">{c.revenue_stars.toLocaleString()} ⭐</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health */}
                {analytics.health && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-3">System Health</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Subs expiradas activas', value: analytics.health.expired_active_subs, warn: true },
                        { label: 'Activas sin expiración', value: analytics.health.active_no_expiry, warn: true },
                        { label: 'Compras stuck (48h)',    value: analytics.health.stuck_purchases, warn: true },
                        { label: 'Companions eliminados',  value: analytics.health.deleted_companions, warn: false },
                      ].map(({ label, value, warn }) => (
                        <div key={label} className="flex flex-col gap-1 p-3 rounded-lg bg-zinc-800/50">
                          <span className="text-xs text-zinc-500">{label}</span>
                          <span className={`text-xl font-bold ${warn && value > 0 ? 'text-red-400' : 'text-zinc-300'}`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CONTENT ── */}
        {activeTab === 'content' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white">
                Vault Content <span className="text-zinc-500 text-sm font-normal">({filteredContent.length})</span>
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowApproved((p) => !p)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {showApproved ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showApproved ? 'Ocultar aprobados' : 'Ver aprobados'}
                </button>
                <button
                  onClick={bulkApprove}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Aprobar todo
                </button>
                <button onClick={loadContent} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${contentLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {contentError && <p className="text-red-400 text-sm">{contentError}</p>}
            {contentLoading && filteredContent.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredContent.map((item, idx) => (
                <div
                  key={item.id}
                  className={`group relative rounded-xl overflow-hidden border ${
                    item.approved ? 'border-green-700/40' : 'border-zinc-700'
                  } bg-zinc-900 aspect-square cursor-pointer`}
                  onClick={() => setLightboxIdx(idx)}
                >
                  {(item.thumbnail_url || item.file_url) ? (
                    <img
                      src={item.thumbnail_url ?? item.file_url!}
                      className="w-full h-full object-cover"
                      alt={item.title ?? ''}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      {item.type === 'video' ? <Play className="w-8 h-8 text-zinc-500" /> : <ImageIcon className="w-8 h-8 text-zinc-500" />}
                    </div>
                  )}
                  {item.approved && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    <span className="text-xs text-white font-medium text-center line-clamp-1">{item.companion_name}</span>
                    <span className="text-xs text-amber-400">{item.price} ⭐</span>
                    <div className="flex gap-1.5">
                      {!item.approved && (
                        <button
                          onClick={(e) => { e.stopPropagation(); approveItem(item.id); }}
                          className="p-1 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                        className="p-1 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COMPANIONS ── */}
        {activeTab === 'companions' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white">
                Creadoras <span className="text-zinc-500 text-sm font-normal">({filteredCompanions.length})</span>
              </h2>
              <div className="flex gap-2">
                {(['all', 'ai', 'human'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setCompFilter(f)}
                    className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      compFilter === f
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Todas' : f === 'ai' ? 'AI' : 'Humanas'}
                  </button>
                ))}
                <button onClick={loadCompanions} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${companionsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {companionsLoading && companions.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {filteredCompanions.map((c) => (
                <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                  {c.photo_url ? (
                    <img src={c.photo_url} className="w-10 h-10 rounded-full object-cover shrink-0" alt={c.name} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium shrink-0">{c.name[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white text-sm">{c.name}</span>
                      <Badge
                        text={c.type}
                        color={c.type === 'ai' ? 'bg-sky-900/50 text-sky-400 border border-sky-800' : 'bg-pink-900/50 text-pink-400 border border-pink-800'}
                      />
                      <Badge
                        text={c.status}
                        color={c.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-800' : 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'}
                      />
                      {c.verified && <Badge text="Verificada" color="bg-violet-900/50 text-violet-400 border border-violet-800" />}
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{c.tagline ?? 'Sin tagline'} · {c.vault_items} vault items</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleVerified(c.id, c.verified)}
                      title={c.verified ? 'Quitar verificación' : 'Verificar'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        c.verified ? 'border-violet-700 text-violet-400 hover:border-violet-500' : 'border-zinc-700 text-zinc-500 hover:text-violet-400 hover:border-violet-700'
                      }`}
                    >
                      {c.verified ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => toggleStatus(c.id, c.status)}
                      title={c.status === 'active' ? 'Desactivar' : 'Activar'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        c.status === 'active' ? 'border-green-700 text-green-400 hover:border-zinc-600 hover:text-zinc-400' : 'border-zinc-700 text-zinc-500 hover:text-green-400 hover:border-green-700'
                      }`}
                    >
                      {c.status === 'active' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteCompanion(c.id, c.name)}
                      className="p-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PAYOUTS ── */}
        {activeTab === 'payouts' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white">Retiros Pendientes</h2>
              <div className="flex gap-2">
                <button onClick={exportSpeiCsv} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <Download className="w-4 h-4" />
                  Exportar SPEI
                </button>
                <button onClick={loadPayouts} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${payoutsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {payoutTotals && (
              <div className="grid grid-cols-3 gap-3">
                <Kpi label="Pendientes" value={payoutTotals.count} />
                <Kpi label="Stars totales" value={payoutTotals.total_stars} accent="text-amber-400" />
                <Kpi label="MXN totales" value={`$${Number(payoutTotals.total_mxn).toFixed(2)}`} accent="text-green-400" />
              </div>
            )}

            {payoutMsg && (
              <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{payoutMsg}</p>
            )}

            {payoutsLoading && payouts.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {payouts.map((p) => (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{p.companion_name}</p>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-amber-400">{p.amount_stars.toLocaleString()} ⭐</span>
                      <span className="text-xs text-green-400">${Number(p.amount_mxn).toFixed(2)} MXN</span>
                      {p.mp_email && <span className="text-xs text-zinc-400">MP: {p.mp_email}</span>}
                      {p.clabe && <span className="text-xs text-zinc-400">CLABE: {p.clabe}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => markPayoutDone(p.id)}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-700/30 border border-green-700/50 text-green-400 hover:bg-green-700/50 transition-colors shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    Pagado
                  </button>
                </div>
              ))}
              {!payoutsLoading && payouts.length === 0 && (
                <div className="text-center py-12 text-zinc-500 text-sm">Sin retiros pendientes</div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((p) => Math.max((p ?? 0) - 1, 0)); }}
            className="absolute left-4 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white z-10"
            disabled={lightboxIdx === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            {filteredContent[lightboxIdx]?.file_url ? (
              filteredContent[lightboxIdx].type === 'video' ? (
                <video src={filteredContent[lightboxIdx].file_url!} controls className="w-full rounded-xl" />
              ) : (
                <img src={filteredContent[lightboxIdx].file_url!} className="w-full rounded-xl object-contain max-h-[80vh]" alt="" />
              )
            ) : (
              <div className="w-full h-64 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">Sin preview</div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className="text-sm text-white">{filteredContent[lightboxIdx]?.companion_name}</p>
                <p className="text-xs text-amber-400">{filteredContent[lightboxIdx]?.price} ⭐</p>
              </div>
              {!filteredContent[lightboxIdx]?.approved && (
                <button
                  onClick={() => { approveItem(filteredContent[lightboxIdx!].id); setLightboxIdx(null); }}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Aprobar
                </button>
              )}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((p) => Math.min((p ?? 0) + 1, filteredContent.length - 1)); }}
            className="absolute right-4 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white z-10"
            disabled={lightboxIdx === filteredContent.length - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
