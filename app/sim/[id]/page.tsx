"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SimSpec } from "@/lib/ai/schema";
import { Sandbox } from "@/lib/runtime/Sandbox";
import { Controls } from "@/components/Controls";
import { GraphPanel } from "@/components/GraphPanel";
import { DataPanel } from "@/components/DataPanel";
import { ModifyPanel } from "@/components/ModifyPanel";
import { LearnSection } from "@/components/LearnSection";

export default function SimPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spec, setSpec] = useState<SimSpec | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Save & Share status
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(id === "current" ? null : id);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (id === "current") {
          const raw = sessionStorage.getItem("currentSim");
          if (raw) {
            const parsed = JSON.parse(raw) as SimSpec & { id?: string };
            setSpec(parsed);
            if (parsed.id) setCurrentId(parsed.id);
            const defaults: Record<string, any> = {};
            parsed.controls.forEach((c) => (defaults[c.id] = c.default));
            setParams(defaults);
          } else {
            setError("No simulation found. Please generate one first.");
          }
        } else {
          const res = await fetch(`/api/sims/${id}`);
          if (!res.ok) throw new Error("Simulation not found");
          const data = await res.json();
          const simSpec: SimSpec = data.spec;
          setSpec(simSpec);
          setCurrentId(id);
          const defaults: Record<string, any> = {};
          simSpec.controls.forEach((c) => (defaults[c.id] = c.default));
          setParams(defaults);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load simulation.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Handle Modify/Remix parameter updates
  function handleApplyModification(newOverrides: Record<string, any>, updatedSpec: SimSpec) {
    setParams((prev) => ({ ...prev, ...newOverrides }));
    setSpec(updatedSpec);
    sessionStorage.setItem("currentSim", JSON.stringify({ ...updatedSpec, id: currentId }));
  }

  // Handle Save
  async function handleSave() {
    if (!spec) return;
    setSaveLoading(true);
    setSaveSuccess(null);

    // Save spec with current active parameters embedded as defaults
    const specToSave: SimSpec = {
      ...spec,
      controls: spec.controls.map((c) => ({
        ...c,
        default: params[c.id] !== undefined ? params[c.id] : c.default,
      })),
    };

    try {
      const res = await fetch("/api/sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: spec.title,
          query: spec.description,
          spec: specToSave,
          is_public: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setCurrentId(data.id);
      setSaveSuccess("Simulation saved to Gallery!");
      sessionStorage.setItem("currentSim", JSON.stringify({ ...specToSave, id: data.id }));
      // Transition URL if currently at /sim/current
      if (id === "current") {
        router.replace(`/sim/${data.id}`);
      }
    } catch (err: any) {
      alert("Failed to save simulation: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  }

  // Handle Share
  async function handleShare() {
    let targetUrl = window.location.href;

    // If unsaved /sim/current, save first to get permanent shareable ID
    if (!currentId || id === "current") {
      setSaveLoading(true);
      try {
        const specToSave: SimSpec = {
          ...spec!,
          controls: spec!.controls.map((c) => ({
            ...c,
            default: params[c.id] !== undefined ? params[c.id] : c.default,
          })),
        };
        const res = await fetch("/api/sims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: spec!.title,
            query: spec!.description,
            spec: specToSave,
            is_public: true,
          }),
        });
        const data = await res.json();
        if (data.id) {
          setCurrentId(data.id);
          targetUrl = `${window.location.origin}/sim/${data.id}`;
          router.replace(`/sim/${data.id}`);
        }
      } catch {
        // Fallback to current URL
      } finally {
        setSaveLoading(false);
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: spec?.title || "SimForge Simulation",
          text: spec?.description || "Explore this interactive simulation on SimForge",
          url: targetUrl,
        });
        setShareSuccess("Shared!");
        setTimeout(() => setShareSuccess(null), 3000);
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(targetUrl);
      setShareSuccess("Link copied to clipboard!");
      setTimeout(() => setShareSuccess(null), 3000);
    } catch {
      prompt("Copy simulation link:", targetUrl);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading simulation...</p>
        </div>
      </main>
    );
  }

  if (error || !spec) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error || "Simulation not found."}</p>
          <a href="/create" className="px-4 py-2 bg-blue-600 rounded-lg">Create New</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
              <a href="/" className="hover:text-white transition">← Home</a>
              <span className="text-slate-600">/</span>
              <a href="/gallery" className="hover:text-white transition">Gallery</a>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300 font-mono">
                {currentId ? `sim/${currentId.slice(0, 8)}...` : "current"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{spec.title}</h1>
              <span className="px-2 py-0.5 bg-blue-900/40 text-blue-400 text-xs font-semibold rounded uppercase tracking-wider border border-blue-800/40">
                {spec.template || spec.domain}
              </span>
            </div>
            <p className="text-slate-400 mt-1 text-sm max-w-3xl">{spec.description}</p>
          </div>

          {/* Action buttons: Save & Share */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
            >
              <span>💾</span>
              <span>{saveLoading ? "Saving..." : "Save Simulation"}</span>
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center gap-1.5"
            >
              <span>🔗</span>
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Save/Share success notifications */}
        {saveSuccess && (
          <div className="p-3 bg-green-950/40 border border-green-700 rounded-lg text-green-300 text-sm flex items-center justify-between">
            <span>✅ {saveSuccess}</span>
            <button onClick={() => setSaveSuccess(null)} className="text-green-500 hover:text-green-300">✕</button>
          </div>
        )}
        {shareSuccess && (
          <div className="p-3 bg-cyan-950/40 border border-cyan-700 rounded-lg text-cyan-300 text-sm flex items-center justify-between">
            <span>📋 {shareSuccess}</span>
            <button onClick={() => setShareSuccess(null)} className="text-cyan-500 hover:text-cyan-300">✕</button>
          </div>
        )}

        {/* Primary Simulation Area: Canvas & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Sandbox spec={spec} params={params} />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4 pb-2 border-b border-slate-800">
              Interactive Controls
            </h3>
            <Controls
              controls={spec.controls}
              values={params}
              onChange={(cid, v) => setParams((prev) => ({ ...prev, [cid]: v }))}
            />
          </div>
        </div>

        {/* Live Physical Data Panel */}
        <DataPanel spec={spec} params={params} />

        {/* Live Telemetry Graph */}
        <GraphPanel spec={spec} params={params} />

        {/* Modify with AI / Remix Panel */}
        <ModifyPanel
          spec={spec}
          currentParams={params}
          onApplyModification={handleApplyModification}
        />

        {/* Comprehensive Learn Section (Explanations, Variables, Equations, Socratic Questions, Challenge) */}
        <LearnSection spec={spec} params={params} />
      </div>
    </main>
  );
}