"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Line } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import * as THREE from "three";

type Pointer = { current: { x: number; y: number } };
type Vec3 = [number, number, number];

const fract = (value: number) => value - Math.floor(value);
// Small deterministic hash keeps every generated field stable between renders.
const hash = (seed: number, salt: number) => fract(Math.sin(seed * salt) * 43758.5453);

/* ------------------------------------------------------------------ */
/* Shared soft-glow texture (fakes bloom without post-processing)      */
/* ------------------------------------------------------------------ */

let glowTexture: THREE.CanvasTexture | null = null;
function getGlowTexture() {
  if (glowTexture || typeof document === "undefined") return glowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.35)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

function Glow({ position = [0, 0, 0], scale, color, opacity }: {
  position?: Vec3;
  scale: number;
  color: string;
  opacity: number;
}) {
  const map = getGlowTexture();
  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial map={map ?? undefined} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

function Scene({ pointer, compact, still }: { pointer: Pointer; compact: boolean; still: boolean }) {
  const system = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (still || !system.current) return;
    const elapsed = state.clock.elapsedTime;
    const targetX = pointer.current.y * 0.045 + Math.sin(elapsed * 0.08) * 0.012;
    const targetY = pointer.current.x * 0.06 + Math.sin(elapsed * 0.055) * 0.018;
    system.current.rotation.x = THREE.MathUtils.damp(system.current.rotation.x, targetX, 1.5, delta);
    system.current.rotation.y = THREE.MathUtils.damp(system.current.rotation.y, targetY, 1.5, delta);
  });

  return (
    <group ref={system} scale={compact ? 1.08 : 1}>
      <ParticleField compact={compact} still={still} />
      <group position={[0, 0.3, 0]}>
        <SimulationCore compact={compact} still={still} />
        <Orbits compact={compact} still={still} />
        <LightArcs compact={compact} still={still} />
      </group>
      {!compact && <Helix still={still} />}
      <EnergyFloor compact={compact} still={still} />
    </group>
  );
}

/* ---- Particles ---------------------------------------------------- */

function ParticleField({ compact, still }: { compact: boolean; still: boolean }) {
  return (
    <group>
      <ParticleLayer kind="far" count={compact ? 170 : 620} size={0.024} color="#b4d8ff" opacity={0.72} seedOffset={0} speed={0.006} still={still} />
      <ParticleLayer kind="far" count={compact ? 50 : 190} size={0.042} color="#d5d3ff" opacity={0.65} seedOffset={1000} speed={-0.004} still={still} />
      <ParticleLayer kind="dust" count={compact ? 50 : 170} size={0.03} color="#9db4ff" opacity={0.55} seedOffset={2000} speed={0.03} still={still} additive />
    </group>
  );
}

function ParticleLayer({ kind, count, size, color, opacity, seedOffset, speed, still, additive = false }: {
  kind: "far" | "dust";
  count: number;
  size: number;
  color: string;
  opacity: number;
  seedOffset: number;
  speed: number;
  still: boolean;
  additive?: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const seed = index + seedOffset + 1;
      if (kind === "dust") {
        const theta = hash(seed, 12.9898) * Math.PI * 2;
        const phi = Math.acos(hash(seed, 78.233) * 2 - 1);
        const radius = 1.1 + hash(seed, 39.425) * 2.4;
        values[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
        values[index * 3 + 1] = 0.3 + radius * Math.cos(phi) * 0.8;
        values[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      } else {
        values[index * 3] = (hash(seed, 12.9898) - 0.5) * 18;
        values[index * 3 + 1] = (hash(seed, 78.233) - 0.5) * 10;
        values[index * 3 + 2] = -1.5 - hash(seed, 39.425) * 8;
      }
    }
    return values;
  }, [count, seedOffset, kind]);

  useFrame((state, delta) => {
    if (still || !points.current) return;
    points.current.rotation.y += delta * speed;
    if (kind === "far") points.current.position.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.035;
  });

  return (
    <points ref={points}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
      <pointsMaterial color={color} size={size} transparent opacity={opacity} sizeAttenuation depthWrite={false} blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending} />
    </points>
  );
}

