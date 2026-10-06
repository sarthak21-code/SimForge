import { SimSpec } from "@/lib/ai/schema";

export const waveTemplate: SimSpec = {
  title: "Traveling Sine Wave",
  domain: "physics",
  description:
    "Explore how amplitude, frequency, wavelength, and speed shape a traveling sine wave.",
  template: "wave",
  controls: [
    {
      id: "amplitude",
      label: "Amplitude",
      type: "slider",
      min: 10,
      max: 180,
      step: 5,
      default: 80,
      unit: " px",
    },
    {
      id: "frequency",
      label: "Frequency",
      type: "slider",
      min: 0.1,
      max: 5,
      step: 0.1,
      default: 1,
      unit: " Hz",
    },
    {
      id: "wavelength",
      label: "Wavelength",
      type: "slider",
      min: 50,
      max: 600,
      step: 10,
      default: 200,
      unit: " px",
    },
    {
      id: "speed",
      label: "Speed",
      type: "slider",
      min: 0.1,
      max: 5,
      step: 0.1,
      default: 1,
      unit: "×",
    },
    {
      id: "paused",
      label: "Pause",
      type: "toggle",
      default: false,
    },
    {
      id: "reset",
      label: "Reset",
      type: "toggle",
      default: false,
    },
  ],
  simulationCode: `
    const { amplitude, frequency, wavelength, speed, paused, reset } = params;
    const W = 800, H = 500;
    const cy = H / 2;

    if (reset) {
      ctx.__wavePhase = 0;
    }

    // Phase offset — advance only when not paused and not reset
    if (!ctx.__wavePhase) ctx.__wavePhase = 0;
    if (!ctx.__waveLastT) ctx.__waveLastT = Date.now();
    const now = Date.now();
    const dt = (now - ctx.__waveLastT) / 1000;
    ctx.__waveLastT = now;
    if (!paused && !reset) {
      ctx.__wavePhase += 2 * Math.PI * frequency * speed * dt;
    }
    const phase = ctx.__wavePhase;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);

    // Centre axis
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Amplitude guides (faint)
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath(); ctx.moveTo(0, cy - amplitude); ctx.lineTo(W, cy - amplitude); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy + amplitude); ctx.lineTo(W, cy + amplitude); ctx.stroke();
    ctx.setLineDash([]);

    // Wave
    const k = (2 * Math.PI) / wavelength;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const y = cy - amplitude * Math.sin(k * x - phase);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Moving crest dot
    const crestX = ((phase / k) % W + W) % W;
    const crestY = cy - amplitude;
    ctx.beginPath();
    ctx.arc(crestX, crestY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#93c5fd';
    ctx.fill();

    // HUD
    ctx.fillStyle = '#f8fafc';
    ctx.font = '15px sans-serif';
    const waveSpeed = frequency * wavelength;
    ctx.fillText('Wave speed:  ' + waveSpeed.toFixed(1) + ' px/s', 16, 30);
    ctx.fillText('Period:      ' + (1 / frequency).toFixed(2) + ' s', 16, 52);
    ctx.fillText('f = ' + frequency.toFixed(1) + ' Hz   λ = ' + wavelength + ' px   A = ' + amplitude + ' px', 16, H - 16);
    if (paused) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('⏸ PAUSED', W - 90, 30);
    }
    if (reset) {
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('↺ RESET', W - 170, 30);
    }
  `,
  graphs: [],
  socraticQuestions: [
    {
      prompt: "What is the relationship between wave speed, frequency, and wavelength?",
      type: "multiple-choice",
      options: [
        "v = f × λ",
        "v = f / λ",
        "v = λ / f",
        "v = f + λ",
      ],
      answer: "v = f × λ",
      explanation:
        "Wave speed v = fλ. Increasing frequency or wavelength proportionally increases speed.",
    },
    {
      prompt:
        "If you double the frequency while keeping wavelength constant, what happens to wave speed?",
      type: "open",
      explanation:
        "Speed doubles. Since v = fλ and λ is unchanged, doubling f doubles v.",
    },
    {
      prompt:
        "What does amplitude affect in a wave?",
      type: "multiple-choice",
      options: ["Speed", "Frequency", "Energy", "Wavelength"],
      answer: "Energy",
      explanation:
        "Amplitude controls the energy carried by the wave (E ∝ A²). It does not affect speed, frequency, or wavelength.",
    },
  ],
  challenge: {
    goal: "Set frequency and wavelength so the wave speed equals exactly 200 px/s.",
    successCondition: "frequency * wavelength between 195 and 205",
  },
};
