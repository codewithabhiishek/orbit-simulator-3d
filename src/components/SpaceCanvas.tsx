/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, MouseEvent, WheelEvent, TouchEvent } from 'react';
import { Body, Particle, StarBackground, PhysicsConfig, SpawnPreset, Vector3D } from '../types';
import { screenTo3D, predictTrajectory, calculateCircularOrbitVelocity, generateDefaultName } from '../utils/physicsHelpers';
import { theme } from '../theme/tokens';
import { Play, Pause, Compass, Move, Video, ZoomIn, Eye, RotateCw } from 'lucide-react';

interface SpaceCanvasProps {
  bodies: Body[];
  particles: Particle[];
  stars: StarBackground[];
  physicsConfig: PhysicsConfig;
  selectedBodyId: string | null;
  onSelectBody: (id: string | null) => void;
  spawnPreset: SpawnPreset;
  cameraTarget: Vector3D;
  setCameraTarget: (v: Vector3D) => void;
  cameraMode: 'orbit' | 'ride' | 'cinematic';
  rideBodyId: string | null;
  onSpawnBody: (body: Omit<Body, 'trail'>) => void;
  yaw: number;
  setYaw: (y: number) => void;
  pitch: number;
  setPitch: (p: number) => void;
  zoom: number;
  setZoom: (z: number) => void;
}

