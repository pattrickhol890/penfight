import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AtSign, CheckCircle2, AlertCircle, Loader2, Sparkles, X, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

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
      try {
        sessionStorage.setItem("pf_claim_modal_dismissed", "true");
      } catch (e) {}
      if (onClose) onClose();
    } else {
      setSubmitError(res.error || "Failed to claim username");
    }
  };

  const handleClose = () => {
    try {
      sessionStorage.setItem("pf_claim_modal_dismissed", "true");
    } catch (e) {}
    if (onClose) onClose();
  };

  if (!isOpen || !user) return null;

  const emailPrefix = user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 15) || "player";
  const defaultHandle = user.username || emailPrefix;
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-md rounded-2xl p-6 sm:p-7 shadow-2xl border-4 border-[#141E50] text-[#0F172A] overflow-hidden"
          style={{
            backgroundColor: "#FAF7F0",
            backgroundImage: "radial-gradient(#141E50 0.8px, transparent 0.8px)",
            backgroundSize: "20px 20px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 2px #141E50",
          }}
        >
          {/* Top Notebook Binder Accent */}
          <div className="absolute top-0 left-0 right-0 h-3.5 bg-[#141E50]/15 flex justify-around items-center px-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#141E50]/40" />
            ))}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#141E50]/70 hover:text-[#141E50] hover:bg-[#141E50]/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="mt-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs mb-2.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>ONBOARDING STEP</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
              Claim Your Handle
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-[#334155] max-w-xs mx-auto leading-relaxed">
              Your unique identity in classroom duels, rankings, and desk passes.
            </p>
          </div>

          {/* Input Field with live feedback */}
          <div className="mt-5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0F172A] mb-1.5">
              Choose Username
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 font-black text-lg text-[#0F172A]/70 select-none">
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
                className="w-full rounded-xl border-2 border-[#141E50] bg-white pl-9 pr-11 py-3 text-base sm:text-lg font-bold text-[#0F172A] outline-none transition focus:border-blue-700 focus:ring-4 focus:ring-blue-500/20 shadow-inner placeholder:text-[#94A3B8]"
              />

              {/* Status Icon inside input */}
              <div className="absolute right-3.5 flex items-center">
                {checking ? (
                  <Loader2 className="w-5 h-5 text-blue-700 animate-spin" />
                ) : status === "available" || status === "is_current" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : status === "taken" || status === "invalid" ? (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                ) : null}
              </div>
            </div>

            {/* Validation Feedback Line */}
            <div className="mt-2.5 min-h-[28px]">
              {checking ? (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-700" />
                  <span>Checking handle availability...</span>
                </div>
              ) : status === "available" ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-300 px-2.5 py-1 text-xs font-bold text-emerald-800 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span>{statusMsg}</span>
                </div>
              ) : status === "is_current" ? (
                <div className="rounded-lg bg-blue-50 border border-blue-300 px-2.5 py-1 text-xs font-bold text-blue-800 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                  <span>{statusMsg}</span>
                </div>
              ) : status === "taken" ? (
                <div className="rounded-lg bg-rose-50 border border-rose-300 px-2.5 py-1 text-xs font-bold text-rose-800 flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{statusMsg}</span>
                </div>
              ) : status === "invalid" ? (
                <div className="rounded-lg bg-amber-50 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 flex items-center gap-1.5 shadow-sm">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                  <span>{statusMsg}</span>
                </div>
              ) : (
                <p className="text-xs text-[#475569] font-medium pl-1">
                  3–20 characters. Letters, numbers, and underscores only.
                </p>
              )}
            </div>
          </div>

          {/* Quick Suggestions */}
          {suggestions.length > 0 && (
            <div className="mt-2.5">
              <span className="text-xs font-bold text-[#334155] block mb-1">
                Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setInputVal(sug)}
                    className="rounded-lg border-2 border-[#141E50]/30 bg-white px-2.5 py-1 text-xs font-bold text-[#0F172A] hover:bg-slate-100 hover:border-[#141E50] transition active:scale-95 shadow-sm"
                  >
                    @{sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 90-Day Policy Alert */}
          <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 flex items-start gap-2.5 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-snug">
              <strong className="block text-amber-950 font-bold mb-0.5">
                ⚠️ 90-Day Handle Policy
              </strong>
              Once claimed, your handle is locked. You can only change it again after <strong>90 days</strong>.
            </div>
          </div>

          {submitError && (
            <div className="mt-3 rounded-lg border-2 border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 font-bold flex items-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => handleClaim()}
              className={`w-full py-3 rounded-xl text-sm sm:text-base font-black tracking-wide uppercase transition shadow-md flex items-center justify-center gap-2 ${
                canSubmit
                  ? "bg-[#141E50] text-white hover:bg-[#1E293B] active:scale-[0.99] cursor-pointer shadow-lg"
                  : "bg-[#141E50]/30 text-white/70 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Claiming Handle...</span>
                </>
              ) : (
                <>
                  <AtSign className="w-5 h-5" />
                  <span>Claim Handle & Enter Arena</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleClaim(defaultHandle)}
              disabled={submitting}
              className="w-full py-2 rounded-xl text-xs font-bold text-[#334155] hover:bg-black/5 transition text-center cursor-pointer"
            >
              Keep Default (@{defaultHandle})
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
