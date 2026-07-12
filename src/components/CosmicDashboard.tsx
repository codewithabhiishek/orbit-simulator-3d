/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Body, BodyType, PhysicsConfig, SpawnPreset } from '../types';
import { Play, Pause, Trash2, Eye, Compass, Sliders, LayoutGrid, Radio, Plus, Layers, Orbit } from 'lucide-react';

interface CosmicDashboardProps {
  bodies: Body[];
  physicsConfig: PhysicsConfig;
  setPhysicsConfig: React.Dispatch<React.SetStateAction<PhysicsConfig>>;
  selectedBodyId: string | null;
  onSelectBody: (id: string | null) => void;
  spawnPreset: SpawnPreset;
  setSpawnPreset: (p: SpawnPreset) => void;
  onLoadPreset: (presetName: string) => void;
  onClearAll: () => void;
  simulationTime: number;
}

const SPAWN_PRESETS: SpawnPreset[] = [
  { name: 'Sol Star', type: 'star', mass: 1000, radius: 45, color: '#f59e0b' },
  { name: 'Gargantua Void', type: 'black_hole', mass: 8000, radius: 25, color: '#a855f7' },
  { name: 'Rocky Planet', type: 'planet', mass: 10, radius: 15, color: '#3b82f6' },
  { name: 'Gas Giant', type: 'gas_giant', mass: 120, radius: 28, color: '#e2e8f0' },
  { name: 'Asteroid', type: 'asteroid', mass: 0.1, radius: 6, color: '#94a3b8' },
];

