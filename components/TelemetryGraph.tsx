"use client";

import { useEffect, useRef } from "react";
import {
  drawTelemetryGraph,
  type GraphDefinition,
  type GraphTelemetryRef,
} from "@/lib/runtime/telemetry";

type Props = {
  graph: GraphDefinition;
  telemetryRef: GraphTelemetryRef;
};

export function TelemetryGraph({ graph, telemetryRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let running = true;
    let frame = 0;
    const render = () => {
      if (!running) return;
      drawTelemetryGraph(ctx, graph, telemetryRef.current[graph.id] ?? [], canvas.width, canvas.height);
      frame = requestAnimationFrame(render);
    };

    render();
    return () => {
      running = false;
      cancelAnimationFrame(frame);
    };
  }, [graph, telemetryRef]);

  return (
    <canvas
      ref={canvasRef}
      width={700}
      height={240}
      role="img"
      aria-label={graph.label + ": " + graph.yLabel + " vs " + graph.xLabel}
      className="mt-3 w-full rounded border border-slate-800 bg-slate-950"
    />
  );
}
