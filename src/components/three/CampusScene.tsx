"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import Campus from "./Campus";
import type { BlockId } from "@/lib/blocks";
import { QUALITY, type Tier } from "@/lib/useDeviceTier";

export type Stage = "campus" | "blocks" | "wall";

type View = { pos: THREE.Vector3; look: THREE.Vector3 };

/** Drifting overview, then a high framing that shows every block at once. */
const VIEWS: Record<"campus" | "blocks", View> = {
  campus: { pos: new THREE.Vector3(16, 30, 92), look: new THREE.Vector3(2, 9, 6) },
  blocks: { pos: new THREE.Vector3(0, 52, 104), look: new THREE.Vector3(0, 4, 4) },
};

/** Standing at each block's entrance, derived from its placement in Campus. */
const WALL_VIEWS: Record<BlockId, View> = {
  A: { pos: new THREE.Vector3(-26, 9, 50), look: new THREE.Vector3(-30, 7, 25) },
  B: { pos: new THREE.Vector3(-24, 9, 20), look: new THREE.Vector3(-32, 7, -4) },
  C: { pos: new THREE.Vector3(19, 8, 56), look: new THREE.Vector3(26, 7, 34) },
  D: { pos: new THREE.Vector3(25, 9, 22), look: new THREE.Vector3(32, 7, -2) },
};

// Phones are portrait, so the campus needs to be further away to fit the frame.
const PORTRAIT_PULLBACK = 1.42;

function CameraRig({
  stage,
  block,
  active,
}: {
  stage: Stage;
  block: BlockId;
  active: boolean;
}) {
  const { camera, size } = useThree();
  const look = useMemo(() => VIEWS.campus.look.clone(), []);

  useFrame((state, delta) => {
    const view = stage === "wall" ? WALL_VIEWS[block] : VIEWS[stage];
    const t = 1 - Math.pow(0.0015, delta); // frame-rate independent damping
    const portrait = size.height > size.width;

    const target = view.pos.clone();
    if (portrait) target.multiplyScalar(PORTRAIT_PULLBACK).setY(view.pos.y * 1.12);

    if (stage === "campus" && active) {
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

/** Uses a real campus model when one is dropped at /public/models/campus.glb. */
function GltfCampus({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} />;
}

function useCustomModel() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch("/models/campus.glb", { method: "HEAD", signal: ac.signal })
      .then((r) => r.ok && setUrl("/models/campus.glb"))
      .catch(() => {});
    return () => ac.abort();
  }, []);
  return url;
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

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh scale={[-1, 1, 1]} renderOrder={-1}>
      <sphereGeometry args={[300, 24, 16]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export default function CampusScene({
  stage,
  block,
  tier,
}: {
  stage: Stage;
  block: BlockId;
  tier: Tier;
}) {
  const model = useCustomModel();
  const q = QUALITY[tier];

  /**
   * The canvas keeps rendering while it is on screen and stops the moment it is
   * not: once the reader is in the feed the scene is almost fully veiled, and a
   * phone should not be spending its battery drawing a campus nobody can see.
   */
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Only the drifting overview needs a live loop; the other stages settle and
  // then hold, so a phone is not redrawing a static frame forever.
  const active = visible && stage === "campus";

  return (
    <Canvas
      shadows={q.shadows}
      dpr={q.dpr}
      frameloop={active ? "always" : "demand"}
      gl={{ antialias: q.antialias, powerPreference: "high-performance" }}
      camera={{ position: [16, 30, 92], fov: 48, near: 1, far: 520 }}
    >
      <fog attach="fog" args={["#e8d4b6", 200, 470]} />

      {/* Late afternoon: low warm sun, cool sky bounce off the sandstone. */}
      <hemisphereLight args={["#cfe0f2", "#8a7757", 1.35]} />
      <directionalLight
        position={[-70, 52, 70]}
        intensity={2.5}
        color="#ffd9a3"
        castShadow={q.shadows}
        shadow-mapSize={[q.shadowMap, q.shadowMap]}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-far={300}
      />
      <ambientLight intensity={0.35} color="#f0e2cc" />

      <Sky />

      <Suspense fallback={null}>
        {model ? <GltfCampus url={model} /> : <Campus quality={q} />}
      </Suspense>

      <CameraRig stage={stage} block={block} active={active} />
      {/* One last frame after the camera settles, so "demand" leaves it correct. */}
      <Settle stage={`${stage}:${block}`} />
    </Canvas>
  );
}

/** Drives a few frames after a stage change so the paused canvas lands settled. */
function Settle({ stage }: { stage: string }) {
  const { invalidate } = useThree();
  useEffect(() => {
    let raf = 0;
    const until = performance.now() + 1800;
    const tick = () => {
      invalidate();
      if (performance.now() < until) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage, invalidate]);
  return null;
}
