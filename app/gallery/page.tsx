"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ensureAnonymousSession } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SIMULATION_DOMAINS } from "@/lib/ai/domains";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SimRow = {
  id: string;
  title: string;
  query?: string;
  spec: { domain: string; description: string };
  created_at: string;
  is_owner?: boolean;
};

const DOMAINS = ["all", ...SIMULATION_DOMAINS];

export default function Gallery() {
  const [sims, setSims] = useState<SimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGallery() {
      try {
        let token: string | undefined;
        try {
          token = (await ensureAnonymousSession()).access_token;
        } catch {
          // Public gallery access remains available if anonymous auth is unavailable.
        }
        const response = await fetch("/api/sims?limit=60", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) throw new Error("Gallery request failed");
        setSims((await response.json()) as SimRow[]);
      } catch {
        setLoadError("The gallery could not be loaded. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, []);

  async function deleteSimulation(sim: SimRow) {
    if (deletingId || !window.confirm("Delete this simulation?\nThis cannot be undone.")) return;
    setDeleteError(null);
    setDeletingId(sim.id);
    try {
      const session = await ensureAnonymousSession();
      const response = await fetch(`/api/sims/${encodeURIComponent(sim.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("Delete failed");
      setSims((current) => current.filter((item) => item.id !== sim.id));
    } catch {
      setDeleteError("This simulation could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = sims.filter((sim) =>
    (filter === "all" || sim.spec?.domain === filter) &&
    (!normalizedSearch || `${sim.title} ${sim.spec?.description ?? ""} ${sim.query ?? ""}`.toLowerCase().includes(normalizedSearch))
  );

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-7xl mx-auto fade-up">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <Badge className="mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Community Gallery
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Explore <span className="gradient-text">simulations</span>
            </h1>
            <p className="mt-2 text-slate-400">
            Browse community experiments and open any simulation to explore its controls and data.
            </p>
          </div>
          <Link href="/create">
            <Button>
              <Plus className="w-4 h-4" />
              New simulation
            </Button>
          </Link>
        </div>

        <label className="relative mb-6 block max-w-xl">
          <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <span className="sr-only">Search simulations</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search experiments…" className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-indigo-400/50 focus:outline-none" />
        </label>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DOMAINS.map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all capitalize",
                filter === d
                  ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              )}
            >
              {d}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl shimmer" />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <Card role="alert" className="mb-5 border-rose-400/20 text-center text-sm text-rose-200">{loadError}</Card>
        )}

        {deleteError && <Card role="alert" className="mb-5 border-rose-400/20 text-sm text-rose-200">{deleteError}</Card>}

        {!loading && !loadError && filtered.length === 0 && (
          <Card className="text-center py-16">
            <p className="text-slate-400">
              {normalizedSearch ? `No simulations match “${search.trim()}”.` : filter === "all"
                ? "No public simulations yet. Start the first experiment."
                : `No simulations in ${filter} yet.`}
            </p>
            <Link href="/create" className="inline-block mt-4">
              <Button>Create one</Button>
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="group h-full transition-all hover:border-white/20 hover:-translate-y-1">
              <Link href={`/sim/${s.id}`} aria-label={`Open ${s.title}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                <Badge className="mb-3 capitalize">{s.spec?.domain ?? "unknown"}</Badge>
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                  {s.spec?.description}
                </p>
                <p className="mt-5 border-t border-white/[.06] pt-3 text-[11px] text-slate-500">{new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              </Link>
              {s.is_owner && (
                <button
                  type="button"
                  aria-label={`Delete ${s.title}`}
                  onClick={() => deleteSimulation(s)}
                  disabled={deletingId === s.id}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300/20 px-3 text-sm text-rose-200 transition hover:bg-rose-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-60"
                >
                  {deletingId === s.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {deletingId === s.id ? "Deleting…" : "Delete"}
                </button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
