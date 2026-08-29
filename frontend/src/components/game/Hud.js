import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, LogOut, Globe, AlertTriangle, Maximize2, Minimize2, Flame } from "lucide-react";

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

  const isP1Turn = turn === "p1";
  const isP2Turn = turn === "p2";

  const p1Label = mode === "online" ? (mp?.role === "p1" ? "YOU" : "OPP") : mode === "ai" ? "YOU" : "YOU";
  const p2Label = mode === "online" ? (mp?.role === "p2" ? "YOU" : "OPP") : mode === "ai" ? "OPP" : "OPP";

  const isMyTurn = mode === "online" ? turn === mp?.role : turn === "p1";

  return (
    <>
      {/* ================= TOP LEFT - ROOM CODE / MODE BADGE ================= */}
      <div className="fixed top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
        {mode === "ai" && (
          <div className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1 border border-white/20 text-white shadow-sm font-mono text-[10px] font-bold uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI: {difficulty}</span>
          </div>
        )}
        {mode === "online" && mp?.roomCode && (
          <div className="flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-sm px-3 py-1 border border-white/25 text-white shadow-sm font-mono text-[10px] font-bold tracking-wider">
            <Globe className="h-3 w-3 text-[#F5D76E]" />
            <span>ROOM: {mp.roomCode}</span>
          </div>
        )}
      </div>

      {/* ================= FAR LEFT EDGE BADGE (YOU / PLAYER 1) ================= */}
      <div
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-between rounded-r-3xl border-y-4 border-r-4 border-white py-5 px-2.5 sm:px-3 shadow-[4px_6px_20px_rgba(0,0,0,0.5)] transition-all duration-300 ${
          isP1Turn ? "scale-105 shadow-[0_0_24px_rgba(255,26,83,0.8)]" : "opacity-85"
        }`}
        style={{
          backgroundColor: "#FF1A53",
          minHeight: "180px",
          width: "48px",
        }}
        data-testid="p1-card"
      >
        {/* Vertical Label */}
        <span
          className="font-mono text-base sm:text-lg font-black tracking-widest text-white select-none"
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
          data-testid="p1-score"
        >
          {p1Label}
        </span>

        {/* Pen Tally Bars */}
        <div className="flex flex-col gap-1.5 w-full items-center mt-3">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-2 w-6 sm:w-7 rounded-full transition-opacity duration-200 ${
                idx < scores.p1 ? "bg-white shadow-sm" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* ================= TURN SPEECH BUBBLE (BESIDE P1 SCORECARD) ================= */}
        <AnimatePresence>
          {isP1Turn && (
            <motion.div
              initial={{ opacity: 0, x: -12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
              className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none z-40"
            >
              <div className="relative flex items-center gap-1.5 rounded-2xl border-2 border-[#141E50] bg-white px-3.5 py-1.5 shadow-[3px_5px_15px_rgba(0,0,0,0.4)] whitespace-nowrap">
                {/* Pointer arrow pointing to the left card */}
                <span className="absolute -left-2 top-1/2 -translate-y-1/2 border-y-6 border-y-transparent border-r-8 border-r-[#141E50]" />
                <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-6 border-r-white z-10" />

                <Flame className="h-4 w-4 text-[#FF1A53] animate-bounce" />
                <span className="font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#141E50]">
                  {turnState === "moving" ? "Rolling physics…" : isMyTurn ? "Your turn!" : "P1 turn"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= FAR RIGHT EDGE BADGE (OPP / PLAYER 2) ================= */}
      <div
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center justify-between rounded-l-3xl border-y-4 border-l-4 border-white py-5 px-2.5 sm:px-3 shadow-[-4px_6px_20px_rgba(0,0,0,0.5)] transition-all duration-300 ${
          isP2Turn ? "scale-105 shadow-[0_0_24px_rgba(41,82,255,0.8)]" : "opacity-85"
        }`}
        style={{
          backgroundColor: "#2952FF",
          minHeight: "180px",
          width: "48px",
        }}
        data-testid="p2-card"
      >
        {/* Vertical Label */}
        <span
          className="font-mono text-base sm:text-lg font-black tracking-widest text-white select-none"
          style={{
            writingMode: "vertical-rl",
          }}
          data-testid="p2-score"
        >
          {p2Label}
        </span>

        {/* Pen Tally Bars */}
        <div className="flex flex-col gap-1.5 w-full items-center mt-3">
          {[0, 1, 2, 3].map((idx) => (
            <span
              key={idx}
              className={`h-2 w-6 sm:w-7 rounded-full transition-opacity duration-200 ${
                idx < scores.p2 ? "bg-white shadow-sm" : "bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* ================= TURN SPEECH BUBBLE (BESIDE P2 SCORECARD) ================= */}
        <AnimatePresence>
          {isP2Turn && (
            <motion.div
              initial={{ opacity: 0, x: 12, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 8, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none z-40"
            >
              <div className="relative flex items-center gap-1.5 rounded-2xl border-2 border-[#141E50] bg-white px-3.5 py-1.5 shadow-[3px_5px_15px_rgba(0,0,0,0.4)] whitespace-nowrap">
                {/* Pointer arrow pointing to the right card */}
                <span className="absolute -right-2 top-1/2 -translate-y-1/2 border-y-6 border-y-transparent border-l-8 border-l-[#141E50]" />
                <span className="absolute -right-[5px] top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-l-6 border-l-white z-10" />

                <span className="font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wide text-[#141E50]">
                  {turnState === "moving"
                    ? "Rolling physics…"
                    : mode === "ai"
                    ? "Thinking…"
                    : isMyTurn
                    ? "Your turn!"
                    : "Opponent's turn"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= OPPONENT DISCONNECTED BANNER ================= */}
      {mode === "online" && mp?.opponentLeft && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-xl bg-amber-100 border-2 border-amber-500 px-4 py-2 text-amber-950 font-mono text-xs shadow-xl">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>Opponent has disconnected from the match.</span>
        </div>
      )}

      {/* ================= TOP RIGHT CONTROLS ================= */}
      <div className="fixed top-3 right-3 z-30 flex gap-2">
        <button
          onClick={toggleFullscreen}
          title="Toggle Fullscreen"
          className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-[#F5F2EB] text-[#141E50] border border-[#141E50]/20 shadow-[1px_3px_8px_rgba(0,0,0,0.4)] transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
        <button
          onClick={onToggleMute}
          data-testid="mute-toggle"
          title="Mute Sound"
          className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-[#F5F2EB] text-[#141E50] border border-[#141E50]/20 shadow-[1px_3px_8px_rgba(0,0,0,0.4)] transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          onClick={onQuit}
          data-testid="quit-button"
          title="Exit to Menu"
          className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-[#F5F2EB] text-[#B42828] border border-[#141E50]/20 shadow-[1px_3px_8px_rgba(0,0,0,0.4)] transition-transform duration-150 hover:scale-110 active:scale-95"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* ================= POWER METER - BOTTOM CENTER ================= */}
      <AnimatePresence>
        {power > 0.01 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-3 left-1/2 z-30 -translate-x-1/2"
            data-testid="power-meter"
          >
            <div
              className="relative h-4 sm:h-5 w-48 sm:w-60 overflow-hidden border-2 border-[#141E50]"
              style={{ backgroundColor: "#F5F2EB", borderRadius: "4px" }}
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
