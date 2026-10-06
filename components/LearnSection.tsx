"use client";
import { SimSpec } from "@/lib/ai/schema";
import { TutorPanel } from "./TutorPanel";
import { ChallengeMode } from "./ChallengeMode";

type Props = {
  spec: SimSpec;
  params: Record<string, any>;
};

export function LearnSection({ spec, params }: Props) {
  const template = spec.template;

  const educationalData: Record<
    string,
    {
      shortExplanation: string;
      variables: { symbol: string; name: string; meaning: string }[];
      equations: { name: string; formula: string; note: string }[];
      whatIsHappening: string;
    }
  > = {
    projectile: {
      shortExplanation:
        "Projectile motion describes the path of an object thrown into the air, moving under the influence of gravity and initial velocity.",
      variables: [
        { symbol: "θ", name: "Launch Angle", meaning: "Direction of initial launch velocity vector" },
        { symbol: "v₀", name: "Initial Velocity", meaning: "Starting launch speed of the projectile" },
        { symbol: "g", name: "Gravity", meaning: "Downwards acceleration due to gravity" },
        { symbol: "R", name: "Range", meaning: "Total horizontal distance traveled" },
        { symbol: "H", name: "Max Height", meaning: "Apex elevation reached during trajectory" },
      ],
      equations: [
        {
          name: "Horizontal Range",
          formula: "R = (v₀² · sin(2θ)) / g",
          note: "Maximum range occurs at θ = 45° without air drag.",
        },
        {
          name: "Maximum Height",
          formula: "H = (v₀² · sin²(θ)) / (2g)",
          note: "Vertical kinetic energy converts completely into potential energy at apex.",
        },
        {
          name: "Total Flight Time",
          formula: "T = (2 · v₀ · sin(θ)) / g",
          note: "Time until the projectile returns to its starting elevation.",
        },
      ],
      whatIsHappening:
        "The projectile follows a parabolic trajectory. The horizontal velocity remains constant (neglecting air resistance) while vertical velocity decelerates under gravity, reaches zero at the apex, and accelerates downward until impact.",
    },
    pendulum: {
      shortExplanation:
        "A simple pendulum consists of a mass bob suspended from a pivot by a lightweight string, oscillating periodically under gravity.",
      variables: [
        { symbol: "L", name: "Length", meaning: "Distance from pivot to bob center of mass" },
        { symbol: "θ", name: "Angle", meaning: "Angular displacement from vertical equilibrium" },
        { symbol: "g", name: "Gravity", meaning: "Local gravitational acceleration constant" },
        { symbol: "T", name: "Period", meaning: "Time required to complete one full back-and-forth oscillation" },
        { symbol: "γ", name: "Damping", meaning: "Viscous resistance reducing oscillation amplitude" },
      ],
      equations: [
        {
          name: "Period (Small-Angle)",
          formula: "T = 2π · √(L / g)",
          note: "Notice the period depends solely on length and gravity, independent of mass.",
        },
        {
          name: "Angular Frequency",
          formula: "ω = √(g / L)",
          note: "Rate of oscillation in radians per second.",
        },
      ],
      whatIsHappening:
        "Gravitational torque continuously accelerates the bob toward the central equilibrium position. Because inertia carries it past the center, energy continuously alternates between gravitational potential energy at the peaks and kinetic energy at the bottom.",
    },
    wave: {
      shortExplanation:
        "A traveling sinusoidal wave transfers energy through space via continuous harmonic oscillations without permanent displacement of matter.",
      variables: [
        { symbol: "A", name: "Amplitude", meaning: "Maximum displacement from equilibrium position" },
        { symbol: "f", name: "Frequency", meaning: "Number of full oscillation cycles per second (Hz)" },
        { symbol: "λ", name: "Wavelength", meaning: "Spatial distance between two consecutive wave peaks" },
        { symbol: "v", name: "Wave Speed", meaning: "Propagation speed of wave crests through space" },
        { symbol: "T", name: "Period", meaning: "Temporal duration of one complete wave cycle (1/f)" },
      ],
      equations: [
        {
          name: "Wave Speed Relation",
          formula: "v = f · λ",
          note: "Wave speed is the direct product of temporal frequency and spatial wavelength.",
        },
        {
          name: "Wave Function",
          formula: "y(x, t) = A · sin(k·x - ω·t)",
          note: "where wavenumber k = 2π/λ and angular frequency ω = 2π·f.",
        },
      ],
      whatIsHappening:
        "Each coordinate along the medium executes vertical simple harmonic motion with phase proportional to position. As phase continuously advances with time, wave crests appear to travel across the screen from left to right.",
    },
    orbit: {
      shortExplanation:
        "Planetary orbits result from the balance between the planet's forward tangential inertia and the star's inward gravitational attraction.",
      variables: [
        { symbol: "M", name: "Central Mass", meaning: "Mass of the central star creating gravitational field" },
        { symbol: "r", name: "Orbital Radius", meaning: "Distance between planet and star centers" },
        { symbol: "v", name: "Orbital Velocity", meaning: "Instantaneous tangential velocity vector" },
        { symbol: "v_circ", name: "Circular Speed", meaning: "Exact velocity for a circular orbit: √(GM/r)" },
        { symbol: "v_esc", name: "Escape Speed", meaning: "Velocity required to overcome gravity: √(2) · v_circ" },
      ],
      equations: [
        {
          name: "Newton's Gravitational Force",
          formula: "F = G · (M · m) / r²",
          note: "Inverse-square law: doubling distance quarters the gravitational attraction.",
        },
        {
          name: "Circular Orbital Speed",
          formula: "v_circ = √(G · M / r)",
          note: "Planet mass m cancels out because inertia and gravity both scale with m.",
        },
        {
          name: "Escape Velocity",
          formula: "v_esc = √(2 · G · M / r)",
          note: "Parabolic trajectory threshold beyond which the planet never returns.",
        },
      ],
      whatIsHappening:
        "The planet constantly 'falls' towards the star due to gravitational acceleration, but its tangential velocity causes it to perpetually miss the star, creating a closed elliptical or circular orbit.",
    },
  };

  const edu = educationalData[template] || educationalData.projectile;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>📚</span>
          <span>Learn & Understand</span>
        </h2>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          {edu.shortExplanation}
        </p>
      </div>

      {/* Variables and Equations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variables */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Key Variables
          </h3>
          <ul className="space-y-2.5">
            {edu.variables.map((v) => (
              <li key={v.symbol} className="text-xs flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 font-mono font-bold shrink-0">
                  {v.symbol}
                </span>
                <div>
                  <span className="font-semibold text-slate-200">{v.name}:</span>{" "}
                  <span className="text-slate-400">{v.meaning}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Equations */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Governing Equations
          </h3>
          <div className="space-y-3">
            {edu.equations.map((eq) => (
              <div key={eq.name} className="border-b border-slate-800/80 last:border-0 pb-2">
                <p className="text-xs font-semibold text-slate-300">{eq.name}</p>
                <p className="text-sm font-mono text-cyan-300 bg-slate-900/80 px-2 py-1 rounded my-1">
                  {eq.formula}
                </p>
                <p className="text-[11px] text-slate-400">{eq.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What is happening description */}
      <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
          <span>💡</span> What is happening in this simulation?
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {edu.whatIsHappening}
        </p>
      </div>

      {/* Socratic Questions */}
      {spec.socraticQuestions && spec.socraticQuestions.length > 0 && (
        <div className="pt-2">
          <TutorPanel questions={spec.socraticQuestions} />
        </div>
      )}

      {/* Challenge Mode */}
      {spec.challenge && (
        <div className="pt-2">
          <ChallengeMode challenge={spec.challenge} params={params} spec={spec} />
        </div>
      )}
    </div>
  );
}
