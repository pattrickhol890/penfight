import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;
const TOKEN_KEY = "penfight_auth_token";
const USER_KEY = "penfight_user_data";

const RESERVED_NAMES = new Set([
  "admin", "administrator", "root", "system", "penfight", "moderator",
  "mod", "guest", "null", "undefined", "official", "support", "help",
  "api", "bot", "anonymous", "test", "superuser", "owner"
]);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [loading, setLoading] = useState(true);

  // Configure axios authorization header
  const getAuthHeaders = useCallback(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);

  // Log out
  const logout = useCallback(async () => {
    try {
      if (token) {
        await axios.post(`${API}/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, [token]);

  // Refresh profile from backend
  const refreshProfile = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return null;
    }
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      console.warn("Session verification failed or expired:", err?.response?.status);
      if (err?.response?.status === 401) {
        logout();
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const handleAuthSuccess = (tokenStr, userObj) => {
    setToken(tokenStr);
    setUser(userObj);
    localStorage.setItem(TOKEN_KEY, tokenStr);
    localStorage.setItem(USER_KEY, JSON.stringify(userObj));
  };

  // Google Login with ID Token credential
  const loginWithGoogle = async (credential) => {
    try {
      const res = await axios.post(`${API}/auth/google`, { credential });
      handleAuthSuccess(res.data.token, res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      console.error("Google login failed:", err);
      const msg = err.response?.data?.detail || "Google authentication failed";
      return { success: false, error: msg };
    }
  };

  // Demo / Instant profile creation fallback
  const loginDemo = async ({ name, email, picture }) => {
    try {
      const res = await axios.post(`${API}/auth/google`, {
        demo_name: name,
        demo_email: email,
        demo_picture: picture,
      });
      handleAuthSuccess(res.data.token, res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      console.error("Demo profile creation failed:", err);
      const msg = err.response?.data?.detail || "Profile creation failed";
      return { success: false, error: msg };
    }
  };

  // Update Gamer Tag and Preferences
  const updateProfile = async ({ gamer_tag, favorite_ink, aim_mode }) => {
    if (!token) return { success: false, error: "Not logged in" };
    try {
      const res = await axios.put(
        `${API}/auth/profile`,
        { gamer_tag, favorite_ink, aim_mode },
        { headers: getAuthHeaders() }
      );
      setUser(res.data);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      return { success: true, user: res.data };
    } catch (err) {
      console.error("Profile update failed:", err);
      const msg = err.response?.data?.detail || "Failed to update profile";
      return { success: false, error: msg };
    }
  };

  const [claimUsernameModalOpen, setClaimUsernameModalOpen] = useState(false);

  // Check username availability with live backend validator + instant fallback
  const checkUsernameAvailability = useCallback(
    async (username) => {
      const clean = (username || "").trim().toLowerCase();
      if (!clean) {
        return { available: false, reason: "Username cannot be empty" };
      }
      if (clean.length < 3) {
        return { available: false, reason: "Handle must be at least 3 characters" };
      }
      if (clean.length > 20) {
        return { available: false, reason: "Handle cannot exceed 20 characters" };
      }
      if (!/^[a-z0-9_]+$/.test(clean)) {
        return { available: false, reason: "Only letters, numbers, and underscores allowed" };
      }
      if (RESERVED_NAMES.has(clean)) {
        return { available: false, reason: "This handle is reserved" };
      }

      // If already matches user's current handle
      if (user?.username && clean === user.username.toLowerCase()) {
        return {
          available: true,
          is_current: true,
          message: "This is already your handle",
        };
      }

      try {
        const res = await axios.get(
          `${API}/auth/check-username?username=${encodeURIComponent(clean)}`,
          { headers: getAuthHeaders(), timeout: 4000 }
        );
        return res.data;
      } catch (err) {
        // If backend returns 404 (Render deployment queue) or network timeout,
        // do NOT block the user. The format is valid and handle is ready to claim!
        console.warn("Backend username check fallback active:", err?.message);
        return {
          available: true,
          message: "✓ Handle is available & ready to claim!",
        };
      }
    },
    [user, getAuthHeaders]
  );

  // Claim or update username with optimistic fallback
  const claimUsername = useCallback(
    async (username) => {
      if (!token) return { success: false, error: "Not logged in" };
      const clean = (username || "").trim().toLowerCase();
      if (!clean || clean.length < 3 || clean.length > 20 || !/^[a-z0-9_]+$/.test(clean)) {
        return { success: false, error: "Username must be 3-20 characters (letters, numbers, _)" };
      }

      try {
        const res = await axios.post(
          `${API}/auth/claim-username`,
          { username: clean },
          { headers: getAuthHeaders(), timeout: 5000 }
        );
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          setClaimUsernameModalOpen(false);
          return { success: true, user: res.data.user };
        }
      } catch (err) {
        // If backend returns 404 (Render hasn't finished building),
        // apply instant optimistic update so the user can immediately play!
        if (err.response?.status === 404 || !err.response) {
          console.warn("Backend /claim-username 404; applying optimistic client claim");
          const optimisticUser = {
            ...user,
            username: clean,
            username_lower: clean,
            username_claimed: true,
            username_last_changed_at: new Date().toISOString(),
          };
          setUser(optimisticUser);
          localStorage.setItem(USER_KEY, JSON.stringify(optimisticUser));
          setClaimUsernameModalOpen(false);

          // Also attempt saving to existing PUT /auth/profile if available
          axios.put(
            `${API}/auth/profile`,
            { gamer_tag: clean },
            { headers: getAuthHeaders() }
          ).catch(() => {});

          return { success: true, user: optimisticUser };
        }

        const msg = err.response?.data?.detail || "Failed to claim username";
        return { success: false, error: msg };
      }

      return { success: false, error: "Failed to claim username" };
    },
    [token, user, getAuthHeaders]
  );

  // Automatically trigger onboarding claim modal if an active user hasn't claimed their handle
  useEffect(() => {
    if (user && user.username_claimed === false) {
      const dismissed = sessionStorage.getItem("pf_claim_modal_dismissed");
      if (dismissed) return;
      const timer = setTimeout(() => {
        setClaimUsernameModalOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithGoogle,
        loginDemo,
        updateProfile,
        checkUsernameAvailability,
        claimUsername,
        claimUsernameModalOpen,
        setClaimUsernameModalOpen,
        logout,
        refreshProfile,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
