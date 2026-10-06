"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Pointer = { current: { x: number; y: number } };

function Scene({ pointer, compact, still }: { pointer: Pointer; compact: boolean; still: boolean }) {
  const system = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (still || !system.current) return;
    const elapsed = state.clock.elapsedTime;
    const targetX = pointer.current.y * 0.035 + Math.sin(elapsed * 0.08) * 0.012;
    const targetY = pointer.current.x * 0.045 + Math.sin(elapsed * 0.055) * 0.018;
    system.current.rotation.x = THREE.MathUtils.damp(system.current.rotation.x, targetX, 1.5, delta);
    system.current.rotation.y = THREE.MathUtils.damp(system.current.rotation.y, targetY, 1.5, delta);
  });

  return (
    <group ref={system} scale={compact ? 0.84 : 1}>
      <CoordinateGrid />
      <ParticleField count={compact ? 190 : 420} still={still} />
      <OrbitalSystem still={still} />
      <ProjectileArc still={still} />
    </group>
  );
}

function CoordinateGrid() {
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (let x = -6; x <= 6; x += 0.6) points.push(x, -3.2, -3.4, x, 3.2, -3.4);
    for (let y = -3; y <= 3; y += 0.6) points.push(-6, y, -3.4, 6, y, -3.4);
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return result;
  }, []);

  return <lineSegments geometry={geometry}><lineBasicMaterial color="#59658a" transparent opacity={0.105} /></lineSegments>;
}

function ParticleField({ count, still }: { count: number; still: boolean }) {
  const fineCount = Math.round(count * 0.72);
  return (
    <group>
      <ParticleLayer count={fineCount} size={0.019} seedOffset={0} speed={0.006} still={still} />
      <ParticleLayer count={count - fineCount} size={0.034} seedOffset={1000} speed={-0.004} still={still} />
    </group>
  );
}

function ParticleLayer({ count, size, seedOffset, speed, still }: {
  count: number;
  size: number;
  seedOffset: number;
  speed: number;
  still: boolean;
}) {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    // A small deterministic hash keeps the field stable between renders.
    for (let index = 0; index < count; index += 1) {
      const seed = index + seedOffset + 1;
      const fract = (value: number) => value - Math.floor(value);
      values[index * 3] = (fract(Math.sin(seed * 12.9898) * 43758.5453) - 0.5) * 15;
      values[index * 3 + 1] = (fract(Math.sin(seed * 78.233) * 24634.6345) - 0.5) * 8;
      values[index * 3 + 2] = -1.5 - fract(Math.sin(seed * 39.425) * 15731.743) * 8;
    }
    return values;
  }, [count, seedOffset]);

  useFrame((state, delta) => {
    if (still || !points.current) return;
    points.current.rotation.y += delta * speed;
    points.current.position.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.035;
  });

  return <points ref={points}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial color="#aeb9e9" size={size} transparent opacity={size > 0.03 ? 0.4 : 0.52} sizeAttenuation depthWrite={false} />
  </points>;
}

function OrbitalSystem({ still }: { still: boolean }) {
  return (
    <group position={[1.55, 0.38, -0.2]}>
      <pointLight color="#8178ff" intensity={1.7} distance={5.4} decay={2} />
      <mesh>
        <sphereGeometry args={[0.32, 40, 40]} />
        <meshPhysicalMaterial color="#b7c2ff" emissive="#5147bd" emissiveIntensity={0.7} roughness={0.24} metalness={0.1} clearcoat={0.7} />
      </mesh>
      <mesh rotation={[0.16, 0.2, 0.2]}>
        <torusGeometry args={[0.48, 0.012, 6, 100]} />
        <meshBasicMaterial color="#aaa4ff" transparent opacity={0.62} />
      </mesh>
      <Orbit radius={0.9} tilt={[0.9, 0.2, 0.05]} color="#92a3ff" speed={0.34} phase={0.5} still={still} />
      <Orbit radius={1.43} tilt={[0.45, -0.18, 0.42]} color="#70d9ed" speed={0.22} phase={2.1} still={still} />
      <Orbit radius={1.9} tilt={[1.22, 0.28, -0.24]} color="#9584e8" speed={0.14} phase={4.1} still={still} />
    </group>
  );
}

function Orbit({ radius, tilt, color, speed, phase, still }: {
  radius: number;
  tilt: [number, number, number];
  color: string;
  speed: number;
  phase: number;
  still: boolean;
}) {
  const body = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (still || !body.current) return;
    const angle = state.clock.elapsedTime * speed + phase;
    body.current.position.set(radius * Math.cos(angle), radius * 0.72 * Math.sin(angle), 0);
  });
  return (
    <group rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.006, 5, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.23} />
      </mesh>
      <mesh ref={body} position={[radius * Math.cos(phase), radius * 0.72 * Math.sin(phase), 0]}>
        <sphereGeometry args={[0.055, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.42} roughness={0.32} />
      </mesh>
    </group>
  );
}

