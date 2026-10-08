"use client";
import { useEffect, useState } from "react";
import type { SimSpec } from "@/lib/ai/schema";
import { formatControlValue } from "../lib/ai/learning";

type Props = {
  spec: SimSpec;
  params: Record<string, number | boolean | string>;
};

export function DataPanel({ spec, params }: Props) {
  const [metrics, setMetrics] = useState<Record<string, string>>({});

  const customMetrics = (spec.template === "custom" || spec.template === "supply-demand")
    ? Object.fromEntries(spec.controls.map((control) => {
        const value = params[control.id] ?? control.default;
        const formatted = formatControlValue(control, value);
        return [control.label, formatted];
      }))
    : null;

  useEffect(() => {
    const template = spec.template;

    if (template === "projectile") {
      const v0 = Number(params.velocity || 50);
      const theta = Number(params.angle || 45);
      const rad = (theta * Math.PI) / 180;
      const g = Number(params.gravity || 9.8);
      const tFlight = (2 * v0 * Math.sin(rad)) / g;
      const range = (v0 * v0 * Math.sin(2 * rad)) / g;
      const maxHeight = (v0 * v0 * Math.sin(rad) * Math.sin(rad)) / (2 * g);
      const vx = v0 * Math.cos(rad);
      const vy = v0 * Math.sin(rad);

      setMetrics({
        "Launch Angle": `${theta}°`,
        "Initial Speed": `${v0} m/s`,
        "Max Height (Apex)": `${maxHeight.toFixed(1)} m`,
        "Horizontal Range": `${range.toFixed(1)} m`,
        "Flight Time": `${tFlight.toFixed(2)} s`,
        "Horizontal Velocity": `${vx.toFixed(1)} m/s`,
        "Vertical Velocity": `${vy.toFixed(1)} m/s`,
        Gravity: `${g} m/s²`,
      });
    } else if (template === "pendulum") {
      const L_cm = Number(params.length || 150);
      const L_m = L_cm / 100;
      const g = Number(params.gravity || 9.8);
      const theta0 = Number(params.angle || 30);
      const damping = Number(params.damping || 0.01);
      const period = 2 * Math.PI * Math.sqrt(L_m / g);
      const freq = 1 / period;
      const omega = Math.sqrt(g / L_m);

      setMetrics({
        "Initial Angle": `${theta0}°`,
        "String Length": `${L_cm} cm (${L_m.toFixed(2)} m)`,
        Period: `${period.toFixed(2)} s`,
        Frequency: `${freq.toFixed(2)} Hz`,
        "Angular Speed (ω)": `${omega.toFixed(2)} rad/s`,
        Damping: damping.toString(),
        Gravity: `${g} m/s²`,
      });
    } else if (template === "wave") {
      const amp = Number(params.amplitude || 80);
      const freq = Number(params.frequency || 1);
      const wlen = Number(params.wavelength || 200);
      const spd = Number(params.speed || 1);
      const waveSpeed = freq * wlen * spd;
      const period = freq > 0 ? 1 / freq : 0;
      const wavenumber = ((2 * Math.PI) / wlen).toFixed(4);

      setMetrics({
        Amplitude: `${amp} px`,
        Frequency: `${freq} Hz`,
        Wavelength: `${wlen} px`,
        "Wave Speed (v = fλ)": `${waveSpeed.toFixed(1)} px/s`,
        Period: `${period.toFixed(2)} s`,
        "Wavenumber (k)": `${wavenumber} rad/px`,
        "Speed Multiplier": `${spd}×`,
        State: params.paused ? "Paused ⏸" : "Propagating ▶",
      });
    } else if (template === "orbit") {
      const dist = Number(params.distance || 140);
      const vel = Number(params.velocity || 50);
      const M = Number(params.centralMass || 1000);
      const G = 350;
      const vCirc = Math.sqrt((G * M) / dist);
      const vEsc = Math.sqrt(2) * vCirc;

      let status = "Elliptical (Bound)";
      if (vel >= vEsc) status = "Escape Trajectory";
      else if (Math.abs(vel - vCirc) < 2) status = "Stable Circular Orbit";
      else if (vel < 18) status = "Collision / Decay";

      setMetrics({
        "Orbital Distance": `${dist} px`,
        "Orbital Velocity": `${vel} km/s`,
        "Circular Speed (v_circ)": `${vCirc.toFixed(1)} km/s`,
        "Escape Speed (v_esc)": `${vEsc.toFixed(1)} km/s`,
        "Central Star Mass": `${M} M☉`,
        "Orbital Status": status,
        "Time Scale": `${params.timeScale || 1.0}×`,
      });
    } else if (template === "circuit") {
      const resistance = Number(params.resistance ?? 1000);
      const capacitance = Number(params.capacitance ?? 0.001);
      const voltage = Number(params.voltage ?? 10);
      const time = Math.max(0, Number(params.time ?? 0));
      const tau = Math.max(0, resistance * capacitance);
      const capacitorVoltage = tau > 0
        ? voltage * (1 - Math.exp(-time / tau))
        : time > 0 ? voltage : 0;

      setMetrics({
        "Time Constant (τ = RC)": `${tau.toFixed(4)} s`,
        "Capacitor Voltage": `${capacitorVoltage.toFixed(3)} V`,
        Resistance: `${resistance.toLocaleString()} Ω`,
        Capacitance: `${(capacitance * 1000).toFixed(3)} mF`,
        "Supply Voltage": `${voltage.toFixed(2)} V`,
        Time: `${time.toFixed(2)} s`,
      });
    }
  }, [spec.template, params]);

  const displayedMetrics = customMetrics ?? metrics;
  if ((spec.template === "custom" || spec.template === "supply-demand") && Object.keys(displayedMetrics).length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
          Live measurements
        </h3>
        <span className="text-xs text-slate-500">Live Telemetry</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Object.entries(displayedMetrics).map(([key, val]) => (
          <div key={key} className="min-w-0 rounded-xl border border-white/[.06] bg-slate-950/45 p-3">
            <p className="text-[11px] text-slate-400 truncate">{key}</p>
            <p className="mt-1 truncate font-mono text-sm font-medium text-indigo-200">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
