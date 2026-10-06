"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Plus, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type SimRow = {
  id: string;
  title: string;
  query?: string;
  spec: { domain: string; description: string };
  created_at: string;
};

const DOMAINS = ["all", "physics", "math", "cs", "economics", "cybersecurity", "sustainability"];

export default function Gallery() {
  const [sims, setSims] = useState<SimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGallery() {
      try {
        const { data, error } = await supabase
          .from("sims")
          .select("id, title, query, spec, created_at")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(60);
        if (error) throw error;
        setSims((data as SimRow[]) || []);
      } catch {
        setLoadError("The gallery could not be loaded. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, []);

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
            <Link key={s.id} href={`/sim/${s.id}`} aria-label={`Open ${s.title}`}>
              <Card className="group h-full transition-all hover:border-white/20 hover:-translate-y-1 cursor-pointer">
                <Badge className="mb-3 capitalize">{s.spec?.domain ?? "unknown"}</Badge>
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                  {s.spec?.description}
                </p>
                <p className="mt-5 border-t border-white/[.06] pt-3 text-[11px] text-slate-500">{new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