/* ---- Core ---------------------------------------------------------- */

const CAGE_A_ROTATION: Vec3 = [0.5, 0.6, 0.12];
const CAGE_B_ROTATION: Vec3 = [-0.3, 0.2, 0.7];

function SimulationCore({ compact, still }: { compact: boolean; still: boolean }) {
  const lattice = useRef<THREE.Group>(null);
  const cageA = useRef<THREE.Group>(null);
  const cageB = useRef<THREE.Group>(null);
  const nucleus = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (still) return;
    const t = state.clock.elapsedTime;
    if (lattice.current) {
      lattice.current.rotation.y += delta * 0.16;
      lattice.current.rotation.x = Math.sin(t * 0.2) * 0.2;
    }
    if (cageA.current) {
      cageA.current.rotation.y += delta * 0.05;
      cageA.current.rotation.z += delta * 0.02;
    }
    if (cageB.current) {
      cageB.current.rotation.y -= delta * 0.035;
      cageB.current.rotation.x += delta * 0.025;
    }
    if (nucleus.current) nucleus.current.scale.setScalar(1 + Math.sin(t * 0.9) * 0.05);
  });

  return (
    <group>
      <pointLight color="#5a86ff" intensity={4} distance={7} decay={1.6} />
      <pointLight color="#c24bff" intensity={2.2} distance={5} decay={1.7} />

      {/* Outer lattice cages: the "engine" from which systems emerge */}
      <group ref={cageA} rotation={CAGE_A_ROTATION}>
        <mesh>
          <boxGeometry args={[1.9, 1.9, 1.9]} />
          <meshBasicMaterial color="#3d5cff" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} />
          <Edges color="#4fb4ff" threshold={15} />
        </mesh>
      </group>
      {!compact && (
        <group ref={cageB} rotation={CAGE_B_ROTATION}>
          <mesh>
            <boxGeometry args={[1.62, 1.62, 1.62]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            <Edges color="#a87bff" threshold={15} />
          </mesh>
        </group>
      )}

      {/* Glass shell */}
      <mesh>
        <sphereGeometry args={[0.72, 40, 40]} />
        <meshStandardMaterial color="#3a52e0" emissive="#2a1fa8" emissiveIntensity={1.1} transparent opacity={0.42} roughness={0.15} metalness={0.3} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.86, 32, 32]} />
        <meshBasicMaterial color="#4a86ff" transparent opacity={0.2} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.76, compact ? 1 : 2]} />
        <meshBasicMaterial color="#8fb4ff" wireframe transparent opacity={0.16} />
      </mesh>

      {/* Computational lattice inside the shell */}
      <group ref={lattice}>
        <Lattice compact={compact} />
      </group>

      {/* Nucleus + bloom */}
      <group ref={nucleus}>
        <mesh>
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshBasicMaterial color="#efe6ff" />
        </mesh>
        <Glow scale={1.4} color="#ff9cf0" opacity={0.75} />
        <Glow scale={2.9} color="#7a6bff" opacity={0.95} />
        <Glow scale={5.2} color="#3b5bff" opacity={0.34} />
      </group>
    </group>
  );
}

function Lattice({ compact }: { compact: boolean }) {
  const { nodes, lines } = useMemo(() => {
    const total = compact ? 26 : 48;
    const vectors: THREE.Vector3[] = [];
    for (let i = 0; i < total; i += 1) {
      const y = 1 - (i / (total - 1)) * 2;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = i * 2.399963;
      const radius = 0.22 + hash(i + 1, 91.7) * 0.3;
      vectors.push(new THREE.Vector3(Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius));
    }
    const nodeValues = new Float32Array(total * 3);
    vectors.forEach((v, i) => v.toArray(nodeValues, i * 3));
    const segments: number[] = [];
    for (let a = 0; a < total; a += 1) {
      for (let b = a + 1; b < total; b += 1) {
        if (vectors[a].distanceTo(vectors[b]) < 0.27) {
          segments.push(vectors[a].x, vectors[a].y, vectors[a].z, vectors[b].x, vectors[b].y, vectors[b].z);
        }
      }
    }
    return { nodes: nodeValues, lines: new Float32Array(segments) };
  }, [compact]);

  return (
    <group>
      <points>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[nodes, 3]} /></bufferGeometry>
        <pointsMaterial color="#d6e4ff" size={0.045} transparent opacity={0.95} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <lineSegments>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[lines, 3]} /></bufferGeometry>
        <lineBasicMaterial color="#8fb4ff" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
    </group>
  );
}

