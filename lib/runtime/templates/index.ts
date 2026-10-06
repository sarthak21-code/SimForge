import { SimSpec } from "@/lib/ai/schema";
import { projectileTemplate } from "./projectile";
import { pendulumTemplate } from "./pendulum";
import { waveTemplate } from "./wave";
import { orbitTemplate } from "./orbit";

export function extractParameters(
  template: string,
  rawQ: string,
  currentParams?: Record<string, number | boolean | string>
): Record<string, number | boolean | string> {
  const q = rawQ.toLowerCase();
  const overrides: Record<string, number | boolean | string> = {};

  const findNumber = (pattern: RegExp): number | null => {
    const match = q.match(pattern);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (!isNaN(val)) return val;
    }
    return null;
  };

  const getPrevNum = (key: string, defaultVal: number): number => {
    if (currentParams && typeof currentParams[key] === "number") {
      return currentParams[key] as number;
    }
    return defaultVal;
  };

  // Global pause/resume toggles
  if (/\b(pause|frozen|freeze|stop)\b/.test(q) && !q.includes("unpause") && !q.includes("resume") && !q.includes("play")) {
    overrides.paused = true;
  } else if (/\b(unpause|resume|play|start)\b/.test(q)) {
    overrides.paused = false;
  }

  // Global reset toggle
  if (/\b(reset|restart|re-center)\b/.test(q)) {
    overrides.reset = true;
  }

  if (template === "wave") {
    // Frequency
    const numFreq =
      findNumber(/(?:frequency|freq)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/) ??
      findNumber(/(\d+(?:\.\d+)?)\s*hz\b/);
    if (numFreq !== null) {
      overrides.frequency = numFreq;
    } else if (/\b(double|2x)\s+(?:the\s+)?(?:wave\s+)?(?:frequency|freq)\b/.test(q)) {
      overrides.frequency = getPrevNum("frequency", 1.0) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?(?:wave\s+)?(?:frequency|freq)\b/.test(q)) {
      overrides.frequency = getPrevNum("frequency", 1.0) * 0.5;
    } else if (
      /(increase|raise|boost|higher|high|fast|faster|more)\s+(?:the\s+)?(?:wave\s+)?(?:frequency|freq)/.test(q) ||
      /(?:frequency|freq)\s+(?:is\s+)?(high|fast|higher)/.test(q)
    ) {
      overrides.frequency = currentParams ? getPrevNum("frequency", 1.0) + 1.0 : 3.5;
    } else if (
      /(decrease|reduce|lower|drop|low|slow|slower|less)\s+(?:the\s+)?(?:wave\s+)?(?:frequency|freq)/.test(q) ||
      /(?:frequency|freq)\s+(?:is\s+)?(low|slow|lower)/.test(q)
    ) {
      overrides.frequency = currentParams ? Math.max(0.1, getPrevNum("frequency", 1.0) - 0.5) : 0.3;
    }

    // Amplitude
    const numAmp =
      findNumber(/(?:amplitude|amp)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/) ??
      findNumber(/(\d+(?:\.\d+)?)\s*px\s+amplitude/);
    if (numAmp !== null) {
      overrides.amplitude = numAmp;
    } else if (/\b(double|2x)\s+(?:the\s+)?(?:amplitude|amp)\b/.test(q)) {
      overrides.amplitude = getPrevNum("amplitude", 80) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?(?:amplitude|amp)\b/.test(q)) {
      overrides.amplitude = getPrevNum("amplitude", 80) * 0.5;
    } else if (/(increase|raise|boost|higher|high|large|big|tall|more)\s+(?:the\s+)?(?:amplitude|amp)/.test(q) || /(?:amplitude|amp)\s+(?:is\s+)?(high|large|big|tall)/.test(q)) {
      overrides.amplitude = currentParams ? getPrevNum("amplitude", 80) + 40 : 150;
    } else if (/(decrease|reduce|lower|drop|low|small|tiny|short|less)\s+(?:the\s+)?(?:amplitude|amp)/.test(q) || /(?:amplitude|amp)\s+(?:is\s+)?(low|small|tiny|short)/.test(q)) {
      overrides.amplitude = currentParams ? Math.max(10, getPrevNum("amplitude", 80) - 30) : 25;
    }

    // Wavelength
    const numWave = findNumber(/(?:wavelength)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/);
    if (numWave !== null) {
      overrides.wavelength = numWave;
    } else if (/\b(double|2x)\s+(?:the\s+)?wavelength\b/.test(q)) {
      overrides.wavelength = getPrevNum("wavelength", 200) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?wavelength\b/.test(q)) {
      overrides.wavelength = getPrevNum("wavelength", 200) * 0.5;
    } else if (/(increase|raise|longer|long|high|large|more)\s+(?:the\s+)?wavelength/.test(q)) {
      overrides.wavelength = currentParams ? getPrevNum("wavelength", 200) + 100 : 450;
    } else if (/(decrease|reduce|shorter|short|low|small|less)\s+(?:the\s+)?wavelength/.test(q)) {
      overrides.wavelength = currentParams ? Math.max(50, getPrevNum("wavelength", 200) - 75) : 80;
    }

    // Speed
    const numSpeed = findNumber(/(?:speed)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/);
    if (numSpeed !== null) {
      overrides.speed = numSpeed;
    } else if (/(increase|raise|faster|fast|high|more)\s+(?:the\s+)?speed/.test(q)) {
      overrides.speed = currentParams ? getPrevNum("speed", 1.0) + 0.8 : 3.0;
    } else if (/(decrease|reduce|slower|slow|low|less)\s+(?:the\s+)?speed/.test(q)) {
      overrides.speed = currentParams ? Math.max(0.1, getPrevNum("speed", 1.0) - 0.5) : 0.3;
    }
  } else if (template === "projectile") {
    // Angle
    const numAngle =
      findNumber(/(?:angle|launched?\s+at|at)\s*(?:to|=)?\s*(\d+(?:\.\d+)?)\s*(?:°|deg|degrees?)?/) ??
      findNumber(/(\d+(?:\.\d+)?)\s*(?:°|deg|degrees?)/);
    if (numAngle !== null) {
      overrides.angle = numAngle;
    } else if (/(increase|raise|higher|high|steep|steeper|more)\s+(?:the\s+)?(?:launch\s+)?angle/.test(q) || /angle\s+(?:is\s+)?(high|steep)/.test(q)) {
      overrides.angle = currentParams ? Math.min(85, getPrevNum("angle", 45) + 15) : 70;
    } else if (/(decrease|reduce|lower|low|shallow|shallower|less)\s+(?:the\s+)?(?:launch\s+)?angle/.test(q) || /angle\s+(?:is\s+)?(low|shallow)/.test(q)) {
      overrides.angle = currentParams ? Math.max(5, getPrevNum("angle", 45) - 15) : 20;
    }

    // Velocity
    const numVel =
      findNumber(/(?:velocity|speed)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/) ??
      findNumber(/(\d+(?:\.\d+)?)\s*m\/s\b/);
    if (numVel !== null) {
      overrides.velocity = numVel;
    } else if (/\b(double|2x)\s+(?:the\s+)?(?:velocity|speed)\b/.test(q)) {
      overrides.velocity = getPrevNum("velocity", 50) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?(?:velocity|speed)\b/.test(q)) {
      overrides.velocity = getPrevNum("velocity", 50) * 0.5;
    } else if (/(increase|raise|boost|higher|high|fast|faster|more)\s+(?:the\s+)?(?:velocity|speed)/.test(q) || /(?:velocity|speed)\s+(?:is\s+)?(high|fast)/.test(q)) {
      overrides.velocity = currentParams ? getPrevNum("velocity", 50) + 20 : 85;
    } else if (/(decrease|reduce|lower|drop|low|slow|slower|less)\s+(?:the\s+)?(?:velocity|speed)/.test(q) || /(?:velocity|speed)\s+(?:is\s+)?(low|slow)/.test(q)) {
      overrides.velocity = currentParams ? Math.max(10, getPrevNum("velocity", 50) - 15) : 20;
    }

    // Gravity
    const numG = findNumber(/(?:gravity|g)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/);
    if (numG !== null) {
      overrides.gravity = numG;
    } else if (/\b(double|2x)\s+(?:the\s+)?gravity\b/.test(q)) {
      overrides.gravity = getPrevNum("gravity", 9.8) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?gravity\b/.test(q)) {
      overrides.gravity = getPrevNum("gravity", 9.8) * 0.5;
    } else if (q.includes("moon")) {
      overrides.gravity = 1.6;
    } else if (q.includes("mars")) {
      overrides.gravity = 3.7;
    } else if (q.includes("jupiter")) {
      overrides.gravity = 20;
    } else if (/(increase|raise|higher|high|strong|stronger|heavy|more)\s+(?:the\s+)?gravity/.test(q)) {
      overrides.gravity = currentParams ? Math.min(20, getPrevNum("gravity", 9.8) + 5) : 18.0;
    } else if (/(decrease|reduce|lower|low|weak|weaker|zero|micro|less)\s+(?:the\s+)?gravity/.test(q)) {
      overrides.gravity = currentParams ? Math.max(1, getPrevNum("gravity", 9.8) - 4) : 2.0;
    }
  } else if (template === "pendulum") {
    // Starting angle
    const numAngle =
      findNumber(/(?:starting\s+angle|initial\s+angle|angle)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/) ??
      findNumber(/(\d+(?:\.\d+)?)\s*(?:°|deg|degrees?)/);
    if (numAngle !== null) {
      overrides.angle = numAngle;
    } else if (
      /(increase|raise|large|larger|high|higher|wide|wider|big|more)\s+(?:the\s+)?(?:starting\s+angle|initial\s+angle|angle|swing)/.test(q) ||
      /(?:starting\s+angle|initial\s+angle|angle|swing)\s+(?:is\s+)?(large|high|wide)/.test(q)
    ) {
      overrides.angle = currentParams ? Math.min(80, getPrevNum("angle", 30) + 20) : 70;
    } else if (
      /(decrease|reduce|small|smaller|low|lower|narrow|narrower|less)\s+(?:the\s+)?(?:starting\s+angle|initial\s+angle|angle|swing)/.test(q) ||
      /(?:starting\s+angle|initial\s+angle|angle|swing)\s+(?:is\s+)?(small|low|narrow)/.test(q)
    ) {
      overrides.angle = currentParams ? Math.max(5, getPrevNum("angle", 30) - 15) : 10;
    }

    // Length
    const numLen =
      findNumber(/(?:length|string)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/) ??
      findNumber(/(\d+(?:\.\d+)?)\s*cm\b/);
    if (numLen !== null) {
      overrides.length = numLen;
    } else if (/\b(double|2x)\s+(?:the\s+)?(?:pendulum\s+)?(?:length|string)\b/.test(q)) {
      overrides.length = getPrevNum("length", 150) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?(?:pendulum\s+)?(?:length|string)\b/.test(q)) {
      overrides.length = getPrevNum("length", 150) * 0.5;
    } else if (
      /(increase|raise|longer|long|more)\s+(?:the\s+)?(?:pendulum\s+)?(?:length|string)/.test(q) ||
      /length\s+(?:is\s+)?(long|longer)/.test(q)
    ) {
      overrides.length = currentParams ? Math.min(300, getPrevNum("length", 150) + 60) : 250;
    } else if (
      /(decrease|reduce|shorter|short|less)\s+(?:the\s+)?(?:pendulum\s+)?(?:length|string)/.test(q) ||
      /length\s+(?:is\s+)?(short|shorter)/.test(q)
    ) {
      overrides.length = currentParams ? Math.max(50, getPrevNum("length", 150) - 50) : 70;
    }

    // Damping
    if (/(no|zero|without)\s+damping/.test(q) || q.includes("undamped")) {
      overrides.damping = 0;
    } else if (/(increase|raise|higher|high|heavy|strong|more)\s+(?:the\s+)?damping/.test(q)) {
      overrides.damping = currentParams ? Math.min(0.05, getPrevNum("damping", 0.01) + 0.015) : 0.04;
    } else if (/(decrease|reduce|lower|low|light|weak|less)\s+(?:the\s+)?damping/.test(q)) {
      overrides.damping = currentParams ? Math.max(0, getPrevNum("damping", 0.01) - 0.006) : 0.002;
    }

    // Gravity
    const numG = findNumber(/(?:gravity|g)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/);
    if (numG !== null) {
      overrides.gravity = numG;
    } else if (/\b(double|2x)\s+(?:the\s+)?gravity\b/.test(q)) {
      overrides.gravity = getPrevNum("gravity", 9.8) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?gravity\b/.test(q)) {
      overrides.gravity = getPrevNum("gravity", 9.8) * 0.5;
    } else if (q.includes("moon")) {
      overrides.gravity = 1.6;
    } else if (/(increase|higher|strong|heavy|more)\s+(?:the\s+)?gravity/.test(q)) {
      overrides.gravity = currentParams ? Math.min(20, getPrevNum("gravity", 9.8) + 5) : 18.0;
    } else if (/(decrease|lower|weak|zero|less)\s+(?:the\s+)?gravity/.test(q)) {
      overrides.gravity = currentParams ? Math.max(1, getPrevNum("gravity", 9.8) - 4) : 2.0;
    }
  } else if (template === "orbit") {
    // Velocity
    const numVel =
      findNumber(/(?:velocity|speed)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/) ??
      findNumber(/(\d+(?:\.\d+)?)\s*km\/s\b/);
    if (numVel !== null) {
      overrides.velocity = numVel;
    } else if (/\b(double|2x)\s+(?:the\s+)?(?:initial\s+)?(?:velocity|speed)\b/.test(q)) {
      overrides.velocity = getPrevNum("velocity", 50) * 2;
    } else if (/\b(halve|half)\s+(?:the\s+)?(?:initial\s+)?(?:velocity|speed)\b/.test(q)) {
      overrides.velocity = getPrevNum("velocity", 50) * 0.5;
    } else if (
      /(increase|raise|boost|higher|high|fast|faster|great|more)\s+(?:the\s+)?(?:planet'?s?\s+)?(?:initial\s+)?(?:velocity|speed)/.test(q) ||
      /(?:velocity|speed)\s+(?:is\s+)?(high|fast)/.test(q) ||
      /(?:orbiting|orbit)\s+with\s+(?:high|fast)\s+velocity/.test(q)
    ) {
      overrides.velocity = currentParams ? Math.min(100, getPrevNum("velocity", 50) + 20) : 80;
    } else if (
      /(decrease|reduce|lower|drop|low|slow|slower|less)\s+(?:the\s+)?(?:planet'?s?\s+)?(?:initial\s+)?(?:velocity|speed)/.test(q) ||
      /(?:velocity|speed)\s+(?:is\s+)?(low|slow)/.test(q)
    ) {
      overrides.velocity = currentParams ? Math.max(10, getPrevNum("velocity", 50) - 15) : 25;
    }

    // Central Mass
    const numMass = findNumber(
      /(?:central\s+mass|star\s+mass|sun\s+mass|star|sun)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/
    );
    if (numMass !== null) {
      overrides.centralMass = numMass;
    } else if (/\b(double|2x)\s+(?:the\s+)?(?:central\s+)?mass\b/.test(q)) {
      overrides.centralMass = getPrevNum("centralMass", 1000) * 2;
    } else if (
      /(increase|raise|massive|heavy|larger|large|giant|more)\s+(?:the\s+)?(?:central\s+mass|star|sun|central\s+body)/.test(q) ||
      /central\s+mass\s+(?:is\s+)?(high|large|heavy)/.test(q)
    ) {
      overrides.centralMass = currentParams ? Math.min(2000, getPrevNum("centralMass", 1000) + 400) : 1800;
    } else if (
      /(decrease|reduce|smaller|small|light|lighter|low|less)\s+(?:the\s+)?(?:central\s+mass|star|sun|central\s+body)/.test(q) ||
      /central\s+mass\s+(?:is\s+)?(low|small|light)/.test(q)
    ) {
      overrides.centralMass = currentParams ? Math.max(200, getPrevNum("centralMass", 1000) - 300) : 400;
    }

    // Distance
    const numDist = findNumber(/(?:distance|radius)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/);
    if (numDist !== null) {
      overrides.distance = numDist;
    } else if (
      /(increase|raise|far|farther|further|large|wide|wider|distant|more)\s+(?:the\s+)?(?:distance|radius|orbit)/.test(q) ||
      q.includes("far away")
    ) {
      overrides.distance = currentParams ? Math.min(220, getPrevNum("distance", 140) + 40) : 200;
    } else if (
      /(decrease|reduce|close|closer|small|smaller|tight|tighter|near|nearer|less)\s+(?:the\s+)?(?:distance|radius|orbit)/.test(q) ||
      q.includes("close orbit")
    ) {
      overrides.distance = currentParams ? Math.max(60, getPrevNum("distance", 140) - 35) : 75;
    }

    // Planet Mass
    const numPlanetM = findNumber(
      /(?:planet\s+mass)\s*(?:to|of|at|=)?\s*(\d+(?:\.\d+)?)/
    );
    if (numPlanetM !== null) {
      overrides.planetMass = numPlanetM;
    } else if (
      /(increase|massive|heavy|larger|large|more)\s+(?:the\s+)?planet\s+mass/.test(q) ||
      /(?:make|set)\s+(?:the\s+)?planet\s+(?:more\s+)?(massive|heavy|larger)/.test(q)
    ) {
      overrides.planetMass = currentParams ? Math.min(50, getPrevNum("planetMass", 10) + 15) : 40;
    } else if (
      /(decrease|smaller|small|light|lighter|tiny|less)\s+(?:the\s+)?planet\s+mass/.test(q) ||
      /(?:make|set)\s+(?:the\s+)?planet\s+(?:more\s+)?(smaller|light|tiny)/.test(q)
    ) {
      overrides.planetMass = currentParams ? Math.max(1, getPrevNum("planetMass", 10) - 5) : 2;
    }

    // Time scale
    if (q.includes("slow motion") || q.includes("slow down")) {
      overrides.timeScale = 0.4;
    } else if (q.includes("fast forward") || q.includes("speed up") || q.includes("faster time")) {
      overrides.timeScale = 2.5;
    }
  }

  return overrides;
}

export function applyParamOverrides(
  spec: SimSpec,
  overrides: Record<string, number | boolean | string>
): SimSpec {
  if (Object.keys(overrides).length === 0) return spec;

  const newControls = spec.controls.map((ctrl) => {
    if (overrides[ctrl.id] !== undefined) {
      let val = overrides[ctrl.id];
      if (ctrl.type === "slider" && typeof val === "number") {
        if (ctrl.min !== undefined) val = Math.max(ctrl.min, val);
        if (ctrl.max !== undefined) val = Math.min(ctrl.max, val);
      }
      return { ...ctrl, default: val };
    }
    return ctrl;
  });

  return {
    ...spec,
    controls: newControls,
  };
}

export function getTemplateFallback(query: string): SimSpec {
  const q = query.toLowerCase();
  let baseSpec: SimSpec;

  if (
    q.includes("orbit") ||
    q.includes("orbital") ||
    q.includes("planet") ||
    q.includes("satellite") ||
    q.includes("gravity") ||
    q.includes("earth around sun")
  ) {
    baseSpec = orbitTemplate;
  } else if (
    q.includes("wave") ||
    q.includes("sine") ||
    q.includes("sinewave") ||
    q.includes("sin wave") ||
    q.includes("interference") ||
    q.includes("frequency") ||
    q.includes("wavelength") ||
    q.includes("amplitude")
  ) {
    baseSpec = waveTemplate;
  } else if (q.includes("pendulum") || q.includes("oscillat") || q.includes("swing")) {
    baseSpec = pendulumTemplate;
  } else if (q.includes("supply") || q.includes("demand") || q.includes("economics") || q.includes("market")) {
    baseSpec = projectileTemplate; // fallback until supply-demand template is built
  } else if (q.includes("projectile") || q.includes("launch") || q.includes("throw") || q.includes("motion")) {
    baseSpec = projectileTemplate;
  } else {
    baseSpec = projectileTemplate;
  }

  const overrides = extractParameters(baseSpec.template, q);
  return applyParamOverrides(baseSpec, overrides);
}