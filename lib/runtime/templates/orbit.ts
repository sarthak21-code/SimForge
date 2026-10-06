import { SimSpec } from "@/lib/ai/schema";

export const orbitTemplate: SimSpec = {
  title: "Orbital Mechanics & Gravity",
  domain: "physics",
  description:
    "Explore how gravitational force, central mass, initial velocity, and orbital distance shape planetary trajectories.",
  template: "orbit",
  controls: [
    {
      id: "centralMass",
      label: "Central Mass",
      type: "slider",
      min: 200,
      max: 2000,
      step: 50,
      default: 1000,
      unit: " M☉",
    },
    {
      id: "planetMass",
      label: "Planet Mass",
      type: "slider",
      min: 1,
      max: 50,
      step: 1,
      default: 10,
      unit: " M⊕",
    },
    {
      id: "velocity",
      label: "Initial Velocity",
      type: "slider",
      min: 10,
      max: 100,
      step: 1,
      default: 50,
      unit: " km/s",
    },
    {
      id: "distance",
      label: "Distance",
      type: "slider",
      min: 60,
      max: 220,
      step: 5,
      default: 140,
      unit: " px",
    },
    {
      id: "timeScale",
      label: "Time Scale",
      type: "slider",
      min: 0.2,
      max: 3.0,
      step: 0.1,
      default: 1.0,
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
    const { centralMass, planetMass, velocity, distance, timeScale, paused, reset } = params;
    const W = 800, H = 500;
    const cx = W / 2, cy = H / 2;
    const G = 350;

    // Reset condition key when setup parameters change or reset is clicked
    const initKey = distance + "_" + velocity + "_" + centralMass;
    if (reset || ctx.__orbitKey !== initKey || !ctx.__orbitInit) {
      ctx.__orbitX = cx;
      ctx.__orbitY = cy - distance;
      ctx.__orbitVx = Number(velocity);
      ctx.__orbitVy = 0;
      ctx.__orbitTrail = [];
      ctx.__orbitSimTime = 0;
      ctx.__orbitLastT = Date.now();
      ctx.__orbitKey = initKey;
      ctx.__orbitInit = true;
    }

    const now = Date.now();
    const rawDt = Math.min((now - (ctx.__orbitLastT || now)) / 1000, 0.05);
    ctx.__orbitLastT = now;
    const dt = rawDt * Number(timeScale);

    const sunRadius = Math.max(16, Math.min(30, 14 + (centralMass / 2000) * 16));
    const planetRadius = Math.max(5, Math.min(12, 4 + (planetMass / 50) * 8));

    // Physics step with sub-stepping for numerical precision
    let dx = ctx.__orbitX - cx;
    let dy = ctx.__orbitY - cy;
    let r = Math.sqrt(dx * dx + dy * dy);
    let crashed = r <= sunRadius;

    if (!paused && !reset && !crashed) {
      ctx.__orbitSimTime += dt;
      const subSteps = 6;
      const subDt = dt / subSteps;
      for (let s = 0; s < subSteps; s++) {
        const curDx = ctx.__orbitX - cx;
        const curDy = ctx.__orbitY - cy;
        const curR = Math.sqrt(curDx * curDx + curDy * curDy);
        if (curR <= sunRadius) {
          crashed = true;
          break;
        }
        if (curR < 3000) {
          const acc = (G * centralMass) / (curR * curR);
          ctx.__orbitVx -= (acc * (curDx / curR)) * subDt;
          ctx.__orbitVy -= (acc * (curDy / curR)) * subDt;
          ctx.__orbitX += ctx.__orbitVx * subDt;
          ctx.__orbitY += ctx.__orbitVy * subDt;
        }
      }

      // Record trajectory trail
      if (!ctx.__orbitTrail) ctx.__orbitTrail = [];
      ctx.__orbitTrail.push({ x: ctx.__orbitX, y: ctx.__orbitY });
      if (ctx.__orbitTrail.length > 500) {
        ctx.__orbitTrail.shift();
      }
    }

    // Refresh dynamic measurements
    dx = ctx.__orbitX - cx;
    dy = ctx.__orbitY - cy;
    r = Math.sqrt(dx * dx + dy * dy);
    const currentSpeed = Math.sqrt(ctx.__orbitVx * ctx.__orbitVx + ctx.__orbitVy * ctx.__orbitVy);
    const circularSpeed = Math.sqrt((G * centralMass) / r);
    const escapeSpeed = Math.sqrt(2) * circularSpeed;

    // Determine orbit classification status
    let orbitStatus = "Elliptical Orbit (Bound)";
    if (crashed) {
      orbitStatus = "Impact / Collision with Sun";
    } else if (currentSpeed >= escapeSpeed) {
      orbitStatus = "Escape Trajectory (Unbound)";
    } else if (Math.abs(currentSpeed - circularSpeed) < 2.5) {
      orbitStatus = "Stable Circular Orbit";
    }

    // Draw background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, W, H);

    // Coordinate grid / distance rings
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    [80, 140, 200].forEach((ringR) => {
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Draw orbital trajectory trail
    if (ctx.__orbitTrail && ctx.__orbitTrail.length > 1) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < ctx.__orbitTrail.length; i++) {
        const pt = ctx.__orbitTrail[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Central Sun with radial glow
    ctx.save();
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 24;
    const sunGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, sunRadius);
    sunGrad.addColorStop(0, '#fef08a');
    sunGrad.addColorStop(0.5, '#f59e0b');
    sunGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sun', cx, cy + 4);

    // Orbiting Planet
    ctx.save();
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 10;
    const planetGrad = ctx.createRadialGradient(
      ctx.__orbitX - 2,
      ctx.__orbitY - 2,
      1,
      ctx.__orbitX,
      ctx.__orbitY,
      planetRadius
    );
    planetGrad.addColorStop(0, '#bae6fd');
    planetGrad.addColorStop(0.6, '#38bdf8');
    planetGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(ctx.__orbitX, ctx.__orbitY, planetRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Velocity Vector Arrow from planet
    if (!crashed && currentSpeed > 0.1) {
      const vScale = 0.7;
      const vEndX = ctx.__orbitX + ctx.__orbitVx * vScale;
      const vEndY = ctx.__orbitY + ctx.__orbitVy * vScale;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ctx.__orbitX, ctx.__orbitY);
      ctx.lineTo(vEndX, vEndY);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(ctx.__orbitVy, ctx.__orbitVx);
      const headLen = 6;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(vEndX, vEndY);
      ctx.lineTo(
        vEndX - headLen * Math.cos(angle - Math.PI / 6),
        vEndY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        vEndX - headLen * Math.cos(angle + Math.PI / 6),
        vEndY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
    }

    // Gravitational Attraction line (Sun to Planet)
    ctx.strokeStyle = '#e2e8f018';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ctx.__orbitX, ctx.__orbitY);
    ctx.stroke();

    // HUD Display
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px sans-serif';
    ctx.fillText('Distance:   ' + r.toFixed(1) + ' px', 18, 28);
    ctx.fillText('Velocity:   ' + currentSpeed.toFixed(1) + ' km/s  (v_circ ≈ ' + circularSpeed.toFixed(1) + ')', 18, 48);
    ctx.fillText('Sim Time:   ' + (ctx.__orbitSimTime || 0).toFixed(1) + ' s', 18, 68);

    // Status pill in HUD
    ctx.font = 'bold 13px sans-serif';
    if (crashed) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText('Status: ' + orbitStatus, 18, 92);
    } else if (currentSpeed >= escapeSpeed) {
      ctx.fillStyle = '#eab308';
      ctx.fillText('Status: ' + orbitStatus, 18, 92);
    } else {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Status: ' + orbitStatus, 18, 92);
    }

    // Indicators in top-right
    if (paused) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('⏸ PAUSED', W - 90, 28);
    }
    if (reset) {
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('↺ RESET', W - 170, 28);
    }
  `,
  graphs: [],
  socraticQuestions: [
    {
      prompt:
        "Newton's Law of Universal Gravitation states that gravitational force F is proportional to (M · m) / r². If you double the distance r between the planet and Sun, what happens to the gravitational force?",
      type: "multiple-choice",
      options: [
        "It is cut to 1/4 (inverse-square law)",
        "It is cut in half",
        "It stays the same",
        "It doubles",
      ],
      answer: "It is cut to 1/4 (inverse-square law)",
      explanation:
        "Gravity obeys an inverse-square law: F ∝ 1/r². Doubling r multiplies force by 1/(2²) = 1/4.",
    },
    {
      prompt:
        "What happens to the orbit if the planet's initial tangential velocity is less than the circular orbital speed v_circ?",
      type: "multiple-choice",
      options: [
        "It enters an elliptical orbit with closer periapsis or falls into the Sun",
        "It escapes the star into deep space",
        "It forms a larger circle",
        "Its mass decreases",
      ],
      answer:
        "It enters an elliptical orbit with closer periapsis or falls into the Sun",
      explanation:
        "If velocity is below circular speed, gravity pulls the planet inwards, creating an eccentric ellipse with a closer periapsis, or colliding if speed is too low.",
    },
    {
      prompt:
        "Why does increasing the planet's mass NOT change the velocity required for a circular orbit?",
      type: "open",
      explanation:
        "Orbital velocity v = √(GM/r) depends only on the central mass M and distance r. The planet's mass m cancels out because gravitational force (F = GMm/r²) and inertial resistance (F = ma) both scale with m.",
    },
  ],
  challenge: {
    goal: "Change the initial velocity and observe how the orbit changes.",
    successCondition: "velocity between 48 and 52",
  },
};
