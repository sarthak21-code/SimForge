"use client";
import { useEffect, useRef, useState } from "react";
import { SimSpec } from "@/lib/ai/schema";
import { projectileTemplate } from "@/lib/runtime/templates/projectile";

type Props = {
  spec: SimSpec;
  params: Record<string, number | boolean | string>;
};

export function Sandbox({ spec, params }: Props) {
  const codeWithoutComments = spec.simulationCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  const hasCanvasDrawing = /\bctx\s*\.\s*(?:fillRect|clearRect|strokeRect|fillText|strokeText|beginPath|moveTo|lineTo|arc|ellipse|quadraticCurveTo|bezierCurveTo|fill|stroke)\s*\(/.test(codeWithoutComments);
  const useProjectileFallback = spec.template === "projectile" && !hasCanvasDrawing;
  const simulationCode = useProjectileFallback ? projectileTemplate.simulationCode : spec.simulationCode;
  const simulationParams = useProjectileFallback
    ? {
        ...params,
        angle: findNumericControl(/angle/i, "angle", 45),
        velocity: findNumericControl(/velocity|speed/i, "velocity", 50),
        gravity: findNumericControl(/gravity/i, "gravity", 9.8),
      }
    : params;

  function findNumericControl(pattern: RegExp, canonicalId: string, fallback: number) {
    const directValue = params[canonicalId];
    if (typeof directValue === "number") return directValue;

    const control = spec.controls.find(({ id, label }) => pattern.test(`${id} ${label}`));
    const value = control ? params[control.id] : undefined;
    return typeof value === "number" ? value : fallback;
  }
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setSimError(null);

    // Cancel any previous animation loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    let running = true;

    function drawFrame() {
      if (!running || !ctx) return;
      try {
        if (spec.template === "custom") {
          if (!spec.simulationCode.trim()) {
            throw new Error("Custom simulation is missing runnable simulationCode.");
          }
          if (/\bdocument\b|\bwindow\b|\bfetch\b|\beval\s*\(|\bimport\b|\bcanvas\s*\.\s*getContext\s*\(/i.test(spec.simulationCode)) {
            throw new Error("Custom simulationCode uses an unsupported browser or network API.");
          }
          if (!/\bctx\s*\.\s*(?:fillRect|clearRect|strokeRect|fillText|strokeText|beginPath|moveTo|lineTo|arc|ellipse|quadraticCurveTo|bezierCurveTo|fill|stroke)\s*\(/.test(spec.simulationCode)) {
            throw new Error("Custom simulationCode does not draw a Canvas 2D visualization.");
          }
        }
        // eslint-disable-next-line no-new-func
        const fn = new Function("params", "ctx", "Date", simulationCode);
        fn(simulationParams, ctx, Date);
      } catch (err) {
        running = false;
        const errorMsg = err instanceof Error ? err.message : String(err);
        setSimError(errorMsg);
        ctx!.fillStyle = "#0f172a";
        ctx!.fillRect(0, 0, 800, 500);
        ctx!.fillStyle = "#ef4444";
        ctx!.font = "16px sans-serif";
        ctx!.fillText("Simulation error: " + errorMsg.slice(0, 60), 20, 60);
        return;
      }
      animFrameRef.current = requestAnimationFrame(drawFrame);
    }

    drawFrame();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [spec, params]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        className="rounded-lg border border-slate-700 w-full"
      />
      {simError && (
        <div className="absolute bottom-2 left-2 right-2 bg-red-900/80 text-red-200 text-xs p-2 rounded">
          ⚠ {simError}
        </div>
      )}
    </div>
  );
}
