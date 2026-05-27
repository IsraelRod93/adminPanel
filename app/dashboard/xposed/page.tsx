"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, RefreshCw, BarChart3, Users, MessageCircle, Trophy,
  Loader2, Globe, Zap, Eye, EyeOff, Star, Flame, MessageCircleOff,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────

interface XposedAnalytics {
  total_users: number; users_this_week: number; users_today: number;
  total_stars_circulation: number; avg_stars: string; active_streaks: number;
  total_messages: number; messages_this_week: number; messages_today: number;
  revealed_count: number; unrevealed_count: number;
  stars_earned: number; stars_spent: number;
  reveals_count: number; missions_count: number; purchases_count: number;
  daily_messages: { day: string; count: number }[];
  top_countries: { country: string; count: number }[];
  top_receivers: { username: string; telegram_id: number; stars: number; streak_count: number; message_count: number }[];
}

interface XposedUser {
  telegram_id: number; username: string; stars: number;
  streak_count: number; last_active_at: string; created_at: string;
  messages_received: number;
}

interface XposedMessage {
  id: string; content: string; sender_os: string | null;
  sender_country: string | null; is_clue_revealed: boolean;
  created_at: string; receiver_username: string | null;
}

type Tab = 'overview' | 'users' | 'messages';

// ── Tier helper ────────────────────────────────────────────────────────────────

function getTier(rank: number): { label: string; color: string } {
  if (rank === 1)  return { label: 'Legend',  color: 'text-orange-400' };
  if (rank <= 3)   return { label: 'Diamond', color: 'text-sky-400' };
  if (rank <= 10)  return { label: 'Gold',    color: 'text-amber-400' };
  if (rank <= 25)  return { label: 'Silver',  color: 'text-zinc-300' };
  return             { label: 'Bronze',  color: 'text-amber-700' };
}