/* ---- Orbits -------------------------------------------------------- */

function Orbits({ compact, still }: { compact: boolean; still: boolean }) {
  return (
    <group>
      <Orbit radius={1.95} tilt={[1.18, 0.1, 0.28]} color="#4aa8ff" speed={0.3} phase={0.4} beads={3} bright still={still} />
      <Orbit radius={1.45} tilt={[0.6, -0.5, 0.2]} color="#9d7cff" speed={-0.22} phase={2.1} beads={2} still={still} />
      {!compact && <Orbit radius={2.5} tilt={[1.45, 0.35, -0.2]} color="#72deff" speed={0.14} phase={4.1} beads={2} still={still} />}
    </group>
  );
}

function Orbit({ radius, tilt, color, speed, phase, beads, bright = false, still }: {
  radius: number;
  tilt: Vec3;
  color: string;
  speed: number;
  phase: number;
  beads: number;
  bright?: boolean;
  still: boolean;
}) {
  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, bright ? 0.016 : 0.007, 6, 160]} />
        <meshBasicMaterial color={color} transparent opacity={bright ? 0.85 : 0.28} />
      </mesh>
      {bright && (
        <mesh>
          <torusGeometry args={[radius, 0.06, 6, 160]} />
          <meshBasicMaterial color={color} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {Array.from({ length: beads }, (_, i) => (
        <Bead key={i} radius={radius} color={color} speed={speed} phase={phase + (i * Math.PI * 2) / beads} size={bright ? 0.085 : 0.055} still={still} />
      ))}
    </group>
  );
}

function Bead({ radius, color, speed, phase, size, still }: {
  radius: number;
  color: string;
  speed: number;
  phase: number;
  size: number;
  still: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (still || !body.current) return;
    const angle = state.clock.elapsedTime * speed + phase;
    body.current.position.set(radius * Math.cos(angle), radius * Math.sin(angle), 0);
  });
  return (
    <group ref={body} position={[radius * Math.cos(phase), radius * Math.sin(phase), 0]}>
      <mesh>
        <sphereGeometry args={[size, 18, 18]} />
        <meshBasicMaterial color="#e8f0ff" />
      </mesh>
      <Glow scale={size * 7} color={color} opacity={0.85} />
    </group>
  );
}

/* ---- Light arcs: energy flowing from the core to each domain ------- */

const ARC_TARGETS: { to: Vec3; lift: number; color: string; speed: number; phase: number }[] = [
  { to: [-3.5, 2.3, 0.3], lift: 0.9, color: "#7aa8ff", speed: 0.16, phase: 0.0 },
  { to: [3.0, 2.5, 0.2], lift: 0.8, color: "#b27cff", speed: 0.13, phase: 0.35 },
  { to: [4.3, 0.5, 0.2], lift: 0.5, color: "#5fd0ff", speed: 0.18, phase: 0.7 },
  { to: [-3.0, -1.5, 0.4], lift: -0.5, color: "#9d7cff", speed: 0.15, phase: 0.15 },
  { to: [2.6, -1.9, 0.4], lift: -0.6, color: "#5fd0ff", speed: 0.12, phase: 0.55 },
];

function LightArcs({ compact, still }: { compact: boolean; still: boolean }) {
  const arcs = compact ? ARC_TARGETS.slice(0, 3) : ARC_TARGETS;
  return (
    <group>
      {arcs.map((arc) => (
        <LightArc key={arc.to.join(",")} {...arc} still={still} />
      ))}
    </group>
  );
}

