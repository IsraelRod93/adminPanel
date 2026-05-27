"use client";

import { useRouter } from 'next/navigation';
import {
  Heart, MessageCircle, Users, Star, LogOut, ChevronRight, ShieldCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-white">Admin Panel</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">Selecciona una app</h2>
            <p className="text-zinc-400 mt-2">Elige qué panel quieres administrar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AuraSecret */}
            <button
              onClick={() => router.push('/dashboard/aurasecret')}
              className="group bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 rounded-2xl p-6 text-left flex flex-col gap-4 transition-all hover:bg-violet-950/20 hover:shadow-lg hover:shadow-violet-900/10"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-violet-400" />
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition-colors mt-1" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">AuraSecret</h3>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Marketplace de companions. Gestiona usuarios, creadoras, contenido del vault, pagos y analíticas.
                </p>
              </div>

              <div className="flex gap-3 mt-auto pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users className="w-3.5 h-3.5" />
                  Usuarios + Creadoras
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Star className="w-3.5 h-3.5" />
                  Stars + Pagos
                </div>
              </div>
            </button>

            {/* Xposed */}
            <button
              onClick={() => router.push('/dashboard/xposed')}
              className="group bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-6 text-left flex flex-col gap-4 transition-all hover:bg-amber-950/20 hover:shadow-lg hover:shadow-amber-900/10"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-amber-400" />
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-400 transition-colors mt-1" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Xposed</h3>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Confesiones anónimas vía Telegram Mini App. Gestiona usuarios, mensajes, economy de estrellas y rankings.
                </p>
              </div>

              <div className="flex gap-3 mt-auto pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users className="w-3.5 h-3.5" />
                  Usuarios Telegram
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Mensajes + Stars
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
