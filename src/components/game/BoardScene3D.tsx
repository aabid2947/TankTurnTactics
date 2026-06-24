import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Crosshair, Footprints, type LucideIcon, RotateCcw, Undo2, Zap } from "lucide-react";
import { BOARD_SIZE, TANKS, YOU, type Tank } from "@/lib/mock";
import { chebyshev, neighbors8 } from "@/lib/geometry";
import { cn } from "@/lib/utils";

type Mode = "move" | "shoot" | null;
type Phase = "idle" | "moving" | "firing";
type Cell = { x: number; y: number };

const HALF = (BOARD_SIZE - 1) / 2;
const GROUND_Y = 0.121;
const DEMO_AP = YOU.ap;

const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const nthPrime = (n: number) => {
  let found = 0;
  let c = 1;
  while (found < n) {
    c += 1;
    if (isPrime(c)) found += 1;
  }
  return c;
};
const moveCost = (n: number) => (n <= 1 ? 1 : nthPrime(n - 1));
const turretColor = (c: string) => new THREE.Color(c).multiplyScalar(0.82).getStyle();

/* ─────────────────────────── 3D scene pieces ─────────────────────────── */

// [worldX, worldZ, biomeIdx] — placed outside the grid (grid spans ±9.5 in x/z)
const TREES: [number, number, number][] = [
  [-13, -13, 0], [-17, -10, 0], [-12, -17, 0], [-16, -7, 0], // Grassland (far-left)
  [ 13, -13, 1], [ 17, -10, 1], [ 12, -17, 1], [ 16, -7, 1], // Desert    (far-right)
  [-13,  13, 2], [-17,  10, 2], [-12,  17, 2], [-16,  7, 2], // Tundra    (near-left)
  [ 13,  13, 3], [ 17,  10, 3], [ 12,  17, 3], [ 16,  7, 3], // Forest    (near-right)
];

const BIOME_COLORS = [
  { trunk: "#6B4423", canopy: "#4CAF50" }, // 0 Grassland — MC oak  (brown / leaf green)
  { trunk: "#4A8F28", canopy: "#4A8F28" }, // 1 Desert    — MC cactus (solid green)
  { trunk: "#C0B8A8", canopy: "#E8EEF8" }, // 2 Tundra    — MC birch (pale bark / snow leaves)
  { trunk: "#2D1B0A", canopy: "#2E7D32" }, // 3 Forest    — MC dark oak (near-black / dark green)
];

/** Minecraft-style pixelated four-biome board:
 *  TL Grassland, TR Desert, BL Snowy Tundra, BR Forest.
 *  Each cell gets MC block pixel-noise; thin grid lines + bold biome dividers. */
function makeBoardTexture() {
  const px = 26; // texture pixels per board cell
  const W = BOARD_SIZE * px;
  const c = document.createElement("canvas");
  c.width = c.height = W;
  const ctx = c.getContext("2d")!;
  // [base, shade, highlight] per biome quadrant
  const biomes = [
    ["#5EA81A", "#4E9616", "#6AC028"], // 0 TL MC Grassland
    ["#E8CC6A", "#D4B85A", "#F0D87A"], // 1 TR MC Desert/Sand
    ["#EEF4F8", "#DDEAF2", "#FAFEFF"], // 2 BL MC Snowy Tundra
    ["#3D7A1A", "#2E6012", "#4E9022"], // 3 BR MC Forest
  ];
  for (let i = 0; i < BOARD_SIZE; i++) {
    for (let j = 0; j < BOARD_SIZE; j++) {
      const bi = (i >= BOARD_SIZE / 2 ? 1 : 0) + (j >= BOARD_SIZE / 2 ? 2 : 0);
      const [base, shade] = biomes[bi];
      const cellBase = (i + j) % 2 === 0 ? base : shade;
      // Fill cell base
      ctx.fillStyle = cellBase;
      ctx.fillRect(i * px, j * px, px, px);
      // Minecraft pixel-noise: 3×3 patches inside each cell
      const [, shd, hi] = biomes[bi];
      for (let py = 1; py < px - 1; py += 3) {
        for (let qx = 1; qx < px - 1; qx += 3) {
          const r = Math.random();
          if (r < 0.18) ctx.fillStyle = shd;
          else if (r < 0.28) ctx.fillStyle = hi;
          else continue;
          ctx.fillRect(i * px + qx, j * px + py, 3, 3);
        }
      }
    }
  }
  // Thin block grid lines (MC look)
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  for (let k = 1; k < BOARD_SIZE; k++) {
    ctx.beginPath();
    ctx.moveTo(k * px, 0); ctx.lineTo(k * px, W);
    ctx.moveTo(0, k * px); ctx.lineTo(W, k * px);
    ctx.stroke();
  }
  // Bold biome-zone dividers
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, W);
  ctx.moveTo(0, W / 2); ctx.lineTo(W, W / 2);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Minecraft grass block top texture for the surrounding area — 4×4 pixel patches. */
