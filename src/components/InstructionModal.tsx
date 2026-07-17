/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, RotateCw, Rocket, X, Orbit } from 'lucide-react';
import { theme } from '../theme/tokens';

interface InstructionModalProps {
  onClose: () => void;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-fade-in"
      style={{ background: 'rgba(7, 9, 15, 0.8)', backdropFilter: 'blur(16px)' }}
    >
      <div
        className="relative w-full max-w-md flex flex-col gap-6 animate-modal-in"
        style={{
          background: theme.colors.bgPanel,
          border: `1px solid ${theme.colors.borderSubtle}`,
          borderRadius: theme.radii.lg,
          boxShadow: theme.shadows.panel,
          padding: '28px',
          fontFamily: theme.typography.fontSans,
          color: theme.colors.textSecondary,
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-all"
          style={{ color: theme.colors.textMuted, background: 'transparent', border: 'none', cursor: 'pointer' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textPrimary; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textMuted; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          id="btn-close-instruction-modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pb-4" style={{ borderBottom: `1px solid ${theme.colors.borderSubtle}` }}>
          <div className="p-2 rounded-lg" style={{ background: theme.colors.accentGlow, border: `1px solid ${theme.colors.borderActive}` }}>
            <Orbit className="w-5 h-5" style={{ color: theme.colors.accent }} />
          </div>
          <div>
            <h2 className="text-lg font-bold font-heading" style={{ color: theme.colors.textPrimary }}>Orbit Simulator</h2>
            <p className="text-[12px]" style={{ color: theme.colors.textMuted }}>Interactive flight directives & controls</p>
          </div>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-5 overflow-y-auto max-h-80 pr-1">

          {/* Camera */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 pb-1.5" style={{ borderBottom: `1px solid ${theme.colors.divider}` }}>
              <Compass className="w-4 h-4" style={{ color: theme.colors.accent }} />
              <span className="text-[13px] font-semibold font-heading" style={{ color: theme.colors.textPrimary }}>Camera Navigation</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]" style={{ color: theme.colors.textSecondary }}>
              <div>
                <span className="font-semibold block mb-0.5" style={{ color: theme.colors.textPrimary }}>Rotate View</span>
                Drag with left-click in empty space
              </div>
              <div>
                <span className="font-semibold block mb-0.5" style={{ color: theme.colors.textPrimary }}>Pan Target</span>
                Drag with right-click or Shift + drag
              </div>
              <div className="col-span-2">
                <span className="font-semibold block mb-0.5" style={{ color: theme.colors.textPrimary }}>Zoom Viewport</span>
                Scroll wheel or trackpad swipe
              </div>
            </div>
          </div>

          {/* Spawning */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 pb-1.5" style={{ borderBottom: `1px solid ${theme.colors.divider}` }}>
              <RotateCw className="w-4 h-4" style={{ color: theme.colors.accent }} />
              <span className="text-[13px] font-semibold font-heading" style={{ color: theme.colors.textPrimary }}>Stellar Launcher</span>
            </div>
            <div className="flex flex-col gap-2 text-[12px]" style={{ color: theme.colors.textSecondary }}>
              <p>
                Select a type in the spawner drawer, then click <span className="font-semibold" style={{ color: theme.colors.textPrimary }}>Launch</span> at the bottom overlay.
              </p>
              <p>
                Drag your cursor to draw a trajectory velocity vector, then release to fire.
              </p>
              <div
                className="px-3.5 py-2.5 rounded-lg text-[11px] leading-relaxed"
                style={{ background: theme.colors.accentGlow, border: `1px solid ${theme.colors.borderActive}`, color: theme.colors.accent }}
              >
                <span className="font-bold">Auto-Orbit Mode:</span> Automates orbital circular vectors to match gravity parameters of the heaviest star, preventing collapse.
              </div>
            </div>
          </div>

          {/* Inspector */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 pb-1.5" style={{ borderBottom: `1px solid ${theme.colors.divider}` }}>
              <Rocket className="w-4 h-4" style={{ color: theme.colors.accent }} />
              <span className="text-[13px] font-semibold font-heading" style={{ color: theme.colors.textPrimary }}>Orbital Analysis</span>
            </div>
            <div className="flex flex-col gap-2 text-[12px]" style={{ color: theme.colors.textSecondary }}>
              <p>
                Click any celestial object to trigger the inspector overlay. Customize weight parameters or lock the camera.
              </p>
              <p>
                Use <span className="font-semibold" style={{ color: theme.colors.textPrimary }}>Ride</span> mode to lock the viewport perspective directly onto the body.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg text-[14px] font-semibold transition-all duration-150 btn-primary"
          id="btn-modal-dismiss-enter"
        >
          Begin exploration
        </button>
      </div>
    </div>
  );
};
