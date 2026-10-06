"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function FloatingShape({
  position,
  color,
  geometry,
}: {
  position: [number, number, number];
  color: string;
  geometry: "icosa" | "torus" | "octa" | "box";
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  const geo = useMemo(() => {
    switch (geometry) {
      case "icosa": return <icosahedronGeometry args={[1, 1]} />;
      case "torus": return <torusGeometry args={[0.8, 0.35, 16, 48]} />;
      case "octa": return <octahedronGeometry args={[1, 0]} />;
      case "box": return <boxGeometry args={[1.2, 1.2, 1.2]} />;
    }
  }, [geometry]);

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <mesh ref={meshRef} position={position}>
        {geo}
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={0.32}
        />
      </mesh>
    </Float>
  );
}

function Particles() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(240 * 3);

    for (let i = 0; i < 240; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    return arr;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y =
        state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>

      <pointsMaterial
        size={0.04}
        color="#a5b4fc"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export function Hero3D() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[680px] opacity-45">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />

        <FloatingShape position={[-4.8, 1.2, 0]} color="#6366f1" geometry="icosa" />
        <FloatingShape position={[5.1, -0.8, 0]} color="#a855f7" geometry="torus" />
        <FloatingShape position={[5, 2.2, -2]} color="#22d3ee" geometry="octa" />
        <FloatingShape position={[-4.8, -1.5, -1]} color="#818cf8" geometry="box" />

        <Particles />
      </Canvas>
    </div>
  );
}
