"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CREAM = "#ece4d2";
const CREAM_DARK = "#c9bfa8";
const ROOF = "#8d5a3b";
const GLASS = "#3fd0ff";

/**
 * Text rendered into a canvas texture. Keeps the scene free of any runtime
 * font download, which matters when this is demoed on campus wifi.
 */
function Label({
  text,
  position,
  width,
  height,
  color,
}: {
  text: string;
  position: [number, number, number];
  width: number;
  height: number;
  color: string;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.round((1024 * height) / width);
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.round(canvas.height * 0.58)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "8px";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }, [text, width, height, color]);

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/** Row of windows on a facade, drawn as one emissive plane grid. */
function Windows({
  count,
  rows,
  width,
  height,
  z,
  color = GLASS,
}: {
  count: number;
  rows: number;
  width: number;
  height: number;
  z: number;
  color?: string;
}) {
  const cells = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < count; c++) {
        const x = (c - (count - 1) / 2) * (width / count);
        const y = (r - (rows - 1) / 2) * (height / rows);
        out.push([x, y]);
      }
    }
    return out;
  }, [count, rows, width, height]);

  return (
    <group position={[0, 0, z]}>
      {cells.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0]}>
          <planeGeometry args={[width / count / 1.9, height / rows / 2.4]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={i % 5 === 0 ? 1.6 : 0.55}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The colonnaded main block, the building everyone pictures for Galgotias. */
function MainBuilding() {
  const columns = useMemo(() => Array.from({ length: 13 }, (_, i) => (i - 6) * 2.4), []);

  return (
    <group position={[0, 0, -6]}>
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[34, 8, 12]} />
        <meshStandardMaterial color={CREAM} roughness={0.85} />
      </mesh>

      {/* central tower + pediment */}
      <mesh position={[0, 9.5, 1]} castShadow>
        <boxGeometry args={[12, 5, 10]} />
        <meshStandardMaterial color={CREAM} roughness={0.8} />
      </mesh>
      <mesh position={[0, 12.6, 1]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[7.6, 3.2, 4]} />
        <meshStandardMaterial color={ROOF} roughness={0.7} />
      </mesh>
      <mesh position={[0, 15, 1]}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshStandardMaterial color="#ffce5c" emissive="#ffce5c" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* colonnade */}
      {columns.map((x) => (
        <mesh key={x} position={[x, 3.4, 6.4]} castShadow>
          <cylinderGeometry args={[0.52, 0.6, 6.8, 12]} />
          <meshStandardMaterial color={CREAM} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 7.2, 6.4]}>
        <boxGeometry args={[34, 1.2, 2.6]} />
        <meshStandardMaterial color={CREAM_DARK} roughness={0.8} />
      </mesh>

      <Windows count={12} rows={2} width={32} height={5} z={6.06} />

      <Label
        text="GALGOTIAS UNIVERSITY"
        position={[0, 8.4, 7.8]}
        width={16}
        height={1.6}
        color="#ffe9a8"
      />
    </group>
  );
}

/** A generic academic block. `highlight` turns it into the C Block target. */
function Block({
  position,
  rotation = 0,
  label,
  size = [12, 9, 9] as [number, number, number],
  highlight = false,
}: {
  position: [number, number, number];
  rotation?: number;
  label: string;
  size?: [number, number, number];
  highlight?: boolean;
}) {
  const sign = useRef<THREE.Mesh>(null);
  const [w, h, d] = size;

  useFrame(({ clock }) => {
    if (!highlight || !sign.current) return;
    const m = sign.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 1.8 + Math.sin(clock.elapsedTime * 2.2) * 0.8;
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={CREAM} roughness={0.9} />
      </mesh>
      <mesh position={[0, h + 0.25, 0]}>
        <boxGeometry args={[w + 0.8, 0.5, d + 0.8]} />
        <meshStandardMaterial color={ROOF} roughness={0.7} />
      </mesh>

      <Windows
        count={4}
        rows={3}
        width={w - 2}
        height={h - 2.5}
        z={d / 2 + 0.06}
        color={highlight ? "#ff5fa2" : GLASS}
      />

      {/* entrance */}
      <mesh position={[0, 1.6, d / 2 + 0.08]}>
        <planeGeometry args={[3.2, 3.2]} />
        <meshStandardMaterial
          color={highlight ? "#ff9ecb" : "#1b2a3a"}
          emissive={highlight ? "#ff5fa2" : "#0d1520"}
          emissiveIntensity={highlight ? 1.4 : 0.2}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={sign} position={[0, h - 1.1, d / 2 + 0.12]}>
        <planeGeometry args={[w - 3, 1.5]} />
        <meshStandardMaterial
          color="#12060f"
          emissive={highlight ? "#ff2f87" : "#20303f"}
          emissiveIntensity={highlight ? 2 : 0.35}
          toneMapped={false}
        />
      </mesh>
      <Label
        text={label}
        position={[0, h - 1.1, d / 2 + 0.2]}
        width={w - 3.4}
        height={1.2}
        color={highlight ? "#fff0f6" : "#9fb6c8"}
      />
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 1.4, 6]} />
        <meshStandardMaterial color="#4a3524" />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <coneGeometry args={[1.15, 3, 7]} />
        <meshStandardMaterial color="#1f6f4a" roughness={1} />
      </mesh>
    </group>
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 3.4, 6]} />
        <meshStandardMaterial color="#2b3440" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <sphereGeometry args={[0.26, 12, 12]} />
        <meshStandardMaterial color="#ffd79a" emissive="#ffc46b" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 3.5, 0]} color="#ffc46b" intensity={7} distance={12} decay={2} />
    </group>
  );
}

export default function Campus() {
  const trees = useMemo<[number, number, number][]>(
    () => [
      [-22, 0, 12], [-17, 0, 17], [-26, 0, 2], [-12, 0, 22],
      [-6, 0, 26], [6, 0, 26], [24, 0, 28], [30, 0, 10],
    ],
    [],
  );
  const lamps = useMemo<[number, number, number][]>(
    () => [[-7, 0, 14], [7, 0, 14], [-7, 0, 24], [7, 0, 24]],
    [],
  );

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#101a24" roughness={1} />
      </mesh>
      {/* lawn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 14]} receiveShadow>
        <planeGeometry args={[26, 22]} />
        <meshStandardMaterial color="#16412f" roughness={1} />
      </mesh>
      {/* walkway to C Block */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[16, 0.03, 12]} receiveShadow>
        <planeGeometry args={[5, 26]} />
        <meshStandardMaterial color="#2a3340" roughness={0.9} />
      </mesh>

      <MainBuilding />
      <Block position={[-21, 0, 6]} rotation={Math.PI / 9} label="A BLOCK" />
      <Block position={[21, 0, -4]} rotation={-Math.PI / 9} label="B BLOCK" />
      <Block position={[18, 0, 19]} rotation={-Math.PI / 14} label="C BLOCK" size={[13, 10, 9]} highlight />

      {trees.map((p, i) => <Tree key={i} position={p} />)}
      {lamps.map((p, i) => <Lamp key={i} position={p} />)}
    </group>
  );
}
