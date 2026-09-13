"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BRAND, CAMPUS } from "@/lib/palette";
import type { Quality } from "@/lib/useDeviceTier";

type Placement = { position: [number, number, number]; scale?: number; rotation?: number };

/**
 * Draws one geometry many times in a single call. The campus has dozens of
 * palms, shrubs and pylons; as separate meshes that is dozens of draw calls a
 * frame, which is exactly what a mid-range phone cannot spare.
 */
function Instanced({
  placements,
  color,
  castShadow = false,
  children,
}: {
  placements: Placement[];
  color: string;
  castShadow?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Object3D();
    placements.forEach((p, i) => {
      m.position.set(...p.position);
      m.rotation.set(0, p.rotation ?? 0, 0);
      const s = p.scale ?? 1;
      m.scale.set(s, s, s);
      m.updateMatrix();
      ref.current!.setMatrixAt(i, m.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [placements]);

  if (!placements.length) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, placements.length]}
      castShadow={castShadow}
    >
      {children}
      <meshStandardMaterial color={color} roughness={1} />
    </instancedMesh>
  );
}

/**
 * Text baked into a canvas texture. Keeps the scene free of any runtime font
 * download, which matters when this gets demoed on campus wifi.
 */
function Label({
  text,
  position,
  rotation = [0, 0, 0],
  width,
  height,
  color,
  weight = 700,
  spacing = 8,
  serif = false,
}: {
  text: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  color: string;
  weight?: number;
  spacing?: number;
  serif?: boolean;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = Math.max(32, Math.round((1024 * height) / width));
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    const family = serif ? '"Times New Roman", Georgia, serif' : "Helvetica, Arial, sans-serif";
    ctx.font = `${weight} ${Math.round(canvas.height * 0.6)}px ${family}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${spacing}px`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 4;
    return tex;
  }, [text, width, height, color, weight, spacing, serif]);

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
}

/**
 * Continuous glazing band, the horizontal ribbon that runs across every
 * academic block on this campus rather than punched individual windows.
 */
