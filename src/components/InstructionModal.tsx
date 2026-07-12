/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, Move, Radio, Eye, Rocket, X, Orbit, RotateCw } from 'lucide-react';

interface InstructionModalProps {
  onClose: () => void;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 font-mono text-xs flex flex-col gap-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
          id="btn-close-instruction-modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Branding Header */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Orbit className="w-5 h-5 text-cyan-400 animate-spin-slow" />
          <div>
            <h2 className="text-sm font-bold tracking-widest text-cyan-400 uppercase">3D ORBITAL SIMULATOR</h2>
            <p className="text-[9px] text-slate-500 uppercase">Interactive Flight Manual & Command Console</p>
          </div>
        </div>

        {/* Interactive instructions section */}
        <div className="flex flex-col gap-4 overflow-y-auto max-h-96 pr-1 scrollbar-thin">
          
          {/* Section: 3D Camera Controls */}
          <div className="flex flex-col gap-2">
            <span className="text-indigo-400 font-semibold tracking-wider text-[10px] uppercase border-b border-indigo-950 pb-1 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              1. 3D Camera Space Navigation
            </span>
            <div className="grid grid-cols-2 gap-3 pl-1 text-[11px] leading-relaxed text-slate-400">
              <div>
                <b className="text-slate-200 block">ROTATE CAMERA:</b>
                Left-Click and Drag on empty space to spin yaw/pitch.
              </div>
              <div>
                <b className="text-slate-200 block">PAN CAMERA:</b>
                Right-Click & Drag OR Shift+Left-Click to pan the target view.
              </div>
              <div className="col-span-2">
                <b className="text-slate-200 block">ZOOM SPACE FRAME:</b>
                Scroll your mouse wheel (or use trackpad swipe) to zoom in or out.
              </div>
            </div>
          </div>

          {/* Section: Slingshot spawner */}
          <div className="flex flex-col gap-2">
            <span className="text-cyan-400 font-semibold tracking-wider text-[10px] uppercase border-b border-cyan-950 pb-1 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" />
              2. Slingshot Orbital Spawning
            </span>
            <div className="pl-1 text-[11px] leading-relaxed text-slate-400 flex flex-col gap-1.5">
              <p>
                Click <b className="text-cyan-300">"Launch [Body]"</b> at the bottom of the screen.
              </p>
              <p>
                A glowing preview body will appear. 
                <b className="text-slate-200"> Drag your cursor</b> to draw a vector representing speed and trajectory. 
                <b className="text-slate-200"> Release the cursor</b> to slingshot-launch the new celestial orbiter into space!
              </p>
              <p className="bg-cyan-950/20 border border-cyan-900/40 p-2 rounded text-[10px] text-cyan-300">
                💡 <b>PRO-TIP (Auto-Orbit):</b> Enabling <b>"AUTO-ORBIT"</b> automatically pre-calculates circular orbital speeds relative to the heaviest star. This ensures beautiful stable orbits instead of instant stellar crashes!
              </p>
            </div>
          </div>

          {/* Section: Orbital Mechanics Inspectors */}
          <div className="flex flex-col gap-2">
            <span className="text-emerald-400 font-semibold tracking-wider text-[10px] uppercase border-b border-emerald-950 pb-1 flex items-center gap-1.5">
              <Rocket className="w-3.5 h-3.5" />
              3. Advanced Flight Director Mode
            </span>
            <div className="pl-1 text-[11px] leading-relaxed text-slate-400 flex flex-col gap-2">
              <p>
                <b className="text-slate-200">Track and Follow:</b> Click any planet to open its flight telemetry inspector. Lock the camera, check its mass, or inspect if its current speed exceeds escape velocities!
              </p>
              <p>
                <b className="text-slate-200">First-Person Ride:</b> Click <b>"Ride Planet"</b> inside the inspector to mount the camera directly on the planet's surface and orbit through space as a pilot!
              </p>
            </div>
          </div>
        </div>

        {/* Footer Accept Button */}
        <button
          onClick={onClose}
          className="mt-2 w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-600/10 transition-all hover:scale-102 active:scale-98 text-center cursor-pointer"
          id="btn-modal-dismiss-enter"
        >
          ENTER SYSTEM CORE
        </button>
      </div>
    </div>
  );
};
