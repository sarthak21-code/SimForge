"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Command, Loader2 } from "lucide-react";

const EXAMPLES = [
  "Projectile motion with air resistance",
  "How does a pendulum swing?",
  "Supply and demand with a tax",
  "Sorting algorithms visualized",
  "Population growth over time",
  "RC circuit charging curve",
];

export default function CreatePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const sim = await res.json();
      if (!res.ok) throw new Error(sim.error || "Generation failed. Please try again.");
      sessionStorage.setItem("currentSim", JSON.stringify(sim));
      router.push(sim.id ? `/sim/${sim.id}` : "/sim/current");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-3xl mx-auto fade-up">
        <div className="text-center mb-10">
          <Badge className="mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            AI Simulator
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            What do you want to{" "}
            <span className="gradient-text">explore?</span>
          </h1>
          <p className="mt-4 text-slate-400">
            Describe anything. SimForge will build an interactive simulation for you.
          </p>
        </div>

        <Card className="glass-strong p-2">
          <label htmlFor="simulation-prompt" className="sr-only">Describe the simulation you want to explore</label>
          <textarea
            id="simulation-prompt"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate();
            }}
            placeholder="e.g. Explain projectile motion with air resistance..."
            className="w-full h-36 p-5 bg-transparent resize-y outline-none text-slate-100 placeholder:text-slate-500 text-base leading-relaxed focus-visible:ring-0"
            disabled={loading}
          />

          <div className="flex items-center justify-between border-t border-white/5 pt-3 px-2">
            <div className="flex items-center gap-2 text-xs text-slate-500" aria-hidden="true">
              <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 flex items-center gap-1">
                <Command className="w-3 h-3" /> + Enter
              </kbd>
              <span>to generate</span>
            </div>
            <Button onClick={handleGenerate} disabled={loading || !query.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Building simulation…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Simulation
                </>
              )}
            </Button>
          </div>
        </Card>

        {loading && <p role="status" className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-400"><Sparkles className="h-4 w-4 text-indigo-300" />Generating the simulation from your description. This can take a moment.</p>}

        {error && (
          <div role="alert" className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-10">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
            Try one of these
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setQuery(ex)}
                disabled={loading}
                className="px-3 py-1.5 rounded-full text-sm border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-slate-300 transition-all disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