function LightArc({ to, lift, color, speed, phase, still }: {
  to: Vec3;
  lift: number;
  color: string;
  speed: number;
  phase: number;
  still: boolean;
}) {
  const pulse = useRef<THREE.Group>(null);
  const curve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(to[0] * 0.5, to[1] * 0.5 + lift, to[2] + 0.6),
        new THREE.Vector3(to[0], to[1], to[2]),
      ),
    [to, lift],
  );
  const points = useMemo(() => curve.getPoints(40), [curve]);
  const scratch = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (still || !pulse.current) return;
    const t = (state.clock.elapsedTime * speed + phase) % 1;
    curve.getPoint(t, scratch);
    pulse.current.position.copy(scratch);
    pulse.current.scale.setScalar(0.4 + Math.sin(t * Math.PI) * 0.8);
  });

  return (
    <group>
      <Line points={points} color={color} lineWidth={1} transparent opacity={0.22} />
      <group ref={pulse} position={curve.getPoint(0.5)}>
        <mesh>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <Glow scale={0.55} color={color} opacity={0.85} />
      </group>
    </group>
  );
}

/* ---- Helix (biology motif) ---------------------------------------- */

function Helix({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [strandA, strandB] = useMemo(() => {
    const a: THREE.Vector3[] = [];
    const b: THREE.Vector3[] = [];
    const steps = 90;
    for (let i = 0; i < steps; i += 1) {
      const t = i / (steps - 1);
      const y = (t - 0.5) * 2.4;
      const angle = t * Math.PI * 2 * 3.2;
      const radius = 0.16 * (0.75 + 0.25 * Math.sin(t * Math.PI));
      a.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      b.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
    }
    return [a, b];
  }, []);

  useFrame((_, delta) => {
    if (still || !group.current) return;
    group.current.rotation.y += delta * 0.4;
  });

  return (
    <group position={[-3.15, 0.7, 0.4]} rotation={[0, 0, 0.25]}>
      <group ref={group}>
        <Line points={strandA} color="#38bdf8" lineWidth={1.2} transparent opacity={0.7} />
        <Line points={strandB} color="#a855f7" lineWidth={1.2} transparent opacity={0.7} />
      </group>
    </group>
  );
}

/* ---- Floor, ripple and light beam --------------------------------- */

function EnergyFloor({ compact, still }: { compact: boolean; still: boolean }) {
  const ripple = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const step = compact ? 0.6 : 0.4;
    const vertices: number[] = [];
    for (let x = -6; x <= 6.001; x += step) vertices.push(x, 0, -4, x, 0, 5);
    for (let z = -4; z <= 5.001; z += step) vertices.push(-6, 0, z, 6, 0, z);
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    return result;
  }, [compact]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    if (still || !ripple.current) return;
    const progress = (state.clock.elapsedTime * 0.18) % 1;
    ripple.current.scale.setScalar(0.5 + progress * 1.6);
    (ripple.current.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * 0.5;
  });

  return (
    <group>
      {/* Light beam from the core to the floor */}
      <mesh position={[0, -1.1, 0]}>
        <cylinderGeometry args={[0.03, 0.5, 2.6, 24, 1, true]} />
        <meshBasicMaterial color="#4e8fff" transparent opacity={0.06} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group position={[0, -2.45, -0.1]}>
        <lineSegments geometry={geometry}><lineBasicMaterial color="#426cff" transparent opacity={0.16} /></lineSegments>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <torusGeometry args={[0.92, 0.012, 6, 96]} />
          <meshBasicMaterial color="#55caff" transparent opacity={0.75} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
          <torusGeometry args={[1.34, 0.008, 5, 120]} />
          <meshBasicMaterial color="#b24fff" transparent opacity={0.6} />
        </mesh>
        <mesh ref={ripple} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <torusGeometry args={[1.72, 0.006, 5, 120]} />
          <meshBasicMaterial color="#5c85ff" transparent opacity={0.4} />
        </mesh>
        <Glow position={[0, 0.1, 0]} scale={3.2} color="#4e8fff" opacity={0.32} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Fallbacks                                                           */
/* ------------------------------------------------------------------ */

function CoreFallback() {
  return (
    <svg viewBox="0 0 640 440" className="h-full w-full" role="img" aria-label="Simulation core with orbiting systems">
      <defs>
        <radialGradient id="fallback-core">
          <stop stopColor="#e3d8ff" stopOpacity=".95" />
          <stop offset=".35" stopColor="#7c8cff" stopOpacity=".55" />
          <stop offset="1" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill="none" strokeLinecap="round">
        <ellipse cx="320" cy="210" rx="170" ry="62" transform="rotate(-24 320 210)" stroke="#5aa8ff" strokeOpacity=".55" />
        <ellipse cx="320" cy="210" rx="125" ry="44" transform="rotate(28 320 210)" stroke="#a78bfa" strokeOpacity=".45" />
        <rect x="262" y="152" width="116" height="116" rx="6" transform="rotate(18 320 210)" stroke="#5cc8ff" strokeOpacity=".4" />
        <path d="M320 268v70" stroke="#5c85ff" strokeOpacity=".4" />
        <ellipse cx="320" cy="350" rx="120" ry="22" stroke="#5c85ff" strokeOpacity=".35" />
      </g>
      <circle cx="320" cy="210" r="95" fill="url(#fallback-core)" />
      <circle cx="170" cy="150" r="5" fill="#7de0ef" />
      <circle cx="470" cy="260" r="5" fill="#c5caff" />
      <circle cx="400" cy="120" r="4" fill="#a78bfa" />
    </svg>
  );
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Public component                                                    */
/* ------------------------------------------------------------------ */

let webglSupport: boolean | null = null;
function detectWebgl() {
  if (webglSupport !== null) return webglSupport;
  try {
    const probe = document.createElement("canvas");
    const gl = (probe.getContext("webgl2") || probe.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
    webglSupport = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}
const noopSubscribe = () => () => {};

export function Hero3D() {
  const reducedMotion = useReducedMotion();
  const still = Boolean(reducedMotion);
  const pointer = useRef({ x: 0, y: 0 });
  const root = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [visible, setVisible] = useState(true);
  // null on the server / during hydration; no canvas is mounted (so no WebGL error) on unsupported devices.
  const webgl = useSyncExternalStore(noopSubscribe, detectWebgl, () => null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Pause rendering entirely while the hero is scrolled out of view.
  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "120px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  function setPointer(x: number, y: number) {
    pointer.current.x = x;
    pointer.current.y = y;
    if (still || !root.current) return;
    root.current.style.setProperty("--px", x.toFixed(3));
    root.current.style.setProperty("--py", y.toFixed(3));
  }

  function trackPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPointer(
      ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
      ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
    );
  }

  return (
    <div ref={root} className="hero-visual" onPointerMove={trackPointer} onPointerLeave={() => setPointer(0, 0)} aria-hidden="true">
      <div className="hero-canvas">
        {webgl === false && <CoreFallback />}
        {webgl && (
          <SceneBoundary fallback={<CoreFallback />}>
            <Canvas
              camera={{ position: [0, 0, compact ? 11.8 : 11.2], fov: compact ? 43 : 40 }}
              dpr={compact ? [1, 1.2] : [1, 1.5]}
              frameloop={still ? "demand" : visible ? "always" : "never"}
              fallback={<CoreFallback />}
              gl={{ alpha: true, antialias: !compact, powerPreference: "low-power" }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[-3, 5, 5]} intensity={1.1} color="#d8dcff" />
              <Scene pointer={pointer} compact={compact} still={still} />
            </Canvas>
          </SceneBoundary>
        )}
      </div>
      <HeroHUD />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Domain panels: simulations emerging from the engine                 */
/* ------------------------------------------------------------------ */

type PanelId = "physics" | "data" | "algorithms" | "math" | "engineering" | "systems" | "biology";

const PANELS: { id: PanelId; label: string; depth: number; ry: number; delay: number }[] = [
  { id: "physics", label: "Physics", depth: 14, ry: -8, delay: 0 },
  { id: "data", label: "Data", depth: 10, ry: -6, delay: 1.2 },
  { id: "algorithms", label: "Algorithms", depth: 18, ry: -10, delay: 2.1 },
  { id: "math", label: "Mathematics", depth: 12, ry: -8, delay: 0.7 },
  { id: "engineering", label: "Engineering", depth: 16, ry: -8, delay: 1.7 },
  { id: "systems", label: "Systems", depth: 8, ry: -6, delay: 2.6 },
  { id: "biology", label: "Biology", depth: 20, ry: -8, delay: 0.4 },
];

function HeroHUD() {
  return (
    <div className="hero-hud" aria-hidden="true">
      {PANELS.map((panel) => (
        <div
          key={panel.id}
          className={`hero-slot hero-slot--${panel.id}`}
          style={{ "--depth": panel.depth, "--ry": `${panel.ry}deg`, "--delay": `${panel.delay}s` } as CSSProperties}
        >
          <div className="hero-panel">
            <PanelArt id={panel.id} />
            <span>{panel.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PanelArt({ id }: { id: PanelId }) {
  switch (id) {
    case "physics":
      // A tiny projectile trajectory with launch point and landing marker.
      return (
        <svg viewBox="0 0 100 58" className="hero-panel-art">
          <path d="M8 50h84" className="hero-panel-grid" />
          <path d="M14 50Q50 -8 86 50" />
          <path d="M14 50Q50 -8 86 50" className="hero-panel-glow" />
          <circle cx="14" cy="50" r="3" className="hero-panel-fill" />
          <circle cx="50" cy="21" r="3.2" className="hero-panel-fill-cyan" />
          <circle cx="86" cy="50" r="2.5" className="hero-panel-fill-cyan" />
        </svg>
      );
    case "data":
      return (
        <svg viewBox="0 0 100 58" className="hero-panel-art">
          <path d="M8 48h84M8 11v37M9 42l15-9 13 5 14-17 13 10 13-5 16-16" />
          <path d="M9 48V12h82v36" className="hero-panel-grid" />
          <path d="m9 42 15-9 13 5 14-17 13 10 13-5 16-16" className="hero-panel-glow" />
        </svg>
      );
    case "algorithms":
      return (
        <svg viewBox="0 0 100 58" className="hero-panel-art">
          <path d="m16 43 22-29 24 19 23-22M16 43l37 5 9-15 23 18M38 14l15 34" />
          <circle cx="16" cy="43" r="3" className="hero-panel-fill-cyan" />
          <circle cx="38" cy="14" r="3" className="hero-panel-fill" />
          <circle cx="62" cy="33" r="3.5" className="hero-panel-fill-cyan" />
          <circle cx="85" cy="11" r="3" className="hero-panel-fill" />
          <circle cx="53" cy="48" r="2.5" className="hero-panel-fill" />
          <circle cx="85" cy="51" r="2.5" className="hero-panel-fill-cyan" />
        </svg>
      );
    case "math":
      return <em className="hero-eq">∂²u/∂t² = c²∇²u</em>;
    case "engineering":
      return (
        <svg viewBox="0 0 100 58" className="hero-panel-art">
          <circle cx="50" cy="29" r="18" />
          <circle cx="50" cy="29" r="8" />
          <path d="M50 6v8M50 44v8M27 29h8M65 29h8M34 13l6 6M60 39l6 6M66 13l-6 6M40 39l-6 6" />
        </svg>
      );
    case "systems":
      return (
        <svg viewBox="0 0 140 54" className="hero-panel-art">
          <path d="M4 32c14 0 14-21 28-21s14 36 28 36 14-29 28-29 14 18 28 18 14-12 20-12" />
          <path d="M4 32c14 0 14-21 28-21s14 36 28 36 14-29 28-29 14 18 28 18 14-12 20-12" className="hero-panel-glow" />
        </svg>
      );
    case "biology":
      return (
        <svg viewBox="0 0 100 58" className="hero-panel-art">
          <path d="m28 30 21-17 23 16-13 17-22-4zM49 13l10 33M28 30l31 16M49 13l23 16" />
          <circle cx="28" cy="30" r="3" className="hero-panel-fill-cyan" />
          <circle cx="49" cy="13" r="4" className="hero-panel-fill" />
          <circle cx="72" cy="29" r="3.5" className="hero-panel-fill-cyan" />
          <circle cx="59" cy="46" r="3" className="hero-panel-fill" />
          <circle cx="37" cy="42" r="3" className="hero-panel-fill-cyan" />
        </svg>
      );
  }
}
