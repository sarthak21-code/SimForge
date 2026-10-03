"use client";
import { useEffect, useState } from "react";
import { SimSpec } from "@/lib/ai/schema";
import { Sandbox } from "@/lib/runtime/Sandbox";
import { Controls } from "@/components/Controls";
import { TutorPanel } from "@/components/TutorPanel";

export default function SimPage() {
  const [spec, setSpec] = useState<SimSpec | null>(null);
  const [params, setParams] = useState<Record<string, any>>({});

  useEffect(() => {
    const raw = sessionStorage.getItem("currentSim");
    if (raw) {
      const parsed = JSON.parse(raw) as SimSpec;
      setSpec(parsed);
      const defaults: Record<string, any> = {};
      parsed.controls.forEach((c) => (defaults[c.id] = c.default));
      setParams(defaults);
    }
  }, []);

  if (!spec) return <div className="p-10 text-white">Loading...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">{spec.title}</h1>
        <p className="text-slate-400 mt-1">{spec.description}</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <Sandbox spec={spec} params={params} />
          </div>
          <div className="space-y-6">
            <Controls
              controls={spec.controls}
              values={params}
              onChange={(id, v) => setParams({ ...params, [id]: v })}
            />
          </div>
        </div>

        <div className="mt-8">
          <TutorPanel questions={spec.socraticQuestions} />
        </div>
      </div>
    </main>
  );
}