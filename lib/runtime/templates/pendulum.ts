import { SimSpec } from "@/lib/ai/schema";

export const pendulumTemplate: SimSpec = {
  title: "Simple Pendulum",
  domain: "physics",
  description: "Explore how length, gravity, and damping affect a pendulum's motion.",
  template: "pendulum",
  controls: [
    { id: "length", label: "Length", type: "slider", min: 50, max: 300, step: 10, default: 150, unit: " cm" },
    { id: "gravity", label: "Gravity", type: "slider", min: 1, max: 20, step: 0.5, default: 9.8, unit: " m/s²" },
    { id: "damping", label: "Damping", type: "slider", min: 0, max: 0.05, step: 0.005, default: 0.01, unit: "" },
    { id: "angle", label: "Initial Angle", type: "slider", min: 5, max: 80, step: 5, default: 30, unit: "°" },
  ],
  simulationCode: `
    const { length, gravity, damping, angle } = params;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 800, 500);
    const L = length / 100;
    const period = 2 * Math.PI * Math.sqrt(L / gravity);
    const t = (Date.now() / 1000) % (period * 10);
    const theta = (angle * Math.PI / 180) * Math.exp(-damping * t) * Math.cos(2 * Math.PI * t / period);
    const pivotX = 400, pivotY = 80;
    const bobX = pivotX + length * Math.sin(theta);
    const bobY = pivotY + length * Math.cos(theta);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX - 30, 80);
    ctx.lineTo(pivotX + 30, 80);
    ctx.stroke();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(bobX, bobY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '16px sans-serif';
    ctx.fillText('Period: ' + period.toFixed(2) + ' s', 20, 30);
    ctx.fillText('Angle: ' + (theta * 180 / Math.PI).toFixed(1) + '°', 20, 55);
  `,
  graphs: [],
  socraticQuestions: [
    {
      prompt: "What happens to the period when you double the length of the pendulum?",
      type: "multiple-choice",
      options: ["Doubles", "Halves", "Increases by √2", "Stays the same"],
      answer: "Increases by √2",
      explanation: "Period T = 2π√(L/g). Doubling L gives T × √2, not ×2.",
    },
    {
      prompt: "Why does changing mass NOT affect the period?",
      type: "open",
      answer: "Mass does not affect the period; only length and gravity determine it.",
      explanation: "The restoring force and inertia both scale with mass, so they cancel out. Only L and g determine the period.",
    },
  ],
  challenge: {
    goal: "Set length so the period is exactly 2 seconds.",
    successCondition: "period between 1.95 and 2.05",
  },
};
