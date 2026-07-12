/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, MouseEvent, WheelEvent, TouchEvent } from 'react';
import { Body, Particle, StarBackground, PhysicsConfig, SpawnPreset, Vector3D } from '../types';
import { screenTo3D, predictTrajectory, calculateCircularOrbitVelocity, generateDefaultName } from '../utils/physicsHelpers';
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

    // Clear with starry deep space gradient
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Subtle cosmic glow in the center
    const radialGlow = ctx.createRadialGradient(
      dimensions.width / 2,
      dimensions.height / 2,
      10,
      dimensions.width / 2,
      dimensions.height / 2,
      dimensions.width * 0.7
    );
    radialGlow.addColorStop(0, '#121324');
    radialGlow.addColorStop(1, '#050508');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // 1. Draw Space Dust/Background Stars with Parallax
    stars.forEach((star) => {
      const p = project(star.x, star.y, star.z);
      if (p) {
        const size = star.size * (p.scale * 0.4);
        if (size > 0.1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          const alpha = Math.min(1, star.brightness * (1000 / p.depth));
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
      }
    });

    // 2. Draw 3D Sci-Fi Celestial Grid
    if (physicsConfig.gridEnabled) {
      ctx.strokeStyle = 'rgba(74, 85, 104, 0.15)';
      ctx.lineWidth = 1;

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

    // 3. Draw Orbit Trails
    if (physicsConfig.showTrails) {
      bodies.forEach((body) => {
        if (body.isDestroyed || body.trail.length < 2) return;

        ctx.lineWidth = Math.max(1, body.radius * 0.15);
        
        // Draw segmented trail with smooth fade
        for (let i = 1; i < body.trail.length; i++) {
          const p1 = project(body.trail[i - 1].x, body.trail[i - 1].y, body.trail[i - 1].z);
          const p2 = project(body.trail[i].x, body.trail[i].y, body.trail[i].z);

          if (p1 && p2) {
            const opacity = (i / body.trail.length) * 0.45;
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

    // 4. Draw Predicted Trajectory Paths (Dotted vector lines)
    if (physicsConfig.showVectors && trajectoryPaths.length > 0) {
      trajectoryPaths.forEach((path, idx) => {
        if (path.length < 2) return;

        const isNewLauncher = idx === trajectoryPaths.length - 1 && isSpawning;
        ctx.strokeStyle = isNewLauncher ? '#22d3ee' : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = isNewLauncher ? 1.5 : 1;
        ctx.setLineDash([4, 4]);

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
        ctx.setLineDash([]); // Reset
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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

      // Draw Selected Bracket Indicator (cyberpunk square target bracket)
      if (selectedBodyId === body.id) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.2;
        const bracketSize = Math.max(12, radius + 8);
        ctx.beginPath();
        
        // Top-Left Corner
        ctx.moveTo(proj.x - bracketSize, proj.y - bracketSize + 5);
        ctx.lineTo(proj.x - bracketSize, proj.y - bracketSize);
        ctx.lineTo(proj.x - bracketSize + 5, proj.y - bracketSize);

        // Top-Right Corner
        ctx.moveTo(proj.x + bracketSize, proj.y - bracketSize + 5);
        ctx.lineTo(proj.x + bracketSize, proj.y - bracketSize);
        ctx.lineTo(proj.x + bracketSize - 5, proj.y - bracketSize);

        // Bottom-Left Corner
        ctx.moveTo(proj.x - bracketSize, proj.y + bracketSize - 5);
        ctx.lineTo(proj.x - bracketSize, proj.y + bracketSize);
        ctx.lineTo(proj.x - bracketSize + 5, proj.y + bracketSize);

        // Bottom-Right Corner
        ctx.moveTo(proj.x + bracketSize, proj.y + bracketSize - 5);
        ctx.lineTo(proj.x + bracketSize, proj.y + bracketSize);
        ctx.lineTo(proj.x + bracketSize - 5, proj.y + bracketSize);

        ctx.stroke();

        // Target label overlay (Monospace HUD style)
        ctx.fillStyle = '#22d3ee';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`TRK > ${body.name.toUpperCase()}`, proj.x + bracketSize + 6, proj.y - 4);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
        ctx.fillText(`M: ${body.mass.toFixed(1)}e24 kg`, proj.x + bracketSize + 6, proj.y + 8);
      } else {
        // Ordinary label overlay
        if (radius > 4) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.font = '9px "Inter", sans-serif';
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

    // 7. Draw ACTIVE LAUNCHER SLINGSHOT VECTOR (When spawning)
    if (isSpawning && spawnStartPos && spawnScreenStart) {
      const pStart = project(spawnStartPos.x, spawnStartPos.y, spawnStartPos.z);
      if (pStart) {
        // Draw the body mockup to launch
        const mockupRadius = Math.max(2, spawnPreset.radius * pStart.scale * 0.15);
        ctx.beginPath();
        ctx.arc(pStart.x, pStart.y, mockupRadius, 0, Math.PI * 2);
        ctx.fillStyle = spawnPreset.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = spawnPreset.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Velocity Aiming Line
        // We find current drag end point
        const dragScreenX = lastMouseX;
        const dragScreenY = lastMouseY;

        ctx.strokeStyle = '#06b6d4'; // Cyan
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(dragScreenX, dragScreenY);
        ctx.stroke();

        // Draw aiming arrow pointer
        const aimAngle = Math.atan2(dragScreenY - pStart.y, dragScreenX - pStart.x);
        ctx.beginPath();
        ctx.moveTo(dragScreenX, dragScreenY);
        ctx.lineTo(dragScreenX - 8 * Math.cos(aimAngle - Math.PI / 6), dragScreenY - 8 * Math.sin(aimAngle - Math.PI / 6));
        ctx.lineTo(dragScreenX - 8 * Math.cos(aimAngle + Math.PI / 6), dragScreenY - 8 * Math.sin(aimAngle + Math.PI / 6));
        ctx.fillStyle = '#06b6d4';
        ctx.fill();

        // Telemetry readout
        const speed = Math.sqrt(
          spawnVelocity.x * spawnVelocity.x +
          spawnVelocity.y * spawnVelocity.y +
          spawnVelocity.z * spawnVelocity.z
        );
        ctx.fillStyle = '#22d3ee';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`LAUNCH VELOCITY: ${speed.toFixed(1)} km/s`, dragScreenX + 12, dragScreenY + 4);
      }
    }

    // 8. Draw UI 3D Coordinate Axis Compass (Overlay on top-right)
    drawCompass(ctx);

  }, [bodies, particles, stars, dimensions, yaw, pitch, zoom, cameraTarget, selectedBodyId, isSpawning, spawnStartPos, spawnVelocity, spawnPreset, accretionAngle, physicsConfig, cameraMode, riddenBody]);

  // Helper to safely convert any color (hex or rgb) to rgba with custom opacity
  function toRgba(col: string, opacity: number): string {
    if (!col) return `rgba(255, 255, 255, ${opacity})`;
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
    return `rgba(255, 255, 255, ${opacity})`;
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

  // Draw 3D coordinate widget in bottom right
  const drawCompass = (ctx: CanvasRenderingContext2D) => {
    const cx = dimensions.width - 60;
    const cy = 60;
    const size = 30;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const projectCompassAxis = (ax: number, ay: number, az: number) => {
      // Rotate Compass Axis
      const rx1 = ax * cosY - az * sinY;
      const rz1 = ax * sinY + az * cosY;
      const rx2 = rx1;
      const ry2 = ay * cosP - rz1 * sinP;
      return { x: cx + rx2 * size, y: cy + ry2 * size };
    };

    const xAxis = projectCompassAxis(1, 0, 0);
    const yAxis = projectCompassAxis(0, 1, 0);
    const zAxis = projectCompassAxis(0, 0, 1);

    // Grid center backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // X Axis (Red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(xAxis.x, xAxis.y);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = '8px monospace';
    ctx.fillText('X', xAxis.x + 3, xAxis.y + 2);

    // Y Axis (Green)
    ctx.strokeStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(yAxis.x, yAxis.y);
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.fillText('Y', yAxis.x + 3, yAxis.y + 2);

    // Z Axis (Blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(zAxis.x, zAxis.y);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z', zAxis.x + 3, zAxis.y + 2);

    // Ring Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 1.3, 0, Math.PI * 2);
    ctx.stroke();
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

      {/* Launcher Quick Controls HUD Overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-slate-900/80 backdrop-blur-md rounded-full border border-slate-700/60 shadow-lg pointer-events-auto">
        <button
          onClick={startSpawnSequence}
          disabled={isSpawning}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
            isSpawning
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse'
              : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 shadow-md shadow-cyan-600/20 hover:scale-105 active:scale-95'
          }`}
          id="btn-quick-launcher"
        >
          <RotateCw className="w-3.5 h-3.5" />
          {isSpawning ? 'Aiming Orbit...' : `Launch ${spawnPreset.name}`}
        </button>

        <div className="h-4 w-[1px] bg-slate-800" />

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useAutoOrbit}
            onChange={(e) => setUseAutoOrbit(e.target.checked)}
            className="rounded border-slate-700 text-cyan-600 bg-slate-800 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
          />
          <span className="text-[10px] font-mono text-slate-400">AUTO-ORBIT VELOCITY</span>
        </label>
      </div>

      {/* Screen Interactive Overlay Help Banner when Spawning */}
      {isSpawning && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-cyan-950/70 border border-cyan-800/80 text-cyan-300 text-xs font-mono rounded-lg shadow-xl animate-fade-in pointer-events-none text-center">
          <p className="font-bold uppercase tracking-wider mb-0.5">SLINGSHOT AIM ACTIVE</p>
          <p className="opacity-80">Drag on the canvas to set initial velocity vector & angle. Let go to launch.</p>
        </div>
      )}
    </div>
  );
};
