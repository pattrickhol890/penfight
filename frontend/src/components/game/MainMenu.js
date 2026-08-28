import React, { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, User, Users, Cpu, Globe, Copy, Check, Loader2, ArrowLeft } from "lucide-react";

const paper =
  "https://images.unsplash.com/photo-1695131020187-d3dcdab5016b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxydWxlZCUyMG5vdGVib29rJTIwcGFwZXIlMjB0ZXh0dXJlfGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85";

const ModeCard = ({ active, onClick, icon: Icon, title, sub, testId }) => (
  <button
    onClick={onClick}
    data-testid={testId}
    className={`flex flex-col items-start gap-1 border-2 px-4 py-3 text-left transition-transform duration-200 hover:-rotate-1 hover:scale-[1.02] ${
      active ? "border-[#B42828] bg-[#F5D76E]/60" : "border-[#141E50] bg-white/40"
    }`}
    style={{ borderRadius: "255px 12px 225px 12px/12px 225px 12px 255px" }}
  >
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" style={{ color: active ? "#B42828" : "#141E50" }} />
      <span className="font-mono text-base font-bold" style={{ color: "#141E50" }}>
        {title}
      </span>
    </div>
    <span className="font-mono text-[11px]" style={{ color: "#141E50cc" }}>
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

export default function MainMenu({ onStart, muted, onToggleMute, mp }) {
  const [mode, setMode] = useState("ai");
  const [difficulty, setDifficulty] = useState("medium");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [onlineTab, setOnlineTab] = useState("create"); // 'create' | 'join'

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
      <motion.div
        initial={{ y: -80, opacity: 0, rotate: -3 }}
        animate={{ y: 0, opacity: 1, rotate: -1.2 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="relative w-full max-w-md p-6 sm:p-8"
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
        <h1 style={{ fontFamily: "'Caveat', cursive", color: "#141E50" }} className="text-5xl sm:text-6xl font-bold leading-none">
          Pen Fight
        </h1>
        <p className="mb-5 mt-1 font-mono text-xs sm:text-sm text-[#141E50cc]">Flick your pens. Knock theirs off the table.</p>

        {/* Mode Selector */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          <ModeCard
            testId="mode-ai"
            active={mode === "ai"}
            onClick={() => setMode("ai")}
            icon={Cpu}
            title="vs AI"
            sub="Single player"
          />
          <ModeCard
            testId="mode-local"
            active={mode === "local"}
            onClick={() => setMode("local")}
            icon={Users}
            title="Pass & Play"
            sub="Same device"
          />
          <ModeCard
            testId="mode-online"
            active={mode === "online"}
            onClick={() => setMode("online")}
            icon={Globe}
            title="Online 1v1"
            sub="With room code"
          />
        </div>

        {/* AI Difficulty Options */}
        {mode === "ai" && (
          <div className="mb-6">
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-[#141E50]">Difficulty</p>
            <div className="flex gap-3">
              <Diff v="easy" cur={difficulty} set={setDifficulty} />
              <Diff v="medium" cur={difficulty} set={setDifficulty} />
              <Diff v="hard" cur={difficulty} set={setDifficulty} />
            </div>
          </div>
        )}

        {/* Online Room Lobby */}
        {mode === "online" && (
          <div className="mb-6 rounded-lg border-2 border-dashed border-[#141E50] bg-white/60 p-4">
            <div className="mb-3 flex border-b border-[#141E50]/20 pb-2">
              <button
                onClick={() => setOnlineTab("create")}
                className={`flex-1 py-1 text-center font-mono text-xs font-bold uppercase tracking-wider ${
                  onlineTab === "create" ? "border-b-2 border-[#B42828] text-[#B42828]" : "text-[#141E50]/60"
                }`}
              >
                Create Room
              </button>
              <button
                onClick={() => setOnlineTab("join")}
                className={`flex-1 py-1 text-center font-mono text-xs font-bold uppercase tracking-wider ${
                  onlineTab === "join" ? "border-b-2 border-[#B42828] text-[#B42828]" : "text-[#141E50]/60"
                }`}
              >
                Join Room
              </button>
            </div>

            {mp?.errorMessage && (
              <div className="mb-3 rounded border border-red-400 bg-red-100/90 p-2 font-mono text-xs text-red-700">
                {mp.errorMessage}
              </div>
            )}

            {onlineTab === "create" ? (
              <div className="flex flex-col items-center gap-3">
                {!mp?.roomCode ? (
                  <button
                    onClick={() => mp?.createRoom()}
                    disabled={mp?.connecting}
                    className="w-full flex items-center justify-center gap-2 border-2 border-[#141E50] bg-[#F5D76E] py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-[#141E50] shadow-sm hover:scale-[1.02] disabled:opacity-75"
                  >
                    {mp?.connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#141E50]" />
                        <span>Connecting & Generating...</span>
                      </>
                    ) : (
                      "Generate Room Code"
                    )}
                  </button>
                ) : (
                  <div className="w-full text-center">
                    <p className="font-mono text-xs text-[#141E50]/80">Share this Room Code with your friend:</p>
                    <div className="my-2 flex items-center justify-center gap-2">
                      <span className="rounded border-2 border-[#141E50] bg-white px-4 py-1 font-mono text-2xl font-black tracking-widest text-[#B42828]">
                        {mp.roomCode}
                      </span>
                      <button
                        onClick={() => handleCopy(mp.roomCode)}
                        className="rounded border border-[#141E50] bg-[#141E50] p-2 text-white hover:opacity-90"
                        title="Copy Code"
                      >
                        {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 font-mono text-xs text-[#141E50]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#B42828]" />
                      <span>Waiting for Player 2 to join...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block font-mono text-xs font-bold uppercase text-[#141E50]">Enter 5-Letter Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A8X9K"
                    className="mt-1 w-full border-2 border-[#141E50] bg-white px-3 py-2 text-center font-mono text-lg font-bold uppercase tracking-widest text-[#141E50] focus:outline-none focus:ring-2 focus:ring-[#B42828]"
                  />
                </div>
                <button
                  onClick={() => mp?.joinRoom(joinCode)}
                  disabled={!joinCode.trim() || mp?.connecting}
                  className="w-full flex items-center justify-center gap-2 border-2 border-[#141E50] bg-[#141E50] py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-[#F5F2EB] shadow-sm hover:scale-[1.02] disabled:opacity-50"
                >
                  {mp?.connecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    "Join Match"
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Start Button for Local & AI */}
        {mode !== "online" && (
          <button
            onClick={() => onStart(mode, difficulty)}
            data-testid="start-game-button"
            className="w-full border-[3px] border-[#141E50] bg-[#141E50] py-3 font-mono text-lg font-bold uppercase tracking-widest text-[#F5F2EB] transition-transform duration-200 hover:-rotate-1 hover:scale-[1.03]"
            style={{ borderRadius: "225px 12px 255px 12px/12px 255px 12px 225px" }}
          >
            Start Match
          </button>
        )}

        <p className="mt-4 flex items-center gap-2 font-mono text-[11px] text-[#141E50aa]">
          <User className="h-3.5 w-3.5" /> Drag back on your pen &amp; release to flick.
        </p>
      </motion.div>
    </div>
  );
}
