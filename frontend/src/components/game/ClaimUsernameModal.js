import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AtSign, CheckCircle2, AlertCircle, Loader2, Sparkles, X, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const paper =
  "radial-gradient(#141E50 0.75px, transparent 0.75px), #F5F0EA";

export default function ClaimUsernameModal({ isOpen, onClose }) {
  const { user, checkUsernameAvailability, claimUsername } = useAuth();

  const [inputVal, setInputVal] = useState("");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(null); // null | 'available' | 'taken' | 'invalid' | 'is_current'
  const [statusMsg, setStatusMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const debounceTimerRef = useRef(null);

  // Initialize with user's auto-generated username or email prefix
  useEffect(() => {
    if (isOpen && user) {
      const initial = user.username || user.email?.split("@")[0] || "";
      const sanitized = initial.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
      setInputVal(sanitized);
      setStatus(null);
      setStatusMsg("");
      setSubmitError(null);
    }
  }, [isOpen, user]);

  // Live validator on input change (debounced 280ms)
  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = inputVal.trim();
    if (!trimmed) {
      setStatus(null);
      setStatusMsg("");
      setChecking(false);
      return;
    }

    // Format validation
    if (trimmed.length < 3) {
      setStatus("invalid");
      setStatusMsg("Handle must be at least 3 characters");
      setChecking(false);
      return;
    }

    if (trimmed.length > 20) {
      setStatus("invalid");
      setStatusMsg("Handle cannot exceed 20 characters");
      setChecking(false);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setStatus("invalid");
      setStatusMsg("Only letters, numbers, and underscores allowed");
      setChecking(false);
      return;
    }

    // Format is valid -> perform live server check
    setChecking(true);
    setStatus(null);

    debounceTimerRef.current = setTimeout(async () => {
      const res = await checkUsernameAvailability(trimmed);
      setChecking(false);
      if (res.available) {
        if (res.is_current) {
          setStatus("is_current");
          setStatusMsg(res.message || "This is already your handle");
        } else {
          setStatus("available");
          setStatusMsg(res.message || "Handle is available!");
        }
      } else {
        setStatus("taken");
        setStatusMsg(res.reason || "Handle is already taken");
      }
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [inputVal, isOpen, checkUsernameAvailability]);

  const handleClaim = async (handleToClaim) => {
    const target = (handleToClaim || inputVal).trim();
    if (!target) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await claimUsername(target);
    setSubmitting(false);

    if (res.success) {
      if (onClose) onClose();
    } else {
      setSubmitError(res.error || "Failed to claim username");
    }
  };

  if (!isOpen || !user) return null;

  const emailPrefix = user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15) || "player";
  const suggestions = [
    emailPrefix,
    `${emailPrefix}_pf`,
    `${emailPrefix}01`,
  ].filter((s) => s !== inputVal);

  const canSubmit =
    !checking &&
    !submitting &&
    (status === "available" || status === "is_current") &&
    inputVal.trim().length >= 3;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl border-4 border-[#141E50] text-[#141E50] overflow-hidden"
          style={{ backgroundImage: paper, backgroundSize: "16px 16px" }}
        >
          {/* Notebook Spiral Edge */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-[#141E50]/10 flex justify-around items-center px-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#141E50]/30" />
            ))}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-[#141E50]/60 hover:text-[#141E50] hover:bg-[#141E50]/10 transition-colors"
            title="Decide later"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mt-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>ONBOARDING STEP</span>
            </div>
            <h2 className="text-2xl font-black font-mono tracking-tight text-[#141E50]">
              Claim Your Handle
            </h2>
            <p className="mt-1 font-mono text-xs text-[#141E50]/75 max-w-xs mx-auto">
              Your unique identity in classroom duels, rankings, and desk passes.
            </p>
          </div>

          {/* Input Field with live feedback */}
          <div className="mt-5">
            <label className="block font-mono text-xs font-bold uppercase tracking-wider text-[#141E50]/80 mb-1.5">
              Choose Username
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 font-mono font-black text-base text-[#141E50]/60 select-none">
                @
              </span>
              <input
                type="text"
                value={inputVal}
                maxLength={20}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                  setInputVal(val);
                }}
                placeholder="pen_master"
                className="w-full rounded-xl border-2 border-[#141E50] bg-white pl-8 pr-10 py-2.5 font-mono text-base font-bold text-[#141E50] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-400/20"
              />

              {/* Status Icon */}
              <div className="absolute right-3 flex items-center">
                {checking ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : status === "available" || status === "is_current" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : status === "taken" || status === "invalid" ? (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                ) : null}
              </div>
            </div>

            {/* Validation Feedback Line */}
            <div className="mt-2 min-h-[20px] font-mono text-xs">
              {checking ? (
                <span className="text-blue-700 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin inline" /> Checking availability...
                </span>
              ) : status === "available" ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> {statusMsg}
                </span>
              ) : status === "is_current" ? (
                <span className="text-blue-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> {statusMsg}
                </span>
              ) : status === "taken" ? (
                <span className="text-rose-700 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 inline" /> {statusMsg}
                </span>
              ) : status === "invalid" ? (
                <span className="text-amber-800 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 inline" /> {statusMsg}
                </span>
              ) : (
                <span className="text-[#141E50]/60">
                  3–20 characters. Letters, numbers, and underscores.
                </span>
              )}
            </div>
          </div>

          {/* Quick Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-3">
              <span className="font-mono text-[11px] text-[#141E50]/70 font-semibold block mb-1">
                Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setInputVal(sug)}
                    className="rounded-lg border border-[#141E50]/30 bg-white/80 px-2 py-0.5 font-mono text-xs font-bold text-[#141E50] hover:bg-[#141E50]/10 transition active:scale-95"
                  >
                    @{sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 90-Day Policy Alert */}
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-2.5 text-xs text-amber-900 font-mono flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight">
              <strong className="block text-amber-950 font-bold mb-0.5">90-Day Handle Policy</strong>
              Once claimed, you will only be able to change your handle again after <strong>90 days</strong>.
            </div>
          </div>

          {submitError && (
            <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 p-2 text-xs text-rose-700 font-mono font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => handleClaim()}
              className={`w-full py-2.5 rounded-xl font-mono text-sm font-black tracking-wide uppercase transition shadow-md flex items-center justify-center gap-2 ${
                canSubmit
                  ? "bg-[#141E50] text-white hover:bg-[#1f2d6e] active:scale-98 cursor-pointer"
                  : "bg-[#141E50]/30 text-white/70 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Claiming Handle...</span>
                </>
              ) : (
                <>
                  <AtSign className="w-4 h-4" />
                  <span>Claim Handle & Enter Arena</span>
                </>
              )}
            </button>

            {user.username && (
              <button
                type="button"
                onClick={() => handleClaim(user.username)}
                disabled={submitting}
                className="w-full py-2 rounded-xl font-mono text-xs font-bold text-[#141E50]/80 hover:bg-[#141E50]/10 transition text-center"
              >
                Keep Default (@{user.username})
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
