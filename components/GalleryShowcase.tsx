import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* Deterministic sine path helper (server-rendered, no hydration concerns). */
function wave(amp: number, cycles: number, phase: number, mid = 56, width = 200, steps = 64) {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * width;
    const y = mid - amp * Math.sin((x / width) * cycles * Math.PI * 2 + phase);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

const ART_CLASS = "h-full w-full";

function ProjectileArt() {
  return (
    <svg viewBox="0 0 200 112" className={ART_CLASS} fill="none" strokeLinecap="round" aria-hidden="true">
      <path d="M12 92h176" stroke="#7c8cff" strokeOpacity=".3" />
      <path d="M28 92Q100 -20 172 92" stroke="#8b9dff" strokeWidth="1.6" />
      <path d="M28 92Q100 -20 172 92" stroke="#a855f7" strokeWidth="5" strokeOpacity=".18" />
      <circle cx="28" cy="92" r="4" fill="#a78bfa" />
      <circle cx="100" cy="36" r="4.5" fill="#67e8f9" />
      <circle cx="172" cy="92" r="3" stroke="#67e8f9" />
      <path d="M28 92l22-26" stroke="#c4b5fd" strokeOpacity=".7" />
    </svg>
  );
}

function DistributionArt() {
  const heights = [8, 14, 26, 42, 58, 66, 56, 40, 24, 12, 6];
  return (
    <svg viewBox="0 0 200 112" className={ART_CLASS} fill="none" aria-hidden="true">
      {heights.map((h, i) => (
        <rect key={i} x={22 + i * 14.5} y={94 - h} width="10" height={h} rx="2" fill="#6366f1" fillOpacity={0.25 + (h / 66) * 0.45} />
      ))}
      <path d="M22 94C54 94 70 30 100 30S146 94 178 94" stroke="#67e8f9" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 94h172" stroke="#7c8cff" strokeOpacity=".3" />
    </svg>
  );
}

function PendulumArt() {
  return (
    <svg viewBox="0 0 200 112" className={ART_CLASS} fill="none" strokeLinecap="round" aria-hidden="true">
      <path d="M70 14h60" stroke="#7c8cff" strokeOpacity=".5" strokeWidth="2" />
      <path d="M61 72A68 68 0 0 0 139 72" stroke="#8b9dff" strokeOpacity=".4" strokeDasharray="3 4" transform="translate(0 0)" />
      <path d="M100 14L139 72" stroke="#c4b5fd" strokeWidth="1.4" />
      <path d="M100 14L61 72" stroke="#c4b5fd" strokeOpacity=".25" />
      <circle cx="61" cy="72" r="7" fill="#a78bfa" fillOpacity=".25" />
      <circle cx="139" cy="72" r="8" fill="#a78bfa" />
      <circle cx="139" cy="72" r="14" fill="#a855f7" fillOpacity=".18" />
      <circle cx="100" cy="14" r="3" fill="#67e8f9" />
    </svg>
  );
}

function AlgorithmArt() {
  const nodes: [number, number][] = [[30, 56], [70, 24], [70, 88], [114, 56], [150, 24], [162, 88]];
  const edges: [number, number][] = [[0, 1], [0, 2], [1, 3], [2, 3], [1, 4], [3, 4], [3, 5], [2, 5]];
  const path = new Set(["0-1", "1-3", "3-5"]);
  return (
    <svg viewBox="0 0 200 112" className={ART_CLASS} fill="none" strokeLinecap="round" aria-hidden="true">
      {edges.map(([a, b]) => {
        const on = path.has(`${a}-${b}`);
        return (
          <line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={on ? "#67e8f9" : "#7c8cff"} strokeOpacity={on ? 0.95 : 0.35} strokeWidth={on ? 1.8 : 1} />
        );
      })}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 || i === 5 ? 6 : 4.5} fill={[0, 1, 3, 5].includes(i) ? "#67e8f9" : "#a78bfa"} fillOpacity={[0, 1, 3, 5].includes(i) ? 0.95 : 0.6} />
      ))}
    </svg>
  );
}

