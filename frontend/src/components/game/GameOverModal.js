import React from "react";
import { motion } from "framer-motion";
import { RotateCcw, Home, Trophy, Swords, Frown } from "lucide-react";

const paper =
  "https://images.unsplash.com/photo-1695131020187-d3dcdab5016b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxydWxlZCUyMG5vdGVib29rJTIwcGFwZXIlMjB0ZXh0dXJlfGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85";

export default function GameOverModal({ winner, mode, scores, onReplay, onMenu, mp }) {
  const isP1 = winner === "p1";
  let title, subTitle, accentColor, isVictory, desc;

  if (mode === "online") {
    isVictory = winner === mp?.role;
    title = isVictory ? "VICTORY!" : "DEFEATED!";
    accentColor = isVictory ? "#1E3A8A" : "#B42828";
    subTitle = isVictory ? "You Won the Match!" : "You Lost the Match";
    desc = mp?.opponentLeft
      ? "Opponent disconnected from the match."
      : isVictory
      ? "Masterful aim! All opponent pens were knocked off the desk."
      : "All your pens were knocked off the desk. Ready for revenge?";
  } else if (mode === "ai") {
    isVictory = isP1;
    title = isVictory ? "VICTORY!" : "DEFEATED!";
    accentColor = isVictory ? "#1E3A8A" : "#B42828";
    subTitle = isVictory ? "You Beat the Computer!" : "Computer Outplayed You";
    desc = isVictory
      ? `You dominated the board (You: ${scores.p1} · CPU: ${scores.p2})`
      : `Better luck next time! (You: ${scores.p1} · CPU: ${scores.p2})`;
  } else {
    isVictory = isP1;
    title = isP1 ? "BLUE WINS!" : "RED WINS!";
    accentColor = isP1 ? "#1E3A8A" : "#B42828";
    subTitle = isP1 ? "Player 1 Victory" : "Player 2 Victory";
    desc = `Final Pens Standing: Blue ${scores.p1} · Red ${scores.p2}`;
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-[2px]" data-testid="gameover-modal">
      <motion.div
        initial={{ y: -80, opacity: 0, scale: 0.9, rotate: isVictory ? 2 : -2 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotate: isVictory ? 1 : -1 }}
        transition={{ type: "spring", stiffness: 140, damping: 14 }}
        className="w-full max-w-sm max-h-[94vh] overflow-y-auto p-5 sm:p-7 text-center shadow-2xl"
        style={{
          backgroundColor: "#F5F2EB",
          backgroundImage: `url(${paper})`,
          backgroundSize: "cover",
          backgroundBlendMode: "multiply",
          boxShadow: "6px 14px 30px rgba(20,10,0,0.65)",
          borderRadius: "4px 255px 3px 255px/255px 4px 255px 3px",
        }}
      >
        {isVictory ? (
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-[#F5D76E]/40 border-2 border-[#141E50] shadow-sm">
            <Trophy className="h-8 w-8 text-[#D97706]" />
          </div>
        ) : (
          <div className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-red-100 border-2 border-[#B42828] shadow-sm">
            <Swords className="h-8 w-8 text-[#B42828]" />
          </div>
        )}

        <h2
          style={{ fontFamily: "'Caveat', cursive", color: accentColor }}
          className="text-5xl sm:text-6xl font-bold leading-none tracking-wide"
          data-testid="winner-text"
        >
          {title}
        </h2>

        <p className="mt-1 font-mono text-sm font-bold uppercase tracking-wider text-[#141E50]">
          {subTitle}
        </p>

        <p className="mb-5 mt-2 font-mono text-xs text-[#141E50]/80 leading-relaxed">
          {desc}
        </p>

        {/* Score Pill */}
        <div className="mb-5 flex items-center justify-center gap-4 rounded-lg border-2 border-[#141E50]/20 bg-white/70 py-2 px-4 font-mono text-xs font-bold text-[#141E50]">
          <span className="text-[#1E3A8A]">P1: {scores.p1} pens</span>
          <span>·</span>
          <span className="text-[#B42828]">P2: {scores.p2} pens</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onReplay}
            data-testid="replay-button"
            className="flex items-center justify-center gap-2 border-[3px] border-[#141E50] bg-[#141E50] py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-[#F5F2EB] shadow-md transition-transform duration-200 hover:-rotate-1 hover:scale-[1.02] active:scale-95"
            style={{ borderRadius: "225px 12px 255px 12px/12px 255px 12px 225px" }}
          >
            <RotateCcw className="h-4 w-4" /> Rematch
          </button>
          <button
            onClick={onMenu}
            data-testid="menu-button"
            className="flex items-center justify-center gap-2 border-2 border-[#141E50] py-2 font-mono text-xs font-bold uppercase tracking-widest text-[#141E50] transition-transform duration-200 hover:scale-[1.02] active:scale-95"
            style={{ borderRadius: "12px 225px 12px 255px/255px 12px 225px 12px" }}
          >
            <Home className="h-4 w-4" /> Main Menu
          </button>
        </div>
      </motion.div>
    </div>
  );
}
