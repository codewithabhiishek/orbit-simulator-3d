/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Body, Vector3D } from '../types';

/**
 * Calculates the circular orbital velocity vector for a body relative to a primary body.
 * Assumes orbital plane is horizontal (XZ plane).
 */
export function calculateCircularOrbitVelocity(
  bodyPos: Vector3D,
  primary: Body,
  G: number
): Vector3D {
  const dx = bodyPos.x - primary.x;
  const dy = bodyPos.y - primary.y;
  const dz = bodyPos.z - primary.z;

  const distanceSqr = dx * dx + dy * dy + dz * dz;
  const distance = Math.sqrt(distanceSqr);

  if (distance < 1e-3) {
    return { x: 0, y: 0, z: 0 };
  }

  // Circular orbit speed v = sqrt(G * M / r)
  const speed = Math.sqrt((G * primary.mass) / distance);

  // Perpendicular vector in XZ plane: (-dz, 0, dx)
  // Or in XY plane if XZ is compressed. Let's do a 3D perpendicular vector.
  // We can project a horizontal perpendicular vector:
  const horizontalDist = Math.sqrt(dx * dx + dz * dz);
  
  if (horizontalDist < 1e-3) {
    // Fallback if directly above/below the star
    return { x: speed, y: 0, z: 0 };
  }

  return {
    x: -(dz / horizontalDist) * speed + primary.vx,
    y: primary.vy, // Match star's vertical velocity
    z: (dx / horizontalDist) * speed + primary.vz,
  };
}

/**
 * Predicts the upcoming trajectory of a body assuming standard Keplerian or N-Body physics.
 * Simple forward Euler integration for a fast preview.
 */
export function predictTrajectory(
  bodies: Body[],
  activeSpawner: { x: number; y: number; z: number; vx: number; vy: number; vz: number; mass: number } | null,
  G: number,
  steps: number = 100,
  dt: number = 0.5
): Vector3D[][] {
  if (bodies.length === 0 && !activeSpawner) return [];

  // Create virtual copies of active bodies
  const virtualBodies = bodies
    .filter((b) => !b.isDestroyed)
    .map((b) => ({
      x: b.x,
      y: b.y,
      z: b.z,
      vx: b.vx,
      vy: b.vy,
      vz: b.vz,
      mass: b.mass,
      id: b.id,
    }));

  let spawnerIndex = -1;
  if (activeSpawner) {
    virtualBodies.push({
      x: activeSpawner.x,
      y: activeSpawner.y,
      z: activeSpawner.z,
      vx: activeSpawner.vx,
      vy: activeSpawner.vy,
      vz: activeSpawner.vz,
      mass: activeSpawner.mass,
      id: 'spawner',
    });
    spawnerIndex = virtualBodies.length - 1;
  }

  const paths: Vector3D[][] = Array.from({ length: virtualBodies.length }, () => []);
  const softeningSqr = 1.0;

  for (let step = 0; step < steps; step++) {
    const ax = new Array(virtualBodies.length).fill(0);
    const ay = new Array(virtualBodies.length).fill(0);
    const az = new Array(virtualBodies.length).fill(0);

    // Calc forces
    for (let i = 0; i < virtualBodies.length; i++) {
      const b1 = virtualBodies[i];
      for (let j = i + 1; j < virtualBodies.length; j++) {
        const b2 = virtualBodies[j];

        const dx = b2.x - b1.x;
        const dy = b2.y - b1.y;
        const dz = b2.z - b1.z;

        const distSqr = dx * dx + dy * dy + dz * dz + softeningSqr;
        const dist = Math.sqrt(distSqr);

        if (dist < 1e-2) continue;

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

    // Update positions and save points (subsample steps to keep path clean)
    for (let i = 0; i < virtualBodies.length; i++) {
      const b = virtualBodies[i];
      b.vx += ax[i] * dt;
      b.vy += ay[i] * dt;
      b.vz += az[i] * dt;

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      if (step % 2 === 0) {
        paths[i].push({ x: b.x, y: b.y, z: b.z });
      }
    }
  }

  return paths;
}

/**
 * Returns a default name for a body based on type and number of existing bodies.
 */
export function generateDefaultName(type: string, count: number): string {
  const prefixes: Record<string, string[]> = {
    star: ['Sol', 'Sirius', 'Vega', 'Betelgeuse', 'Antares', 'Polaris', 'Rigel'],
    planet: ['Astra', 'Vulcan', 'Zephyr', 'Triton', 'Erebus', 'Isis', 'Osiris', 'Krypton', 'Arrakis', 'Pandora'],
    gas_giant: ['Jupiter', 'Saturn', 'Neptune', 'Cronus', 'Aether', 'Hyperion', 'Typhon'],
    black_hole: ['Gargantua', 'Singularity', 'Erebus', 'Abyss', 'Void', 'Sagittarius A*'],
    asteroid: ['Ceres', 'Vesta', 'Pallas', 'Hygiea', 'Eros', 'Itokawa', 'Bennu'],
  };

  const list = prefixes[type] || ['Celestial'];
  const name = list[count % list.length];
  const index = Math.floor(count / list.length);
  return index > 0 ? `${name} ${romanize(index + 1)}` : name;
}

function romanize(num: number): string {
  const lookup: Record<string, number> = {
    M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1
  };
  let roman = '';
  for (const i in lookup) {
    while (num >= lookup[i]) {
      roman += i;
      num -= lookup[i];
    }
  }
  return roman;
}

/**
 * Projects a 2D screen coordinate back to the 3D billboard plane that passes
 * through the camera target and is parallel to the camera view frame.
 */
export function screenTo3D(
  sx: number,
  sy: number,
  width: number,
  height: number,
  target: Vector3D,
  yaw: number,
  pitch: number,
  zoom: number,
  fov: number = 800
): Vector3D {
  const scale = fov / zoom;
  const rx2 = (sx - width / 2) / scale;
  const ry2 = (sy - height / 2) / scale;
  const rz2 = 0; // Screen-parallel flat focal plane

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  // Rotate backwards around X-axis (pitch)
  const rx1 = rx2;
  const ry1 = ry2 * cosP - rz2 * sinP;
  const rz1 = ry2 * sinP + rz2 * cosP;

  // Rotate backwards around Y-axis (yaw)
  const dx = rx1 * cosY + rz1 * sinY;
  const dy = ry1;
  const dz = -rx1 * sinY + rz1 * cosY;

  return {
    x: dx + target.x,
    y: dy + target.y,
    z: dz + target.z,
  };
}

