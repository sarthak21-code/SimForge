import type { SimSpec } from "@/lib/ai/schema";

export const circuitTemplate: SimSpec = {
  title: "RC Circuit Charging Curve",
  domain: "physics",
  description:
    "Explore how a capacitor charges through a resistor and how resistance and capacitance affect the charging time.",

  template: "circuit",

  controls: [
    {
      id: "resistance",
      label: "Resistance",
      type: "slider",
      min: 100,
      max: 10000,
      step: 100,
      default: 1000,
      unit: "Ω",
    },
    {
      id: "capacitance",
      label: "Capacitance",
      type: "slider",
      min: 0.0001,
      max: 0.01,
      step: 0.0001,
      default: 0.001,
      unit: "F",
    },
    {
      id: "voltage",
      label: "Supply Voltage",
      type: "slider",
      min: 1,
      max: 20,
      step: 1,
      default: 10,
      unit: "V",
    },
    {
      id: "time",
      label: "Time",
      type: "slider",
      min: 0,
      max: 10,
      step: 0.1,
      default: 2,
      unit: "s",
    },
  ],

  simulationCode: `
const rawR = Number(params.resistance);
const rawC = Number(params.capacitance);
const rawV = Number(params.voltage);
const rawTime = Number(params.time);
const R = Number.isFinite(rawR) ? Math.max(0, rawR) : 1000;
const C = Number.isFinite(rawC) ? Math.max(0, rawC) : 0.001;
const V = Number.isFinite(rawV) ? Math.max(0, rawV) : 10;
const t = Number.isFinite(rawTime) ? Math.max(0, rawTime) : 0;

ctx.fillStyle = "#0f172a";
ctx.fillRect(0, 0, 800, 500);

const tau = R * C;
const safeTau = Math.max(tau, 0.000000001);
const capacitorVoltage = tau > 0
  ? V * (1 - Math.exp(-t / safeTau))
  : t > 0 ? V : 0;

// Title
ctx.fillStyle = "#e2e8f0";
ctx.font = "bold 22px sans-serif";
ctx.fillText("RC Circuit Charging", 30, 35);

// Circuit
ctx.strokeStyle = "#64748b";
ctx.lineWidth = 3;

ctx.beginPath();
ctx.moveTo(80, 130);
ctx.lineTo(200, 130);
ctx.lineTo(230, 100);
ctx.lineTo(270, 160);
ctx.lineTo(310, 100);
ctx.lineTo(350, 160);
ctx.lineTo(390, 130);
ctx.lineTo(500, 130);
ctx.lineTo(500, 220);
ctx.lineTo(80, 220);
ctx.lineTo(80, 130);
ctx.stroke();

// Battery
ctx.strokeStyle = "#f8fafc";
ctx.lineWidth = 4;

ctx.beginPath();
ctx.moveTo(110, 105);
ctx.lineTo(110, 155);
ctx.moveTo(130, 95);
ctx.lineTo(130, 165);
ctx.stroke();

// Capacitor
ctx.strokeStyle = "#38bdf8";
ctx.lineWidth = 5;

ctx.beginPath();
ctx.moveTo(480, 175);
ctx.lineTo(480, 235);
ctx.moveTo(520, 175);
ctx.lineTo(520, 235);
ctx.stroke();

ctx.fillStyle = "#fbbf24";
ctx.font = "14px sans-serif";
ctx.fillText("R = " + R.toFixed(0) + " Ω", 220, 185);

ctx.fillStyle = "#38bdf8";
ctx.fillText("C = " + C.toFixed(4) + " F", 430, 260);
ctx.fillStyle = "#f8fafc";
ctx.fillText("Battery: " + V.toFixed(1) + " V", 35, 250);

// Live measurements beside the circuit.
ctx.fillStyle = "#e2e8f0";
ctx.font = "14px sans-serif";
ctx.fillText("Supply: " + V.toFixed(2) + " V", 555, 135);
ctx.fillText("Time: " + t.toFixed(2) + " s", 555, 160);
ctx.fillText("Vc(t): " + capacitorVoltage.toFixed(3) + " V", 555, 185);
ctx.fillText("τ = RC: " + tau.toFixed(4) + " s", 555, 210);

// Graph
const gx = 70;
const gy = 300;
const gw = 650;
const gh = 150;

ctx.strokeStyle = "#475569";
ctx.lineWidth = 1;

ctx.beginPath();
ctx.moveTo(gx, gy);
ctx.lineTo(gx, gy + gh);
ctx.lineTo(gx + gw, gy + gh);
ctx.stroke();

ctx.fillStyle = "#94a3b8";
ctx.font = "13px sans-serif";
ctx.fillText("Voltage (V)", gx, gy - 10);
ctx.fillText("Time", gx + gw - 35, gy + gh + 25);

// Charging curve
ctx.strokeStyle = "#22d3ee";
ctx.lineWidth = 3;

ctx.beginPath();

const graphDuration = Math.max(tau * 5, 0.01);
const voltageScale = Math.max(V, 0.000001);

for (let i = 0; i <= 100; i++) {
  const graphTime =
    (i / 100) * graphDuration;

  const graphVoltage =
    (tau > 0 ? V * (1 - Math.exp(-graphTime / safeTau)) : graphTime > 0 ? V : 0);

  const x = gx + (i / 100) * gw;

  const y =
    gy +
    gh -
    (graphVoltage / voltageScale) * gh;

  if (i === 0) {
    ctx.moveTo(x, y);
  } else {
    ctx.lineTo(x, y);
  }
}

ctx.stroke();

// Current point
const pointX = gx + Math.min(t / graphDuration, 1) * gw;

const pointY =
  gy +
  gh -
  (capacitorVoltage / voltageScale) * gh;

ctx.fillStyle = "#f43f5e";

ctx.beginPath();
ctx.arc(pointX, pointY, 6, 0, Math.PI * 2);
ctx.fill();

ctx.fillStyle = "#94a3b8";
ctx.font = "13px sans-serif";

ctx.fillText(
  "After one time constant, the capacitor reaches about 63% of its final voltage.",
  70,
  480
);
`,

  graphs: [
    {
      id: "chargingCurve",
      label: "Capacitor Voltage vs Time",
      xLabel: "Time (s)",
      yLabel: "Voltage (V)",
      color: "#22d3ee",
    },
  ],

  socraticQuestions: [
    {
      prompt:
        "What happens to the charging speed when resistance increases?",
      type: "multiple-choice",
      options: [
        "The capacitor charges more slowly",
        "The capacitor charges instantly",
        "The final voltage becomes zero",
        "Nothing changes",
      ],
      answer: "The capacitor charges more slowly",
      explanation:
        "Increasing resistance increases the RC time constant, so charging takes longer.",
    },
  ],

  challenge: {
    goal:
      "Choose resistance and capacitance values that produce a time constant close to 2 seconds.",
    successCondition:
      "RC must be between 1.9 and 2.1 seconds.",
  },
};
