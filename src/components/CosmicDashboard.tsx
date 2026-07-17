/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Body, PhysicsConfig, SpawnPreset } from '../types';
import { theme } from '../theme/tokens';
import { Play, Pause, Trash2, Orbit } from 'lucide-react';

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
  isOpen: boolean;
}

const SPAWN_PRESETS: SpawnPreset[] = [
  { name: 'Star', type: 'star', mass: 1000, radius: 45, color: theme.colors.meaning.star },
  { name: 'Black hole', type: 'black_hole', mass: 8000, radius: 25, color: theme.colors.meaning.blackHole },
  { name: 'Rocky planet', type: 'planet', mass: 10, radius: 15, color: theme.colors.accent },
  { name: 'Gas giant', type: 'gas_giant', mass: 120, radius: 28, color: '#A1A1AA' },
  { name: 'Asteroid', type: 'asteroid', mass: 0.1, radius: 6, color: '#71717A' },
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    className="font-heading text-[12px] font-semibold tracking-wider uppercase mb-5"
    style={{ color: theme.colors.textMuted, letterSpacing: '0.12em' }}
  >
    {children}
  </p>
);

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
  isOpen,
}) => {
  const activeCount = bodies.filter((b) => !b.isDestroyed).length;

  return (
    <div
      className={`absolute xl:top-6 xl:bottom-6 xl:left-6 lg:top-4 lg:bottom-4 lg:left-4 top-4 bottom-4 left-4 z-40 w-[280px] max-w-[85vw] flex flex-col select-none overflow-y-auto shrink-0 scrollbar-none rounded-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : '-translate-x-[120%]'}`}
      style={{
        background: theme.colors.glassPanel,
        backdropFilter: 'blur(24px) saturate(120%)',
        WebkitBackdropFilter: 'blur(24px) saturate(120%)',
        border: `1px solid ${theme.colors.glassBorder}`,
        boxShadow: theme.shadows.panel,
        fontFamily: theme.typography.fontSans,
      }}
    >
      {/* Header section with generous spacing */}
      <div className="px-6 pt-9 pb-8 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Orbit className="w-7 h-7 animate-spin-slow text-[#E5E7EB]" />
          <h1
            className="font-heading text-[34px] font-bold tracking-tight"
            style={{ color: theme.colors.textPrimary, letterSpacing: '-0.03em' }}
          >
            Orbit Sim
          </h1>
        </div>
        <p className="text-[13px] pl-11" style={{ color: theme.colors.textMuted }}>
          N-body gravitational engine
        </p>
      </div>

      {/* Main content separated with spacing and divider lines */}
      <div className="flex-1 px-6 pb-8 flex flex-col gap-8">
        
        {/* Simulation Section */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <SectionLabel>Simulation</SectionLabel>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded font-mono"
              style={{
                color: theme.colors.textPrimary,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
              }}
            >
              {activeCount} {activeCount === 1 ? 'BODY' : 'BODIES'}
            </span>
          </div>

          {/* Play/Pause & Clear Buttons - macOS style */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setPhysicsConfig((prev) => ({ ...prev, paused: !prev.paused }))}
              className="interactive-btn flex items-center justify-center gap-2 px-3 rounded-xl text-[14px] font-semibold"
              style={{
                height: '40px',
                background: physicsConfig.paused ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                border: 'none',
                color: '#F8FAFC',
                cursor: 'pointer',
              }}
              id="btn-physics-play-pause"
            >
              {physicsConfig.paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              {physicsConfig.paused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={onClearAll}
              className="interactive-btn flex items-center justify-center gap-1.5 px-3 rounded-xl text-[14px] font-semibold"
              style={{
                height: '40px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: 'none',
                color: theme.colors.textSecondary,
                cursor: 'pointer',
              }}
              id="btn-physics-clear-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          {/* Gravity Multiplier (G) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[13px]">
              <span className="font-medium text-[#CBD5E1]">Gravity constant</span>
              <span className="font-mono font-bold text-[#F8FAFC]">{physicsConfig.G.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.5"
              value={physicsConfig.G}
              onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, G: parseFloat(e.target.value) }))}
              id="slider-gravity-g"
              style={{ height: '3px' }}
            />
          </div>

          {/* Simulation Speed */}
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-[13px]">
              <span className="font-medium text-[#CBD5E1]">Time scale</span>
              <span className="font-mono font-bold text-[#F8FAFC]">{physicsConfig.timeScale.toFixed(2)}×</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.50"
              step="0.05"
              value={physicsConfig.timeScale}
              onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, timeScale: parseFloat(e.target.value) }))}
              id="slider-time-scale"
              style={{ height: '3px' }}
            />
          </div>

          {/* Collision Response Selector */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-medium text-[#CBD5E1]">Collision response</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['merge', 'bounce', 'none'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setPhysicsConfig((prev) => ({ ...prev, collisionMode: mode }))}
                  className="rounded-xl text-[12px] font-semibold capitalize transition-all duration-150 text-center"
                  style={{
                    height: '40px',
                    background: physicsConfig.collisionMode === mode ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: physicsConfig.collisionMode === mode ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.04)',
                    color: physicsConfig.collisionMode === mode ? theme.colors.textPrimary : theme.colors.textMuted,
                    cursor: 'pointer',
                  }}
                  id={`btn-collision-mode-${mode}`}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = physicsConfig.collisionMode === mode ? 'rgba(255, 255, 255, 0.08)' : 'transparent'; }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

        {/* Scenario preset section */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Scenarios</SectionLabel>
          <div className="flex flex-col gap-1.5">
            {[
              { id: 'solar_system', name: 'Solar Oasis System', desc: 'Star with planets and asteroid belt' },
              { id: 'binary_star', name: 'Binary Dance', desc: 'Two equal-mass stars in mutual orbit' },
              { id: 'galaxy_collision', name: 'Galactic Fusion', desc: 'Two spiral systems colliding' },
              { id: 'black_hole_catastrophe', name: 'Event Horizon', desc: 'Accretion disk around singularity' },
            ].map((scen) => (
              <button
                key={scen.id}
                onClick={() => onLoadPreset(scen.id)}
                className="scenario-item text-left px-3.5 py-2.5 rounded-xl"
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                }}
                id={`btn-preset-${scen.id}`}
              >
                <div className="text-[13px] font-semibold text-[#F8FAFC]">{scen.name}</div>
                <div className="text-[11px] text-[#94A3B8] leading-normal">{scen.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider line */}
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

        {/* Body Spawner presets */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Spawn Body</SectionLabel>
          <p className="text-[13px] leading-relaxed text-[#94A3B8] mb-1">
            Choose a type, then click Launch or drag on the canvas to slingshot.
          </p>

          <div className="flex flex-col gap-1.5">
            {SPAWN_PRESETS.map((preset) => {
              const isSelected = spawnPreset.type === preset.type;
              return (
                <button
                  key={preset.type}
                  onClick={() => setSpawnPreset(preset)}
                  className="interactive-btn flex items-center justify-between px-3.5 py-2 rounded-xl text-[13px] font-semibold"
                  style={{
                    height: '40px',
                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(255, 255, 255, 0.04)',
                    color: isSelected ? '#F8FAFC' : '#CBD5E1',
                    cursor: 'pointer',
                  }}
                  id={`btn-spawner-preset-${preset.type}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span>{preset.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B]">M {preset.mass}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider line */}
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

        {/* Display options */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Display</SectionLabel>
          <div className="flex flex-col gap-3.5">
            {[
              { key: 'gridEnabled' as const, label: 'Reference grid' },
              { key: 'showTrails' as const, label: 'Orbit trails' },
              { key: 'showVectors' as const, label: 'Velocity vectors' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={physicsConfig[key] as boolean}
                  onChange={(e) => setPhysicsConfig((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span className="text-[13px] font-medium text-[#CBD5E1] group-hover:text-[#F8FAFC] transition-colors">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Divider line */}
        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

        {/* Active Orbiters */}
        <div className="flex flex-col gap-4 flex-1">
          <SectionLabel>Active Orbiters</SectionLabel>

          <div className="flex-1 overflow-y-auto max-h-72 flex flex-col gap-1 pr-0.5">
            {bodies
              .filter((b) => !b.isDestroyed)
              .map((body) => {
                const isSelected = selectedBodyId === body.id;
                const speed = Math.sqrt(body.vx * body.vx + body.vy * body.vy + body.vz * body.vz);
                return (
                  <div
                    key={body.id}
                    onClick={() => onSelectBody(body.id)}
                    className="flex items-center justify-between px-3.5 py-1.5 rounded-lg cursor-pointer transition-all duration-150 animate-fade-in"
                    style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: isSelected ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent'; }}
                    id={`orbiter-row-${body.id}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: body.color }}
                      />
                      <div className="flex flex-col">
                        <span
                          className="text-[12px] font-semibold leading-tight"
                          style={{ color: isSelected ? theme.colors.textPrimary : theme.colors.textSecondary }}
                        >
                          {body.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748B]">M {body.mass.toFixed(1)}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#CBD5E1]">{speed.toFixed(1)}</span>
                  </div>
                );
              })}
            {activeCount === 0 && (
              <div
                className="text-center py-6 text-[12px] text-[#64748B] rounded-lg"
                style={{ border: '1px dashed rgba(255, 255, 255, 0.06)' }}
              >
                System is empty
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