export const SpaceCanvas: React.FC<SpaceCanvasProps> = ({
  bodies,
  particles,
  stars,
  physicsConfig,
  selectedBodyId,
  onSelectBody,
  spawnPreset,
  cameraTarget,
  setCameraTarget,
  cameraMode,
  rideBodyId,
  onSpawnBody,
  yaw,
  setYaw,
  pitch,
  setPitch,
  zoom,
  setZoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag interaction states
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'orbit' | 'pan' | 'none'>('none');
  const [lastMouseX, setLastMouseX] = useState(0);
  const [lastMouseY, setLastMouseY] = useState(0);

  // Spawning interaction states
  const [isSpawning, setIsSpawning] = useState(false);
  const [spawnStartPos, setSpawnStartPos] = useState<Vector3D | null>(null);
  const [spawnScreenStart, setSpawnScreenStart] = useState<{ x: number; y: number } | null>(null);
  const [spawnVelocity, setSpawnVelocity] = useState<Vector3D>({ x: 0, y: 0, z: 0 });
  const [useAutoOrbit, setUseAutoOrbit] = useState(true);

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Accretion disk animation rotation
  const [accretionAngle, setAccretionAngle] = useState(0);

  // Track active ride body reference
  const riddenBody = bodies.find((b) => b.id === rideBodyId && !b.isDestroyed);

  // Update accretion disk rotation
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setAccretionAngle((prev) => (prev + 0.02) % (Math.PI * 2));
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Handle resizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
        }
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // FOV Constant
  const FOV = 800;

  // Projection logic
  const project = (x: number, y: number, z: number) => {
    // Determine active camera target
    let activeTarget = cameraTarget;
    if (cameraMode === 'ride' && riddenBody) {
      activeTarget = { x: riddenBody.x, y: riddenBody.y, z: riddenBody.z };
    }

    const dx = x - activeTarget.x;
    const dy = y - activeTarget.y;
    const dz = z - activeTarget.z;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    // Rotation around Y axis (yaw)
    const rx1 = dx * cosY - dz * sinY;
    const rz1 = dx * sinY + dz * cosY;

    // Rotation around X axis (pitch)
    const rx2 = rx1;
    const ry2 = dy * cosP - rz1 * sinP;
    const rz2 = dy * sinP + rz1 * cosP;

    // Depth relative to camera
    const depth = zoom + rz2;

    if (depth <= 15) return null; // Clipped

    const scale = FOV / depth;
    const screenX = dimensions.width / 2 + rx2 * scale;
    const screenY = dimensions.height / 2 + ry2 * scale;

    return {
      x: screenX,
      y: screenY,
      scale,
      depth,
    };
  };

  // Trajectory predictions
  const trajectoryPaths = predictTrajectory(
    bodies,
    isSpawning && spawnStartPos
      ? {
          x: spawnStartPos.x,
          y: spawnStartPos.y,
          z: spawnStartPos.z,
          vx: spawnVelocity.x,
          vy: spawnVelocity.y,
          vz: spawnVelocity.z,
          mass: spawnPreset.mass,
        }
      : null,
    physicsConfig.G,
    140, // 140 integration steps
    0.3  // dt step
  );

  // Main Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear — deep almost-black
    ctx.fillStyle = '#09090d';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Very subtle cinematic center glow (barely visible)
    const radialGlow = ctx.createRadialGradient(
      dimensions.width / 2,
      dimensions.height / 2,
      10,
      dimensions.width / 2,
      dimensions.height / 2,
      dimensions.width * 0.55
    );
    radialGlow.addColorStop(0, 'rgba(12,13,22,0.6)');
    radialGlow.addColorStop(1, 'rgba(5,5,8,0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 1. Stars with subtle parallax depth
    stars.forEach((star) => {
      const p = project(star.x, star.y, star.z);
      if (p) {
        const size = star.size * (p.scale * 0.38);
        if (size > 0.08) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          // Slightly warm white for realism, not pure white
          const alpha = Math.min(0.85, star.brightness * (900 / p.depth));
          ctx.fillStyle = `rgba(240, 242, 255, ${alpha})`;
          ctx.fill();
        }
      }
    });

    // 2. Reference grid — very subtle
    if (physicsConfig.gridEnabled) {
      ctx.strokeStyle = 'rgba(255, 248, 235, 0.04)';
      ctx.lineWidth = 0.7;

      const activeTarget = cameraMode === 'ride' && riddenBody
        ? { x: riddenBody.x, y: riddenBody.y, z: riddenBody.z }
        : cameraTarget;

      // Draw concentric circles in Y=0 plane
      const radii = [100, 250, 500, 800, 1200];
      radii.forEach((r) => {
        ctx.beginPath();
        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const gx = activeTarget.x + Math.cos(theta) * r;
          const gz = activeTarget.z + Math.sin(theta) * r;
          const gp = project(gx, activeTarget.y, gz);
          if (gp) {
            if (i === 0) ctx.moveTo(gp.x, gp.y);
            else ctx.lineTo(gp.x, gp.y);
          }
        }
        ctx.stroke();
      });

      // Draw grid radial spokes
      const spokes = 8;
      for (let i = 0; i < spokes; i++) {
        const theta = (i / spokes) * Math.PI * 2;
        const outerR = 1200;
        const gx = activeTarget.x + Math.cos(theta) * outerR;
        const gz = activeTarget.z + Math.sin(theta) * outerR;

        const pStart = project(activeTarget.x, activeTarget.y, activeTarget.z);
        const pEnd = project(gx, activeTarget.y, gz);

        if (pStart && pEnd) {
          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.stroke();
        }
      }
    }

    // 3. Orbit trails — subtle fade
    if (physicsConfig.showTrails) {
      bodies.forEach((body) => {
        if (body.isDestroyed || body.trail.length < 2) return;

        ctx.lineWidth = Math.max(0.7, body.radius * 0.10);
        
        for (let i = 1; i < body.trail.length; i++) {
          const p1 = project(body.trail[i - 1].x, body.trail[i - 1].y, body.trail[i - 1].z);
          const p2 = project(body.trail[i].x, body.trail[i].y, body.trail[i].z);

          if (p1 && p2) {
            const opacity = (i / body.trail.length) * 0.28;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const bColor = body.color || '#ffffff';
            ctx.strokeStyle = toRgba(bColor, opacity);
            ctx.stroke();
          }
        }
      });
    }

    // 4. Predicted trajectory paths
    if (physicsConfig.showVectors && trajectoryPaths.length > 0) {
      trajectoryPaths.forEach((path, idx) => {
        if (path.length < 2) return;

        const isNewLauncher = idx === trajectoryPaths.length - 1 && isSpawning;
        ctx.strokeStyle = isNewLauncher ? 'rgba(79, 128, 255, 0.7)' : 'rgba(255, 248, 235, 0.12)';
        ctx.lineWidth = isNewLauncher ? 1.2 : 0.8;
        ctx.setLineDash([4, 6]);

        ctx.beginPath();
        let started = false;
        path.forEach((pt) => {
          const p = project(pt.x, pt.y, pt.z);
          if (p) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Sort bodies by depth ( painters algorithm for correct 3D overlapping!)
    const projectedBodies = bodies
      .map((b) => ({ body: b, proj: project(b.x, b.y, b.z) }))
      .filter((pb) => pb.proj !== null) as { body: Body; proj: { x: number; y: number; scale: number; depth: number } }[];

    // Sort further away first (depth descending)
    projectedBodies.sort((a, b) => b.proj.depth - a.proj.depth);

    // 5. Draw Celestial Bodies
    projectedBodies.forEach(({ body, proj }) => {
      const radius = Math.max(1.5, body.radius * proj.scale * 0.15);

      // Save context for special glow filters
      ctx.save();

      if (body.type === 'black_hole') {
        // Accretion disk glow (gravitational lensing)
        const diskRadius = radius * 3.5;
        const gradientDisk = ctx.createRadialGradient(
          proj.x,
          proj.y,
          radius * 0.8,
          proj.x,
          proj.y,
          diskRadius
        );
        gradientDisk.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradientDisk.addColorStop(0.15, 'rgba(249, 115, 22, 0.8)'); // fiery orange
        gradientDisk.addColorStop(0.4, 'rgba(168, 85, 247, 0.4)'); // deep purple
        gradientDisk.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, diskRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradientDisk;
        ctx.fill();

        // Gravitational lensing rings (rotating neon dashes)
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([15, 30]);
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius * 2.2, accretionAngle, accretionAngle + Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
        ctx.setLineDash([30, 20]);
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius * 1.5, -accretionAngle * 1.5, -accretionAngle * 1.5 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Event Horizon (perfect void black sphere)
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#020205';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000000';
        ctx.fill();

      } else if (body.type === 'star') {
        // High intensity Star Glow
        const bColor = body.color || '#f59e0b';
        const gradientGlow = ctx.createRadialGradient(
          proj.x,
          proj.y,
          radius * 0.2,
          proj.x,
          proj.y,
          radius * 4
        );
        gradientGlow.addColorStop(0, bColor);
        gradientGlow.addColorStop(0.2, bColor);
        gradientGlow.addColorStop(0.5, toRgba(bColor, 0.3));
        gradientGlow.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradientGlow;
        ctx.fill();

        // Central Bright Core
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 4 Lens flare lines
        ctx.strokeStyle = 'rgba(255, 248, 235, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(proj.x - radius * 6, proj.y);
        ctx.lineTo(proj.x + radius * 6, proj.y);
        ctx.moveTo(proj.x, proj.y - radius * 6);
        ctx.lineTo(proj.x, proj.y + radius * 6);
        ctx.stroke();

      } else {
        // Standard Planet or Asteroid shaded sphere
        const bColor = body.color || '#3b82f6';
        const gradientSphere = ctx.createRadialGradient(
          proj.x - radius * 0.3,
          proj.y - radius * 0.3,
          radius * 0.1,
          proj.x,
          proj.y,
          radius
        );
        gradientSphere.addColorStop(0, '#ffffff'); // bright specular highlight
        gradientSphere.addColorStop(0.2, bColor);
        gradientSphere.addColorStop(0.8, darkenColor(bColor, 0.6)); // shaded shadow edge
        gradientSphere.addColorStop(1, '#05050a');

        ctx.beginPath();
        ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradientSphere;
        ctx.fill();

        // Planet atmospheric halo (subtle glow border)
        ctx.strokeStyle = bColor;
        ctx.lineWidth = 0.5;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      ctx.restore();

      // Selection indicator — clean, soft blue arc brackets
      if (selectedBodyId === body.id) {
        const time = performance.now();
        const pulse = 0.5 + 0.5 * Math.sin(time / 500); // smooth 0 to 1 over 1000ms
        ctx.strokeStyle = `rgba(255, 248, 235, ${0.15 + 0.2 * pulse})`; // Soft glowing selection border
        ctx.lineWidth = 1.5;
        const bracketSize = Math.max(10, radius + 7);
        ctx.beginPath();

        // Top-Left
        ctx.moveTo(proj.x - bracketSize, proj.y - bracketSize + 5);
        ctx.lineTo(proj.x - bracketSize, proj.y - bracketSize);
        ctx.lineTo(proj.x - bracketSize + 5, proj.y - bracketSize);

        // Top-Right
        ctx.moveTo(proj.x + bracketSize, proj.y - bracketSize + 5);
        ctx.lineTo(proj.x + bracketSize, proj.y - bracketSize);
        ctx.lineTo(proj.x + bracketSize - 5, proj.y - bracketSize);

        // Bottom-Left
        ctx.moveTo(proj.x - bracketSize, proj.y + bracketSize - 5);
        ctx.lineTo(proj.x - bracketSize, proj.y + bracketSize);
        ctx.lineTo(proj.x - bracketSize + 5, proj.y + bracketSize);

        // Bottom-Right
        ctx.moveTo(proj.x + bracketSize, proj.y + bracketSize - 5);
        ctx.lineTo(proj.x + bracketSize, proj.y + bracketSize);
        ctx.lineTo(proj.x + bracketSize - 5, proj.y + bracketSize);

        ctx.stroke();

        // Label
        ctx.fillStyle = '#F8FAFC'; // Primary text
        ctx.font = '700 12px "General Sans", sans-serif'; // General Sans title font
        ctx.fillText(`${body.name}`, proj.x + bracketSize + 6, proj.y - 2);
        ctx.fillStyle = '#94A3B8'; // Secondary text
        ctx.font = '11px "JetBrains Mono", monospace'; // JetBrains Mono
        ctx.fillText(`M ${body.mass.toFixed(1)}`, proj.x + bracketSize + 6, proj.y + 10);
      } else {
        // Ordinary name label
        if (radius > 4) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.45)'; // Secondary text with opacity
          ctx.font = '11px Inter, sans-serif';
          ctx.fillText(body.name, proj.x + radius + 4, proj.y + 3);
        }
      }

      // Draw physics vectors arrows (Velocity)
      if (physicsConfig.showVectors) {
        const velScale = 1.2;
        const velVector = {
          x: body.x + body.vx * velScale,
          y: body.y + body.vy * velScale,
          z: body.z + body.vz * velScale,
        };
        const pVel = project(velVector.x, velVector.y, velVector.z);
        if (pVel) {
          ctx.beginPath();
          ctx.moveTo(proj.x, proj.y);
          ctx.lineTo(pVel.x, pVel.y);
          ctx.strokeStyle = '#a855f7'; // purple arrow
          ctx.lineWidth = 1;
          ctx.stroke();

          // Arrow head
          const angle = Math.atan2(pVel.y - proj.y, pVel.x - proj.x);
          ctx.beginPath();
          ctx.moveTo(pVel.x, pVel.y);
          ctx.lineTo(pVel.x - 5 * Math.cos(angle - Math.PI / 6), pVel.y - 5 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(pVel.x - 5 * Math.cos(angle + Math.PI / 6), pVel.y - 5 * Math.sin(angle + Math.PI / 6));
          ctx.fillStyle = '#a855f7';
          ctx.fill();
        }
      }
    });

    // 6. Draw Sparkle Explosion Particles (Fully client-animated)
    particles.forEach((p) => {
      const proj = project(p.x, p.y, p.z);
      if (proj) {
        const radius = p.size * proj.scale * 0.15;
        if (radius > 0) {
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }
      }
    });

    // 7. Slingshot aim vector
    if (isSpawning && spawnStartPos && spawnScreenStart) {
      const pStart = project(spawnStartPos.x, spawnStartPos.y, spawnStartPos.z);
      if (pStart) {
        // Preview body
        const mockupRadius = Math.max(2, spawnPreset.radius * pStart.scale * 0.15);
        ctx.beginPath();
        ctx.arc(pStart.x, pStart.y, mockupRadius, 0, Math.PI * 2);
        ctx.fillStyle = spawnPreset.color;
        ctx.fill();

        // Velocity line — soft blue
        const dragScreenX = lastMouseX;
        const dragScreenY = lastMouseY;

        ctx.strokeStyle = 'rgba(79, 128, 255, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(dragScreenX, dragScreenY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrow tip
        const aimAngle = Math.atan2(dragScreenY - pStart.y, dragScreenX - pStart.x);
        ctx.beginPath();
        ctx.moveTo(dragScreenX, dragScreenY);
        ctx.lineTo(dragScreenX - 7 * Math.cos(aimAngle - Math.PI / 6), dragScreenY - 7 * Math.sin(aimAngle - Math.PI / 6));
        ctx.lineTo(dragScreenX - 7 * Math.cos(aimAngle + Math.PI / 6), dragScreenY - 7 * Math.sin(aimAngle + Math.PI / 6));
        ctx.fillStyle = 'rgba(79, 128, 255, 0.65)';
        ctx.fill();

        // Speed readout
        const speed = Math.sqrt(
          spawnVelocity.x * spawnVelocity.x +
          spawnVelocity.y * spawnVelocity.y +
          spawnVelocity.z * spawnVelocity.z
        );
        ctx.fillStyle = '#CBD5E1';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(`${speed.toFixed(1)} km/s`, dragScreenX + 10, dragScreenY + 4);
      }
    }

    // 8. Draw UI 3D Coordinate Axis Compass (Overlay on top-right)
    drawCompass(ctx);

  }, [bodies, particles, stars, dimensions, yaw, pitch, zoom, cameraTarget, selectedBodyId, isSpawning, spawnStartPos, spawnVelocity, spawnPreset, accretionAngle, physicsConfig, cameraMode, riddenBody]);

  // Helper to safely convert any color (hex or rgb) to rgba with custom opacity
  function toRgba(col: string, opacity: number): string {
    if (!col) return `rgba(255, 248, 235, ${opacity})`;
    let r = 0, g = 0, b = 0;
    try {
      if (col.startsWith('#')) {
        const hex = col.replace('#', '');
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16) || 0;
          g = parseInt(hex[1] + hex[1], 16) || 0;
          b = parseInt(hex[2] + hex[2], 16) || 0;
        } else {
          r = parseInt(hex.slice(0, 2), 16) || 0;
          g = parseInt(hex.slice(2, 4), 16) || 0;
          b = parseInt(hex.slice(4, 6), 16) || 0;
        }
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else if (col.startsWith('rgb')) {
        const match = col.match(/\d+/g);
        if (match) {
          r = parseInt(match[0]) || 0;
          g = parseInt(match[1]) || 0;
          b = parseInt(match[2]) || 0;
          return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
      }
    } catch (e) {
      // safe fallback
    }
    return `rgba(255, 248, 235, ${opacity})`;
  }

  // Darkens a color (hex/rgb) for correct sphere shading
  function darkenColor(col: string, percent: number): string {
    let r = 0, g = 0, b = 0;
    if (!col) return 'rgb(0, 0, 0)';
    try {
      if (col.startsWith('#')) {
        r = parseInt(col.slice(1, 3), 16) || 0;
        g = parseInt(col.slice(3, 5), 16) || 0;
        b = parseInt(col.slice(5, 7), 16) || 0;
      } else if (col.startsWith('rgb')) {
        const match = col.match(/\d+/g);
        if (match) {
          r = parseInt(match[0]) || 0;
          g = parseInt(match[1]) || 0;
          b = parseInt(match[2]) || 0;
        }
      }
    } catch (e) {
      // safe fallback
    }
    r = Math.floor(Math.max(0, Math.min(255, r * (1 - percent))));
    g = Math.floor(Math.max(0, Math.min(255, g * (1 - percent))));
    b = Math.floor(Math.max(0, Math.min(255, b * (1 - percent))));
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Minimal XYZ compass in top-right corner
  const drawCompass = (ctx: CanvasRenderingContext2D) => {
    const cx = dimensions.width - 48;
    const cy = 48;
    const size = 22;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const projectCompassAxis = (ax: number, ay: number, az: number) => {
      const rx1 = ax * cosY - az * sinY;
      const rz1 = ax * sinY + az * cosY;
      const rx2 = rx1;
      const ry2 = ay * cosP - rz1 * sinP;
      return { x: cx + rx2 * size, y: cy + ry2 * size };
    };

    const xAxis = projectCompassAxis(1, 0, 0);
    const yAxis = projectCompassAxis(0, 1, 0);
    const zAxis = projectCompassAxis(0, 0, 1);

    // Subtle backdrop
    ctx.fillStyle = 'rgba(9,9,13,0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // X — muted red
    ctx.strokeStyle = 'rgba(210, 100, 100, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(xAxis.x, xAxis.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210, 100, 100, 0.55)';
    ctx.font = '7px Inter, sans-serif';
    ctx.fillText('X', xAxis.x + 2, xAxis.y + 2);

    // Y — muted green
    ctx.strokeStyle = 'rgba(90, 185, 130, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(yAxis.x, yAxis.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90, 185, 130, 0.55)';
    ctx.fillText('Y', yAxis.x + 2, yAxis.y + 2);

    // Z — muted blue
    ctx.strokeStyle = 'rgba(90, 130, 220, 0.6)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(zAxis.x, zAxis.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90, 130, 220, 0.55)';
    ctx.fillText('Z', zAxis.x + 2, zAxis.y + 2);
  };

  // MOUSE EVENT HANDLERS
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setLastMouseX(x);
    setLastMouseY(y);

    // Check if spawning/aiming mode is active (when clicking "Ctrl" or we can trigger launcher manually)
    // Here we support regular clicking:
    // Left click on an empty spot = spawn launcher start if spawnPreset is active and clicked with Alt/Ctrl,
    // OR we can make spawning mode toggled via UI buttons!
    // Let's check click targets first (Select bodies)
    let bodyClicked = false;
    
    // Sort by projected closeness to cursor
    const clickedPb = bodies
      .map((b) => ({ body: b, proj: project(b.x, b.y, b.z) }))
      .filter((pb) => pb.proj !== null)
      .map((pb) => {
        const dx = x - pb.proj!.x;
        const dy = y - pb.proj!.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { body: pb.body, dist, radius: Math.max(5, pb.body.radius * pb.proj!.scale * 0.15) };
      })
      .filter((pb) => pb.dist < pb.radius + 10)
      .sort((a, b) => a.dist - b.dist);

    if (clickedPb.length > 0) {
      onSelectBody(clickedPb[0].body.id);
      bodyClicked = true;
    }

    if (!bodyClicked) {
      if (e.button === 0 && e.shiftKey) {
        setDragMode('pan');
      } else if (e.button === 0) {
        setDragMode('orbit');
      } else if (e.button === 2) {
        setDragMode('pan');
      }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - lastMouseX;
    const dy = y - lastMouseY;

    if (isDragging) {
      if (dragMode === 'orbit') {
        setYaw((prev) => prev - dx * 0.007);
        setPitch((prev) => Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, prev + dy * 0.007)));
      } else if (dragMode === 'pan') {
        // Pan rate depends on zoom level
        const factor = zoom * 0.0015;
        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);
        
        // Translate screenspace dx, dy into 3D world target offsets
        setCameraTarget({
          x: cameraTarget.x - (dx * cosY - dy * sinY * Math.sin(pitch)) * factor,
          y: cameraTarget.y - (dy * Math.cos(pitch)) * factor,
          z: cameraTarget.z + (dx * sinY + dy * cosY * Math.sin(pitch)) * factor,
        });
      }

      setLastMouseX(x);
      setLastMouseY(y);
    }

    // Spawner Real-time aiming calculation
    if (isSpawning && spawnStartPos && spawnScreenStart) {
      setLastMouseX(x);
      setLastMouseY(y);

      // Map screenspace drag vector to physical 3D velocity
      // Dragging backwards = launches forwards (slingshot style!)
      const dragDx = spawnScreenStart.x - x;
      const dragDy = spawnScreenStart.y - y;

      const velocityMultiplier = zoom * 0.05; // speed scales with zoom level for better control

      // Project screenspace vector into world 3D space velocity
      const rotatedVel = screenTo3D(
        spawnScreenStart.x + dragDx,
        spawnScreenStart.y + dragDy,
        dimensions.width,
        dimensions.height,
        { x: 0, y: 0, z: 0 }, // relative origin
        yaw,
        pitch,
        zoom,
        FOV
      );

      // Add relative orbit calculations or use standard drag
      if (useAutoOrbit && bodies.length > 0) {
        // Automatically pre-calculate the Keplerian orbital velocity relative to the heaviest body!
        const activeBodiesForSpawn = bodies.filter(b => !b.isDestroyed);
        const heaviestBody = activeBodiesForSpawn.length > 0
          ? activeBodiesForSpawn.reduce((max, current) => (current.mass > max.mass ? current : max))
          : null;

        if (heaviestBody) {
          const autoVel = calculateCircularOrbitVelocity(spawnStartPos, heaviestBody, physicsConfig.G);
          
          // Let drag modify the auto velocity
          setSpawnVelocity({
            x: autoVel.x + rotatedVel.x * 0.25,
            y: autoVel.y + rotatedVel.y * 0.25,
            z: autoVel.z + rotatedVel.z * 0.25,
          });
        }
      } else {
        setSpawnVelocity({
          x: rotatedVel.x * 0.3,
          y: rotatedVel.y * 0.3,
          z: rotatedVel.z * 0.3,
        });
      }
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    setDragMode('none');

    // Launch spawned body
    if (isSpawning && spawnStartPos) {
      const activeTarget = cameraMode === 'ride' && riddenBody
        ? { x: riddenBody.x, y: riddenBody.y, z: riddenBody.z }
        : cameraTarget;

      const randomCount = bodies.length;
      const defaultName = generateDefaultName(spawnPreset.type, randomCount);

      onSpawnBody({
        name: defaultName,
        type: spawnPreset.type,
        mass: spawnPreset.mass,
        radius: spawnPreset.radius,
        color: spawnPreset.color,
        x: spawnStartPos.x,
        y: spawnStartPos.y,
        z: spawnStartPos.z,
        vx: spawnVelocity.x,
        vy: spawnVelocity.y,
        vz: spawnVelocity.z,
      });

      setIsSpawning(false);
      setSpawnStartPos(null);
      setSpawnScreenStart(null);
    }
  };

  // ZOOM SCROLL
  const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    setZoom((prev) => Math.max(80, Math.min(4000, prev + e.deltaY * 0.8)));
  };

  // TOUCH EVENTS (Mobile support)
  const handleTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setIsDragging(true);
      setDragMode('orbit');
      setLastMouseX(touch.clientX - rect.left);
      setLastMouseY(touch.clientY - rect.top);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLCanvasElement>) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const dx = x - lastMouseX;
      const dy = y - lastMouseY;

      setYaw((prev) => prev - dx * 0.01);
      setPitch((prev) => Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, prev + dy * 0.01)));

      setLastMouseX(x);
      setLastMouseY(y);
    }
  };

  // BUTTON TRIGGERS
  const startSpawnSequence = () => {
    // Spawn planet right at the center focus plane coordinates
    const sx = dimensions.width / 2;
    const sy = dimensions.height / 2 + 50; // offset slightly for visibility
    const activeTarget = cameraMode === 'ride' && riddenBody
      ? { x: riddenBody.x, y: riddenBody.y, z: riddenBody.z }
      : cameraTarget;

    const pos3D = screenTo3D(
      sx,
      sy,
      dimensions.width,
      dimensions.height,
      activeTarget,
      yaw,
      pitch,
      zoom,
      FOV
    );

    setSpawnStartPos(pos3D);
    setSpawnScreenStart({ x: sx, y: sy });
    setLastMouseX(sx);
    setLastMouseY(sy);

    // Initial velocity
    if (useAutoOrbit && bodies.length > 0) {
      const activeBodiesForSpawn = bodies.filter(b => !b.isDestroyed);
      const heaviestBody = activeBodiesForSpawn.length > 0
        ? activeBodiesForSpawn.reduce((max, current) => (current.mass > max.mass ? current : max))
        : null;
      if (heaviestBody) {
        setSpawnVelocity(calculateCircularOrbitVelocity(pos3D, heaviestBody, physicsConfig.G));
      }
    } else {
      setSpawnVelocity({ x: 0, y: 0, z: 0 });
    }

    setIsSpawning(true);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none outline-none">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsDragging(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        id="celestial-canvas-element"
      />

      {/* Bottom launch bar */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-auto"
        style={{
          background: 'rgba(20, 26, 40, 0.82)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 248, 235, 0.08)',
          borderRadius: '99px',
          padding: '6px 14px 6px 8px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
        }}
      >
        <button
          onClick={startSpawnSequence}
          disabled={isSpawning}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-150"
          style={{
            background: isSpawning ? 'rgba(255, 248, 235, 0.08)' : theme.colors.accent,
            border: isSpawning ? '1px solid rgba(255, 248, 235, 0.18)' : 'none',
            color: isSpawning ? theme.colors.accent : theme.colors.bgBase,
            backdropFilter: 'blur(12px)',
            transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: isSpawning ? 'none' : '0 8px 24px rgba(255, 248, 235, 0.08)',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => { if (!isSpawning) { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; } }}
          onMouseLeave={(e) => { if (!isSpawning) { (e.currentTarget as HTMLButtonElement).style.background = theme.colors.accent; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; } }}
          onMouseDown={(e) => { if (!isSpawning) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
          onMouseUp={(e) => { if (!isSpawning) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          id="btn-quick-launcher"
        >
          <RotateCw className="w-3.5 h-3.5" />
          {isSpawning ? 'Aim and release...' : `Launch ${spawnPreset.name}`}
        </button>
        <div className="h-4 w-px" style={{ background: 'rgba(255, 248, 235, 0.08)' }} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useAutoOrbit}
            onChange={(e) => setUseAutoOrbit(e.target.checked)}
          />
          <span className="text-[13px] font-medium text-[#94A3B8]">Auto-orbit</span>
        </label>
      </div>

      {/* Spawn hint banner */}
      {isSpawning && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg pointer-events-none text-center animate-fade-in"
          style={{
            background: 'rgba(20, 26, 40, 0.82)',
            border: '1px solid rgba(255, 248, 235, 0.08)',
            color: '#F8FAFC',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          }}
        >
          <p className="text-[13px] font-bold font-heading mb-0.5">Aim to set velocity</p>
          <p className="text-[12px]" style={{ color: '#94A3B8' }}>Drag to set direction · release to launch</p>
        </div>
      )}
    </div>
  );
};
