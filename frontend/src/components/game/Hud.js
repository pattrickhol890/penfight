import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, LogOut, Globe, AlertTriangle, Maximize2, Minimize2 } from "lucide-react";

const PenRow = ({ count, color, testId }) => (
  <div className="flex gap-1" data-testid={testId}>
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="h-3 sm:h-3.5 w-1 sm:w-1.5 rounded-full" style={{ backgroundColor: color }} />
    ))}
    {count === 0 && <span className="font-mono text-[9px] sm:text-[10px] text-[#141E50]/50">—</span>}
  </div>
);

export default function Hud({ scores, turn, turnState, mode, difficulty, muted, power, onToggleMute, onQuit, mp }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
          document.documentElement.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  let label = "";
  if (mode === "ai") {
    label = turn === "p1" ? "Your turn" : "Computer thinking…";
  } else if (mode === "online") {
    const isMyTurn = turn === mp?.role;
    label = isMyTurn ? "Your turn! (Flick your pen)" : "Opponent's turn…";
  } else {
    label = turn === "p1" ? "Blue's turn" : "Red's turn";
  }

  const turnColor = turn === "p1" ? "#1E3A8A" : "#B42828";

  const p1Label = mode === "online" ? (mp?.role === "p1" ? "YOU (P1)" : "OPPONENT (P1)") : mode === "ai" ? "YOU" : "BLUE (P1)";
  const p2Label = mode === "online" ? (mp?.role === "p2" ? "YOU (P2)" : "OPPONENT (P2)") : mode === "ai" ? "CPU" : "RED (P2)";

  return (
    <>
      {/* PLAYER 1 CARD - LEFT SIDE */}
      <div
        className="absolute -left-1 sm:-left-3 top-1.5 z-20 -rotate-2 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-[2px_4px_10px_rgba(20,10,0,0.45)] border border-[#1E3A8A]/30 transition-transform hover:scale-105"
        style={{
          backgroundColor: "#F5F2EB",
          borderRadius: "3px 18px 3px 18px",
          borderLeft: "4px solid #1E3A8A",
        }}
        data-testid="p1-card"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] sm:text-xs font-bold text-[#1E3A8A]" data-testid="p1-score">
              {p1Label}
            </span>
            <span className="rounded bg-[#1E3A8A] px-1.5 py-0.2 font-mono text-[10px] sm:text-xs font-black text-white">
              {scores.p1}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <PenRow count={scores.p1} color="#1E3A8A" testId="p1-pens" />
          </div>
        </div>
      </div>

      {/* PLAYER 2 CARD - RIGHT SIDE */}
      <div
        className="absolute -right-1 sm:-right-3 top-1.5 z-20 rotate-2 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-[2px_4px_10px_rgba(20,10,0,0.45)] border border-[#B42828]/30 transition-transform hover:scale-105"
        style={{
          backgroundColor: "#F5F2EB",
          borderRadius: "18px 3px 18px 3px",
          borderRight: "4px solid #B42828",
        }}
        data-testid="p2-card"
      >
        <div className="flex flex-col gap-0.5 items-end">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-[#B42828] px-1.5 py-0.2 font-mono text-[10px] sm:text-xs font-black text-white">
              {scores.p2}
            </span>
            <span className="font-mono text-[10px] sm:text-xs font-bold text-[#B42828]" data-testid="p2-score">
              {p2Label}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <PenRow count={scores.p2} color="#B42828" testId="p2-pens" />
          </div>
        </div>
      </div>

      {/* TOP CENTER - TURN INDICATOR & ROOM CODE */}
      <div className="absolute left-1/2 top-1.5 z-20 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={label}
            initial={{ y: -15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3.5 py-1 sm:px-4 sm:py-1.5 shadow-[2px_4px_10px_rgba(20,10,0,0.4)] border border-[#141E50]/20"
            style={{
              backgroundColor: "#F5F2EB",
              borderRadius: "14px 3px 14px 3px",
            }}
            data-testid="turn-indicator"
          >
            <span className="font-mono text-xs sm:text-sm font-bold tracking-wide" style={{ color: turnColor }}>
              {turnState === "moving" ? "Rolling physics…" : label}
            </span>
          </motion.div>
        </AnimatePresence>

        {mode === "online" && mp?.roomCode && (
          <div className="flex items-center gap-1 rounded bg-[#F5F2EB]/90 px-2 py-0.5 border border-[#141E50]/20 shadow-sm">
            <Globe className="h-2.5 w-2.5 text-[#141E50]/70" />
            <span className="font-mono text-[9px] sm:text-[10px] font-bold text-[#141E50]">Room: {mp.roomCode}</span>
          </div>
        )}
        {mode === "ai" && (
          <span className="font-mono text-[8px] uppercase tracking-widest text-[#F5F2EB]/80 drop-shadow">
            AI: {difficulty}
          </span>
        )}
      </div>

      {/* Opponent Left Alert Banner */}
      {mode === "online" && mp?.opponentLeft && (
        <div className="absolute top-12 sm:top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 rounded bg-amber-100 border border-amber-400 px-3 py-1.5 text-amber-900 font-mono text-[10px] sm:text-xs shadow-lg">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          <span>Opponent has disconnected.</span>
        </div>
      )}

      {/* QUICK CONTROLS - FLOATING TOP BAR */}
      <div className="absolute -top-7 sm:-top-8 right-0 z-20 flex gap-1.5 sm:gap-2">
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full bg-[#F5F2EB] text-[#141E50] shadow-[1px_2px_6px_rgba(20,10,0,0.4)] transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          {isFullscreen ? <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
        </button>
        <button
          onClick={onToggleMute}
          data-testid="mute-toggle"
          title="Mute Sound"
          className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full bg-[#F5F2EB] text-[#141E50] shadow-[1px_2px_6px_rgba(20,10,0,0.4)] transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          {muted ? <VolumeX className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <Volume2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
        </button>
        <button
          onClick={onQuit}
          data-testid="quit-button"
          title="Exit to Menu"
          className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full bg-[#F5F2EB] text-[#B42828] shadow-[1px_2px_6px_rgba(20,10,0,0.4)] transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </button>
      </div>

      {/* Power meter - bottom center */}
      <AnimatePresence>
        {power > 0.01 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-2 sm:bottom-3 left-1/2 z-20 -translate-x-1/2"
            data-testid="power-meter"
          >
            <div
              className="relative h-4 sm:h-5 w-44 sm:w-56 overflow-hidden border-2 border-[#141E50]"
              style={{ backgroundColor: "#F5F2EB", borderRadius: "3px" }}
            >
              <div
                className="h-full transition-[width] duration-75"
                style={{
                  width: `${power * 100}%`,
                  backgroundColor: power > 0.7 ? "#B42828" : "#F5D76E",
                }}
              />
              <span className="absolute inset-0 grid place-items-center font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#141E50]">
                Power {Math.round(power * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
