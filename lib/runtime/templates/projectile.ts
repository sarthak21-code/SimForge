import { SimSpec } from "@/lib/ai/schema";

export const projectileTemplate: SimSpec = {
  title: "Projectile Motion",
  domain: "physics",
  description: "Explore how angle, velocity, and gravity affect a projectile's path.",
  template: "projectile",
  controls: [
    { id: "angle", label: "Angle", type: "slider", min: 5, max: 85, step: 1, default: 45, unit: "°" },
    { id: "velocity", label: "Velocity", type: "slider", min: 10, max: 100, step: 1, default: 50, unit: "m/s" },
    { id: "gravity", label: "Gravity", type: "slider", min: 1, max: 20, step: 0.5, default: 9.8, unit: "m/s²" },
  ],
  simulationCode: `
    const { angle, velocity, gravity } = params;
    const rad = angle * Math.PI / 180;
    const tMax = (2 * velocity * Math.sin(rad)) / gravity;
    const range = (velocity * velocity * Math.sin(2 * rad)) / gravity;
    const maxHeight = (velocity * velocity * Math.sin(rad) * Math.sin(rad)) / (2 * gravity);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 800, 500);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 450);
    ctx.lineTo(750, 450);
    ctx.stroke();
    const scaleX = range > 0 ? 700 / range : 1;
    const scaleY = maxHeight > 0 ? 400 / maxHeight : 1;
    const scale = Math.min(scaleX, scaleY);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let t = 0; t <= tMax; t += tMax / 200) {
      const x = 50 + velocity * Math.cos(rad) * t * scale;
      const y = 450 - (velocity * Math.sin(rad) * t - 0.5 * gravity * t * t) * scale;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '16px sans-serif';
    ctx.fillText('Range: ' + range.toFixed(1) + ' m', 20, 30);
    ctx.fillText('Max Height: ' + maxHeight.toFixed(1) + ' m', 20, 55);
  `,
  graphs: [],
  socraticQuestions: [
    {
      prompt: "At what angle is the range maximized?",
      type: "multiple-choice",
      options: ["30°", "45°", "60°", "90°"],
      answer: "45°",
      explanation: "Range is proportional to sin(2θ), which peaks at θ = 45°.",
    },
    {
      prompt: "If you double the velocity, what happens to the range?",
      type: "open",
      explanation: "Range is proportional to v², so doubling velocity quadruples the range.",
    },
  ],
  challenge: {
    goal: "Hit a target at 200 m.",
    successCondition: "Range between 195 and 205",
  },
};