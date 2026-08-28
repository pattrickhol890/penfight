import React from "react";
import { motion } from "framer-motion";
import { RotateCcw, Home, Trophy, AlertTriangle } from "lucide-react";

const paper =
  "https://images.unsplash.com/photo-1695131020187-d3dcdab5016b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxydWxlZCUyMG5vdGVib29rJTIwcGFwZXIlMjB0ZXh0dXJlfGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85";

export default function GameOverModal({ winner, mode, scores, onReplay, onMenu, mp }) {
  const isP1 = winner === "p1";
  let title, color, sub;

  if (mode === "online") {
    const iWon = winner === mp?.role;
    title = iWon ? "You Win!" : "Opponent Wins";
    color = iWon ? "#1E3A8A" : "#B42828";
    sub = mp?.opponentLeft
      ? "Opponent disconnected from the match."
      : `Final Score — P1 ${scores.p1} · P2 ${scores.p2}`;
  } else if (mode === "ai") {
    title = isP1 ? "You Win!" : "Computer Wins";
    color = isP1 ? "#1E3A8A" : "#B42828";
    sub = `Pens left — You ${scores.p1} · CPU ${scores.p2}`;
  } else {
    title = isP1 ? "Blue Wins!" : "Red Wins!";
    color = isP1 ? "#1E3A8A" : "#B42828";
    sub = `Pens left — Blue ${scores.p1} · Red ${scores.p2}`;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-4" data-testid="gameover-modal">
      <motion.div
        initial={{ y: -100, opacity: 0, rotate: 3 }}
        animate={{ y: 0, opacity: 1, rotate: 1.5 }}
        transition={{ type: "spring", stiffness: 130, damping: 13 }}
        className="w-full max-w-sm p-8 text-center"
        style={{
          backgroundColor: "#F5F2EB",
          backgroundImage: url(),
          backgroundSize: "cover",
          backgroundBlendMode: "multiply",
          boxShadow: "6px 12px 26px rgba(20,10,0,0.6)",
          borderRadius: "4px 255px 3px 255px/255px 4px 255px 3px",
        }}
      >
        <Trophy className="mx-auto mb-2 h-10 w-10" style={{ color }} />
        <h2 style={{ fontFamily: "'Caveat', cursive", color }} className="text-6xl font-bold leading-none" data-testid="winner-text">
          {title}
        </h2>
        <p className="mb-6 mt-2 font-mono text-sm text-[#141E50cc]">
          {sub}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onReplay}
            data-testid="replay-button"
            className="flex items-center justify-center gap-2 border-[3px] border-[#141E50] bg-[#141E50] py-3 font-mono text-base font-bold uppercase tracking-widest text-[#F5F2EB] transition-transform duration-200 hover:-rotate-1 hover:scale-[1.03]"
            style={{ borderRadius: "225px 12px 255px 12px/12px 255px 12px 225px" }}
          >
            <RotateCcw className="h-4 w-4" /> Rematch
          </button>
          <button
            onClick={onMenu}
            data-testid="menu-button"
            className="flex items-center justify-center gap-2 border-2 border-[#141E50] py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-[#141E50] transition-transform duration-200 hover:scale-[1.03]"
            style={{ borderRadius: "12px 225px 12px 255px/255px 12px 225px 12px" }}
          >
            <Home className="h-4 w-4" /> Main Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}