function WaveArt() {
  return (
    <svg viewBox="0 0 200 112" className={ART_CLASS} fill="none" strokeLinecap="round" aria-hidden="true">
      <path d={wave(20, 2, 0)} stroke="#67e8f9" strokeOpacity=".5" />
      <path d={wave(20, 2.6, 1.2)} stroke="#a78bfa" strokeOpacity=".5" />
      <path d={wave(28, 2.3, 0.6)} stroke="#c4b5fd" strokeWidth="1.8" />
      <path d={wave(28, 2.3, 0.6)} stroke="#a855f7" strokeWidth="6" strokeOpacity=".15" />
    </svg>
  );
}

function SystemArt() {
  return (
    <svg viewBox="0 0 200 112" className={ART_CLASS} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="22" y="40" width="50" height="30" rx="7" stroke="#8b9dff" fill="#6366f1" fillOpacity=".15" />
      <rect x="128" y="40" width="50" height="30" rx="7" stroke="#67e8f9" fill="#22d3ee" fillOpacity=".12" />
      <rect x="75" y="82" width="50" height="22" rx="7" stroke="#c4b5fd" fill="#a855f7" fillOpacity=".15" />
      <path d="M72 55h56" stroke="#8b9dff" />
      <path d="m122 50 6 5-6 5" stroke="#8b9dff" />
      <path d="M153 70v22h-28" stroke="#c4b5fd" strokeOpacity=".8" />
      <path d="M75 93H47V70" stroke="#c4b5fd" strokeOpacity=".8" />
      <path d="m42 76 5-6 5 6" stroke="#c4b5fd" strokeOpacity=".8" />
      <path d="M100 14v18" stroke="#67e8f9" strokeOpacity=".5" strokeDasharray="2 4" />
      <circle cx="100" cy="12" r="3" fill="#67e8f9" />
    </svg>
  );
}

const TILES = [
  { title: "Projectile Motion", domain: "Physics", art: <ProjectileArt /> },
  { title: "Data Distribution", domain: "Data", art: <DistributionArt /> },
  { title: "Pendulum", domain: "Mechanics", art: <PendulumArt /> },
  { title: "Algorithm Visualization", domain: "Algorithms", art: <AlgorithmArt /> },
  { title: "Wave Simulation", domain: "Waves", art: <WaveArt /> },
  { title: "System Model", domain: "Systems", art: <SystemArt /> },
];

export function GalleryShowcase() {
  return (
    <section aria-labelledby="breadth-heading" className="relative">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[.24em] text-indigo-300">ONE ENGINE, EVERY DOMAIN</p>
          <h2 id="breadth-heading" className="text-2xl font-semibold tracking-[-.03em] text-slate-100 md:text-3xl">
            From orbits to organisms to algorithms
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            If it can be modelled, it can be explored.
          </p>
        </div>
        <Link
          href="/gallery"
          className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.03] px-4 py-2 text-sm text-slate-200 backdrop-blur-md transition hover:border-indigo-300/40 hover:bg-white/[.07]"
        >
          View gallery
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {TILES.map((tile) => (
          <li key={tile.title}>
            <Link
              href="/gallery"
              className="group block overflow-hidden rounded-2xl border border-white/[.08] bg-[#060818]/70 transition hover:-translate-y-0.5 hover:border-indigo-300/30 hover:shadow-[0_12px_40px_-16px_rgba(99,102,241,.5)]"
            >
              <div className="simulation-artwork aspect-[16/9] p-3">{tile.art}</div>
              <div className="flex items-center justify-between gap-2 border-t border-white/[.06] px-4 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-tight text-slate-100">{tile.title}</h3>
                  <p className="text-xs text-slate-500">{tile.domain}</p>
                </div>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-indigo-300 sm:block" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
