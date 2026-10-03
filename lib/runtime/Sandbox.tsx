"use client";
import { useEffect, useRef } from "react";
import { SimSpec, Control } from "@/lib/ai/schema";

type Props = {
  spec: SimSpec;
  params: Record<string, number | boolean | string>;
};

export function Sandbox({ spec, params }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      // Wrap the AI-generated code in a function with sandboxed scope
      const fn = new Function("params", "ctx", spec.simulationCode);
      fn(params, ctx);
    } catch (err) {
      console.error("Simulation error:", err);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, 800, 500);
      ctx.fillStyle = "#ef4444";
      ctx.font = "20px sans-serif";
      ctx.fillText("Simulation error. Try adjusting parameters.", 40, 60);
    }
  }, [spec, params]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={500}
      className="rounded-lg border border-slate-700 w-full"
    />
  );
}