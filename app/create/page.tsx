"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const sim = await res.json();
      // Store in sessionStorage for now (we'll add DB later)
      sessionStorage.setItem("currentSim", JSON.stringify(sim));
      router.push("/sim/current");
    } catch (err) {
      alert("Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-6">What do you want to explore?</h1>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Explain projectile motion with air resistance"
          className="w-full h-32 p-4 bg-slate-900 border border-slate-700 rounded-lg resize-none focus:border-blue-500 outline-none"
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-lg font-semibold"
        >
          {loading ? "Generating simulation..." : "Generate Simulation"}
        </button>
      </div>
    </main>
  );
}