import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Trophy,
  Flame,
  Check,
  Edit2,
  Crown,
  LogOut,
  Sparkles,
  Zap,
  Target,
  PenTool,
  Lock,
  ShieldCheck,
  AtSign,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const paper =
  "https://images.unsplash.com/photo-1695131020187-d3dcdab5016b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxydWxlZCUyMG5vdGVib29rJTIwcGFwZXIlMjB0ZXh0dXJlfGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85";

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile, logout, setClaimUsernameModalOpen } = useAuth();

  const [isEditingTag, setIsEditingTag] = useState(false);
  const [gamerTag, setGamerTag] = useState(user?.gamer_tag || "");
  const [favoriteInk, setFavoriteInk] = useState(user?.preferences?.favorite_ink || "p1");
  const [aimMode, setAimMode] = useState(user?.preferences?.aim_mode || "slingshot");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [subNotice, setSubNotice] = useState(false);

  // Calculate 90-day cooldown status for username changes
  const getCooldownInfo = () => {
    if (!user?.username_claimed || !user?.username_last_changed_at) {
      return { isLocked: false };
    }
    try {
      const lastChanged = new Date(user.username_last_changed_at);
      const now = new Date();
      const diffMs = now.getTime() - lastChanged.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < 90) {
        const daysLeft = Math.ceil(90 - diffDays);
        const unlockDate = new Date(lastChanged.getTime() + 90 * 24 * 60 * 60 * 1000);
        return {
          isLocked: true,
          daysLeft,
          unlockDateStr: unlockDate.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        };
      }
    } catch (e) {
      console.warn("Cooldown calculation error:", e);
    }
    return { isLocked: false };
  };

  const cooldown = getCooldownInfo();

  // Sync state when user changes
  React.useEffect(() => {
    if (user) {
      setGamerTag(user.gamer_tag || "");
      setFavoriteInk(user.preferences?.favorite_ink || "p1");
      setAimMode(user.preferences?.aim_mode || "slingshot");
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const stats = user.stats || {
    games_played: 0,
    wins: 0,
    losses: 0,
    win_streak: 0,
    best_win_streak: 0,
  };

  const winRate =
    stats.games_played > 0 ? Math.round((stats.wins / stats.games_played) * 100) : 0;

  const handleSaveProfile = async () => {
    const res = await updateProfile({
      gamer_tag: gamerTag.trim() || user.gamer_tag,
      favorite_ink: favoriteInk,
      aim_mode: aimMode,
    });
    if (res.success) {
      setIsEditingTag(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleSubscriptionClick = () => {
    setSubNotice(true);
    setTimeout(() => setSubNotice(false), 3500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-sm select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotate: -1.5 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6"
          style={{
            backgroundColor: "#F5F2EB",
            backgroundImage: `url(${paper})`,
            backgroundSize: "cover",
            backgroundBlendMode: "multiply",
            boxShadow: "8px 18px 40px rgba(10,5,0,0.7)",
            borderRadius: "4px 245px 5px 235px/235px 5px 245px 4px",
            border: "2px solid #141E50",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[#141E50] hover:scale-110 transition-transform"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header Profile Section */}
          <div className="flex items-center gap-3.5 border-b-2 border-[#141E50]/15 pb-4">
            <div className="relative">
              <img
                src={
                  user.picture ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name || "Player"}`
                }
                alt={user.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#141E50] bg-white object-cover shadow-md"
              />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#B42828] text-[#F5F2EB] text-[10px] font-bold border border-white">
                ★
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isEditingTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={gamerTag}
                      onChange={(e) => setGamerTag(e.target.value)}
                      maxLength={18}
                      className="rounded border border-[#141E50] bg-white/90 px-1.5 py-0.5 font-mono text-sm font-bold text-[#141E50] focus:outline-none focus:ring-1 focus:ring-[#B42828]"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveProfile}
                      className="p-1 rounded bg-[#B42828] text-white hover:bg-[#8F1F1F]"
                      title="Save tag"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-mono text-base sm:text-lg font-bold text-[#141E50] truncate">
                      {user.gamer_tag}
                    </h3>
                    <button
                      onClick={() => setIsEditingTag(true)}
                      className="text-[#141E50]/60 hover:text-[#B42828] p-0.5 transition-colors"
                      title="Edit gamer tag"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Unique Handle & 90-Day Claim Status */}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#141E50]">
                  @{user.username || user.gamer_tag}
                </span>

                {user.username_claimed ? (
                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 font-mono text-[10px] font-bold text-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    <span>Claimed</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (setClaimUsernameModalOpen) setClaimUsernameModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900 hover:bg-amber-200 transition active:scale-95"
                  >
                    <AtSign className="w-3 h-3 text-amber-700" />
                    <span>Claim Handle</span>
                  </button>
                )}

                {user.username_claimed && (
                  cooldown.isLocked ? (
                    <span
                      title={`You can change your handle again on ${cooldown.unlockDateStr} (once per 90 days)`}
                      className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-300 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-slate-700"
                    >
                      <Lock className="w-2.5 h-2.5 text-slate-500" />
                      <span>{cooldown.daysLeft}d left</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (setClaimUsernameModalOpen) setClaimUsernameModalOpen(true);
                      }}
                      className="text-[10px] font-mono font-bold text-blue-700 underline hover:text-blue-900"
                    >
                      Change
                    </button>
                  )
                )}
              </div>

              <p className="font-mono text-[11px] text-[#141E50]/70 truncate mt-0.5">{user.name}</p>
              <p className="font-mono text-[10px] text-[#141E50]/50 truncate">{user.email}</p>
            </div>
          </div>

          {/* 90-Day Handle Policy Banner */}
          {user.username_claimed && cooldown.isLocked && (
            <div className="mt-3 rounded-lg border border-[#141E50]/15 bg-white/60 p-2 font-mono text-[11px] text-[#141E50]/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  Handle locked for <strong>{cooldown.daysLeft} days</strong> (available <strong>{cooldown.unlockDateStr}</strong>).
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#141E50]/50 shrink-0">
                90-Day Rule
              </span>
            </div>
          )}

          {/* Subscription / Desk Pass Card */}
          <div
            className="my-4 rounded-xl border-2 border-[#8C6A48] p-3.5 sm:p-4 text-[#141E50] relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #FFF7E6 0%, #F5E8D0 100%)",
              boxShadow: "2px 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-[#B42828]" />
                <span className="font-mono text-xs sm:text-sm font-bold tracking-wider uppercase text-[#141E50]">
                  Desk Pass: {user.subscription_tier === "pro" ? "Pro Scholar" : "Free Student"}
                </span>
              </div>
              <span className="rounded-full bg-emerald-600/90 text-white font-mono text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider shadow-sm">
                Active
              </span>
            </div>

            <p className="font-mono text-xs text-[#141E50]/80 mb-3">
              Included: Standard Reynolds 045 Pen, 360° Desk Rotation Dial, AI & Online Battles.
            </p>

            {/* Pro Preview Perquisite list */}
            <div className="rounded-lg bg-black/5 p-2.5 mb-3 border border-[#8C6A48]/30">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#8C6A48] mb-1">
                <Sparkles className="h-3.5 w-3.5 text-[#B42828]" />
                <span>Upcoming Pro Subscription Perks:</span>
              </div>
              <ul className="grid grid-cols-2 gap-1 font-mono text-[10px] text-[#141E50]/75">
                <li>✨ Gold Reynolds Fin & Nib</li>
                <li>🪵 Teakwood Slab Skins</li>
                <li>🎯 Custom Chalk Aim Lines</li>
                <li>👑 Pro Scholar Desk Badge</li>
              </ul>
            </div>

            <button
              onClick={handleSubscriptionClick}
              className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-[#8C6A48] bg-[#F5D76E] py-2 font-mono text-xs font-bold text-[#141E50] shadow-sm hover:bg-[#F5D76E]/80 transition-transform active:scale-98"
            >
              <Zap className="h-4 w-4 text-[#B42828]" />
              <span>Upgrade to Pro Desk Pass (Coming Soon)</span>
            </button>

            {subNotice && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-center font-mono text-[11px] text-[#B42828] font-bold"
              >
                🎉 Subscriptions with custom pens & tables will launch soon!
              </motion.div>
            )}
          </div>

          {/* Career Statistics */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2 font-mono text-xs font-bold uppercase tracking-wider text-[#141E50]">
              <Trophy className="h-4 w-4 text-[#B42828]" />
              <span>Career Record</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border-2 border-[#141E50]/20 bg-white/50 p-2.5 text-center">
                <span className="block font-mono text-[10px] uppercase text-[#141E50]/60 font-bold">
                  Matches
                </span>
                <span className="font-mono text-lg font-extrabold text-[#141E50]">
                  {stats.games_played}
                </span>
              </div>

              <div className="rounded-lg border-2 border-[#141E50]/20 bg-white/50 p-2.5 text-center">
                <span className="block font-mono text-[10px] uppercase text-[#141E50]/60 font-bold">
                  Win Rate
                </span>
                <span className="font-mono text-lg font-extrabold text-emerald-700">
                  {winRate}%
                </span>
              </div>

              <div className="rounded-lg border-2 border-[#141E50]/20 bg-white/50 p-2.5 text-center">
                <span className="block font-mono text-[10px] uppercase text-[#141E50]/60 font-bold">
                  W / L
                </span>
                <span className="font-mono text-lg font-extrabold text-[#141E50]">
                  {stats.wins} / {stats.losses}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center justify-between rounded-lg border border-[#141E50]/20 bg-white/40 px-3 py-2">
                <span className="flex items-center gap-1.5 font-mono text-xs text-[#141E50]/80">
                  <Flame className="h-4 w-4 text-orange-600" />
                  <span>Win Streak:</span>
                </span>
                <span className="font-mono text-sm font-bold text-[#141E50]">
                  {stats.win_streak}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#141E50]/20 bg-white/40 px-3 py-2">
                <span className="flex items-center gap-1.5 font-mono text-xs text-[#141E50]/80">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  <span>Best Streak:</span>
                </span>
                <span className="font-mono text-sm font-bold text-[#141E50]">
                  {stats.best_win_streak}
                </span>
              </div>
            </div>
          </div>

          {/* Match Preferences */}
          <div className="mb-4 border-t border-[#141E50]/15 pt-3">
            <span className="block font-mono text-xs font-bold uppercase tracking-wider text-[#141E50] mb-2">
              Match Preferences
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Preferred Ink */}
              <div>
                <label className="block font-mono text-[11px] text-[#141E50]/70 mb-1">
                  Default Ink:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFavoriteInk("p1")}
                    className={`flex-1 py-1.5 rounded border-2 font-mono text-xs font-bold transition-all ${
                      favoriteInk === "p1"
                        ? "border-[#1E3A8A] bg-[#1E3A8A] text-white shadow-sm"
                        : "border-[#141E50]/30 bg-white/40 text-[#141E50]"
                    }`}
                  >
                    Royal Blue
                  </button>
                  <button
                    onClick={() => setFavoriteInk("p2")}
                    className={`flex-1 py-1.5 rounded border-2 font-mono text-xs font-bold transition-all ${
                      favoriteInk === "p2"
                        ? "border-[#B42828] bg-[#B42828] text-white shadow-sm"
                        : "border-[#141E50]/30 bg-white/40 text-[#141E50]"
                    }`}
                  >
                    Crimson Red
                  </button>
                </div>
              </div>

              {/* Aim Style */}
              <div>
                <label className="block font-mono text-[11px] text-[#141E50]/70 mb-1">
                  Aim Flick Style:
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAimMode("slingshot")}
                    className={`flex-1 py-1.5 rounded border-2 font-mono text-xs font-bold transition-all ${
                      aimMode === "slingshot"
                        ? "border-[#B42828] bg-[#F5D76E] text-[#141E50] shadow-sm"
                        : "border-[#141E50]/30 bg-white/40 text-[#141E50]"
                    }`}
                  >
                    Slingshot
                  </button>
                  <button
                    onClick={() => setAimMode("forward")}
                    className={`flex-1 py-1.5 rounded border-2 font-mono text-xs font-bold transition-all ${
                      aimMode === "forward"
                        ? "border-[#B42828] bg-[#F5D76E] text-[#141E50] shadow-sm"
                        : "border-[#141E50]/30 bg-white/40 text-[#141E50]"
                    }`}
                  >
                    Forward
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded border border-[#141E50] bg-white/70 py-1.5 font-mono text-xs font-bold text-[#141E50] hover:bg-white transition-colors"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Preferences Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t-2 border-[#141E50]/15 pt-3">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="flex items-center gap-1.5 font-mono text-xs font-bold text-red-700 hover:text-red-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg border-2 border-[#141E50] bg-[#141E50] px-4 py-1.5 font-mono text-xs font-bold text-[#F5F2EB] shadow hover:bg-[#141E50]/90 transition-transform active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