function Kpi({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${accent ?? 'text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
    </div>
  );
}

const COUNTRY_COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#fffbeb', '#fef9c3', '#fef08a', '#fde047', '#facc15'];

// ── Root ───────────────────────────────────────────────────────────────────────

export default function XposedAdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [analytics, setAnalytics] = useState<XposedAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  const [users, setUsers] = useState<XposedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const [messages, setMessages] = useState<XposedMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showRevealed, setShowRevealed] = useState(true);
  const [msgSearch, setMsgSearch] = useState('');

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const res = await fetch('/api/xposed/analytics');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalytics(data);
    } catch (err) {
      setAnalyticsError(err instanceof Error ? err.message : 'Error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/xposed/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data.users);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch('/api/xposed/messages');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(data.messages);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') loadAnalytics();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'messages') loadMessages();
  }, [activeTab, loadAnalytics, loadUsers, loadMessages]);

  const filteredUsers = users.filter((u) =>
    !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.telegram_id.toString().includes(userSearch),
  );

  const filteredMessages = messages.filter((m) => {
    const revealOk = showRevealed ? true : !m.is_clue_revealed;
    const searchOk = !msgSearch || m.content.toLowerCase().includes(msgSearch.toLowerCase()) || m.receiver_username?.toLowerCase().includes(msgSearch.toLowerCase());
    return revealOk && searchOk;
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',  label: 'Overview',  icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'users',     label: 'Usuarios',  icon: <Users className="w-4 h-4" /> },
    { id: 'messages',  label: 'Mensajes',  icon: <MessageCircle className="w-4 h-4" /> },
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
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span className="font-semibold text-white">Xposed</span>
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
                    ? 'border-amber-500 text-amber-400'
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
                {/* User KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Kpi label="Usuarios totales" value={analytics.total_users} sub={`+${analytics.users_today} hoy · +${analytics.users_this_week} semana`} />
                  <Kpi label="Stars en circulación" value={analytics.total_stars_circulation} sub={`Promedio ${analytics.avg_stars} por usuario`} accent="text-amber-400" />
                  <Kpi label="Streaks activos" value={analytics.active_streaks} accent="text-orange-400" />
                </div>

                {/* Message KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Kpi label="Mensajes totales" value={analytics.total_messages} sub={`+${analytics.messages_today} hoy`} />
                  <Kpi label="Esta semana" value={analytics.messages_this_week} accent="text-sky-400" />
                  <Kpi label="Clues revelados" value={analytics.revealed_count} sub={`${analytics.reveals_count} transacciones`} accent="text-violet-400" />
                  <Kpi label="Sin revelar" value={analytics.unrevealed_count} />
                </div>

                {/* Stars economy */}
                <div className="grid grid-cols-3 gap-3">
                  <Kpi label="Stars ganadas" value={analytics.stars_earned} accent="text-green-400" />
                  <Kpi label="Stars gastadas" value={analytics.stars_spent} accent="text-red-400" />
                  <Kpi label="Misiones completadas" value={analytics.missions_count} accent="text-amber-400" />
                </div>

                {/* Daily messages chart */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">Mensajes diarios (últimos 7 días)</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={analytics.daily_messages}>
                      <defs>
                        <linearGradient id="msgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                        labelStyle={{ color: '#e4e4e7' }}
                        itemStyle={{ color: '#fbbf24' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="url(#msgGrad)" strokeWidth={2} name="Mensajes" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top countries */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-zinc-400" />
                      Mensajes por país
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={analytics.top_countries.slice(0, 8)} layout="vertical">
                        <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} />
                        <YAxis type="category" dataKey="country" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={70} />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                          labelStyle={{ color: '#e4e4e7' }}
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        />
                        <Bar dataKey="count" name="Mensajes" radius={[0, 4, 4, 0]}>
                          {analytics.top_countries.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={COUNTRY_COLORS[i] ?? '#f59e0b'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top receivers */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-zinc-400" />
                      Top Receptores
                    </h3>
                    <div className="flex flex-col divide-y divide-zinc-800">
                      {analytics.top_receivers.map((u, i) => {
                        const tier = getTier(i + 1);
                        return (
                          <div key={u.telegram_id} className="flex items-center gap-2.5 py-2">
                            <span className="text-xs text-zinc-500 w-5">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white truncate">{u.username ?? `#${u.telegram_id}`}</p>
                              <div className="flex gap-2 mt-0.5">
                                <span className="text-xs text-amber-400">{u.stars} ⭐</span>
                                {u.streak_count > 0 && (
                                  <span className="text-xs text-orange-400 flex items-center gap-0.5">
                                    <Flame className="w-3 h-3" />{u.streak_count}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-medium ${tier.color}`}>{tier.label}</span>
                              <p className="text-xs text-zinc-400">{u.message_count} msgs</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white">
                Usuarios <span className="text-zinc-500 text-sm font-normal">({filteredUsers.length})</span>
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar username o ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-48"
                />
                <button onClick={loadUsers} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {usersLoading && users.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 font-medium px-4 py-3">Usuario</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3">Mensajes</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3">Stars</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3">Streak</th>
                    <th className="text-right text-xs text-zinc-500 font-medium px-4 py-3 hidden sm:table-cell">Último activo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredUsers.map((u, i) => {
                    const tier = getTier(i + 1);
                    return (
                      <tr key={u.telegram_id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium w-14 shrink-0 ${tier.color}`}>{tier.label}</span>
                            <div>
                              <p className="text-white font-medium">{u.username ?? `#${u.telegram_id}`}</p>
                              <p className="text-xs text-zinc-500">ID: {u.telegram_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sky-400 font-medium">{u.messages_received}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-amber-400">{u.stars} ⭐</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.streak_count > 0 ? (
                            <span className="text-orange-400 flex items-center justify-end gap-1">
                              <Flame className="w-3.5 h-3.5" />{u.streak_count}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400 text-xs hidden sm:table-cell">
                          {u.last_active_at ? new Date(u.last_active_at).toLocaleDateString('es-MX') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!usersLoading && filteredUsers.length === 0 && (
                <div className="text-center py-12 text-zinc-500 text-sm">No se encontraron usuarios</div>
              )}
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        {activeTab === 'messages' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-white">
                Mensajes <span className="text-zinc-500 text-sm font-normal">({filteredMessages.length})</span>
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar contenido o usuario..."
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-52"
                />
                <button
                  onClick={() => setShowRevealed((p) => !p)}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {showRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showRevealed ? 'Ocultar revelados' : 'Ver revelados'}
                </button>
                <button onClick={loadMessages} className="p-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white transition-colors">
                  <RefreshCw className={`w-4 h-4 ${messagesLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {messagesLoading && messages.length === 0 && (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {filteredMessages.map((m) => (
                <div key={m.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-white leading-relaxed flex-1">{m.content}</p>
                    {m.is_clue_revealed ? (
                      <span className="flex items-center gap-1 text-xs text-violet-400 bg-violet-900/30 border border-violet-800/50 px-2 py-1 rounded-full shrink-0">
                        <Eye className="w-3 h-3" />
                        Revelado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded-full shrink-0">
                        <EyeOff className="w-3 h-3" />
                        Oculto
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-2 flex-wrap">
                    {m.receiver_username && (
                      <span className="text-xs text-zinc-400">
                        Para: <span className="text-white">{m.receiver_username}</span>
                      </span>
                    )}
                    {m.sender_country && (
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Globe className="w-3 h-3" />{m.sender_country}
                      </span>
                    )}
                    {m.sender_os && (
                      <span className="text-xs text-zinc-500">{m.sender_os}</span>
                    )}
                    <span className="text-xs text-zinc-600 ml-auto">
                      {new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
              {!messagesLoading && filteredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                  <MessageCircleOff className="w-8 h-8" />
                  <span className="text-sm">No se encontraron mensajes</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
