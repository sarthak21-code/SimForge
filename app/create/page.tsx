"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate(overrideQuery?: string) {
    const rawQuery = overrideQuery || query;
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const sim = body;

      // Always persist in sessionStorage so sim/current works immediately
      sessionStorage.setItem("currentSim", JSON.stringify(sim));

      // Navigate to saved DB ID if returned, else /sim/current
      if (sim.id) {
        router.push(`/sim/${sim.id}`);
      } else {
        router.push("/sim/current");
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const exampleCategories = [
    {
      type: "Projectile",
      icon: "🚀",
      prompts: [
        "Show a ball thrown at 45 degrees.",
        "Show a projectile launched at 60 degrees with speed 70 m/s.",
        "Projectile motion on the Moon with low gravity.",
      ],
    },
    {
      type: "Wave",
      icon: "🌊",
      prompts: [
        "Create a sine wave with high frequency.",
        "Create a wave with high frequency and low amplitude.",
        "Fast traveling wave with long wavelength.",
      ],
    },
    {
      type: "Orbit",
      icon: "🪐",
      prompts: [
        "Show a planet orbiting the Sun.",
        "Show a planet orbiting with high velocity.",
        "Planet orbiting a massive star at large distance.",
      ],
    },
    {
      type: "Pendulum",
      icon: "⏱️",
      prompts: [
        "Create a pendulum with a long string.",
        "Show a pendulum with a large starting angle.",
        "Pendulum on Mars with no damping.",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 sm:px-6 py-12">
      <div className="max-w-2xl w-full space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <a href="/" className="text-slate-400 hover:text-white text-xs transition flex items-center gap-1">
            <span>←</span> Back to Home
          </a>
          <a href="/gallery" className="text-slate-400 hover:text-white text-xs transition">
            Explore Gallery →
          </a>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 border border-blue-800/40 text-blue-400 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            AI Simulation Generator
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            What do you want to simulate?
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Describe any physics scenario in plain English. SimForge identifies the simulation, extracts parameters, and runs it instantly.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleGenerate();
              }
            }}
            placeholder="e.g. 'Show a projectile launched at 60 degrees', 'Create a wave with high frequency', 'Show a planet orbiting with high velocity'..."
            className="w-full h-28 p-3.5 bg-slate-950 border border-slate-700/80 rounded-lg resize-none focus:border-blue-500 outline-none text-white text-sm placeholder:text-slate-500 leading-relaxed"
          />

          <button
            onClick={() => handleGenerate()}
            disabled={loading || !query.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Interpreting prompt & generating simulation...</span>
              </>
            ) : (
              <span>Launch Simulation →</span>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-xs text-center leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Ctrl+Enter</kbd> to launch
          </p>
        </div>

        {/* Example Prompt Categories */}
        <div className="space-y-3 pt-2">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
            Or pick an example scenario:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exampleCategories.map((cat) => (
              <div
                key={cat.type}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <span>{cat.icon}</span>
                  <span>{cat.type}</span>
                </div>
                <div className="space-y-1.5">
                  {cat.prompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setQuery(p);
                        handleGenerate(p);
                      }}
                      className="block w-full text-left text-[11px] text-slate-400 hover:text-blue-300 hover:bg-slate-800/60 px-2 py-1 rounded transition truncate"
                    >
                      • {p}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}