export const CosmicDashboard: React.FC<CosmicDashboardProps> = ({
  bodies,
  physicsConfig,
  setPhysicsConfig,
  selectedBodyId,
  onSelectBody,
  spawnPreset,
  setSpawnPreset,
  onLoadPreset,
  onClearAll,
  simulationTime,
}) => {
  const activeCount = bodies.filter((b) => !b.isDestroyed).length;

  return (
    <div className="w-80 h-full flex flex-col bg-slate-950/85 backdrop-blur-lg border-r border-slate-800/80 text-slate-100 z-10 select-none overflow-y-auto shrink-0 scrollbar-thin scrollbar-thumb-slate-800">
      {/* Header telemetry branding */}
      <div className="p-5 border-b border-slate-800/80 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Orbit className="w-5 h-5 text-cyan-400 animate-spin-slow" />
          <h1 className="text-sm font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 uppercase">
            3D Gravity Simulator
          </h1>
        </div>
        <p className="text-[10px] font-mono text-slate-400">GRAVITY TELEMETRY SYSTEM ACTIVE</p>
      </div>

      {/* Physics Core Control Panel */}
      <div className="p-4 border-b border-slate-800/50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Physics Core
          </div>
          <span className="text-[10px] font-mono bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 px-2 py-0.5 rounded">
            {activeCount} BODIES
          </span>
        </div>

        {/* Play/Pause & Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPhysicsConfig((prev) => ({ ...prev, paused: !prev.paused }))}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition-all ${
              physicsConfig.paused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            id="btn-physics-play-pause"
          >
            {physicsConfig.paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            {physicsConfig.paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-950/40 border border-rose-800/40 hover:bg-rose-900/30 text-rose-300 rounded-lg text-xs font-medium tracking-wide transition-all"
            id="btn-physics-clear-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </button>
        </div>

        {/* Gravity Multiplier (G) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>GRAVITY CONSTANT (G)</span>
            <span className="text-cyan-400 font-bold">{physicsConfig.G.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="15.0"
            step="0.5"
            value={physicsConfig.G}
            onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, G: parseFloat(e.target.value) }))}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            id="slider-gravity-g"
          />
        </div>

        {/* Simulation Speed (Time step) */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
            <span>TEMPORAL TIME-STEP</span>
            <span className="text-cyan-400 font-bold">{physicsConfig.timeScale.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.50"
            step="0.05"
            value={physicsConfig.timeScale}
            onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, timeScale: parseFloat(e.target.value) }))}
            className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            id="slider-time-scale"
          />
        </div>

        {/* Collision Behavior Select */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-slate-400">COLLISION MECHANICAL RESPONSE</span>
          <div className="grid grid-cols-3 gap-1">
            {(['merge', 'bounce', 'none'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setPhysicsConfig((prev) => ({ ...prev, collisionMode: mode }))}
                className={`px-2 py-1.5 border rounded text-[10px] font-mono uppercase transition-all ${
                  physicsConfig.collisionMode === mode
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
                id={`btn-collision-mode-${mode}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preset cosmic scenarios */}
      <div className="p-4 border-b border-slate-800/50 flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Cosmic Presets
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'solar_system', name: 'Solar Oasis System', desc: 'Stable star with orbiting planets and asteroid field.' },
            { id: 'binary_star', name: 'Binary Dance', desc: 'Two equal-mass stars in chaotic orbits.' },
            { id: 'galaxy_collision', name: 'Galactic Fusion', desc: 'Two beautiful colliding spiral systems of space dust.' },
            { id: 'black_hole_catastrophe', name: 'Black Hole Event Horizon', desc: 'A giant singularity tearing stars and dust apart.' },
          ].map((scen) => (
            <button
              key={scen.id}
              onClick={() => onLoadPreset(scen.id)}
              className="text-left p-2.5 bg-slate-900 hover:bg-slate-800/80 rounded-lg border border-slate-800 hover:border-slate-700 transition-all group"
              id={`btn-preset-${scen.id}`}
            >
              <div className="text-[11px] font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                {scen.name}
              </div>
              <div className="text-[9px] text-slate-400 leading-normal mt-0.5">{scen.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Body Launcher presets */}
      <div className="p-4 border-b border-slate-800/50 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Plus className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          Body Spawner Tool
        </div>
        <p className="text-[9px] text-slate-400">Select a preset template, then use the <b>Launch</b> button or click & drag on the canvas to throw into orbit.</p>

        <div className="flex flex-col gap-1.5">
          {SPAWN_PRESETS.map((preset) => {
            const isSelected = spawnPreset.type === preset.type;
            return (
              <button
                key={preset.type}
                onClick={() => setSpawnPreset(preset)}
                className={`flex items-center justify-between p-2 rounded-lg border transition-all text-xs font-mono ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-semibold shadow-md shadow-cyan-500/5'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
                id={`btn-spawner-preset-${preset.type}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shadow-inner"
                    style={{ backgroundColor: preset.color, boxShadow: `0 0 6px ${preset.color}` }}
                  />
                  <span>{preset.name.toUpperCase()}</span>
                </div>
                <span className="text-[10px] text-slate-500">M: {preset.mass}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid overlay & trail switches */}
      <div className="p-4 border-b border-slate-800/50 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <LayoutGrid className="w-3.5 h-3.5 text-slate-400" />
          HUD Settings
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded border border-slate-800 hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={physicsConfig.gridEnabled}
              onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, gridEnabled: e.target.checked }))}
              className="rounded border-slate-700 text-cyan-600 bg-slate-800 focus:ring-0"
            />
            <span>3D GRID</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded border border-slate-800 hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={physicsConfig.showTrails}
              onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, showTrails: e.target.checked }))}
              className="rounded border-slate-700 text-cyan-600 bg-slate-800 focus:ring-0"
            />
            <span>TRAILS</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded border border-slate-800 hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={physicsConfig.showVectors}
              onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, showVectors: e.target.checked }))}
              className="rounded border-slate-700 text-cyan-600 bg-slate-800 focus:ring-0"
            />
            <span>VECTORS</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2 rounded border border-slate-800 hover:border-slate-700 transition-all">
            <input
              type="checkbox"
              checked={physicsConfig.collisionMode !== 'none'}
              onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, collisionMode: e.target.checked ? 'merge' : 'none' }))}
              className="rounded border-slate-700 text-cyan-600 bg-slate-800 focus:ring-0"
            />
            <span>COLLISIONS</span>
          </label>
        </div>
      </div>

      {/* Active Bodies List */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-300">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Active Orbiters
          </span>
          <span className="text-[10px] font-mono text-slate-500">SELECT TO TRACK</span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-72 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
          {bodies
            .filter((b) => !b.isDestroyed)
            .map((body) => {
              const isSelected = selectedBodyId === body.id;
              const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy + body.vz * body.vz);
              return (
                <div
                  key={body.id}
                  onClick={() => onSelectBody(body.id)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                  id={`orbiter-row-${body.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shadow-lg"
                      style={{ backgroundColor: body.color, boxShadow: `0 0 5px ${body.color}` }}
                    />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold font-mono tracking-wide">{body.name.toUpperCase()}</span>
                      <span className="text-[8px] text-slate-500 font-mono">MASS: {body.mass.toFixed(1)}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">{speed.toFixed(1)} km/s</span>
                </div>
              );
            })}
          {activeCount === 0 && (
            <div className="text-center py-6 text-slate-500 text-xs font-mono border border-dashed border-slate-800 rounded-lg">
              SYSTEM IS EMPTY
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
