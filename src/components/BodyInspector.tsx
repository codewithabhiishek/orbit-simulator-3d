/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Body, PhysicsConfig, Vector3D } from '../types';
import { calculateCircularOrbitVelocity } from '../utils/physicsHelpers';
import { Trash2, Shield, Info, Rocket, Compass, Video, Eye, RefreshCw, ChevronRight } from 'lucide-react';

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
}) => {
  if (!selectedBody || selectedBody.isDestroyed) {
    return (
      <div className="p-4 bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-xl text-slate-400 font-mono text-[11px] text-center shadow-lg flex flex-col gap-2 justify-center items-center h-48">
        <Info className="w-5 h-5 text-slate-500" />
        <div>SELECT A CELESTIAL BODY TO INSPECT ORBITAL TELEMETRY</div>
      </div>
    );
  }

  const speed = Math.sqrt(
    selectedBody.vx * selectedBody.vx +
    selectedBody.vy * selectedBody.vy +
    selectedBody.vz * selectedBody.vz
  );

  // Math: Escape velocity relative to heaviest attractor
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
      onUpdateBody(selectedBody.id, {
        vx: circVel.x,
        vy: circVel.y,
        vz: circVel.z,
      });
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

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl p-5 text-slate-200 font-mono text-[11px] flex flex-col gap-4 animate-fade-in" id={`inspector-panel-${selectedBody.id}`}>
      {/* Name and Status Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full inline-block shadow-lg"
            style={{ backgroundColor: selectedBody.color, boxShadow: `0 0 8px ${selectedBody.color}` }}
          />
          <div className="flex flex-col">
            <input
              type="text"
              value={selectedBody.name}
              onChange={(e) => onUpdateBody(selectedBody.id, { name: e.target.value })}
              className="text-xs font-bold text-slate-100 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none w-36 py-0.5 tracking-wider"
              id="input-inspector-name"
            />
            <span className="text-[8px] text-slate-500 uppercase">
              CLASSIFICATION: {selectedBody.type.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Status Indicator Pill */}
        <span
          className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider ${
            selectedBody.type === 'black_hole'
              ? 'bg-purple-950/40 border border-purple-800 text-purple-300'
              : isEscaping
              ? 'bg-rose-950/40 border border-rose-800 text-rose-300 animate-pulse'
              : 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
          }`}
        >
          {selectedBody.type === 'black_hole'
            ? 'SINGULARITY'
            : isEscaping
            ? 'ESCAPING ORBIT'
            : 'BOUND ORBIT'}
        </span>
      </div>

      {/* Physics Stats Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800/60">
        <div className="bg-slate-950/40 border border-slate-800/40 rounded-lg p-2 flex flex-col gap-0.5">
          <span className="text-[8px] text-slate-500 font-semibold tracking-wider">ORBITAL SPEED</span>
          <span className="text-xs font-bold text-cyan-400">{speed.toFixed(2)} km/s</span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/40 rounded-lg p-2 flex flex-col gap-0.5">
          <span className="text-[8px] text-slate-500 font-semibold tracking-wider">CELESTIAL MASS</span>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-indigo-400">{selectedBody.mass.toFixed(1)}</span>
            <span className="text-[8px] text-slate-500">e24 kg</span>
          </div>
        </div>

        {/* Dynamic Mass Controller Slider */}
        <div className="col-span-2 flex flex-col gap-1.5 py-1">
          <div className="flex justify-between items-center text-[8px] text-slate-400">
            <span>ADJUST CELESTIAL MASS</span>
            <span className="text-cyan-400">{selectedBody.mass.toFixed(1)} e24 kg</span>
          </div>
          <input
            type="range"
            min="0.1"
            max={selectedBody.type === 'star' || selectedBody.type === 'black_hole' ? '15000' : '500'}
            step="0.5"
            value={selectedBody.mass}
            onChange={(e) => onUpdateBody(selectedBody.id, { mass: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 bg-slate-800 h-1 rounded cursor-pointer"
            id="slider-inspector-mass"
          />
        </div>
      </div>

      {/* Flight Telemetry Coordinates */}
      <div className="flex flex-col gap-1.5 pb-3 border-b border-slate-800/60">
        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Vector Telemetry Coordinates</span>
        <div className="grid grid-cols-3 gap-2 text-slate-400">
          <div>
            <span className="text-rose-500 font-bold">X:</span> {selectedBody.x.toFixed(1)}
          </div>
          <div>
            <span className="text-emerald-500 font-bold">Y:</span> {selectedBody.y.toFixed(1)}
          </div>
          <div>
            <span className="text-blue-500 font-bold">Z:</span> {selectedBody.z.toFixed(1)}
          </div>
          <div>
            <span className="text-rose-400 font-bold">Vx:</span> {selectedBody.vx.toFixed(1)}
          </div>
          <div>
            <span className="text-emerald-400 font-bold">Vy:</span> {selectedBody.vy.toFixed(1)}
          </div>
          <div>
            <span className="text-blue-400 font-bold">Vz:</span> {selectedBody.vz.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Keplerian Orbital Mechanics Inspector */}
      {heaviestBody && heaviestBody.id !== selectedBody.id && (
        <div className="flex flex-col gap-1 text-[10px] text-slate-400 bg-slate-950/20 p-2.5 rounded-lg border border-slate-800/40">
          <div className="flex justify-between">
            <span>PRIMARY ATTRACTOR:</span>
            <span className="text-slate-200 font-semibold">{attractorName.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span>RADIAL DISTANCE:</span>
            <span className="text-slate-200 font-semibold">{distToAttractor.toFixed(1)} AU</span>
          </div>
          <div className="flex justify-between">
            <span>ESCAPE SPEED:</span>
            <span className="text-rose-400 font-bold">{escapeSpeed.toFixed(2)} km/s</span>
          </div>
        </div>
      )}

      {/* Camera and Navigation Controllers */}
      <div className="flex flex-col gap-2">
        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Camera Directives</span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => {
              setCameraMode('orbit');
              setRideBodyId(null);
              setCameraTarget({ x: selectedBody.x, y: selectedBody.y, z: selectedBody.z });
            }}
            className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition-all ${
              cameraMode === 'orbit' && rideBodyId === null
                ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
            id="btn-cam-inspect-orbit"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="text-[8px] uppercase">Orbit Lock</span>
          </button>

          <button
            onClick={() => {
              setCameraMode('cinematic');
              setRideBodyId(null);
              setCameraTarget({ x: selectedBody.x, y: selectedBody.y, z: selectedBody.z });
            }}
            className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition-all ${
              cameraMode === 'cinematic'
                ? 'bg-indigo-500/10 border-indigo-400 text-indigo-300 font-bold'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
            id="btn-cam-inspect-cinematic"
          >
            <Video className="w-3.5 h-3.5" />
            <span className="text-[8px] uppercase">Cinematic</span>
          </button>

          <button
            onClick={() => {
              setCameraMode('ride');
              setRideBodyId(selectedBody.id);
            }}
            className={`flex flex-col items-center gap-1 p-2 border rounded-lg transition-all ${
              cameraMode === 'ride' && rideBodyId === selectedBody.id
                ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300 font-bold animate-pulse'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400'
            }`}
            id="btn-cam-inspect-ride"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span className="text-[8px] uppercase">Ride planet</span>
          </button>
        </div>
      </div>

      {/* Orbital Mechanics Alignment Actions */}
      {heaviestBody && heaviestBody.id !== selectedBody.id && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleRecalculateCircular}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[9px] font-semibold transition-all hover:scale-102"
            title="Sets the velocity vector to be perfectly perpendicular and circular relative to the sun"
            id="btn-action-circular"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            STABILIZE ORBIT
          </button>
          <button
            onClick={handleMatchAttractorSpeed}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[9px] font-semibold transition-all hover:scale-102"
            id="btn-action-match"
          >
            <Rocket className="w-3 h-3 text-indigo-400" />
            SYNC SPEED
          </button>
        </div>
      )}

      {/* Delete / Terminate button */}
      <button
        onClick={() => onDeleteBody(selectedBody.id)}
        className="flex items-center justify-center gap-2 px-3 py-2 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/40 text-rose-300 rounded-xl text-xs font-semibold tracking-wider transition-all"
        id="btn-action-delete"
      >
        <Trash2 className="w-3.5 h-3.5" />
        VAPORIZE CELESTIAL BODY
      </button>
    </div>
  );
};
