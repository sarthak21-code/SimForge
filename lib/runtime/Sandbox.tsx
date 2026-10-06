"use client";
import { useEffect, useRef, useState } from "react";
import { SimSpec } from "@/lib/ai/schema";

type Props = {
  spec: SimSpec;
  params: Record<string, number | boolean | string>;
};

export function Sandbox({ spec, params }: Props) {
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
        // eslint-disable-next-line no-new-func
        const fn = new Function("params", "ctx", "Date", spec.simulationCode);
        fn(params, ctx, Date);
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