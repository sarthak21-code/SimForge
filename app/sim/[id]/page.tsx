"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, FlaskConical, Play, RotateCcw, Save, Share2, Pause, Sparkles } from "lucide-react";
import type { SimSpec } from "@/lib/ai/schema";
import { Sandbox } from "@/lib/runtime/Sandbox";
import { Controls } from "@/components/Controls";
import { GraphPanel } from "@/components/GraphPanel";
import { DataPanel } from "@/components/DataPanel";
import { ModifyPanel } from "@/components/ModifyPanel";
import { LearnSection } from "@/components/LearnSection";
import { ChallengeMode } from "@/components/ChallengeMode";
import { TutorPanel } from "@/components/TutorPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ParamValue = number | boolean | string;

export default function SimPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spec, setSpec] = useState<SimSpec | null>(null);
  const [params, setParams] = useState<Record<string, ParamValue>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(id === "current" ? null : id);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (id === "current") {
          const raw = sessionStorage.getItem("currentSim");
          if (!raw) throw new Error("No simulation found. Please generate one first.");
          const parsed = JSON.parse(raw) as SimSpec & { id?: string };
          setSpec(parsed);
          if (parsed.id) setCurrentId(parsed.id);
          setParams(Object.fromEntries(parsed.controls.map((control) => [control.id, control.default])));
        } else {
          const res = await fetch(`/api/sims/${id}`);
          if (!res.ok) throw new Error("Simulation not found");
          const data = await res.json();
          const simSpec = data.spec as SimSpec;
          setSpec(simSpec);
          setCurrentId(id);
          setParams(Object.fromEntries(simSpec.controls.map((control) => [control.id, control.default])));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load simulation.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleApplyModification(newOverrides: Record<string, ParamValue>, updatedSpec: SimSpec) {
    setParams((prev) => ({ ...prev, ...newOverrides }));
    setSpec(updatedSpec);
    sessionStorage.setItem("currentSim", JSON.stringify({ ...updatedSpec, id: currentId }));
  }

  function savePayload() {
    if (!spec) return null;
    return {
      ...spec,
      controls: spec.controls.map((control) => ({
        ...control,
        default: params[control.id] !== undefined ? params[control.id] : control.default,
      })),
    } satisfies SimSpec;
  }

  async function persistSimulation() {
    const specToSave = savePayload();
    if (!spec || !specToSave) throw new Error("Simulation is not ready to save.");
    const res = await fetch("/api/sims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: spec.title, query: spec.description, spec: specToSave, is_public: true }),
    });
    const data = await res.json();
    if (!res.ok || !data.id) throw new Error(data.error || "Save failed");
    setCurrentId(data.id);
    sessionStorage.setItem("currentSim", JSON.stringify({ ...specToSave, id: data.id }));
    if (id === "current") router.replace(`/sim/${data.id}`);
    return `${window.location.origin}/sim/${data.id}`;
  }

  async function handleSave() {
    if (!spec) return;
    setSaveLoading(true);
    setSaveSuccess(null);
    setActionError(null);
    try {
      await persistSimulation();
      setSaveSuccess("Saved to your public gallery.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save this simulation.");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleShare() {
    if (!spec) return;
    setSaveLoading(true);
    setShareSuccess(null);
    setActionError(null);
    try {
      let targetUrl = window.location.href;
      if (!currentId || id === "current") targetUrl = await persistSimulation();
      if (navigator.share) {
        try {
          await navigator.share({ title: spec.title, text: spec.description, url: targetUrl });
          setShareSuccess("Shared successfully.");
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(targetUrl);
      setShareSuccess("Link copied to clipboard.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not share this simulation.");
    } finally {
      setSaveLoading(false);
      window.setTimeout(() => setShareSuccess(null), 3000);
    }
  }

  function handleReset() {
    if (!spec) return;
    const defaults: Record<string, ParamValue> = Object.fromEntries(
      spec.controls.map((control) => [control.id, control.default])
    );
    const resetControl = spec.controls.find((control) => control.id === "reset");
    if (resetControl) {
      defaults.reset = true;
      window.setTimeout(() => setParams((current) => ({ ...current, reset: false })), 100);
    }
    setParams(defaults);
  }

  function togglePlayback() {
    setParams((current) => ({ ...current, paused: !Boolean(current.paused) }));
  }

  if (loading) return (
    <main className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-300" />
        <p className="text-sm text-slate-400">Preparing your simulation…</p>
      </div>
    </main>
  );

  if (error || !spec) return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6">
      <Card className="w-full p-8 text-center">
        <FlaskConical className="mx-auto mb-4 h-8 w-8 text-indigo-300" />
        <h1 className="text-xl font-semibold text-slate-100">Simulation unavailable</h1>
        <p className="mt-2 text-sm text-slate-400">{error || "Simulation not found."}</p>
        <Link href="/create" className="mt-6 inline-flex"><Button>Create a simulation</Button></Link>
      </Card>
    </main>
  );

  return (
    <main className="mx-auto min-h-screen max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
            <Link href="/gallery" className="inline-flex items-center gap-1 transition hover:text-slate-200"><ArrowLeft size={13} /> Gallery</Link>
            <span>/</span><span className="font-mono">{currentId ? currentId.slice(0, 8) : "unsaved"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">{spec.title}</h1>
            <Badge className="capitalize text-indigo-200">{spec.domain}</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{spec.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saveLoading} aria-label="Save simulation">
            <Save size={15} /> <span className="hidden sm:inline">{saveLoading ? "Saving…" : "Save"}</span>
          </Button>
          <Button onClick={handleShare} disabled={saveLoading} aria-label="Share simulation">
            <Share2 size={15} /> <span className="hidden sm:inline">Share</span>
          </Button>
        </div>
      </div>

      {actionError && <div role="alert" className="mb-5 rounded-xl border border-rose-300/15 bg-rose-300/[.06] px-4 py-3 text-sm text-rose-200">{actionError}</div>}
      {(saveSuccess || shareSuccess) && (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.06] px-4 py-3 text-sm text-emerald-200">
          {shareSuccess?.includes("copied") ? <Copy size={15} /> : <Check size={15} />}{shareSuccess || saveSuccess}
        </div>
      )}

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(300px,.8fr)]" aria-label="Simulation workspace">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,.5)]" />Live simulation</div>
            <div className="flex items-center gap-2">
              {"paused" in params && <Button variant="ghost" size="sm" onClick={togglePlayback} aria-label={params.paused ? "Resume simulation" : "Pause simulation"}>{params.paused ? <Play size={15} /> : <Pause size={15} />}<span className="hidden sm:inline">{params.paused ? "Resume" : "Pause"}</span></Button>}
              <Button variant="ghost" size="sm" onClick={handleReset} aria-label="Reset simulation"><RotateCcw size={15} /><span className="hidden sm:inline">Reset</span></Button>
            </div>
          </div>
          <div className="sim-canvas-wrap p-2 sm:p-3"><Sandbox spec={spec} params={params} /></div>
          <div className="flex items-center justify-between border-t border-white/[.06] px-4 py-2.5 text-[11px] text-slate-500 sm:px-5">
            <span>Adjust a parameter to explore how the system responds.</span>
            <span className="hidden font-mono sm:inline">{spec.template}</span>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between border-b border-white/[.07] pb-4">
            <div><p className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-500">Experiment setup</p><h2 className="mt-1 text-base font-semibold text-slate-100">Parameters</h2></div>
            <FlaskConical size={17} className="text-indigo-300" />
          </div>
          <Controls controls={spec.controls.filter((control) => control.id !== "paused" && control.id !== "reset")} values={params} onChange={(cid, value) => setParams((prev) => ({ ...prev, [cid]: value }))} />
        </Card>
      </section>

      {spec.challenge && <section className="mt-5"><ChallengeMode challenge={spec.challenge} params={params} spec={spec} /></section>}

      <section className="mt-5" aria-label="Live data"><DataPanel spec={spec} params={params} /></section>
      <section className="mt-5" aria-label="Simulation graph"><GraphPanel spec={spec} params={params} /></section>
      <section className="mt-5" aria-label="Modify simulation"><ModifyPanel spec={spec} currentParams={params} onApplyModification={handleApplyModification} /></section>
      {spec.socraticQuestions?.length > 0 && <section className="mt-5"><Card><div className="mb-4 flex items-center gap-2"><Sparkles size={16} className="text-violet-300" /><h2 className="text-base font-semibold text-slate-100">Think it through</h2></div><TutorPanel questions={spec.socraticQuestions} /></Card></section>}
      <section className="mt-5" aria-label="Learn about the simulation"><LearnSection spec={spec} /></section>
    </main>
  );
}
