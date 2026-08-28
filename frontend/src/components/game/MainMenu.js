import React, { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, User, Users, Cpu } from "lucide-react";

const paper =
  "https://images.unsplash.com/photo-1695131020187-d3dcdab5016b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxydWxlZCUyMG5vdGVib29rJTIwcGFwZXIlMjB0ZXh0dXJlfGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85";

const ModeCard = ({ active, onClick, icon: Icon, title, sub, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`flex flex-col items-start gap-1 border-2 px-5 py-4 text-left transition-transform duration-200 hover:-rotate-1 hover:scale-[1.03] ${
      active ? "border-[#B42828] bg-[#F5D76E]/60" : "border-[#141E50] bg-white/40"
    }`}
    style={{ borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px" }}
  >
    <div className="flex items-center gap-2">
      <Icon className="h-6 w-6" style={{ color: active ? "#B42828" : "#141E50" }} />
      <span className="font-mono text-lg font-bold" style={{ color: "#141E50" }}>
        {title}
      </span>
    </div>
    <span className="font-mono text-xs" style={{ color: "#141E50cc" }}>
      {sub}
    </span>
  </button>
);

const Diff = ({ v, cur, set }) => (
  <button
    onClick={() => set(v)}
    data-testid={`difficulty-${v}`}
    className={`border-2 px-4 py-1 font-mono text-sm font-bold uppercase tracking-widest transition-transform duration-200 hover:scale-105 ${
      cur === v ? "border-[#B42828] bg-[#B42828] text-[#F5F2EB]" : "border-[#141E50] text-[#141E50]"
    }`}
    style={{ borderRadius: "12px 225px 12px 255px/255px 12px 225px 12px" }}
  >
    {v}
  </button>
);

export default function MainMenu({ onStart, muted, onToggleMute }) {
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("medium");

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: -80, opacity: 0, rotate: -3 }}
        animate={{ y: 0, opacity: 1, rotate: -1.2 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="relative w-full max-w-md p-8 sm:p-10"
        style={{
          backgroundColor: "#F5F2EB",
          backgroundImage: `url(${paper})`,
          backgroundSize: "cover",
          backgroundBlendMode: "multiply",
          boxShadow: "6px 12px 26px rgba(20,10,0,0.6)",
          borderRadius: "3px 255px 4px 255px/255px 3px 255px 4px",
        }}
        data-testid="main-menu"
      >
        <button
          onClick={onToggleMute}
          data-testid="menu-mute-toggle"
          className="absolute right-4 top-4 text-[#141E50] transition-transform duration-200 hover:scale-110"
        >
          {muted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </button>

        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-[#B42828]">desk classics</p>
        <h1 style={{ fontFamily: "'Caveat', cursive", color: "#141E50" }} className="text-6xl font-bold leading-none">
          Pen Fight
        </h1>
        <p className="mb-6 mt-1 font-mono text-sm text-[#141E50cc]">Flick your pens. Knock theirs off the table.</p>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <ModeCard
            testId="mode-ai"
            active={mode === "ai"}
            onClick={() => setMode("ai")}
            icon={Cpu}
            title="vs Computer"
            sub="Play the AI"
          />
          <ModeCard
            testId="mode-local"
            active={mode === "local"}
            onClick={() => setMode("local")}
            icon={Users}
            title="2 Players"
            sub="Same device"
          />
        </div>

        {mode === "ai" && (
          <div className="mb-8">
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-[#141E50]">Difficulty</p>
            <div className="flex gap-3">
              <Diff v="easy" cur={difficulty} set={setDifficulty} />
              <Diff v="medium" cur={difficulty} set={setDifficulty} />
              <Diff v="hard" cur={difficulty} set={setDifficulty} />
            </div>
          </div>
        )}

        <button
          onClick={() => onStart(mode, difficulty)}
          data-testid="start-game-button"
          className="w-full border-[3px] border-[#141E50] bg-[#141E50] py-3 font-mono text-lg font-bold uppercase tracking-widest text-[#F5F2EB] transition-transform duration-200 hover:-rotate-1 hover:scale-[1.03]"
          style={{ borderRadius: "225px 12px 255px 12px/12px 255px 12px 225px" }}
        >
          Start Match
        </button>

        <p className="mt-4 flex items-center gap-2 font-mono text-[11px] text-[#141E50aa]">
          <User className="h-3.5 w-3.5" /> Drag back on your pen &amp; release to flick.
        </p>
      </motion.div>
    </div>
  );
}
