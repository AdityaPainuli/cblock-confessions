"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import Campus from "./Campus";
import { FLIGHT_MS, easeInOutCubic } from "@/lib/flight";
import type { BlockId } from "@/lib/blocks";
import { QUALITY, type Tier } from "@/lib/useDeviceTier";

export type Stage = "campus" | "blocks" | "wall";

type View = { pos: THREE.Vector3; look: THREE.Vector3 };

/**
 * The drifting overview, then a near-plan view for choosing a block: high
 * enough to look over the entrance gate and read all four buildings at once.
 */
const VIEWS: Record<"campus" | "blocks", View> = {
  campus: { pos: new THREE.Vector3(16, 30, 92), look: new THREE.Vector3(2, 9, 6) },
  blocks: { pos: new THREE.Vector3(0, 96, 74), look: new THREE.Vector3(0, 2, 4) },
};

/** Standing at each block's entrance, derived from its placement in Campus. */
const WALL_VIEWS: Record<BlockId, View> = {
  A: { pos: new THREE.Vector3(-25, 10, 57), look: new THREE.Vector3(-30, 7, 25) },
  B: { pos: new THREE.Vector3(-22, 10, 26), look: new THREE.Vector3(-32, 7, -4) },
  C: { pos: new THREE.Vector3(17, 9, 62), look: new THREE.Vector3(26, 7, 34) },
  D: { pos: new THREE.Vector3(23, 10, 28), look: new THREE.Vector3(32, 7, -2) },
};

// Phones are portrait, so every view needs more distance to fit the frame. The
// camera retreats along its own sight line rather than being scaled from the
// origin, which would swing it sideways and change the angle on the building.
const PORTRAIT_PULLBACK = 1.45;

function frame(view: View, portrait: boolean, out: THREE.Vector3) {
  out.copy(view.pos);
  if (portrait) out.sub(view.look).multiplyScalar(PORTRAIT_PULLBACK).add(view.look);
  return out;
}

/**
 * Flies the camera between views rather than snapping to them. Every move
 * starts from wherever the camera actually is, eases, and arcs upward through
 * the middle so it sweeps over the campus instead of sliding through it.
 */
function CameraRig({
  stage,
  block,
  drifting,
  onArrive,
}: {
  stage: Stage;
  block: BlockId;
  drifting: boolean;
  onArrive: () => void;
}) {
  const { camera, size } = useThree();

  const look = useRef(VIEWS.campus.look.clone());
  const fromPos = useRef(new THREE.Vector3());
  const fromLook = useRef(new THREE.Vector3());
  const progress = useRef(1);
  const route = useRef("");
  const scratch = useRef(new THREE.Vector3());
  const scratchDest = useRef(new THREE.Vector3());

  // Held in a ref so a new callback identity never restarts a flight.
  const arrive = useRef(onArrive);
  useEffect(() => {
    arrive.current = onArrive;
  }, [onArrive]);

  useFrame((state, delta) => {
    const view = stage === "wall" ? WALL_VIEWS[block] : VIEWS[stage];

    const dest = frame(view, size.height > size.width, scratchDest.current);

    const key = `${stage}:${block}`;
    if (route.current !== key) {
      route.current = key;
      fromPos.current.copy(camera.position);
      fromLook.current.copy(look.current);
      progress.current = 0;
    }

    if (progress.current < 1) {
      const seconds = FLIGHT_MS[stage] / 1000;
      progress.current = Math.min(1, progress.current + delta / seconds);
      const e = easeInOutCubic(progress.current);

      // Arc over the campus rather than clipping through a building.
      const span = fromPos.current.distanceTo(dest);
      const lift = Math.sin(e * Math.PI) * Math.min(span * 0.18, 26);

      scratch.current.lerpVectors(fromPos.current, dest, e);
      scratch.current.y += lift;
      camera.position.copy(scratch.current);

      look.current.lerpVectors(fromLook.current, view.look, e);

      if (progress.current >= 1) arrive.current();
    } else if (drifting) {
      // Slow drift on the overview, so it never looks like a still render.
      const a = state.clock.elapsedTime * 0.06;
      const t = 1 - Math.pow(0.0015, delta);
      dest.x += Math.sin(a) * 13;
      dest.y += Math.sin(a * 0.8) * 2.4;
      dest.z += Math.cos(a) * 6;
      camera.position.lerp(dest, t);
      look.current.lerp(view.look, t);
    }

    camera.lookAt(look.current);
  });

  return null;
}

/**
 * Forces a redraw whenever the paused canvas could be holding a stale frame:
 * the moment a flight lands, when the tab comes back, and after a resize. In
 * `demand` mode nothing redraws on its own, so a dropped final frame would
 * otherwise stay on screen.
 */
function Repaint({ on }: { on: string }) {
  const { invalidate } = useThree();

  useEffect(() => {
    // Two frames: one for the state that just changed, one after layout.
    invalidate();
    const raf = requestAnimationFrame(() => invalidate());
    return () => cancelAnimationFrame(raf);
  }, [on, invalidate]);

  useEffect(() => {
    const redraw = () => invalidate();
    document.addEventListener("visibilitychange", redraw);
    window.addEventListener("resize", redraw);
    return () => {
      document.removeEventListener("visibilitychange", redraw);
      window.removeEventListener("resize", redraw);
    };
  }, [invalidate]);

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
  /**
   * A flight has to be drawn frame by frame; once it lands, only the drifting
   * overview keeps the loop alive. Everything else holds a still frame, which
   * is what stops a phone redrawing a static campus behind the feed.
   *
   * `landed` names the route that has finished, so a change of stage or block
   * makes this false again without a setState during render.
   */
  const [landed, setLanded] = useState("");
  const route = `${stage}:${block}`;
  const flying = landed !== route;

  const onArrive = useCallback(() => setLanded(route), [route]);

  const drifting = visible && stage === "campus";
  const active = visible && (drifting || flying);

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

      <CameraRig stage={stage} block={block} drifting={drifting} onArrive={onArrive} />
      <Repaint on={`${route}:${landed}:${visible}`} />
    </Canvas>
  );
}
