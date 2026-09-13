"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Campus from "./Campus";

export type Stage = "campus" | "block";

const VIEWS: Record<Stage, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  // Looking straight down the axial plaza, through the gate.
  campus: { pos: new THREE.Vector3(16, 30, 92), look: new THREE.Vector3(2, 9, 6) },
  // Standing at the C Block entrance.
  block: { pos: new THREE.Vector3(19, 8, 63), look: new THREE.Vector3(26, 7, 34) },
};

function CameraRig({ stage }: { stage: Stage }) {
  const { camera } = useThree();
  const look = useMemo(() => VIEWS.campus.look.clone(), []);

  useFrame((state, delta) => {
    const view = VIEWS[stage];
    const t = 1 - Math.pow(0.0015, delta); // frame-rate independent damping

    const target = view.pos.clone();
    if (stage === "campus") {
      // Slow drift, so the overview never looks like a still render.
      const a = state.clock.elapsedTime * 0.06;
      target.x += Math.sin(a) * 13;
      target.y += Math.sin(a * 0.8) * 2.4;
      target.z += Math.cos(a) * 6;
    }

    camera.position.lerp(target, t);
    look.lerp(view.look, t);
    camera.lookAt(look);
  });

  return null;
}

/** Warm dusk gradient, painted into a canvas rather than pulled from a CDN. */
function Sky() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#5f86b4");
    g.addColorStop(0.42, "#b9c8d2");
    g.addColorStop(0.68, "#f0d9b4");
    g.addColorStop(1, "#f6c893");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[300, 32, 24]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Uses a real campus model when one is dropped at /public/models/campus.glb. */
function GltfCampus({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function useCustomModel() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/models/campus.glb", { method: "HEAD" })
      .then((r) => alive && r.ok && setUrl("/models/campus.glb"))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return url;
}

export default function CampusScene({ stage }: { stage: Stage }) {
  const model = useCustomModel();

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [16, 30, 92], fov: 48, near: 0.5, far: 700 }}
    >
      <fog attach="fog" args={["#e8d4b6", 200, 470]} />

      {/* Late afternoon: low warm sun, cool sky bounce off the sandstone. */}
      <hemisphereLight args={["#cfe0f2", "#8a7757", 1.35]} />
      <directionalLight
        position={[-70, 52, 70]}
        intensity={2.5}
        color="#ffd9a3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-far={300}
      />
      <ambientLight intensity={0.35} color="#f0e2cc" />

      <Sky />

      <Suspense fallback={null}>{model ? <GltfCampus url={model} /> : <Campus />}</Suspense>

      <CameraRig stage={stage} />
    </Canvas>
  );
}