function GlazingBands({
  floors,
  width,
  depth,
  floorHeight,
  base = 1.6,
  lit = false,
}: {
  floors: number;
  width: number;
  depth: number;
  floorHeight: number;
  base?: number;
  lit?: boolean;
}) {
  const rows = useMemo(
    () => Array.from({ length: floors }, (_, i) => base + i * floorHeight + floorHeight * 0.55),
    [floors, floorHeight, base],
  );

  return (
    <group>
      {rows.map((y, i) => (
        <group key={y}>
          {/* recessed glass */}
          <mesh position={[0, y, depth / 2 - 0.18]}>
            <boxGeometry args={[width - 2.2, floorHeight * 0.42, 0.3]} />
            <meshStandardMaterial
              color={CAMPUS.glass}
              emissive={lit ? CAMPUS.interior : "#0d1318"}
              emissiveIntensity={lit ? 0.5 + (i % 2) * 0.35 : 0.12}
              roughness={0.25}
              metalness={0.15}
            />
          </mesh>
          {/* projecting slab that shades it */}
          <mesh position={[0, y + floorHeight * 0.32, depth / 2 + 0.22]} castShadow>
            <boxGeometry args={[width + 0.5, 0.34, 1.1]} />
            <meshStandardMaterial color={CAMPUS.sand} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Standing-seam barrel vault, the curved roof on the newer blocks. `axis` is
 * the horizontal direction the vault runs along.
 */
function BarrelVault({
  position,
  length,
  radius,
  axis = "x",
}: {
  position: [number, number, number];
  length: number;
  radius: number;
  axis?: "x" | "z";
}) {
  return (
    <group position={position} rotation={[0, axis === "x" ? Math.PI / 2 : 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[radius, radius, length, 24, 1, true, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial
          color={CAMPUS.vault}
          side={THREE.DoubleSide}
          roughness={0.45}
          metalness={0.35}
        />
      </mesh>
    </group>
  );
}

/**
 * One academic block. Cream sandstone mass, ribbon glazing, a red sandstone
 * stair tower breaking the elevation, optionally capped with a barrel vault.
 */
function AcademicBlock({
  position,
  rotation = 0,
  label,
  width,
  depth,
  floors,
  vault = false,
  tower = true,
  highlight = false,
  underConstruction = false,
}: {
  position: [number, number, number];
  rotation?: number;
  label?: string;
  width: number;
  depth: number;
  floors: number;
  vault?: boolean;
  tower?: boolean;
  highlight?: boolean;
  /** Draws scaffolding instead of a finished elevation. */
  underConstruction?: boolean;
}) {
  const sign = useRef<THREE.Mesh>(null);
  const floorHeight = 3.6;
  const base = 1.6;
  const height = base + floors * floorHeight;

  useFrame(({ clock }) => {
    if (!highlight || !sign.current) return;
    const m = sign.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = 1.5 + Math.sin(clock.elapsedTime * 2) * 0.7;
  });

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* plinth */}
      <mesh position={[0, base / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[width + 1, base, depth + 1]} />
        <meshStandardMaterial color={CAMPUS.sandShade} roughness={0.95} />
      </mesh>

      {/* main mass */}
      <mesh position={[0, base + (height - base) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height - base, depth]} />
        <meshStandardMaterial color={CAMPUS.sand} roughness={0.92} />
      </mesh>

      <GlazingBands
        floors={floors}
        width={width}
        depth={depth}
        floorHeight={floorHeight}
        base={base}
        lit={highlight}
      />

      {/* red sandstone stair tower */}
      {tower && (
        <mesh position={[width / 2 - 2.2, (height + 1.6) / 2, depth / 2 + 0.7]} castShadow>
          <boxGeometry args={[4, height + 1.6, 2.8]} />
          <meshStandardMaterial color={CAMPUS.terracotta} roughness={0.95} />
        </mesh>
      )}

      {/* parapet */}
      <mesh position={[0, height + 0.45, 0]} castShadow>
        <boxGeometry args={[width + 0.9, 0.9, depth + 0.9]} />
        <meshStandardMaterial color={CAMPUS.sandShade} roughness={0.9} />
      </mesh>

      {underConstruction && (
        <group>
          {Array.from({ length: 7 }, (_, i) => (i - 3) * (width / 7)).map((x) => (
            <mesh key={x} position={[x, (height + 3) / 2, depth / 2 + 1.1]}>
              <boxGeometry args={[0.16, height + 3, 0.16]} />
              <meshStandardMaterial color="#9a8a63" roughness={1} />
            </mesh>
          ))}
          {Array.from({ length: floors + 1 }, (_, i) => 2 + i * 3.6).map((y) => (
            <mesh key={y} position={[0, y, depth / 2 + 1.1]}>
              <boxGeometry args={[width, 0.14, 0.14]} />
              <meshStandardMaterial color="#9a8a63" roughness={1} />
            </mesh>
          ))}
          {/* crane */}
          <mesh position={[width / 2 + 3, (height + 10) / 2, -depth / 3]}>
            <boxGeometry args={[0.5, height + 10, 0.5]} />
            <meshStandardMaterial color={CAMPUS.terracotta} roughness={0.9} />
          </mesh>
          <mesh position={[width / 2 - 3, height + 10, -depth / 3]}>
            <boxGeometry args={[14, 0.45, 0.45]} />
            <meshStandardMaterial color={CAMPUS.terracotta} roughness={0.9} />
          </mesh>
        </group>
      )}

      {vault && !underConstruction && (
        <BarrelVault
          position={[0, height + 0.8, 0]}
          length={width * 0.88}
          radius={depth * 0.34}
          axis="x"
        />
      )}

      {/* entrance portal */}
      <mesh position={[-width / 6, base + 1.7, depth / 2 + 0.1]}>
        <planeGeometry args={[5.4, 3.4]} />
        <meshStandardMaterial
          color={highlight ? "#f7e2cf" : CAMPUS.glass}
          emissive={highlight ? BRAND.gold : "#10181e"}
          emissiveIntensity={highlight ? 0.9 : 0.15}
        />
      </mesh>

      {label && (
        <>
          <mesh ref={sign} position={[0, height - 1.4, depth / 2 + 0.14]}>
            <planeGeometry args={[width * 0.62, 1.9]} />
            <meshStandardMaterial
              color={highlight ? BRAND.maroon : CAMPUS.sandShade}
              emissive={highlight ? BRAND.maroon : "#000000"}
              emissiveIntensity={highlight ? 1.6 : 0}
              roughness={0.8}
            />
          </mesh>
          <Label
            text={label}
            position={[0, height - 1.4, depth / 2 + 0.22]}
            width={width * 0.58}
            height={1.4}
            color={highlight ? "#fff4e6" : BRAND.maroonDeep}
            spacing={14}
          />
        </>
      )}
    </group>
  );
}

/**
 * The main administrative building: the landmark at the head of the axis, with
 * the deep colonnade and the pyramid-roofed centre tower.
 */
function MainBuilding({ position }: { position: [number, number, number] }) {
  const columns = useMemo(() => Array.from({ length: 15 }, (_, i) => (i - 7) * 3.1), []);

  return (
    <group position={position}>
      {/* wings */}
      <mesh position={[0, 7, 0]} castShadow receiveShadow>
        <boxGeometry args={[52, 14, 20]} />
        <meshStandardMaterial color={CAMPUS.sand} roughness={0.92} />
      </mesh>
      <mesh position={[0, 14.6, 0]} castShadow>
        <boxGeometry args={[53, 1.2, 21]} />
        <meshStandardMaterial color={CAMPUS.sandShade} roughness={0.9} />
      </mesh>

      {/* centre tower */}
      <mesh position={[0, 17.5, 2]} castShadow receiveShadow>
        <boxGeometry args={[18, 7, 16]} />
        <meshStandardMaterial color={CAMPUS.sand} roughness={0.9} />
      </mesh>
      <mesh position={[0, 22.6, 2]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[13.6, 5.4, 4]} />
        <meshStandardMaterial color={CAMPUS.terracottaDeep} roughness={0.8} />
      </mesh>
      <mesh position={[0, 26.2, 2]} castShadow>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshStandardMaterial
          color={BRAND.gold}
          emissive={BRAND.gold}
          emissiveIntensity={0.7}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* colonnade across the front */}
      {columns.map((x) => (
        <mesh key={x} position={[x, 5.6, 10.6]} castShadow>
          <cylinderGeometry args={[0.62, 0.72, 11.2, 12]} />
          <meshStandardMaterial color={CAMPUS.gateStone} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 11.9, 10.6]} castShadow>
        <boxGeometry args={[52, 1.6, 3.4]} />
        <meshStandardMaterial color={CAMPUS.sandShade} roughness={0.9} />
      </mesh>

      {/* glazing behind the colonnade */}
      <mesh position={[0, 5.4, 10.05]}>
        <boxGeometry args={[48, 7.4, 0.3]} />
        <meshStandardMaterial
          color={CAMPUS.glass}
          emissive={CAMPUS.interior}
          emissiveIntensity={0.32}
          roughness={0.25}
          metalness={0.15}
        />
      </mesh>

      <Label
        text="GALGOTIAS UNIVERSITY"
        position={[0, 13.2, 12.4]}
        width={30}
        height={2.1}
        color={BRAND.maroonDeep}
        weight={400}
        spacing={14}
        serif
      />
    </group>
  );
}

/** The trabeated sandstone entrance gate, with the name incised in the beam. */
function Gate({ position }: { position: [number, number, number] }) {
  const piers = useMemo(() => [-13, -4.5, 4.5, 13], []);

  return (
    <group position={position}>
      {piers.map((x) => (
        <mesh key={x} position={[x, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.6, 10, 2.8]} />
          <meshStandardMaterial color={CAMPUS.gateStone} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 11.1, 0]} castShadow>
        <boxGeometry args={[32, 2.6, 4.4]} />
        <meshStandardMaterial color={CAMPUS.gateStone} roughness={0.95} />
      </mesh>
      <Label
        text="GALGOTIAS UNIVERSITY"
        position={[0, 11.2, 2.24]}
        width={26}
        height={1.7}
        color="#9c8f75"
        weight={400}
        spacing={16}
        serif
      />
    </group>
  );
}

/**
 * Palms and shrubs, drawn instanced. A palm is a trunk plus a crown; the crown
 * is one cone rather than seven frond planes, which reads the same at the
 * distance this camera ever sits at and costs a fraction of the geometry.
 */
function Planting({ palms, shrubs }: { palms: Placement[]; shrubs: Placement[] }) {
  return (
    <group>
      <Instanced placements={palms} color={CAMPUS.trunk}>
        <cylinderGeometry args={[0.16, 0.28, 4.8, 6]} />
      </Instanced>
      <Instanced
        placements={palms.map((p) => ({
          ...p,
          position: [p.position[0], p.position[1] + 5.2, p.position[2]],
        }))}
        color={CAMPUS.foliage}
      >
        <coneGeometry args={[2.3, 2.6, 7]} />
      </Instanced>
      <Instanced placements={shrubs} color={CAMPUS.foliage}>
        <sphereGeometry args={[0.85, 8, 6]} />
      </Instanced>
    </group>
  );
}

/** Red sandstone pylons lining the central axis, drawn instanced. */
function Pylons({ placements }: { placements: Placement[] }) {
  return (
    <group>
      <Instanced placements={placements} color={CAMPUS.terracotta}>
        <boxGeometry args={[1.5, 4.2, 1.5]} />
      </Instanced>
      <Instanced
        placements={placements.map((p) => ({
          ...p,
          position: [p.position[0], p.position[1] + 2.25, p.position[2]],
        }))}
        color={CAMPUS.sandShade}
      >
        <boxGeometry args={[1.9, 0.4, 1.9]} />
      </Instanced>
    </group>
  );
}

/** Jet in the axial water channel. */
function Fountain({ position }: { position: [number, number, number] }) {
  const jet = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!jet.current) return;
    const t = clock.elapsedTime * 1.6 + position[2];
    jet.current.scale.y = 1 + Math.sin(t) * 0.22;
  });

  return (
    <mesh ref={jet} position={[position[0], 1.1, position[2]]}>
      <cylinderGeometry args={[0.08, 0.22, 2.2, 8]} />
      <meshStandardMaterial
        color="#eaf6fa"
        transparent
        opacity={0.62}
        roughness={0.1}
        emissive="#cfeaf4"
        emissiveIntensity={0.35}
      />
    </mesh>
  );
}

export default function Campus({ quality }: { quality: Quality }) {
  // Lower tiers thin out the repeated props rather than dropping them entirely,
  // so the campus keeps its shape on a phone.
  const step = useMemo(
    () => (n: number) => (quality.props >= 1 ? n : Math.round(n / Math.max(quality.props, 0.34))),
    [quality.props],
  );
  const thin = useMemo(
    () =>
      <T,>(arr: T[]): T[] =>
        quality.props >= 1 ? arr : arr.filter((_, i) => i % Math.round(1 / quality.props) === 0),
    [quality.props],
  );

  const pylons = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    for (let z = 40; z >= 4; z -= step(9)) {
      out.push({ position: [-9.5, 2.1, z] }, { position: [9.5, 2.1, z] });
    }
    return out;
  }, [step]);

  const fountains = useMemo<[number, number, number][]>(
    () =>
      (quality.props >= 1 ? [8, 17, 26, 35] : quality.props > 0 ? [17, 31] : []).map(
        (z) => [0, 0, z] as [number, number, number],
      ),
    [quality.props],
  );

  const palms = useMemo<Placement[]>(() => {
    const all: [number, number, number][] = [
      [-16, 44, 1], [16, 44, 1.1], [-16, 30, 0.9], [16, 30, 1],
      [-16, 16, 1.05], [16, 16, 0.95], [-34, 34, 1.1], [34, 36, 1],
      [-24, 46, 0.9], [26, 46, 1.05],
    ];
    return thin(all).map(([x, z, sc]) => ({ position: [x, 2.4, z], scale: sc }));
  }, [thin]);

  const shrubs = useMemo<Placement[]>(() => {
    const out: Placement[] = [];
    const ring = quality.props >= 1 ? 12 : 6;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2;
      out.push({ position: [Math.sin(a) * 6, 0.8, 50 + Math.cos(a) * 6], scale: 0.9 });
    }
    for (let z = 10; z <= 40; z += step(6)) {
      out.push(
        { position: [-14, 0.6, z], scale: 0.7 },
        { position: [14, 0.6, z], scale: 0.7 },
      );
    }
    return out;
  }, [quality.props, step]);

  return (
    <group>
      {/* ground and lawns */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[900, 900]} />
        <meshStandardMaterial color={CAMPUS.lawnDeep} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-20, 0.02, 26]} receiveShadow>
        <planeGeometry args={[24, 52]} />
        <meshStandardMaterial color={CAMPUS.lawn} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, 0.02, 26]} receiveShadow>
        <planeGeometry args={[24, 52]} />
        <meshStandardMaterial color={CAMPUS.lawn} roughness={1} />
      </mesh>

      {/* the axial plaza running from the gate to the academic blocks */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 24]} receiveShadow>
        <planeGeometry args={[26, 60]} />
        <meshStandardMaterial color={CAMPUS.paving} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 24]} receiveShadow>
        <planeGeometry args={[13, 58]} />
        <meshStandardMaterial color={CAMPUS.pavingDark} roughness={0.95} />
      </mesh>

      {/* water channel down the middle of the axis */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 24]}>
        <planeGeometry args={[4.6, 48]} />
        <meshStandardMaterial
          color={CAMPUS.water}
          roughness={0.08}
          metalness={0.55}
          emissive="#2f6b7d"
          emissiveIntensity={0.16}
        />
      </mesh>

      {/* roundabout at the gate end */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 50]} receiveShadow>
        <circleGeometry args={[7.6, 36]} />
        <meshStandardMaterial color={CAMPUS.lawn} roughness={1} />
      </mesh>

      <Gate position={[0, 0, 62]} />

      {/* blocks, laid out the way the campus reads from the air */}
      <MainBuilding position={[0, 0, -26]} />

      <AcademicBlock
        position={[-31, 0, 16]}
        rotation={0.14}
        label="A BLOCK"
        width={30}
        depth={17}
        floors={4}
        underConstruction
      />
      <AcademicBlock
        position={[-34, 0, -12]}
        rotation={0.3}
        label="B BLOCK"
        width={26}
        depth={17}
        floors={4}
        underConstruction
      />
      <AcademicBlock
        position={[28, 0, 26]}
        rotation={-0.3}
        label="C BLOCK"
        width={26}
        depth={16}
        floors={4}
        vault
        highlight
      />
      <AcademicBlock
        position={[34, 0, -10]}
        rotation={-0.28}
        label="D BLOCK"
        width={26}
        depth={17}
        floors={4}
        underConstruction
      />

      <Pylons placements={pylons} />
      <Planting palms={palms} shrubs={shrubs} />
      {fountains.map((p, i) => (
        <Fountain key={i} position={p} />
      ))}
    </group>
  );
}
