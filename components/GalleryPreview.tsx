"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

type PublicSimulation = {
  id: string;
  title: string;
  query?: string | null;
  created_at: string;
  spec?: { domain?: string; description?: string; template?: string } | null;
};

export function GalleryPreview() {
  const [sims, setSims] = useState<PublicSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data, error } = await supabase
          .from("sims")
          .select("id, title, query, spec, created_at")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(4);
        if (error) throw error;
        if (active) setSims((data as PublicSimulation[]) ?? []);
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, []);

  return (
    <section aria-labelledby="gallery-preview-title" className="mb-20 rounded-3xl border border-indigo-400/20 bg-[rgba(2,5,17,.76)] p-4 shadow-[0_0_55px_rgba(40,72,180,.1)] backdrop-blur-md sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_18px_rgba(217,70,239,.16)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>
            </svg>
          </span>
          <div>
          <h2 id="gallery-preview-title" className="text-2xl font-semibold tracking-[-.035em] text-slate-100 sm:text-3xl">
            Explore the Gallery
          </h2>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">Discover simulations created by our community. Get inspired or remix to make it your own.</p>
          </div>
        </div>
        <Link href="/gallery" className="group inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-indigo-300/30 hover:text-white">
          View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading community simulations">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-64 rounded-2xl shimmer" />)}
        </div>
      )}

      {!loading && failed && (
        <Card role="status" className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-slate-400">The community gallery is unavailable right now.</p>
          <Link href="/gallery" className="text-sm text-indigo-200 hover:text-white">Open the gallery</Link>
        </Card>
      )}

      {!loading && !failed && sims.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <Sparkles className="h-5 w-5 text-indigo-300" />
          <p className="max-w-md text-sm leading-6 text-slate-400">The gallery is waiting for its first public experiment. Create one and share it with the community.</p>
          <Link href="/create" className="text-sm text-indigo-200 hover:text-white">Create the first simulation</Link>
        </Card>
      )}

      {!loading && !failed && sims.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sims.map((sim) => (
            <Link key={sim.id} href={`/sim/${sim.id}`} aria-label={`Open ${sim.title}`} className="group h-full">
              <Card className="h-full overflow-hidden p-0 transition duration-200 group-hover:-translate-y-1 group-hover:border-indigo-300/25">
                <SimulationArtwork template={sim.spec?.template ?? sim.spec?.domain ?? "simulation"} />
                <div className="p-5">
                  <Badge className="mb-3 capitalize">{sim.spec?.domain ?? "simulation"}</Badge>
                  <h3 className="line-clamp-1 text-base font-semibold text-slate-100 transition-colors group-hover:text-white">{sim.title}</h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">{sim.spec?.description || sim.query || "An interactive experiment made with SimForge."}</p>
                  <p className="mt-4 border-t border-white/[.06] pt-3 text-[11px] text-slate-500">{new Date(sim.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function SimulationArtwork({ template }: { template: string }) {
  const type = template.toLowerCase();
  const isWave = /wave|oscillat|sound|signal/.test(type);
  const isOrbit = /orbit|planet|gravity|solar/.test(type);
  const isNetwork = /network|graph|data|algorithm|node/.test(type);

  return (
    <div className="simulation-artwork relative h-36 overflow-hidden border-b border-white/[.06]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(99,102,241,.16),transparent_62%)]" />
      <svg viewBox="0 0 360 144" className="relative h-full w-full" fill="none">
        <path d="M0 113H360M0 85H360M0 57H360M45 0V144M90 0V144M135 0V144M180 0V144M225 0V144M270 0V144M315 0V144" stroke="#8590bb" strokeOpacity=".11" strokeWidth=".7" />
        {isWave ? (
          <><path d="M34 78C57 78 57 39 80 39S103 105 126 105 149 52 172 52s23 39 46 39 23-30 46-30 23 19 60 19" stroke="#a5b4fc" strokeOpacity=".85" strokeWidth="2"/><path d="M34 78C57 78 57 39 80 39S103 105 126 105 149 52 172 52s23 39 46 39 23-30 46-30 23 19 60 19" stroke="#67e8f9" strokeOpacity=".25" strokeWidth="8"/></>
        ) : isOrbit ? (
          <><ellipse cx="183" cy="72" rx="100" ry="31" transform="rotate(-18 183 72)" stroke="#a5b4fc" strokeOpacity=".6"/><ellipse cx="183" cy="72" rx="75" ry="22" transform="rotate(27 183 72)" stroke="#67e8f9" strokeOpacity=".5"/><circle cx="183" cy="72" r="12" fill="#a5b4fc" fillOpacity=".8"/><circle cx="277" cy="42" r="4" fill="#67e8f9"/><circle cx="133" cy="49" r="3" fill="#c4b5fd"/></>
        ) : isNetwork ? (
          <><path d="m83 94 58-51 69 33 65-39M83 94l85 13 42-31 65 31M141 43l27 64" stroke="#8292e8" strokeOpacity=".58"/><circle cx="83" cy="94" r="5" fill="#a5b4fc"/><circle cx="141" cy="43" r="5" fill="#67e8f9"/><circle cx="210" cy="76" r="6" fill="#c4b5fd"/><circle cx="275" cy="37" r="5" fill="#67e8f9"/><circle cx="168" cy="107" r="4" fill="#a5b4fc"/><circle cx="275" cy="107" r="4" fill="#c4b5fd"/></>
        ) : (
          <><path d="M46 103C83 98 98 69 126 73s39 20 63-4 44-38 65-19 28 38 62 28" stroke="#a5b4fc" strokeOpacity=".75" strokeWidth="2"/><path d="m56 93 19 10 18-23 19 5 20-17 20 12 18-4 19-18 20 12 19-22 19 7 18-12 21 18 20-9" stroke="#67e8f9" strokeOpacity=".44" strokeWidth="1"/></>
        )}
      </svg>
      <span className="absolute bottom-3 left-4 text-[9px] font-medium uppercase tracking-[.2em] text-slate-500">SIMFORGE / EXPERIMENT</span>
    </div>
  );
}
