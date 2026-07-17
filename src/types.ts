/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BodyType = 'star' | 'planet' | 'gas_giant' | 'black_hole' | 'asteroid';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Body {
  id: string;
  name: string;
  mass: number;
  radius: number;
  color: string;
  type: BodyType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  trail: Vector3D[];
  isDestroyed?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number; // 0 to 1
  maxLife: number;
}

export interface StarBackground {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
}

export interface LogEvent {
  id: string;
  timestamp: string; // formatted simulation time, e.g. "12.43"
  title: string;
  description?: string;
  type: 'collision' | 'merge' | 'explosion' | 'orbit' | 'spawn' | 'warning' | 'info';
}

export interface PhysicsConfig {
  G: number;
  timeScale: number;
  collisionMode: 'merge' | 'bounce' | 'none';
  trailLength: number;
  showTrails: boolean;
  showVectors: boolean;
  gridEnabled: boolean;
  shadowsEnabled: boolean;
  paused: boolean;
}

export interface SpawnPreset {
  name: string;
  type: BodyType;
  mass: number;
  radius: number;
  color: string;
}
