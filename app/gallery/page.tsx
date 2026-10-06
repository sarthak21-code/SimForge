"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type SimRow = {
  id: string;
  title: string;
  query: string;
  spec: {
    domain?: string;
    description?: string;
    template?: string;
  };
  created_at: string;
};

const TEMPLATE_COLORS: Record<string, { badge: string; text: string }> = {
  projectile: { badge: "bg-blue-900/40 border-blue-700/50", text: "text-blue-400" },
  pendulum: { badge: "bg-purple-900/40 border-purple-700/50", text: "text-purple-400" },
  wave: { badge: "bg-cyan-900/40 border-cyan-700/50", text: "text-cyan-400" },
  orbit: { badge: "bg-amber-900/40 border-amber-700/50", text: "text-amber-400" },
  other: { badge: "bg-slate-800 border-slate-700", text: "text-slate-400" },
};

const TEMPLATE_ICONS: Record<string, string> = {
  projectile: "🚀",
  pendulum: "⏱️",
  wave: "🌊",
  orbit: "🪐",
  other: "🔬",
};

export default function Gallery() {
  const [sims, setSims] = useState<SimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const filterTabs = [
    { id: "all", label: "All Simulations" },
    { id: "projectile", label: "Projectile" },
    { id: "pendulum", label: "Pendulum" },
    { id: "wave", label: "Wave" },
    { id: "orbit", label: "Orbit" },
  ];

  useEffect(() => {
    async function fetchSims() {
      try {
        const res = await fetch("/api/sims?limit=60");
        const data = await res.json();
        setSims(Array.isArray(data) ? data : []);
      } catch {
        setSims([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSims();
  }, []);

  const filtered =
    filter === "all"
      ? sims
      : sims.filter((s) => (s.spec?.template || "").toLowerCase() === filter);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <a href="/" className="text-slate-400 hover:text-white text-xs mb-2 inline-block transition">
              ← Back to Home
            </a>
            <h1 className="text-3xl font-bold tracking-tight">Simulation Gallery</h1>
            <p className="text-slate-400 text-sm mt-1">
              {loading
                ? "Loading simulations..."
                : `Showing ${filtered.length} simulation${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Link
            href="/create"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-sm transition flex items-center gap-1.5 shadow-sm"
          >
            <span>+</span>
            <span>Create Simulation</span>
          </Link>
        </div>

        {/* Simulation Type Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                filter === tab.id
                  ? "bg-blue-600 text-white shadow"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <span>{TEMPLATE_ICONS[tab.id] || "✦"}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 animate-pulse space-y-3">
                <div className="h-4 w-20 bg-slate-800 rounded" />
                <div className="h-6 w-48 bg-slate-800 rounded" />
                <div className="h-14 w-full bg-slate-950/60 rounded" />
                <div className="h-4 w-28 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
            <span className="text-4xl mb-3 block">🧪</span>
            <p className="text-slate-300 text-base font-medium mb-1">
              No simulations found for this filter.
            </p>
            <p className="text-slate-500 text-xs mb-5">
              Create and save your custom simulation to showcase it here!
            </p>
            <Link
              href="/create"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold text-sm transition inline-block"
            >
              Create New Simulation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => {
              const tpl = (s.spec?.template || "other").toLowerCase();
              const styling = TEMPLATE_COLORS[tpl] || TEMPLATE_COLORS.other;
              const icon = TEMPLATE_ICONS[tpl] || "🔬";

              return (
                <div
                  key={s.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition flex flex-col justify-between group shadow-sm hover:shadow-md"
                >
                  <div>
                    {/* Header: Type badge & icon */}
                    <div className="flex items-center justify-between mb-2.5">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${styling.badge} ${styling.text} flex items-center gap-1`}
                      >
                        <span>{icon}</span>
                        <span>{s.spec?.template || s.spec?.domain || "physics"}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition line-clamp-1">
                      {s.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {s.spec?.description || s.query}
                    </p>
                  </div>

                  {/* Open Button */}
                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                      {s.query}
                    </span>
                    <Link
                      href={`/sim/${s.id}`}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition flex items-center gap-1"
                    >
                      <span>Open</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}