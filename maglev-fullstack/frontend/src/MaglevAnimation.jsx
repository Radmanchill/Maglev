import React from "react";

export default function MaglevAnimation({ state }) {
  if (!state) return null;

  const { position } = state;

  // --- physical limits (meters) ---
  const yMin = 0.005;
  const yMax = 0.05;

  // --- visual layout (pixels) ---
  const magnetY = 60;
  const baseY = 320;
  const scale = (baseY - magnetY) / (yMax - yMin);

  const clampedY = Math.max(yMin, Math.min(position, yMax));
  const ballY = magnetY + (clampedY - yMin) * scale;

  return (
    <svg width="300" height="360" style={{ background: "#f9fafb" }}>
      {/* Magnet */}
      <rect x="110" y="20" width="80" height="30" fill="#1f2937" />
      <text x="150" y="40" textAnchor="middle" fill="white" fontSize="12">
        MAGNET
      </text>

      {/* Ball */}
      <circle cx="150" cy={ballY} r="18" fill="#2563eb" />

      {/* Ground */}
      <line x1="50" y1={baseY} x2="250" y2={baseY} stroke="#111827" />
    </svg>
  );
}