function makeGrassTexture() {
  const W = 128;
  const c = document.createElement("canvas");
  c.width = c.height = W;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#5EA81A";
  ctx.fillRect(0, 0, W, W);
  // MC-style 4×4 pixel noise
  for (let x = 0; x < W; x += 4) {
    for (let y = 0; y < W; y += 4) {
      const r = Math.random();
      if (r < 0.22) ctx.fillStyle = "#4E9616";
      else if (r < 0.32) ctx.fillStyle = "#6AC028";
      else continue;
      ctx.fillRect(x, y, 4, 4);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  return t;
}

/** Classic Minecraft sky — flat blue with hazy horizon. */
function SceneBg() {
  const { scene } = useThree();
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#87CEEB");
    g.addColorStop(0.6, "#A8D8F0");
    g.addColorStop(0.88, "#C8E8F8");
    g.addColorStop(1, "#D8EEF0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => {
    const prev = scene.background;
    scene.background = tex;
    return () => {
      scene.background = prev;
    };
  }, [scene, tex]);
  return null;
}

function BattlefieldGround({ onPick }: { onPick: (c: Cell) => void }) {
  const boardTex = useMemo(makeBoardTexture, []);
  const grassTex = useMemo(makeGrassTexture, []);
  const handle = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const x = Math.round(e.point.x + HALF);
    const y = Math.round(e.point.z + HALF);
    if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) onPick({ x, y });
  };
  return (
    <group>
      {/* cartoon-grass surroundings */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={grassTex} roughness={0.85} />
      </mesh>
      {/* ink-black platform — neo-brutalist frame for the board */}
      <mesh position={[0, -0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[BOARD_SIZE + 0.6, 0.52, BOARD_SIZE + 0.6]} />
        <meshStandardMaterial color="#141414" roughness={0.8} />
      </mesh>
      {/* playable biome grid surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} receiveShadow onClick={handle}>
        <planeGeometry args={[BOARD_SIZE, BOARD_SIZE]} />
        <meshStandardMaterial map={boardTex} roughness={0.72} />
      </mesh>
    </group>
  );
}

/** Minecraft voxel-style props — all geometry is box-based (no curves). */
function BattlefieldProps() {
  return (
    <group>
      {TREES.map(([x, z, biome], i) => {
        const { trunk, canopy } = BIOME_COLORS[biome];
        const h = 1.6 + (i % 4) * 0.4;  // trunk height varies
        const isDesert = biome === 1;     // desert = cactus shape
        return (
          <group key={i} position={[x, -0.4, z]}>
            {isDesert ? (
              // MC cactus: tall thin green box + two stubby arm boxes
              <>
                <mesh position={[0, h / 2, 0]} castShadow>
                  <boxGeometry args={[0.44, h, 0.44]} />
                  <meshStandardMaterial color={canopy} roughness={0.85} />
                </mesh>
                <mesh position={[-0.5, h * 0.55, 0]} castShadow>
                  <boxGeometry args={[0.44, h * 0.35, 0.44]} />
                  <meshStandardMaterial color={canopy} roughness={0.85} />
                </mesh>
                <mesh position={[0.5, h * 0.62, 0]} castShadow>
                  <boxGeometry args={[0.44, h * 0.32, 0.44]} />
                  <meshStandardMaterial color={canopy} roughness={0.85} />
                </mesh>
              </>
            ) : (
              // MC oak/dark-oak/birch: square log trunk + wide flat leaf cluster
              <>
                <mesh position={[0, h / 2, 0]} castShadow>
                  <boxGeometry args={[0.44, h, 0.44]} />
                  <meshStandardMaterial color={trunk} roughness={0.9} />
                </mesh>
                {/* Main leaf block — wide, slightly shorter than tall */}
                <mesh position={[0, h + 0.72, 0]} castShadow>
                  <boxGeometry args={[1.76, 0.88, 1.76]} />
                  <meshStandardMaterial color={canopy} roughness={0.8} />
                </mesh>
                {/* Second tier — narrower on top (MC oak leaf shape) */}
                <mesh position={[0, h + 1.44, 0]} castShadow>
                  <boxGeometry args={[1.1, 0.72, 1.1]} />
                  <meshStandardMaterial color={canopy} roughness={0.8} />
                </mesh>
              </>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Tile({ cell, color, opacity = 0.55, y = GROUND_Y + 0.012 }: { cell: Cell; color: string; opacity?: number; y?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cell.x - HALF, y, cell.y - HALF]}>
      <planeGeometry args={[0.92, 0.92]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function TankMesh({ tank, selected, aimAt, onSelect }: { tank: Tank; selected: boolean; aimAt?: Cell | null; onSelect?: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const turret = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(tank.x - HALF, GROUND_Y, tank.y - HALF));
  targetPos.current.set(tank.x - HALF, GROUND_Y, tank.y - HALF);
  const aim = useRef(0);
  if (aimAt) aim.current = Math.atan2(aimAt.x - tank.x, aimAt.y - tank.y);

  useFrame((_, dt) => {
    if (ref.current) ref.current.position.lerp(targetPos.current, Math.min(1, dt * 9));
    if (turret.current) {
      let d = aim.current - turret.current.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      turret.current.rotation.y += d * Math.min(1, dt * 8);
    }
  });

  const dead = tank.status === "dead";
  const hull = dead ? "#6b6b6b" : tank.color;
  return (
    <group ref={ref} position={[tank.x - HALF, GROUND_Y, tank.y - HALF]} onClick={onSelect ? (e) => { e.stopPropagation(); onSelect(); } : undefined}>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
          <ringGeometry args={[0.5, 0.62, 28]} />
          <meshBasicMaterial color="#7C3AED" transparent opacity={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[-0.32, 0.13, 0]} castShadow><boxGeometry args={[0.16, 0.22, 0.92]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
      <mesh position={[0.32, 0.13, 0]} castShadow><boxGeometry args={[0.16, 0.22, 0.92]} /><meshStandardMaterial color="#1b1b1b" /></mesh>
      <mesh position={[0, 0.28, 0]} castShadow><boxGeometry args={[0.64, 0.24, 0.84]} /><meshStandardMaterial color={hull} metalness={0.1} roughness={0.7} /></mesh>
      {/* Turret + barrel rotate to aim at the target. */}
      <group ref={turret}>
        <mesh position={[0, 0.5, -0.04]} castShadow><boxGeometry args={[0.4, 0.22, 0.44]} /><meshStandardMaterial color={dead ? "#555" : turretColor(tank.color)} metalness={0.15} roughness={0.6} /></mesh>
        <mesh position={[0, 0.52, 0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, 0.52, 12]} /><meshStandardMaterial color="#2a2a2a" /></mesh>
      </group>
    </group>
  );
}

function GhostTank({ cell, color }: { cell: Cell; color: string }) {
  return (
    <group position={[cell.x - HALF, GROUND_Y, cell.y - HALF]}>
      <mesh position={[0, 0.28, 0]}><boxGeometry args={[0.64, 0.24, 0.84]} /><meshStandardMaterial color={color} transparent opacity={0.32} depthWrite={false} /></mesh>
      <mesh position={[0, 0.5, -0.04]}><boxGeometry args={[0.4, 0.22, 0.44]} /><meshStandardMaterial color={color} transparent opacity={0.32} depthWrite={false} /></mesh>
    </group>
  );
}

/** Floating lock-on reticle ABOVE the cell — depthTest off so it stays visible over a targeted tank. */
function Reticle3D({ cell }: { cell: Cell }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (ref.current) {
      ref.current.rotation.y += dt * 1.2;
      ref.current.position.y = GROUND_Y + 1.2 + Math.sin(t.current * 3) * 0.06;
    }
  });
  return (
    <group ref={ref} position={[cell.x - HALF, GROUND_Y + 1.2, cell.y - HALF]} renderOrder={999}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.38, 6]} />
        <meshBasicMaterial color="#F4524D" transparent opacity={0.95} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.26, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.13, 0.28, 4]} />
        <meshBasicMaterial color="#F4524D" depthTest={false} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#F4524D" depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Tank-shot: muzzle flash from the barrel tip → bright tracer beam + projectile → impact (flash, twin
 *  shockwave rings, smoke). Driven by a single useFrame timeline (~0.6s). */
function ShotFx({ shooter, target }: { shooter: Cell; target: Cell }) {
  const geo = useMemo(() => {
    const s = new THREE.Vector3(shooter.x - HALF, GROUND_Y + 0.52, shooter.y - HALF);
    const tg = new THREE.Vector3(target.x - HALF, GROUND_Y + 0.34, target.y - HALF);
    const flat = new THREE.Vector3(tg.x - s.x, 0, tg.z - s.z).normalize();
    const muzzle = s.clone().add(flat.multiplyScalar(0.55));
    const dir = new THREE.Vector3().subVectors(tg, muzzle).normalize();
    const len = muzzle.distanceTo(tg);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const mid = muzzle.clone().lerp(tg, 0.5);
    return { muzzle, hit: tg, mid, len, quat };
  }, [shooter, target]);

  const muzzleRef = useRef<THREE.Mesh>(null);
  const muzzleLight = useRef<THREE.PointLight>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const projRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const impactLight = useRef<THREE.PointLight>(null);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const smokeRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  const op = (m: THREE.Mesh | null, v: number) => {
    if (m) (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, v);
  };

  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt / 0.8);
    const p = t.current;
    const mp = Math.min(1, p / 0.12);
    if (muzzleRef.current) {
      muzzleRef.current.scale.setScalar(0.2 + mp * 2);
      op(muzzleRef.current, p < 0.12 ? 1 : 1 - (p - 0.12) / 0.14);
    }
    if (muzzleLight.current) muzzleLight.current.intensity = Math.max(0, 1 - p / 0.18) * 9;
    op(beamRef.current, p < 0.05 ? p / 0.05 : 1 - (p - 0.05) / 0.25);
    if (projRef.current) {
      const pp = Math.min(1, p / 0.4);
      projRef.current.position.lerpVectors(geo.muzzle, geo.hit, pp);
      op(projRef.current, pp < 1 ? 1 : 0);
    }
    const ip = p < 0.36 ? 0 : (p - 0.36) / 0.64;
    if (flashRef.current) {
      flashRef.current.scale.setScalar(0.1 + ip * 2.3);
      op(flashRef.current, ip > 0 ? 1 - ip * 1.7 : 0);
    }
    if (impactLight.current) impactLight.current.intensity = ip > 0 ? Math.max(0, 1 - ip * 1.5) * 16 : 0;
    if (ring1.current) {
      ring1.current.scale.setScalar(0.1 + ip * 3.3);
      op(ring1.current, ip > 0 ? 1 - ip : 0);
    }
    if (ring2.current) {
      const i2 = Math.max(0, ip - 0.15);
      ring2.current.scale.setScalar(0.1 + i2 * 4.3);
      op(ring2.current, i2 > 0 ? 1 - i2 * 1.2 : 0);
    }
    if (smokeRef.current) {
      smokeRef.current.position.y = GROUND_Y + 0.35 + ip * 1.1;
      smokeRef.current.scale.setScalar(0.3 + ip * 1.8);
      op(smokeRef.current, ip > 0.1 ? 0.6 - ip * 0.6 : 0);
    }
  });

  return (
    <group>
      <pointLight ref={muzzleLight} position={geo.muzzle} color="#FFE9A8" intensity={0} distance={7} decay={2} />
      <mesh ref={muzzleRef} position={geo.muzzle}><sphereGeometry args={[0.3, 14, 14]} /><meshBasicMaterial color="#FFF3CC" transparent /></mesh>
      <mesh ref={beamRef} position={geo.mid} quaternion={geo.quat}><cylinderGeometry args={[0.07, 0.07, geo.len, 8]} /><meshBasicMaterial color="#FFF3CC" transparent /></mesh>
      <mesh ref={projRef} position={geo.muzzle}><sphereGeometry args={[0.14, 12, 12]} /><meshBasicMaterial color="#F4D44E" transparent /></mesh>
      <pointLight ref={impactLight} position={geo.hit} color="#F4A24D" intensity={0} distance={9} decay={2} />
      <mesh ref={flashRef} position={geo.hit}><sphereGeometry args={[0.45, 14, 14]} /><meshBasicMaterial color="#FFFFFF" transparent /></mesh>
      <mesh ref={ring1} position={[geo.hit.x, GROUND_Y + 0.06, geo.hit.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.3, 0.46, 28]} /><meshBasicMaterial color="#F4524D" transparent side={THREE.DoubleSide} /></mesh>
      <mesh ref={ring2} position={[geo.hit.x, GROUND_Y + 0.05, geo.hit.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.22, 0.34, 28]} /><meshBasicMaterial color="#F4D44E" transparent side={THREE.DoubleSide} /></mesh>
      <mesh ref={smokeRef} position={[geo.hit.x, GROUND_Y + 0.35, geo.hit.z]}><sphereGeometry args={[0.4, 12, 12]} /><meshBasicMaterial color="#6b6b6b" transparent /></mesh>
    </group>
  );
}

/* ───────────────────────────── main board ───────────────────────────── */

export function BoardScene3D({ fill = false, className }: { fill?: boolean; className?: string }) {
  const [tanks, setTanks] = useState<Tank[]>(TANKS);
  const [selectedId, setSelectedId] = useState("t1");
  const [mode, setMode] = useState<Mode>(null);
  const [plannedMoves, setPlannedMoves] = useState<Cell[]>([]);
  const [plannedShot, setPlannedShot] = useState<Cell | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [shotFx, setShotFx] = useState<{ shooter: Cell; target: Cell } | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const selected = tanks.find((t) => t.id === selectedId);
  const range = selected?.isYou ? YOU.range : 2;
  const busy = phase !== "idle";

  const byCell = new Map<string, Tank>();
  for (const t of tanks) byCell.set(`${t.x},${t.y}`, t);

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
  const projected: Cell = plannedMoves.length ? plannedMoves[plannedMoves.length - 1] : selected ? { x: selected.x, y: selected.y } : { x: 0, y: 0 };
  const plannedSet = new Set(plannedMoves.map((c) => `${c.x},${c.y}`));
  const moveCostSoFar = plannedMoves.reduce((s, _c, i) => s + moveCost(i + 1), 0);
  const canAddMove = moveCostSoFar + moveCost(plannedMoves.length + 1) <= DEMO_AP;

  const moveKeys: Cell[] = [];
  const rangeKeys: Cell[] = [];
  if (selected && !busy) {
    if (canAddMove)
      for (const n of neighbors8(projected)) {
        const occ = byCell.get(`${n.x},${n.y}`);
        if (inBounds(n.x, n.y) && !plannedSet.has(`${n.x},${n.y}`) && (!occ || occ.id === selected.id)) moveKeys.push(n);
      }
    for (let x = 0; x < BOARD_SIZE; x++)
      for (let y = 0; y < BOARD_SIZE; y++) {
        const d = chebyshev(projected, { x, y });
        if (d > 0 && d <= range) rangeKeys.push({ x, y });
      }
  }
  const moveKeySet = new Set(moveKeys.map((c) => `${c.x},${c.y}`));
  const rangeKeySet = new Set(rangeKeys.map((c) => `${c.x},${c.y}`));
  const isEnemy = (c: Cell) => {
    const t = byCell.get(`${c.x},${c.y}`);
    return !!t && t.id !== selectedId && t.status !== "dead";
  };

  const reset = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setTanks(TANKS);
    setMode(null);
    setPlannedMoves([]);
    setPlannedShot(null);
    setPhase("idle");
    setShotFx(null);
  };
  const undo = () => {
    if (busy) return;
    if (plannedMoves.length) setPlannedMoves((m) => m.slice(0, -1));
    else if (plannedShot) setPlannedShot(null);
  };
  const pickCell = (cell: Cell) => {
    if (busy || !selected) return;
    const key = `${cell.x},${cell.y}`;
    if (mode === "move" && moveKeySet.has(key)) setPlannedMoves((m) => [...m, cell]);
    else if (mode === "shoot" && rangeKeySet.has(key)) setPlannedShot(cell);
  };

  const resolve = () => {
    if (busy || !selected) return;
    const moves = plannedMoves;
    const shot = plannedShot;
    if (!moves.length && !shot) return;
    setMode(null);
    let t = 0;
    const stepMs = 320;
    if (moves.length) {
      setPhase("moving");
      setPlannedMoves([]);
      moves.forEach((cell) => {
        timers.current.push(window.setTimeout(() => {
          setTanks((ts) => ts.map((tk) => (tk.id === selected.id ? { ...tk, x: cell.x, y: cell.y } : tk)));
        }, t));
        t += stepMs;
      });
    }
    const shooter = moves.length ? moves[moves.length - 1] : { x: selected.x, y: selected.y };
    if (shot) {
      timers.current.push(window.setTimeout(() => {
        setShotFx({ shooter, target: shot });
        setPhase("firing");
      }, t + 150));
      timers.current.push(window.setTimeout(() => {
        setTanks((ts) => ts.map((tk) => (tk.x === shot.x && tk.y === shot.y && tk.status !== "dead" ? { ...tk, hearts: Math.max(0, tk.hearts - 1), status: tk.hearts - 1 <= 0 ? "dead" : tk.status } : tk)));
      }, t + 560));
      timers.current.push(window.setTimeout(() => {
        setPhase("idle");
        setShotFx(null);
        setPlannedShot(null);
      }, t + 1250));
    } else {
      timers.current.push(window.setTimeout(() => setPhase("idle"), t + 120));
    }
  };

  const canAct = !busy && (plannedMoves.length > 0 || !!plannedShot);
  const shooterAim = plannedShot ?? shotFx?.target ?? null;

  return (
    <div className={cn("flex flex-col rounded-[var(--radius)] border-2 border-foreground bg-paper shadow-brutal", fill ? "h-full w-full p-2" : "p-3", className)}>
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-1.5">
        <ModeButton active={mode === "move"} disabled={busy} onClick={() => setMode(mode === "move" ? null : "move")} icon={Footprints} label="Move" tone="accent" />
        <ModeButton active={mode === "shoot"} disabled={busy} onClick={() => setMode(mode === "shoot" ? null : "shoot")} icon={Crosshair} label="Shoot" tone="destructive" />
        <button type="button" disabled={!canAct} onClick={resolve} className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-primary px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <Zap className="size-4" />
          Resolve
        </button>
        {plannedMoves.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-[10px] border-2 border-foreground bg-card px-2 py-1.5 font-mono text-[11px] font-bold tabular-nums" title="Stacked moves · AP cost (1, 2, 3, 5, 7…)">
            <Footprints className="size-3.5" />
            {plannedMoves.length} · {moveCostSoFar} AP
          </span>
        )}
        <button type="button" onClick={undo} disabled={!canAct} aria-label="Undo last queued action" className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-card px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <Undo2 className="size-4" />
          <span className="hidden sm:inline">Undo</span>
        </button>
        <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground bg-card px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <RotateCcw className="size-4" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      <div className={cn("overflow-hidden rounded-md border-2 border-foreground", fill ? "min-h-0 flex-1" : "aspect-square w-full")}>
        <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 13, 13], fov: 40 }}>
          <SceneBg />
          <fog attach="fog" args={["#A8D8F0", 32, 75]} />
          <hemisphereLight args={["#87CEEB", "#5EA81A", 0.95]} />
          <ambientLight intensity={0.55} color="#FFF8E8" />
          <directionalLight position={[12, 18, 8]} intensity={1.45} color="#FFE8A0" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={60} />
          <directionalLight position={[-6, 7, -9]} intensity={0.3} color="#B0D8FF" />

          <BattlefieldGround onPick={pickCell} />
          <BattlefieldProps />

          {mode === "shoot" && rangeKeys.map((c) => <Tile key={`r${c.x},${c.y}`} cell={c} color={isEnemy(c) ? "#F4524D" : "#8B5CF6"} opacity={isEnemy(c) ? 0.5 : 0.22} />)}
          {mode === "move" && moveKeys.map((c) => <Tile key={`m${c.x},${c.y}`} cell={c} color="#9FD356" opacity={0.62} />)}
          {plannedMoves.map((c) => <Tile key={`p${c.x},${c.y}`} cell={c} color="#8B5CF6" opacity={0.32} />)}
          {plannedMoves.length > 0 && selected && phase === "idle" && (
            <Line points={[{ x: selected.x, y: selected.y }, ...plannedMoves].map((c) => [c.x - HALF, GROUND_Y + 0.06, c.y - HALF] as [number, number, number])} color="#7C3AED" lineWidth={3} dashed dashScale={6} />
          )}
          {plannedMoves.length > 0 && selected && phase === "idle" && <GhostTank cell={plannedMoves[plannedMoves.length - 1]} color={selected.color} />}
          {plannedShot && phase === "idle" && <Reticle3D cell={plannedShot} />}

          {tanks.filter((t) => t.x >= 0).map((t) => (
            <TankMesh
              key={t.id}
              tank={t}
              selected={t.id === selectedId}
              aimAt={t.id === selectedId ? shooterAim : null}
              onSelect={!mode && !busy ? () => { setSelectedId(t.id); setPlannedMoves([]); setPlannedShot(null); } : undefined}
            />
          ))}

          {phase === "firing" && shotFx && <ShotFx shooter={shotFx.shooter} target={shotFx.target} />}

          <OrbitControls target={[0, 0, 0]} enablePan={false} minDistance={9} maxDistance={26} minPolarAngle={0.15} maxPolarAngle={Math.PI / 2.25} />
        </Canvas>
      </div>

      {!fill && (
        <p className="mt-2 shrink-0 text-center font-mono text-[11px] text-muted-foreground">
          {mode === "move"
            ? "click cells to stack moves — X→Y→Z (each step costs more AP)"
            : mode === "shoot"
              ? "click a cell in range to target — turret aims, fires from the chain's end"
              : "click a tank to select · stack Moves &/or Shoot · Resolve · drag to orbit"}
        </p>
      )}
    </div>
  );
}

function ModeButton({ active, disabled, onClick, icon: Icon, label, tone }: { active: boolean; disabled?: boolean; onClick: () => void; icon: LucideIcon; label: string; tone: "accent" | "destructive" }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} className={cn("inline-flex items-center gap-1.5 rounded-[10px] border-2 border-foreground px-2.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wide shadow-brutal-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", active ? (tone === "destructive" ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground") : "bg-card")}>
      <Icon className="size-4" />
      {label}
    </button>
  );
}
