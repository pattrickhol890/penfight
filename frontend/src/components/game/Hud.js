import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, LogOut } from "lucide-react";

const PenRow = ({ count, color, testId }) => (
  <div className="flex gap-1" data-testid={testId}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="h-4 w-1.5 rounded-full" style={{ backgroundColor: color }} />
    ))}
    {count === 0 && <span className="font-mono text-xs text-[#141E50]/50">—</span>}
  </div>
);

export default function Hud({ scores, turn, turnState, mode, difficulty, muted, power, onToggleMute, onQuit }) {
  const label =
    mode === "ai"
      ? turn === "p1"
        ? "Your turn"
        : "Computer thinking…"
      : turn === "p1"
      ? "Blue's turn"
      : "Red's turn";
  const turnColor = turn === "p1" ? "#1E3A8A" : "#B42828";

  return (
    <>
      {/* Scoreboard - top left, masking-tape look */}
      <div
        className="absolute left-2 top-2 z-20 -rotate-2 px-3 py-2 shadow-[3px_5px_12px_rgba(20,10,0,0.5)]"
        style={{ backgroundColor: "#F5F2EB", borderRadius: "2px 20px 2px 20px" }}
        data-testid="scoreboard"
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#1E3A8A]" data-testid="p1-score">
            {mode === "ai" ? "YOU" : "BLUE"} {scores.p1}
          </span>
          <PenRow count={scores.p1} color="#1E3A8A" testId="p1-pens" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-[#B42828]" data-testid="p2-score">
            {mode === "ai" ? "CPU" : "RED"} {scores.p2}
          </span>
          <PenRow count={scores.p2} color="#B42828" testId="p2-pens" />
        </div>
        {mode === "ai" && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-[#141E50]/60">{difficulty}</p>
        )}
      </div>

      {/* Turn indicator - top center */}
      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rotate-1 px-4 py-1.5 shadow-[3px_5px_12px_rgba(20,10,0,0.5)]"
          style={{ backgroundColor: "#F5F2EB", borderRadius: "18px 3px 18px 3px" }}
          data-testid="turn-indicator"
        >
          <span className="font-mono text-sm font-bold" style={{ color: turnColor }}>
            {turnState === "moving" ? "…" : label}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Controls - top right */}
      <div className="absolute right-2 top-2 z-20 flex gap-2">
        <button
          onClick={onToggleMute}
          data-testid="mute-toggle"
          className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F2EB] text-[#141E50] shadow-[2px_4px_10px_rgba(20,10,0,0.5)] transition-transform duration-200 hover:scale-110"
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <button
          onClick={onQuit}
          data-testid="quit-button"
          className="grid h-9 w-9 place-items-center rounded-full bg-[#F5F2EB] text-[#B42828] shadow-[2px_4px_10px_rgba(20,10,0,0.5)] transition-transform duration-200 hover:scale-110"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Power meter - bottom center, ruler style */}
      <AnimatePresence>
        {power > 0.01 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
            data-testid="power-meter"
          >
            <div
              className="relative h-5 w-56 overflow-hidden border-2 border-[#141E50]"
              style={{ backgroundColor: "#F5F2EB", borderRadius: "3px" }}
            >
              <div
                className="h-full transition-[width] duration-75"
                style={{
                  width: `${power * 100}%`,
                  backgroundColor: power > 0.7 ? "#B42828" : "#F5D76E",
                }}
              />
              <span className="absolute inset-0 grid place-items-center font-mono text-[10px] font-bold uppercase tracking-widest text-[#141E50]">
                Power {Math.round(power * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
