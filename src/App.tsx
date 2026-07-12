/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Body, BodyType, Particle, StarBackground, PhysicsConfig, SpawnPreset, LogEvent, Vector3D } from './types';
import { SpaceCanvas } from './components/SpaceCanvas';
import { CosmicDashboard } from './components/CosmicDashboard';
import { BodyInspector } from './components/BodyInspector';
import { InstructionModal } from './components/InstructionModal';
import { Play, Pause, Terminal, Eye, HelpCircle, RefreshCw, Volume2, Plus } from 'lucide-react';

export default function App() {
  const [bodies, setBodies] = useState<Body[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [stars, setStars] = useState<StarBackground[]>([]);
  
  // HUD UI properties
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'ride' | 'cinematic'>('orbit');
  const [rideBodyId, setRideBodyId] = useState<string | null>(null);
  
  // Camera target & angles
  const [cameraTarget, setCameraTarget] = useState<Vector3D>({ x: 0, y: 0, z: 0 });
  const [yaw, setYaw] = useState<number>(Math.PI / 4);
  const [pitch, setPitch] = useState<number>(Math.PI / 6);
  const [zoom, setZoom] = useState<number>(650);

  const [spawnPreset, setSpawnPreset] = useState<SpawnPreset>({
    name: 'Rocky Planet',
    type: 'planet',
    mass: 10,
    radius: 14,
    color: '#3b82f6',
  });

  const [physicsConfig, setPhysicsConfig] = useState<PhysicsConfig>({
    G: 4.0,
    timeScale: 0.50,
    collisionMode: 'merge',
    trailLength: 100,
    showTrails: true,
    showVectors: false,
    gridEnabled: true,
    shadowsEnabled: true,
    paused: false,
  });

  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [showInstructions, setShowInstructions] = useState<boolean>(true);
  const [simulationTime, setSimulationTime] = useState<number>(0);

  // References to keep animation loop clean of closure leaks
  const stateRef = useRef({ bodies, physicsConfig, particles, cameraMode, rideBodyId, selectedBodyId });
  useEffect(() => {
    stateRef.current = { bodies, physicsConfig, particles, cameraMode, rideBodyId, selectedBodyId };
  }, [bodies, physicsConfig, particles, cameraMode, rideBodyId, selectedBodyId]);

  // Telemetry Logs Ref to prevent logs overflow
  const addLog = (text: string, type: 'info' | 'collision' | 'escape' | 'blackhole' = 'info') => {
    const newLog: LogEvent = {
      id: Math.random().toString(),
      timestamp: Date.now(),
      text,
      type,
    };
    setLogEvents((prev) => [newLog, ...prev.slice(0, 49)]); // keep last 50
  };

  // 1. Initial Seeding of Space Dust
  useEffect(() => {
    // Generate star background
    const starList: StarBackground[] = [];
    for (let i = 0; i < 220; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 1000 + Math.random() * 1800;
      starList.push({
        x: Math.sin(phi) * Math.cos(theta) * r,
        y: Math.sin(phi) * Math.sin(theta) * r,
        z: Math.cos(phi) * r,
        size: 0.7 + Math.random() * 1.5,
        brightness: 0.2 + Math.random() * 0.8,
      });
    }
    setStars(starList);

    // Initial default Scenario: Solar Oasis System
    loadPresetScenario('solar_system');
    addLog('FLIGHT TELEMETRY SYSTEM BOOT SEQUENCED ONLINE', 'info');
  }, []);

  // 2. CORE N-BODY PHYSICS INTEGRATION LOOP (60 FPS)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const config = stateRef.current.physicsConfig;

      // Rotate camera automatically in cinematic mode
      if (stateRef.current.cameraMode === 'cinematic') {
        setYaw((y) => (y + 0.0015) % (Math.PI * 2));
      }

      // Update particle explosions (decrease life frames)
      if (stateRef.current.particles.length > 0) {
        setParticles((prevParticles) =>
          prevParticles
            .map((p) => {
              const friction = 0.98;
              return {
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                z: p.z + p.vz,
                vx: p.vx * friction,
                vy: p.vy * friction,
                vz: p.vz * friction,
                life: p.life - 1 / p.maxLife,
              };
            })
            .filter((p) => p.life > 0)
        );
      }

      // Run physical body dynamics if not paused
      if (!config.paused && stateRef.current.bodies.length > 0) {
        const dt = config.timeScale * 0.16; // Fixed timestep delta for gravity stability

        // Run integration & collision updates
        const nextBodies = runNBodySimulation(
          stateRef.current.bodies,
          dt,
          config,
          (text, type, x, y, z, color) => {
            addLog(text, type);
            triggerExplosion(x, y, z, color);
          }
        );

        setBodies(nextBodies);
        setSimulationTime((prev) => prev + dt);

        // Adjust camera target in ride camera mode to sit directly on ridden body
        if (stateRef.current.cameraMode === 'ride' && stateRef.current.rideBodyId) {
          const ridden = nextBodies.find((b) => b.id === stateRef.current.rideBodyId);
          if (ridden) {
            setCameraTarget({ x: ridden.x, y: ridden.y, z: ridden.z });
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Particle burst generator
  const triggerExplosion = (x: number, y: number, z: number, color?: string) => {
    const sparkles: Particle[] = [];
    const count = 30;
    const fallbackColor = color || '#3b82f6';
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 1.0 + Math.random() * 4.5;
      sparkles.push({
        x,
        y,
        z,
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.sin(phi) * Math.sin(theta) * speed,
        vz: Math.cos(phi) * speed,
        color: fallbackColor,
        size: 1.0 + Math.random() * 2.5,
        life: 1.0,
        maxLife: 35 + Math.random() * 25,
      });
    }
    setParticles((prev) => [...prev, ...sparkles]);
  };

  // N-body gravity integration core
  function runNBodySimulation(
    currentBodies: Body[],
    dt: number,
    config: PhysicsConfig,
    onCollision: (text: string, type: 'collision' | 'blackhole', x: number, y: number, z: number, color: string) => void
  ): Body[] {
    const list = currentBodies.map((b) => ({ ...b, trail: [...b.trail] }));
    const G = config.G;
    const softeningSqr = 1.0;

    const ax = new Array(list.length).fill(0);
    const ay = new Array(list.length).fill(0);
    const az = new Array(list.length).fill(0);

    // 1. Calculate relative force accelerations (N^2 complexity, ideal for small sandboxes)
    for (let i = 0; i < list.length; i++) {
      const b1 = list[i];
      if (b1.isDestroyed) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b2 = list[j];
        if (b2.isDestroyed) continue;

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dz = b2.z - b1.z;

        const distSqr = dx * dx + dy * dy + dz * dz + softeningSqr;
        const dist = Math.sqrt(distSqr);

        if (dist < 1e-1) continue;

        const f1 = (G * b2.mass) / (distSqr * dist);
        const f2 = (G * b1.mass) / (distSqr * dist);

        ax[i] += f1 * dx;
        ay[i] += f1 * dy;
        az[i] += f1 * dz;

        ax[j] -= f2 * dx;
        ay[j] -= f2 * dy;
        az[j] -= f2 * dz;
      }
    }

    // 2. Apply Verlet integration
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.isDestroyed) continue;

      b.vx += ax[i] * dt;
      b.vy += ay[i] * dt;
      b.vz += az[i] * dt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      // Track trails
      if (config.showTrails) {
        b.trail.push({ x: b.x, y: b.y, z: b.z });
        if (b.trail.length > config.trailLength) {
          b.trail.shift();
        }
      } else {
        b.trail = [];
      }
    }

    // 3. Handle elastic & merge collisions
    if (config.collisionMode !== 'none') {
      for (let i = 0; i < list.length; i++) {
        const b1 = list[i];
        if (b1.isDestroyed) continue;

        for (let j = i + 1; j < list.length; j++) {
          const b2 = list[j];
          if (b2.isDestroyed) continue;

          const dx = b2.x - b1.x;
          const dy = b2.y - b1.y;
          const dz = b2.z - b1.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const colDist = (b1.radius + b2.radius) * 0.15; // Scaled radius

          if (dist <= colDist) {
            if (config.collisionMode === 'merge') {
              const heavier = b1.mass >= b2.mass ? b1 : b2;
              const lighter = b1.mass < b2.mass ? b1 : b2;

              lighter.isDestroyed = true;

              const totalMass = heavier.mass + lighter.mass;

              // Conservation of momentum
              heavier.vx = (heavier.mass * heavier.vx + lighter.mass * lighter.vx) / totalMass;
              heavier.vy = (heavier.mass * heavier.vy + lighter.mass * lighter.vy) / totalMass;
              heavier.vz = (heavier.mass * heavier.vz + lighter.mass * lighter.vz) / totalMass;

              // Center of mass
              heavier.x = (heavier.mass * heavier.x + lighter.mass * lighter.x) / totalMass;
              heavier.y = (heavier.mass * heavier.y + lighter.mass * lighter.y) / totalMass;
              heavier.z = (heavier.mass * heavier.z + lighter.mass * lighter.z) / totalMass;

              heavier.mass = totalMass;
              heavier.radius = Math.pow(Math.pow(heavier.radius, 3) + Math.pow(lighter.radius, 3), 1 / 3);

              const eventType = heavier.type === 'black_hole' ? 'blackhole' : 'collision';
              const text = eventType === 'blackhole'
                ? `EVENT HORIZON: ${heavier.name} consumed planet ${lighter.name}`
                : `COLLISION: ${heavier.name} swallowed ${lighter.name} (+${lighter.mass.toFixed(0)}e24 kg)`;

              onCollision(text, eventType, heavier.x, heavier.y, heavier.z, lighter.color);
            } else if (config.collisionMode === 'bounce') {
              const safeDist = Math.max(1e-4, dist);
              const nx = dx / safeDist;
              const ny = dy / safeDist;
              const nz = dz / safeDist;

              const rvx = b2.vx - b1.vx;
              const rvy = b2.vy - b1.vy;
              const rvz = b2.vz - b1.vz;

              const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

              if (velAlongNormal < 0) {
                const impulse = (-(1 + 0.6) * velAlongNormal) / (1 / b1.mass + 1 / b2.mass);

                b1.vx -= (impulse * nx) / b1.mass;
                b1.vy -= (impulse * ny) / b1.mass;
                b1.vz -= (impulse * nz) / b1.mass;

                b2.vx += (impulse * nx) / b2.mass;
                b2.vy += (impulse * ny) / b2.mass;
                b2.vz += (impulse * nz) / b2.mass;

                // Push bodies apart
                const overlap = colDist - dist;
                b1.x -= nx * overlap * 0.5;
                b1.y -= ny * overlap * 0.5;
                b1.z -= nz * overlap * 0.5;

                b2.x += nx * overlap * 0.5;
                b2.y += ny * overlap * 0.5;
                b2.z += nz * overlap * 0.5;

                onCollision(
                  `RECOIL IMPACT: ${b1.name} bounced off ${b2.name}`,
                  'collision',
                  (b1.x + b2.x) / 2,
                  (b1.y + b2.y) / 2,
                  (b1.z + b2.z) / 2,
                  '#cbd5e1'
                );
              }
            }
          }
        }
      }
    }

    return list.filter((b) => !b.isDestroyed);
  }

  // Preset Scenario Spawning Formulas
  const loadPresetScenario = (type: string) => {
    setSelectedBodyId(null);
    setRideBodyId(null);
    setCameraMode('orbit');
    setCameraTarget({ x: 0, y: 0, z: 0 });
    setSimulationTime(0);

    let seedBodies: Body[] = [];

    if (type === 'solar_system') {
      setZoom(680);
      setPitch(Math.PI / 6);
      setYaw(Math.PI / 4);

      // SUN
      seedBodies.push({
        id: 'sun',
        name: 'Sol Star',
        mass: 2200,
        radius: 46,
        color: '#fbbf24',
        type: 'star',
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        trail: [],
      });

      // MERCURY
      seedBodies.push({
        id: 'mercury',
        name: 'Hermes Inner',
        mass: 8,
        radius: 10,
        color: '#94a3b8',
        type: 'planet',
        x: 0, y: 0, z: -180,
        vx: 7.0, vy: 0, vz: 0, // sqrt(4 * 2200 / 180) => sqrt(48.8) = ~7.0
        trail: [],
      });

      // EARTH
      seedBodies.push({
        id: 'earth',
        name: 'Terra Habitable',
        mass: 25,
        radius: 15,
        color: '#3b82f6',
        type: 'planet',
        x: 0, y: 0, z: 340,
        vx: -5.1, vy: 0, vz: 0, // sqrt(4 * 2200 / 340) => ~5.1
        trail: [],
      });

      // MOON
      seedBodies.push({
        id: 'moon',
        name: 'Luna',
        mass: 0.15,
        radius: 6,
        color: '#e2e8f0',
        type: 'asteroid',
        x: 0, y: 0, z: 368, // Earth is at 340. Moon is +28.
        vx: -5.1 + 1.8, vy: 0, vz: 0, // Earth's vx + Moon's circular speed relative to earth: sqrt(4 * 25 / 28) => ~1.8
        trail: [],
      });

      // JUPITER Gas giant
      seedBodies.push({
        id: 'jupiter',
        name: 'Zeus Giant',
        mass: 220,
        radius: 26,
        color: '#f97316',
        type: 'gas_giant',
        x: 0, y: 0, z: -580,
        vx: 3.9, vy: 0, vz: 0, // sqrt(4 * 2200 / 580) => ~3.9
        trail: [],
      });

      // Seed small asteroid belt scattered in XZ plane
      for (let i = 0; i < 15; i++) {
        const theta = (i / 15) * Math.PI * 2 + Math.random() * 0.4;
        const radius = 430 + Math.random() * 50;
        const ax = Math.cos(theta) * radius;
        const az = Math.sin(theta) * radius;
        
        // Orbital circular velocity speed
        const orbitalSpeed = Math.sqrt((4 * 2200) / radius);
        const vx = -Math.sin(theta) * orbitalSpeed;
        const vz = Math.cos(theta) * orbitalSpeed;

        seedBodies.push({
          id: `asteroid-${i}`,
          name: `Belt Ceres #${i + 1}`,
          mass: 0.1,
          radius: 5 + Math.random() * 3,
          color: '#64748b',
          type: 'asteroid',
          x: ax, y: (Math.random() - 0.5) * 8, z: az,
          vx, vy: (Math.random() - 0.5) * 0.2, vz,
          trail: [],
        });
      }

      addLog('LOADED: SOLAR SYSTEM SANDBOXPreserve equilibrium orbit matrices', 'info');

    } else if (type === 'binary_star') {
      setZoom(750);
      setPitch(Math.PI / 4);

      // Star A
      seedBodies.push({
        id: 'stara',
        name: 'Alpha Centauri A',
        mass: 1400,
        radius: 38,
        color: '#fb923c',
        type: 'star',
        x: -160, y: 0, z: 0,
        vx: 0, vy: 0, vz: -4.2, // Mutual attraction: sqrt(G*M_b / dist)
        trail: [],
      });

      // Star B
      seedBodies.push({
        id: 'starb',
        name: 'Alpha Centauri B',
        mass: 1400,
        radius: 38,
        color: '#38bdf8',
        type: 'star',
        x: 160, y: 0, z: 0,
        vx: 0, vy: 0, vz: 4.2,
        trail: [],
      });

      // Circumbinary Planet (Outer stable orbit)
      seedBodies.push({
        id: 'cbplanet',
        name: 'Tatooine Circumbinary',
        mass: 18,
        radius: 13,
        color: '#22c55e',
        type: 'planet',
        x: 0, y: 0, z: -480,
        vx: 4.8, vy: 0, vz: 0, // sqrt(G * (Ma + Mb) / dist)
        trail: [],
      });

      addLog('LOADED: BINARY STAR DANCING SYSTEM', 'info');

    } else if (type === 'galaxy_collision') {
      setZoom(1000);
      setPitch(Math.PI / 3);

      // Core Galaxy A
      seedBodies.push({
        id: 'core_a',
        name: 'Andromeda Core',
        mass: 1600,
        radius: 30,
        color: '#f43f5e',
        type: 'star',
        x: -350, y: -40, z: -100,
        vx: 1.8, vy: 0.1, vz: 0.8,
        trail: [],
      });

      // Galaxy A surrounding rings
      for (let i = 0; i < 20; i++) {
        const theta = (i / 20) * Math.PI * 2;
        const radius = 60 + Math.random() * 80;
        const ax = -350 + Math.cos(theta) * radius;
        const az = -100 + Math.sin(theta) * radius;

        const speed = Math.sqrt((4 * 1600) / radius);
        const vx = 1.8 - Math.sin(theta) * speed;
        const vz = 0.8 + Math.cos(theta) * speed;

        seedBodies.push({
          id: `galaxy_a_particle_${i}`,
          name: `Dust A-${i}`,
          mass: 0.05,
          radius: 4,
          color: '#fda4af',
          type: 'asteroid',
          x: ax, y: -40 + (Math.random() - 0.5) * 5, z: az,
          vx, vy: 0.1, vz,
          trail: [],
        });
      }

      // Core Galaxy B
      seedBodies.push({
        id: 'core_b',
        name: 'Milkyway Core',
        mass: 1600,
        radius: 30,
        color: '#3b82f6',
        type: 'star',
        x: 350, y: 40, z: 100,
        vx: -1.8, vy: -0.1, vz: -0.8,
        trail: [],
      });

      // Galaxy B surrounding rings
      for (let i = 0; i < 20; i++) {
        const theta = (i / 20) * Math.PI * 2;
        const radius = 60 + Math.random() * 80;
        const ax = 350 + Math.cos(theta) * radius;
        const az = 100 + Math.sin(theta) * radius;

        const speed = Math.sqrt((4 * 1600) / radius);
        const vx = -1.8 - Math.sin(theta) * speed;
        const vz = -0.8 + Math.cos(theta) * speed;

        seedBodies.push({
          id: `galaxy_b_particle_${i}`,
          name: `Dust B-${i}`,
          mass: 0.05,
          radius: 4,
          color: '#93c5fd',
          type: 'asteroid',
          x: ax, y: 40 + (Math.random() - 0.5) * 5, z: az,
          vx, vy: -0.1, vz,
          trail: [],
        });
      }

      addLog('LOADED: GALACTIC TIDAL MERGER SYSTEM', 'info');

    } else if (type === 'black_hole_catastrophe') {
      setZoom(550);
      setPitch(Math.PI / 5);

      // Supermassive Singularity
      seedBodies.push({
        id: 'singularity',
        name: 'Gargantua Singularity',
        mass: 9000,
        radius: 26,
        color: '#a855f7',
        type: 'black_hole',
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        trail: [],
      });

      // Orbiting gas giant close to edge
      seedBodies.push({
        id: 'doomed_giant',
        name: 'Icarus Giant',
        mass: 140,
        radius: 20,
        color: '#10b981',
        type: 'gas_giant',
        x: 0, y: 0, z: 140,
        vx: -16.0, vy: 0, vz: 0, // sqrt(4 * 9000 / 140) => sqrt(257) = ~16
        trail: [],
      });

      // Accretion light rings
      for (let i = 0; i < 22; i++) {
        const theta = (i / 22) * Math.PI * 2 + Math.random() * 0.3;
        const radius = 190 + Math.random() * 120;
        const ax = Math.cos(theta) * radius;
        const az = Math.sin(theta) * radius;

        const speed = Math.sqrt((4 * 9000) / radius);
        const vx = -Math.sin(theta) * speed;
        const vz = Math.cos(theta) * speed;

        seedBodies.push({
          id: `accretion_disk_${i}`,
          name: `Lensed Matter #${i}`,
          mass: 0.1,
          radius: 4 + Math.random() * 3,
          color: i % 2 === 0 ? '#f97316' : '#c084fc',
          type: 'asteroid',
          x: ax, y: (Math.random() - 0.5) * 4, z: az,
          vx, vy: 0, vz,
          trail: [],
        });
      }

      addLog('LOADED: DOOMED SINGULARITY EVENT HORIZON', 'blackhole');
    }

    setBodies(seedBodies);
  };

  const handleUpdateBody = (id: string, updates: Partial<Body>) => {
    setBodies((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
    if (updates.name) {
      addLog(`RECLASSIFIED: Celestial entity named ${updates.name}`, 'info');
    }
  };

  const handleDeleteBody = (id: string) => {
    const target = bodies.find((b) => b.id === id);
    if (target) {
      addLog(`VAPORIZED: Celestial body ${target.name} removed from physical plane`, 'escape');
      triggerExplosion(target.x, target.y, target.z, target.color);
    }
    setBodies((prev) => prev.filter((b) => b.id !== id));
    if (selectedBodyId === id) setSelectedBodyId(null);
    if (rideBodyId === id) {
      setRideBodyId(null);
      setCameraMode('orbit');
    }
  };

  const handleSpawnBody = (body: Omit<Body, 'trail'>) => {
    const newId = `launched-${Date.now()}`;
    const newBody: Body = {
      ...body,
      id: newId,
      trail: [],
    };
    setBodies((prev) => [...prev, newBody]);
    setSelectedBodyId(newId);
    addLog(`SLINGSHOT LAUNCH: ${newBody.name} orbital path tracked`, 'info');
  };

  const selectedBody = bodies.find((b) => b.id === selectedBodyId && !b.isDestroyed) || null;

  // Find heaviest attractor
  const activeBodiesForHeaviest = bodies.filter((b) => !b.isDestroyed);
  const heaviestBody = activeBodiesForHeaviest.length > 0
    ? activeBodiesForHeaviest.reduce((max, curr) => (curr.mass > max.mass ? curr : max))
    : null;

  return (
    <div className="w-full h-screen flex bg-slate-950 overflow-hidden relative font-sans text-slate-100" id="main-gravity-app-container">
      
      {/* 1. Left Glass Sidebar Controls */}
      <CosmicDashboard
        bodies={bodies}
        physicsConfig={physicsConfig}
        setPhysicsConfig={setPhysicsConfig}
        selectedBodyId={selectedBodyId}
        onSelectBody={(id) => {
          setSelectedBodyId(id);
          const b = bodies.find((x) => x.id === id);
          if (b) {
            setCameraTarget({ x: b.x, y: b.y, z: b.z });
          }
        }}
        spawnPreset={spawnPreset}
        setSpawnPreset={setSpawnPreset}
        onLoadPreset={loadPresetScenario}
        onClearAll={() => {
          setBodies([]);
          setSelectedBodyId(null);
          setRideBodyId(null);
          setCameraMode('orbit');
          setCameraTarget({ x: 0, y: 0, z: 0 });
          addLog('SYSTEM PURGED: ALL CELESTIAL MATERIAL DISSIPATED', 'escape');
        }}
        simulationTime={simulationTime}
      />

      {/* 2. Main 3D Space Viewport Frame */}
      <div className="flex-1 h-full relative flex flex-col min-w-0">
        
        {/* Top-Bar Navigation HUD */}
        <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between px-6 z-10 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="text-xs font-mono">
              <span className="text-slate-500 mr-2">SYSTEM TIME:</span>
              <span className="text-cyan-400 font-bold">{(simulationTime / 10).toFixed(1)} yr</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Instruction manual button */}
            <button
              onClick={() => setShowInstructions(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-mono rounded-lg transition-all"
              id="btn-help-manual"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              FLIGHT MANUAL
            </button>
          </div>
        </div>

        {/* Space Render Layer */}
        <SpaceCanvas
          bodies={bodies}
          particles={particles}
          stars={stars}
          physicsConfig={physicsConfig}
          selectedBodyId={selectedBodyId}
          onSelectBody={(id) => {
            setSelectedBodyId(id);
            if (id === null) {
              setRideBodyId(null);
              if (cameraMode === 'ride') setCameraMode('orbit');
            }
          }}
          spawnPreset={spawnPreset}
          cameraTarget={cameraTarget}
          setCameraTarget={setCameraTarget}
          cameraMode={cameraMode}
          rideBodyId={rideBodyId}
          onSpawnBody={handleSpawnBody}
          yaw={yaw}
          setYaw={setYaw}
          pitch={pitch}
          setPitch={setPitch}
          zoom={zoom}
          setZoom={setZoom}
        />

        {/* Flight Telemetry Logs overlay (HUD terminal feed bottom-left) */}
        <div className="absolute bottom-4 left-4 w-72 h-36 bg-slate-950/80 backdrop-blur-md border border-slate-900 rounded-xl p-3 flex flex-col gap-1.5 pointer-events-auto overflow-hidden">
          <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-slate-500 uppercase border-b border-slate-900 pb-1">
            <Terminal className="w-3 h-3 text-cyan-400 animate-pulse" />
            TELEMETRY LOGS FEED
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-1 scrollbar-thin scrollbar-thumb-slate-900 pr-0.5 text-[9px] font-mono leading-relaxed">
            {logEvents.map((evt) => (
              <div
                key={evt.id}
                className={`truncate ${
                  evt.type === 'collision'
                    ? 'text-orange-400 font-bold'
                    : evt.type === 'blackhole'
                    ? 'text-purple-400 font-bold animate-pulse'
                    : evt.type === 'escape'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                &gt; {evt.text}
              </div>
            ))}
            {logEvents.length === 0 && (
              <div className="text-slate-600 italic">SYSTEM CHRONICLE CALM...</div>
            )}
          </div>
        </div>

        {/* Selected Body Inspector Panel overlay (HUD bottom-right) */}
        <div className="absolute bottom-4 right-4 w-76 pointer-events-auto">
          <BodyInspector
            selectedBody={selectedBody}
            heaviestBody={heaviestBody}
            G={physicsConfig.G}
            onUpdateBody={handleUpdateBody}
            onDeleteBody={handleDeleteBody}
            cameraMode={cameraMode}
            setCameraMode={setCameraMode}
            rideBodyId={rideBodyId}
            setRideBodyId={setRideBodyId}
            setCameraTarget={setCameraTarget}
          />
        </div>
      </div>

      {/* 3. Instruction modal handbook manual */}
      {showInstructions && (
        <InstructionModal onClose={() => setShowInstructions(false)} />
      )}
    </div>
  );
}
