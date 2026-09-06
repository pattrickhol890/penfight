import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;
const TOKEN_KEY = "penfight_auth_token";
const USER_KEY = "penfight_user_data";

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

  // Check username availability with live backend validator
  const checkUsernameAvailability = useCallback(
    async (username) => {
      if (!username || !username.trim()) {
        return { available: false, reason: "Username cannot be empty" };
      }
      try {
        const res = await axios.get(
          `${API}/auth/check-username?username=${encodeURIComponent(username.trim())}`,
          { headers: getAuthHeaders() }
        );
        return res.data;
      } catch (err) {
        return {
          available: false,
          reason: err.response?.data?.detail || "Error checking username",
        };
      }
    },
    [getAuthHeaders]
  );

  // Claim or update username
  const claimUsername = useCallback(
    async (username) => {
      if (!token) return { success: false, error: "Not logged in" };
      try {
        const res = await axios.post(
          `${API}/auth/claim-username`,
          { username: username.trim() },
          { headers: getAuthHeaders() }
        );
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
          return { success: true, user: res.data.user };
        }
        return { success: false, error: "Unexpected server response" };
      } catch (err) {
        const msg = err.response?.data?.detail || "Failed to claim username";
        return { success: false, error: msg };
      }
    },
    [token, getAuthHeaders]
  );

  // Automatically trigger onboarding claim modal if an active user hasn't claimed their handle
  useEffect(() => {
    if (user && user.username_claimed === false) {
      // Small timeout to avoid clashing with auth login transitions
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
