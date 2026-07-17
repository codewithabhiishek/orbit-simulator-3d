/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Body, PhysicsConfig, Vector3D } from '../types';
import { theme } from '../theme/tokens';
import { calculateCircularOrbitVelocity } from '../utils/physicsHelpers';
import { Trash2, Info, Rocket, Compass, Video, RefreshCw } from 'lucide-react';

interface BodyInspectorProps {
  selectedBody: Body | null;
  heaviestBody: Body | null;
  G: number;
  onUpdateBody: (id: string, updates: Partial<Body>) => void;
  onDeleteBody: (id: string) => void;
  cameraMode: 'orbit' | 'ride' | 'cinematic';
  setCameraMode: (mode: 'orbit' | 'ride' | 'cinematic') => void;
  rideBodyId: string | null;
  setRideBodyId: (id: string | null) => void;
  setCameraTarget: (v: Vector3D) => void;
  isOpen: boolean;
}

export const BodyInspector: React.FC<BodyInspectorProps> = ({
  selectedBody,
  heaviestBody,
  G,
  onUpdateBody,
  onDeleteBody,
  cameraMode,
  setCameraMode,
  rideBodyId,
  setRideBodyId,
  setCameraTarget,
  isOpen,
}) => {
  const containerClasses = `absolute xl:top-6 xl:right-6 lg:top-4 lg:right-4 top-4 right-4 z-40 w-[300px] max-w-[85vw] transform transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : 'translate-x-[150%] xl:translate-x-0'}`;

  if (!selectedBody || selectedBody.isDestroyed) {
    return (
      <div
        className={`${containerClasses} p-6 rounded-2xl flex flex-col gap-3 justify-center items-center h-44`}
        style={{
          background: theme.colors.glassPanel,
          backdropFilter: 'blur(24px) saturate(120%)',
          WebkitBackdropFilter: 'blur(24px) saturate(120%)',
          border: `1px solid ${theme.colors.glassBorder}`,
          boxShadow: theme.shadows.panel,
          fontFamily: theme.typography.fontSans,
        }}
      >
        <Info className="w-5 h-5" style={{ color: theme.colors.textMuted }} />
        <div className="text-[13px] font-semibold text-[#F8FAFC]">Orbital Analysis Deck</div>
        <div className="text-[11px] text-center leading-relaxed" style={{ color: theme.colors.textMuted }}>
          Click a celestial body to inspect orbital telemetry
        </div>
      </div>
    );
  }

  const speed = Math.sqrt(
    selectedBody.vx * selectedBody.vx +
    selectedBody.vy * selectedBody.vy +
    selectedBody.vz * selectedBody.vz
  );

  let escapeSpeed = 0;
  let distToAttractor = 0;
  let attractorName = 'N/A';

  if (heaviestBody && heaviestBody.id !== selectedBody.id) {
    const dx = selectedBody.x - heaviestBody.x;
    const dy = selectedBody.y - heaviestBody.y;
    const dz = selectedBody.z - heaviestBody.z;
    distToAttractor = Math.sqrt(dx * dx + dy * dy + dz * dz);
    attractorName = heaviestBody.name;
    if (distToAttractor > 1e-1) {
      escapeSpeed = Math.sqrt((2 * G * heaviestBody.mass) / distToAttractor);
    }
  }

  const isEscaping = escapeSpeed > 0 && speed > escapeSpeed;

  const handleRecalculateCircular = () => {
    if (heaviestBody && heaviestBody.id !== selectedBody.id) {
      const circVel = calculateCircularOrbitVelocity(
        { x: selectedBody.x, y: selectedBody.y, z: selectedBody.z },
        heaviestBody,
        G
      );
      onUpdateBody(selectedBody.id, { vx: circVel.x, vy: circVel.y, vz: circVel.z });
    }
  };

  const handleMatchAttractorSpeed = () => {
    if (heaviestBody) {
      onUpdateBody(selectedBody.id, {
        vx: heaviestBody.vx,
        vy: heaviestBody.vy,
        vz: heaviestBody.vz,
      });
    }
  };

  const statusLabel =
    selectedBody.type === 'black_hole' ? 'Singularity' :
    isEscaping ? 'Escaping Orbit' : 'Bound Orbit';

  // Warnings, success, and singularity tags use meaning colors: Success -> emerald, Warning -> amber, Singularity -> deep purple
  const statusColor =
    selectedBody.type === 'black_hole' ? { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.25)', text: theme.colors.meaning.blackHole } :
    isEscaping ? { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)', text: theme.colors.meaning.warning } :
    { bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.2)', text: theme.colors.meaning.success };

  return (
    <div
      className={`${containerClasses} rounded-2xl p-5 flex flex-col gap-4`}
      style={{
        background: theme.colors.glassPanel,
        backdropFilter: 'blur(24px) saturate(120%)',
        WebkitBackdropFilter: 'blur(24px) saturate(120%)',
        border: `1px solid ${theme.colors.glassBorder}`,
        boxShadow: theme.shadows.panel,
        fontFamily: theme.typography.fontSans,
      }}
      id={`inspector-panel-${selectedBody.id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${theme.colors.borderSubtle}` }}>
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: selectedBody.color }}
          />
          <div className="flex flex-col">
            <input
              type="text"
              value={selectedBody.name}
              onChange={(e) => onUpdateBody(selectedBody.id, { name: e.target.value })}
              className="text-[14px] font-bold font-heading bg-transparent border-b border-transparent hover:border-white/10 focus:border-white/20 focus:outline-none py-0.5 w-36 text-[#F8FAFC] transition-colors"
              id="input-inspector-name"
            />
            <span className="text-[11px] font-medium capitalize" style={{ color: theme.colors.textMuted }}>
              {selectedBody.type.replace('_', ' ')}
            </span>
          </div>
        </div>

        <span
          className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase"
          style={{ background: statusColor.bg, border: `1px solid ${statusColor.border}`, color: statusColor.text }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Grid statistics - clean table view */}
      <div className="flex flex-col gap-2 pb-3" style={{ borderBottom: `1px solid ${theme.colors.borderSubtle}` }}>
        <div className="flex justify-between items-center text-[13px]">
          <span style={{ color: theme.colors.textSecondary }}>Velocity</span>
          <span className="font-mono font-bold" style={{ color: theme.colors.textPrimary }}>{speed.toFixed(2)} km/s</span>
        </div>
        <div className="flex justify-between items-center text-[13px]">
          <span style={{ color: theme.colors.textSecondary }}>Mass index</span>
          <span className="font-mono font-bold" style={{ color: theme.colors.textPrimary }}>{selectedBody.mass.toFixed(1)} M₀</span>
        </div>

        {/* Mass slider */}
        <div className="flex flex-col gap-1.5 pt-2">
          <div className="flex justify-between items-center text-[11px]">
            <span style={{ color: theme.colors.textMuted }}>Adjust mass coefficient</span>
            <span className="font-mono" style={{ color: theme.colors.textSecondary }}>{selectedBody.mass.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max={selectedBody.type === 'star' || selectedBody.type === 'black_hole' ? '15000' : '500'}
            step="0.5"
            value={selectedBody.mass}
            onChange={(e) => onUpdateBody(selectedBody.id, { mass: parseFloat(e.target.value) })}
            id="slider-inspector-mass"
          />
        </div>
      </div>

      {/* Vector position matrices */}
      <div className="flex flex-col gap-2.5 pb-3" style={{ borderBottom: `1px solid ${theme.colors.borderSubtle}` }}>
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: theme.colors.textMuted }}>Spatial Matrix</span>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          {[['X', selectedBody.x, '#EF4444'], ['Y', selectedBody.y, '#22C55E'], ['Z', selectedBody.z, theme.colors.accent]].map(([axis, val, col]) => (
            <div key={axis as string} className="flex flex-col gap-0.5 px-2.5 py-1.5 rounded-lg bg-[#1A2233]" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>
              <span className="text-[9px] font-bold" style={{ color: col as string }}>{axis as string}</span>
              <span className="text-[12px] font-mono font-medium text-[#F8FAFC]">{(val as number).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          {[['Vx', selectedBody.vx, '#EF4444'], ['Vy', selectedBody.vy, '#22C55E'], ['Vz', selectedBody.vz, theme.colors.accent]].map(([axis, val, col]) => (
            <div key={axis as string} className="flex flex-col gap-0.5 px-2.5 py-1.5 rounded-lg bg-[#1A2233]" style={{ border: '1px solid rgba(255,255,255,0.03)' }}>
              <span className="text-[9px] font-bold" style={{ color: col as string }}>{axis as string}</span>
              <span className="text-[12px] font-mono font-medium text-[#F8FAFC]">{(val as number).toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Keplerian attractor metrics */}
      {heaviestBody && heaviestBody.id !== selectedBody.id && (
        <div className="flex flex-col gap-2 pb-3" style={{ borderBottom: `1px solid ${theme.colors.borderSubtle}` }}>
          {[
            ['Attractor', attractorName],
            ['Distance', `${distToAttractor.toFixed(1)} AU`],
            ['Escape vel.', `${escapeSpeed.toFixed(2)} km/s`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center text-[13px]">
              <span className="font-medium" style={{ color: theme.colors.textSecondary }}>{label}</span>
              <span className="font-mono font-bold" style={{ color: theme.colors.textPrimary }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Camera lock actions */}
      <div className="flex flex-col gap-2 pb-1">
        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: theme.colors.textMuted }}>Camera target mode</span>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            {
              mode: 'orbit' as const,
              icon: <Compass className="w-4 h-4" />,
              label: 'Orbit',
              active: cameraMode === 'orbit' && rideBodyId === null,
              action: () => { setCameraMode('orbit'); setRideBodyId(null); setCameraTarget({ x: selectedBody.x, y: selectedBody.y, z: selectedBody.z }); },
              id: 'btn-cam-inspect-orbit',
            },
            {
              mode: 'cinematic' as const,
              icon: <Video className="w-4 h-4" />,
              label: 'Cinema',
              active: cameraMode === 'cinematic',
              action: () => { setCameraMode('cinematic'); setRideBodyId(null); setCameraTarget({ x: selectedBody.x, y: selectedBody.y, z: selectedBody.z }); },
              id: 'btn-cam-inspect-cinematic',
            },
            {
              mode: 'ride' as const,
              icon: <Rocket className="w-4 h-4" />,
              label: 'Ride',
              active: cameraMode === 'ride' && rideBodyId === selectedBody.id,
              action: () => { setCameraMode('ride'); setRideBodyId(selectedBody.id); },
              id: 'btn-cam-inspect-ride',
            },
          ].map(({ icon, label, active, action, id }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all duration-150 text-[11px] font-semibold"
              style={{
                background: active ? theme.colors.accentGlow : 'transparent',
                border: active ? `1px solid ${theme.colors.borderActive}` : `1px solid ${theme.colors.borderSubtle}`,
                color: active ? theme.colors.textPrimary : theme.colors.textSecondary,
                cursor: 'pointer',
              }}
              id={id}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = active ? theme.colors.accentGlow : 'transparent'; }}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Keplerian actions */}
      {heaviestBody && heaviestBody.id !== selectedBody.id && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleRecalculateCircular}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150"
            style={{
              background: 'transparent',
              border: `1px solid ${theme.colors.borderSubtle}`,
              color: theme.colors.textSecondary,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.bgHover; e.currentTarget.style.borderColor = theme.colors.borderActive; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = theme.colors.borderSubtle; }}
            title="Sets velocity to maintain a stable circular orbit"
            id="btn-action-circular"
          >
            <RefreshCw className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
            Stabilize
          </button>
          <button
            onClick={handleMatchAttractorSpeed}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150"
            style={{
              background: 'transparent',
              border: `1px solid ${theme.colors.borderSubtle}`,
              color: theme.colors.textSecondary,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = theme.colors.bgHover; e.currentTarget.style.borderColor = theme.colors.borderActive; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = theme.colors.borderSubtle; }}
            id="btn-action-match"
          >
            <Rocket className="w-3.5 h-3.5" style={{ color: theme.colors.accent }} />
            Sync speed
          </button>
        </div>
      )}

      {/* Delete / remove */}
      <button
        onClick={() => onDeleteBody(selectedBody.id)}
        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 animate-fade-in"
        style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          color: theme.colors.meaning.error,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.1)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.05)'; }}
        id="btn-action-delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Remove body
      </button>
    </div>
  );
};
