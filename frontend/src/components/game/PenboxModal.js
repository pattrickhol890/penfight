import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Shield,
  Zap,
  Weight,
  Compass,
  Trophy,
  CheckCircle2,
  Lock,
  Plus,
  ArrowRight,
  Flame,
  Award,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PEN_CATALOG } from "../../game/penCatalog";

export default function PenboxModal({ isOpen, onClose }) {
  const {
    inventory,
    activeLineup,
    updateLineup,
    missions,
    claimMissionReward,
    inkCoins,
  } = useAuth();

  const [activeTab, setActiveTab] = useState("lineup"); // 'lineup' | 'missions' | 'ante'
  const [selectedSlot, setSelectedSlot] = useState(0); // 0, 1, 2, 3
  const [inspectPenId, setInspectPenId] = useState("ocean_gel");

  if (!isOpen) return null;

  const inspectPen = PEN_CATALOG[inspectPenId] || PEN_CATALOG.classic;

  // Calculate copies of inspectPenId owned vs equipped in other slots
  const inspectOwned = inventory[inspectPenId] || 0;
  const inspectInOtherSlots = activeLineup.filter((id, idx) => idx !== selectedSlot && id === inspectPenId).length;
  const inspectAvailForSlot = Math.max(0, inspectOwned - inspectInOtherSlots);
  const inspectTotalEquipped = activeLineup.filter((id) => id === inspectPenId).length;
  const isInspectAlreadyInSlot = activeLineup[selectedSlot] === inspectPenId;
  const canEquipInspect = inspectAvailForSlot > 0;

  // Helper for any pen
  const getPenAvailability = (penId) => {
    const owned = inventory[penId] || 0;
    const inOtherSlots = activeLineup.filter((id, idx) => idx !== selectedSlot && id === penId).length;
    const availForSlot = Math.max(0, owned - inOtherSlots);
    const totalEquipped = activeLineup.filter((id) => id === penId).length;
    return {
      owned,
      availForSlot,
      totalEquipped,
      canEquip: availForSlot > 0,
      isMaxEquipped: totalEquipped >= owned,
    };
  };

  const handleEquipPen = (penId) => {
    const { canEquip } = getPenAvailability(penId);
    if (!canEquip) return;

    const newLineup = [...activeLineup];
    newLineup[selectedSlot] = penId;
    updateLineup(newLineup);
    // Auto-advance to next slot
    setSelectedSlot((prev) => (prev + 1) % 4);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border-4 border-[#141E50] text-[#0F172A] overflow-hidden"
          style={{
            backgroundColor: "#FAF7F0",
            backgroundImage: "radial-gradient(#141E50 0.8px, transparent 0.8px)",
            backgroundSize: "20px 20px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 2px #141E50",
          }}
        >
          {/* Nostalgic School Geometry Tin Hinges Accent */}
          <div className="h-6 bg-[#141E50] flex items-center justify-between px-4 text-white font-mono text-[10px] tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>OFFICIAL DESK PENBOX • GEOMETRY TIN</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-300 font-bold">INK COINS: {inkCoins || 100}</span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-8 right-4 p-1.5 rounded-full text-[#141E50]/70 hover:text-[#141E50] hover:bg-[#141E50]/10 transition-colors z-10"
            title="Close Penbox"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="p-4 sm:p-5 pb-2 border-b-2 border-[#141E50]/15">
            <div className="flex items-center justify-between pr-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#141E50] tracking-tight flex items-center gap-2">
                  <span>My Penbox</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-mono font-bold">
                    4 Slots Active
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] font-medium">
                  Configure your 4-pen desk lineup and complete classroom missions.
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setActiveTab("lineup")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide uppercase transition ${
                  activeTab === "lineup"
                    ? "bg-[#141E50] text-white shadow-sm"
                    : "bg-white/80 border border-[#141E50]/20 text-[#141E50] hover:bg-white"
                }`}
              >
                Lineup & Locker
              </button>
              <button
                onClick={() => setActiveTab("missions")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide uppercase flex items-center gap-1.5 transition ${
                  activeTab === "missions"
                    ? "bg-[#141E50] text-white shadow-sm"
                    : "bg-white/80 border border-[#141E50]/20 text-[#141E50] hover:bg-white"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>Class Missions</span>
              </button>
              <button
                onClick={() => setActiveTab("ante")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-wide uppercase flex items-center gap-1.5 transition ${
                  activeTab === "ante"
                    ? "bg-[#141E50] text-white shadow-sm"
                    : "bg-white/80 border border-[#141E50]/20 text-[#141E50] hover:bg-white"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>Play for Keeps (Wager)</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {activeTab === "lineup" && (
              <>
                {/* 1. ACTIVE 4-SLOT DESK LINEUP */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-[#141E50]">
                      Active Desk Lineup (Click a slot to change)
                    </label>
                    <span className="text-[11px] text-[#475569] font-medium">
                      Slot {selectedSlot + 1} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    {activeLineup.map((penId, idx) => {
                      const pen = PEN_CATALOG[penId] || PEN_CATALOG.classic;
                      const isSelected = selectedSlot === idx;
                      const isGel = penId === "ocean_gel";

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(idx);
                            setInspectPenId(penId);
                          }}
                          className={`relative flex flex-col items-center justify-between p-2.5 rounded-xl border-2 transition text-left cursor-pointer ${
                            isSelected
                              ? "border-blue-700 bg-blue-50 ring-4 ring-blue-500/20 shadow-md"
                              : "border-[#141E50]/30 bg-white hover:border-[#141E50] shadow-sm"
                          }`}
                        >
                          <span className="self-start text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#141E50]/10 text-[#141E50]">
                            SLOT {idx + 1}
                          </span>

                          <div className="my-2 flex flex-col items-center">
                            <span className="text-2xl">{isGel ? "🌊" : "🖊️"}</span>
                            <span className="font-black text-xs text-[#141E50] text-center mt-1 truncate max-w-full">
                              {pen.shortName}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-[#64748B]">
                              {isGel ? "1.28x Heavy" : "1.0x Balanced"}
                            </span>
                          </div>

                          {isSelected && (
                            <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-0.5">
                              <span>Editing</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. INSPECTED PEN DETAILS & STATS */}
                <div className="rounded-xl border-2 border-[#141E50]/20 bg-white p-3.5 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-[#141E50]">
                          {inspectPen.name}
                        </h3>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${inspectPen.badgeColor}`}
                        >
                          {inspectPen.rarity}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] font-medium italic">
                        "{inspectPen.subtitle}"
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#141E50] bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        Owned: x{inspectOwned} ({inspectTotalEquipped}/{inspectOwned} equipped)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleEquipPen(inspectPenId)}
                        disabled={!canEquipInspect}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-sm ${
                          canEquipInspect
                            ? "bg-[#141E50] text-white hover:bg-[#1E293B]"
                            : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                        }`}
                      >
                        {isInspectAlreadyInSlot
                          ? "Current Pen in Slot " + (selectedSlot + 1)
                          : canEquipInspect
                          ? `Equip to Slot ${selectedSlot + 1} (${inspectAvailForSlot} left)`
                          : `All Equipped (${inspectTotalEquipped}/${inspectOwned})`}
                      </button>
                    </div>
                  </div>

                  {/* Limit reached warning banner */}
                  {!canEquipInspect && (
                    <div className="mt-2.5 text-xs bg-amber-50 border border-amber-300 rounded-lg p-2 text-amber-950 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">⚠️</span>
                        <span>
                          You have equipped all <strong>{inspectOwned}</strong> owned copies of <strong>{inspectPen.name}</strong>. Earn more copies from Classroom Missions to equip more!
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("missions")}
                        className="text-[10px] font-bold uppercase tracking-wider text-amber-900 underline hover:text-amber-700 whitespace-nowrap"
                      >
                        View Missions
                      </button>
                    </div>
                  )}

                  {/* Stat Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-[#334155] mb-1">
                        <span className="flex items-center gap-1">
                          <Weight className="w-3 h-3 text-blue-600" /> Mass / Weight
                        </span>
                        <span>{inspectPen.stats.weight}/10</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${inspectPen.stats.weight * 10}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-[#334155] mb-1">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-cyan-600" /> Glide / Speed
                        </span>
                        <span>{inspectPen.stats.glide}/10</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-cyan-500 rounded-full"
                          style={{ width: `${inspectPen.stats.glide * 10}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-[#334155] mb-1">
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-rose-600" /> Impact Force
                        </span>
                        <span>{inspectPen.stats.impact}/10</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-rose-600 rounded-full"
                          style={{ width: `${inspectPen.stats.impact * 10}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-[#334155] mb-1">
                        <span className="flex items-center gap-1">
                          <Compass className="w-3 h-3 text-emerald-600" /> Pivot Control
                        </span>
                        <span>{inspectPen.stats.control}/10</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${inspectPen.stats.control * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Special Trait */}
                  <div className="mt-3 text-xs bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-950 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Special Trait:</strong> {inspectPen.trait}
                    </div>
                  </div>
                </div>

                {/* 3. PEN LOCKER (OWNED PENS) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-[#141E50]">
                      Pen Locker (Owned Models)
                    </label>
                    <span className="text-[11px] text-[#475569] font-medium">
                      Select to inspect & equip
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Object.values(PEN_CATALOG).map((pen) => {
                      const avail = getPenAvailability(pen.id);
                      const isInspecting = inspectPenId === pen.id;
                      const isGel = pen.id === "ocean_gel";

                      return (
                        <div
                          key={pen.id}
                          onClick={() => setInspectPenId(pen.id)}
                          className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                            isInspecting
                              ? "border-[#141E50] bg-white shadow-md ring-2 ring-[#141E50]/15"
                              : "border-[#141E50]/20 bg-white/70 hover:bg-white shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{isGel ? "🌊" : "🖊️"}</span>
                            <div>
                              <h4 className="text-xs font-black text-[#141E50] leading-tight">
                                {pen.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-[#64748B]">
                                  x{avail.owned}
                                </span>
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                    avail.isMaxEquipped
                                      ? "text-rose-700 bg-rose-50 border-rose-200"
                                      : "text-blue-700 bg-blue-50 border-blue-200"
                                  }`}
                                >
                                  {avail.totalEquipped}/{avail.owned} {avail.isMaxEquipped ? "MAX" : "used"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEquipPen(pen.id);
                            }}
                            disabled={!avail.canEquip}
                            className={`p-1.5 rounded-lg transition active:scale-95 ${
                              avail.canEquip
                                ? "bg-[#141E50]/10 hover:bg-[#141E50] hover:text-white text-[#141E50]"
                                : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-50"
                            }`}
                            title={
                              avail.canEquip
                                ? `Equip to Slot ${selectedSlot + 1} (${avail.availForSlot} available)`
                                : `All ${avail.owned} copies equipped in lineup`
                            }
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === "missions" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                  <strong>Classroom Taskboard:</strong> Complete daily and desk achievements to unlock new pen models, duplicate copies for your lineup, and ink coins!
                </div>

                {missions.map((mission) => {
                  const progress = Math.min(mission.current || 0, mission.target || 1);
                  const isReady = progress >= (mission.target || 1) && !mission.claimed;
                  const isClaimed = mission.claimed;

                  return (
                    <div
                      key={mission.id}
                      className={`p-3.5 rounded-xl border-2 transition flex items-center justify-between gap-3 ${
                        isClaimed
                          ? "border-emerald-200 bg-emerald-50/50 opacity-75"
                          : isReady
                          ? "border-amber-400 bg-amber-50/80 shadow-md ring-2 ring-amber-400/20"
                          : "border-[#141E50]/15 bg-white shadow-sm"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-[#141E50]">
                            {mission.title}
                          </h4>
                          {isClaimed && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900">
                              COMPLETED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#475569] font-medium mt-0.5">
                          {mission.desc}
                        </p>

                        <div className="mt-2 flex items-center gap-2 max-w-xs">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${(progress / mission.target) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[#64748B]">
                            {progress}/{mission.target}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          {mission.rewardText}
                        </span>

                        {isClaimed ? (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-4 h-4" /> Claimed
                          </span>
                        ) : isReady ? (
                          <button
                            type="button"
                            onClick={() => claimMissionReward(mission.id)}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow active:scale-95 transition mt-1"
                          >
                            Claim!
                          </button>
                        ) : (
                          <span className="text-xs text-[#94A3B8] font-bold mt-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "ante" && (
              <div className="space-y-3.5">
                <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-950 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Flame className="w-5 h-5 text-rose-600" />
                    <h3 className="font-black text-sm uppercase tracking-wide">
                      Play for Keeps (The Classroom Wager)
                    </h3>
                  </div>
                  <p className="text-xs font-medium leading-relaxed">
                    Remember playing pen fight in school where the winner took home the opponent's pen?
                    In <strong>Wager Matches</strong>, both players put up a copy of a pen or Ink Coins into the pot. The winner claims the prize!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-[#141E50]/20 bg-white p-3.5 shadow-sm">
                    <h4 className="text-xs font-black text-[#141E50] flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>Friendly / Standard Matches</span>
                    </h4>
                    <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                      Your pens are <strong>100% safe</strong>. Losing a match will never consume or delete your pens. You still earn match XP and mission progress.
                    </p>
                  </div>

                  <div className="rounded-xl border-2 border-[#141E50]/20 bg-white p-3.5 shadow-sm">
                    <h4 className="text-xs font-black text-[#141E50] flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>High-Stakes Ante Matches</span>
                    </h4>
                    <p className="text-xs text-[#475569] mt-1.5 leading-relaxed">
                      Only enabled when both players agree before starting an online duel. You can only wager duplicate pens so you are never left without a pen!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-3 sm:p-4 bg-white/80 border-t-2 border-[#141E50]/15 flex items-center justify-between">
            <div className="text-xs font-mono text-[#475569]">
              Equipped: {activeLineup.map((p) => PEN_CATALOG[p]?.shortName || p).join(" • ")}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#141E50] text-white text-xs sm:text-sm font-black uppercase tracking-wider hover:bg-[#1E293B] active:scale-95 transition shadow-md cursor-pointer"
            >
              Done / Ready to Fight
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
