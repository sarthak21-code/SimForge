"use client";
import { useEffect, useRef } from "react";
import { SimSpec } from "@/lib/ai/schema";

type Props = {
  spec: SimSpec;
  params: Record<string, number | boolean | string>;
};

export function GraphPanel({ spec, params }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const simTimeRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const animRef = useRef<number>(0);

  const template = spec.template;

  useEffect(() => {
    // Reset data points when params or spec change
    dataHistoryRef.current = [];
    simTimeRef.current = 0;
    lastTimeRef.current = Date.now();
  }, [spec.template, params.angle, params.velocity, params.gravity, params.length, params.frequency, params.wavelength, params.amplitude, params.distance, params.centralMass]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    function renderGraph() {
      if (!running || !canvas || !ctx) return;

      const now = Date.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = now;

      const isPaused = Boolean(params.paused);
      if (!isPaused) {
        simTimeRef.current += dt;
      }
      const t = simTimeRef.current;

      const W = canvas.width;
      const H = canvas.height;

      // Sample simulation-specific data
      let sampleY = 0;
      let xLabel = "Time (s)";
      let yLabel = "Value";
      let graphTitle = "Live Telemetry";
      let maxY = 100;
      let minY = 0;

      if (template === "projectile") {
        xLabel = "Time (s)";
        yLabel = "Height (m)";
        graphTitle = "Height vs. Time";
        const v0 = Number(params.velocity || 50);
        const ang = (Number(params.angle || 45) * Math.PI) / 180;
        const g = Number(params.gravity || 9.8);
        const tFlight = (2 * v0 * Math.sin(ang)) / g;
        const currentT = tFlight > 0 ? (t % (tFlight + 0.5)) : 0;
        sampleY = Math.max(0, v0 * Math.sin(ang) * currentT - 0.5 * g * currentT * currentT);
        const hMax = (v0 * v0 * Math.sin(ang) * Math.sin(ang)) / (2 * g);
        maxY = Math.max(10, hMax * 1.25);
        minY = 0;
      } else if (template === "pendulum") {
        xLabel = "Time (s)";
        yLabel = "Angle (deg)";
        graphTitle = "Angular Displacement vs. Time";
        const L = Number(params.length || 150) / 100;
        const g = Number(params.gravity || 9.8);
        const damp = Number(params.damping || 0.01);
        const theta0 = Number(params.angle || 30);
        const period = 2 * Math.PI * Math.sqrt(L / g);
        sampleY = theta0 * Math.exp(-damp * t) * Math.cos((2 * Math.PI * t) / period);
        maxY = Math.max(10, Math.abs(theta0) * 1.2);
        minY = -maxY;
      } else if (template === "wave") {
        xLabel = "Position x (px)";
        yLabel = "Displacement y (px)";
        graphTitle = "Wave Profile: y(x)";
        const amp = Number(params.amplitude || 80);
        maxY = Math.max(20, amp * 1.3);
        minY = -maxY;
      } else if (template === "orbit") {
        xLabel = "Time (s)";
        yLabel = "Radial Distance r (px)";
        graphTitle = "Orbital Distance vs. Time";
        const d0 = Number(params.distance || 140);
        const v0 = Number(params.velocity || 50);
        // Harmonic radial fluctuation around semi-major axis
        const eccFactor = Math.abs(v0 - 50) / 60;
        sampleY = d0 * (1 + eccFactor * Math.sin(t * 1.8));
        maxY = Math.max(150, d0 * 1.8);
        minY = Math.max(0, d0 * 0.4);
      }

      // Record point periodically
      if (template !== "wave" && !isPaused) {
        dataHistoryRef.current.push({ x: t, y: sampleY });
        if (dataHistoryRef.current.length > 200) {
          dataHistoryRef.current.shift();
        }
      }

      // Draw Graph Canvas
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, W, H);

      // Graph frame box
      const padL = 60, padR = 25, padT = 32, padB = 35;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      // Grid lines
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);

      // Horizontal grid lines
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const gy = padT + (plotH / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(padL, gy);
        ctx.lineTo(padL + plotW, gy);
        ctx.stroke();

        const val = maxY - ((maxY - minY) / gridSteps) * i;
        ctx.fillStyle = "#64748b";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(1), padL - 8, gy + 3);
      }
      ctx.setLineDash([]);

      // Axes lines
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT + plotH);
      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.stroke();

      // Zero baseline if minY < 0 < maxY
      if (minY < 0 && maxY > 0) {
        const zeroY = padT + ((maxY - 0) / (maxY - minY)) * plotH;
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padL, zeroY);
        ctx.lineTo(padL + plotW, zeroY);
        ctx.stroke();
      }

      // Title & Labels
      ctx.textAlign = "left";
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(graphTitle, padL, 20);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(xLabel, padL + plotW / 2, H - 8);

      ctx.save();
      ctx.translate(16, padT + plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();

      // Plot data
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      if (template === "wave") {
        // Draw spatial snapshot of the wave
        const amp = Number(params.amplitude || 80);
        const freq = Number(params.frequency || 1);
        const wlen = Number(params.wavelength || 200);
        const spd = Number(params.speed || 1);
        const k = (2 * Math.PI) / wlen;
        const phase = 2 * Math.PI * freq * spd * t;

        for (let px = 0; px <= plotW; px += 2) {
          const worldX = (px / plotW) * 800;
          const yVal = amp * Math.sin(k * worldX - phase);
          const canvasY = padT + ((maxY - yVal) / (maxY - minY)) * plotH;
          if (px === 0) ctx.moveTo(padL + px, canvasY);
          else ctx.lineTo(padL + px, canvasY);
        }
        ctx.stroke();
      } else {
        // Draw streaming time series
        const pts = dataHistoryRef.current;
        if (pts.length > 1) {
          const minT = pts[0].x;
          const maxT = Math.max(pts[pts.length - 1].x, minT + 0.1);

          for (let i = 0; i < pts.length; i++) {
            const normX = (pts[i].x - minT) / (maxT - minT);
            const normY = (pts[i].y - minY) / (maxY - minY);
            const cx = padL + normX * plotW;
            const cy = padT + (1 - Math.max(0, Math.min(1, normY))) * plotH;
            if (i === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
          }
          ctx.stroke();

          // Live tracer dot on latest point
          const lastPt = pts[pts.length - 1];
          const lastNormY = (lastPt.y - minY) / (maxY - minY);
          const dotY = padT + (1 - Math.max(0, Math.min(1, lastNormY))) * plotH;
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(padL + plotW, dotY, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(renderGraph);
    }

    renderGraph();

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [template, params]);

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
          Simulation graph
        </h3>
        <span className="text-xs text-slate-500 font-mono">Real-time Stream</span>
      </div>
      <canvas
        ref={canvasRef}
        width={700}
        height={190}
        aria-label={`${spec.title} live graph`}
        role="img"
        className="w-full rounded bg-slate-950 border border-slate-800"
      />
    </div>
  );
}
