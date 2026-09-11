"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import Campus from "./Campus";

export type Stage = "campus" | "block";

const VIEWS: Record<Stage, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  campus: { pos: new THREE.Vector3(3, 15, 52), look: new THREE.Vector3(3, 7, 4) },
  block: { pos: new THREE.Vector3(16, 5, 36), look: new THREE.Vector3(17.5, 4.5, 19) },
};

/** Glides the camera between the campus overview and the C Block doorway. */
function CameraRig({ stage }: { stage: Stage }) {
  const { camera } = useThree();
  const look = useRef(VIEWS.campus.look.clone());

  useFrame((state, delta) => {
    const view = VIEWS[stage];
    const t = 1 - Math.pow(0.0015, delta); // frame-rate independent damping

    const target = view.pos.clone();
    if (stage === "campus") {
      // lazy orbit so the overview never feels like a static render
      const a = state.clock.elapsedTime * 0.09;
      target.x += Math.sin(a) * 10;
      target.z += Math.cos(a) * 6;
      target.y += Math.sin(a * 0.7) * 2;
    }

    camera.position.lerp(target, t);
    look.current.lerp(view.look, t);
    camera.lookAt(look.current);
  });

  return null;
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
      camera={{ position: [3, 15, 52], fov: 48, near: 0.5, far: 400 }}
    >
      <color attach="background" args={["#070b12"]} />
      <fog attach="fog" args={["#070b12", 90, 230]} />

      <hemisphereLight args={["#7fb0ff", "#0b1018", 1.1]} />
      <directionalLight
        position={[18, 30, 20]}
        intensity={1.8}
        color="#bfd8ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <Suspense fallback={null}>
        {model ? <GltfCampus url={model} /> : <Campus />}
      </Suspense>

      <Stars radius={140} depth={50} count={2200} factor={4} fade speed={0.6} />
      <CameraRig stage={stage} />
    </Canvas>
  );
}
