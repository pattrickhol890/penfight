import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, User, Mail, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const paper =
  "https://images.unsplash.com/photo-1695131020187-d3dcdab5016b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2OTV8MHwxfHNlYXJjaHwxfHxydWxlZCUyMG5vdGVib29rJTIwcGFwZXIlMjB0ZXh0dXJlfGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85";

export default function GoogleAuthModal({ isOpen, onClose }) {
  const { loginWithGoogle, loginDemo } = useAuth();
  const googleBtnRef = useRef(null);

  const [activeTab, setActiveTab] = useState("google"); // 'google' | 'instant'
  const [demoName, setDemoName] = useState("");
  const [demoEmail, setDemoEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  // Initialize official Google Identity Services button if Client ID is configured
  useEffect(() => {
    if (!isOpen) return;

    const initGsi = () => {
      if (!window.google || !googleClientId) return;
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (res) => {
            setLoading(true);
            setError(null);
            const r = await loginWithGoogle(res.credential);
            setLoading(false);
            if (r.success) {
              onClose();
            } else {
              setError(r.error || "Google login failed");
            }
          },
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "outline",
            size: "large",
            width: 280,
            shape: "pill",
            text: "continue_with",
          });
        }
      } catch (err) {
        console.warn("GIS initialization error:", err);
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGsi;
      document.body.appendChild(script);
    }
  }, [isOpen, googleClientId, loginWithGoogle, onClose]);

  const handleInstantSubmit = async (e) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim()) {
      setError("Please provide a name and email");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await loginDemo({
      name: demoName.trim(),
      email: demoEmail.trim(),
    });
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || "Failed to create profile");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-sm sm:max-w-md overflow-hidden p-5 sm:p-6"
          style={{
            backgroundColor: "#F5F2EB",
            backgroundImage: `url(${paper})`,
            backgroundSize: "cover",
            backgroundBlendMode: "multiply",
            boxShadow: "8px 16px 36px rgba(10,5,0,0.7)",
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

          {/* Header */}
          <div className="mb-4 text-center">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#B42828]">
              STUDENT DESK PASS
            </span>
            <h2
              style={{ fontFamily: "'Caveat', cursive", color: "#141E50" }}
              className="text-4xl sm:text-5xl font-bold leading-none mt-1"
            >
              Player Profile
            </h2>
            <p className="mt-1 font-mono text-xs text-[#141E50cc]">
              Save your matches, unlock streaks, and prepare for upcoming desk passes!
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-red-100/90 border border-red-300 p-2.5 text-xs text-red-800 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab buttons */}
          <div className="mb-4 flex border-b-2 border-[#141E50]/20 pb-2">
            <button
              onClick={() => setActiveTab("google")}
              className={`flex-1 py-1 text-center font-mono text-xs sm:text-sm font-bold transition-colors ${
                activeTab === "google"
                  ? "text-[#B42828] border-b-2 border-[#B42828]"
                  : "text-[#141E50]/60 hover:text-[#141E50]"
              }`}
            >
              Google Sign-In
            </button>
            <button
              onClick={() => setActiveTab("instant")}
              className={`flex-1 py-1 text-center font-mono text-xs sm:text-sm font-bold transition-colors ${
                activeTab === "instant"
                  ? "text-[#B42828] border-b-2 border-[#B42828]"
                  : "text-[#141E50]/60 hover:text-[#141E50]"
              }`}
            >
              Instant Profile
            </button>
          </div>

          {activeTab === "google" ? (
            <div className="flex flex-col items-center py-3">
              {googleClientId ? (
                <>
                  <div ref={googleBtnRef} className="my-2 min-h-[44px]" />
                  <p className="mt-3 font-mono text-[11px] text-[#141E50]/70 text-center">
                    Sign in with your Google account to sync your game stats across devices.
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center my-2">
                  <div className="p-3 bg-white/70 rounded-full border border-[#141E50]/20 shadow-sm">
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <p className="font-mono text-xs text-[#141E50]">
                    Google OAuth Client is ready. To enable direct Google Sign-In, add your{" "}
                    <code className="bg-[#141E50]/10 px-1 py-0.5 rounded text-[10px]">
                      REACT_APP_GOOGLE_CLIENT_ID
                    </code>
                    .
                  </p>
                  <button
                    onClick={() => setActiveTab("instant")}
                    className="mt-1 flex items-center gap-1.5 rounded-lg border-2 border-[#141E50] bg-[#F5D76E] px-4 py-2 font-mono text-xs font-bold text-[#141E50] shadow hover:bg-[#F5D76E]/80 transition-transform active:scale-95"
                  >
                    <Sparkles className="h-4 w-4" />
                    Use Instant Profile Creator (1-Click)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleInstantSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block font-mono text-xs font-bold text-[#141E50] mb-1">
                  Player Name:
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-[#141E50]/60" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reynolds Kid"
                    value={demoName}
                    onChange={(e) => setDemoName(e.target.value)}
                    className="w-full rounded-md border-2 border-[#141E50] bg-white/70 pl-8 pr-3 py-1.5 font-mono text-xs text-[#141E50] focus:outline-none focus:ring-2 focus:ring-[#B42828]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold text-[#141E50] mb-1">
                  Email Address:
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-[#141E50]/60" />
                  <input
                    type="email"
                    required
                    placeholder="player@gmail.com"
                    value={demoEmail}
                    onChange={(e) => setDemoEmail(e.target.value)}
                    className="w-full rounded-md border-2 border-[#141E50] bg-white/70 pl-8 pr-3 py-1.5 font-mono text-xs text-[#141E50] focus:outline-none focus:ring-2 focus:ring-[#B42828]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-[#141E50] bg-[#B42828] py-2 font-mono text-xs sm:text-sm font-bold text-[#F5F2EB] shadow hover:bg-[#8F1F1F] transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Profile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Create Profile & Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-4 border-t border-[#141E50]/15 pt-2 text-center">
            <span className="font-mono text-[10px] text-[#141E50]/60">
              🔒 Profiles are securely stored and synced to MongoDB.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