function ProjectileArc({ still }: { still: boolean }) {
  const marker = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => {
    // A compact projectile model: x=v₀cos(θ)t; y=v₀sin(θ)t−½gt².
    const velocity = 3.3;
    const angle = THREE.MathUtils.degToRad(42);
    const gravity = 2.3;
    const flightTime = (2 * velocity * Math.sin(angle)) / gravity;
    const samples = Array.from({ length: 90 }, (_, index) => {
      const t = (index / 89) * flightTime;
      return new THREE.Vector3(
        -4.35 + velocity * Math.cos(angle) * t * 0.78,
        -1.33 + (velocity * Math.sin(angle) * t - 0.5 * gravity * t * t) * 0.78,
        1.05 + Math.sin((t / flightTime) * Math.PI) * 0.18,
      );
    });
    return new THREE.CatmullRomCurve3(samples);
  }, []);
  const points = useMemo(() => curve.getPoints(120), [curve]);
  const start = points[0];
  const end = points[points.length - 1];

  useFrame((state) => {
    if (still || !marker.current) return;
    const progress = (state.clock.elapsedTime * 0.19) % 1;
    curve.getPointAt(progress, marker.current.position);
  });

  return (
    <group>
      <Line points={points} color="#8f9eff" lineWidth={1.6} transparent opacity={0.72} />
      <mesh position={start}><sphereGeometry args={[0.085, 20, 20]} /><meshBasicMaterial color="#aeb8ff" /></mesh>
      <mesh position={end}><ringGeometry args={[0.11, 0.135, 36]} /><meshBasicMaterial color="#7ee2f1" side={THREE.DoubleSide} transparent opacity={0.82} /></mesh>
      <mesh ref={marker} position={curve.getPointAt(0.55)}>
        <sphereGeometry args={[0.072, 20, 20]} />
        <meshBasicMaterial color="#e5f6ff" />
      </mesh>
      <pointLight position={curve.getPointAt(0.55)} color="#61d7ef" intensity={0.42} distance={1.15} />
    </group>
  );
}

function TrajectoryFallback() {
  return (
    <svg viewBox="0 0 640 440" className="h-full w-full" role="img" aria-label="Projectile trajectory and orbit visualization">
      <defs><radialGradient id="fallback-star"><stop stopColor="#C4B5FD" stopOpacity=".9"/><stop offset="1" stopColor="#6366F1" stopOpacity=".12"/></radialGradient></defs>
      <g fill="none" strokeLinecap="round">
        <ellipse cx="414" cy="177" rx="135" ry="54" transform="rotate(-25 414 177)" stroke="#8994ff" strokeOpacity=".38"/>
        <ellipse cx="414" cy="177" rx="100" ry="39" transform="rotate(28 414 177)" stroke="#5fc9df" strokeOpacity=".38"/>
        <path d="M55 335 Q177 140 310 305" stroke="#aab2ff" strokeOpacity=".75" strokeWidth="2"/>
        <path d="M414 120v114M357 177h114" stroke="#aaa4ff" strokeOpacity=".22"/>
      </g>
      <circle cx="414" cy="177" r="20" fill="url(#fallback-star)"/>
      <circle cx="331" cy="159" r="5" fill="#7de0ef"/>
      <circle cx="55" cy="335" r="5" fill="#c5caff"/>
      <circle cx="310" cy="305" r="5" fill="#7de0ef"/>
      <path d="M72 376h220" stroke="#7180b2" strokeOpacity=".25"/>
    </svg>
  );
}

export function Hero3D() {
  const reducedMotion = useReducedMotion();
  const still = Boolean(reducedMotion);
  const pointer = useRef({ x: 0, y: 0 });
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  function trackPointer(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointer.current.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointer.current.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
  }

  function resetPointer() {
    pointer.current.x = 0;
    pointer.current.y = 0;
  }

  return (
    <div className="hero-visual" onPointerMove={trackPointer} onPointerLeave={resetPointer} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, compact ? 12.2 : 11.2], fov: compact ? 43 : 40 }}
        dpr={compact ? [1, 1.2] : [1, 1.5]}
        frameloop={still ? "demand" : "always"}
        fallback={<TrajectoryFallback />}
        gl={{ alpha: true, antialias: !compact, powerPreference: "low-power" }}
      >
        <ambientLight intensity={0.58} />
        <directionalLight position={[-3, 5, 5]} intensity={1.15} color="#d8dcff" />
        <pointLight position={[2, 1, 3]} intensity={0.45} color="#a28bff" />
        <Scene pointer={pointer} compact={compact} still={still} />
      </Canvas>
    </div>
  );
}
