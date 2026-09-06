/**
 * Mobile Fullscreen & Orientation Lock Utility
 * Handles cross-browser fullscreen requests and native landscape orientation lock,
 * with graceful fallback for devices with portrait lock or iOS Safari.
 */

export function isMobileDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 900 && ("ontouchstart" in window || navigator.maxTouchPoints > 0))
  );
}

export function isPortraitMode() {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth;
}

export async function requestFullscreenAndLockLandscape() {
  if (typeof document === "undefined") return;

  // 1. Enter Fullscreen (Cross-browser with vendor prefixes)
  const docEl = document.documentElement;
  try {
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen({ navigationUI: "hide" }).catch(() => docEl.requestFullscreen());
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    }
  } catch (err) {
    console.warn("Fullscreen request error:", err);
  }

  // 2. Try native Screen Orientation API lock (Android Chrome / Firefox)
  try {
    if (window.screen?.orientation?.lock) {
      await window.screen.orientation.lock("landscape").catch(() => {});
    } else if (window.screen?.lockOrientation) {
      window.screen.lockOrientation("landscape");
    } else if (window.screen?.mozLockOrientation) {
      window.screen.mozLockOrientation("landscape");
    } else if (window.screen?.msLockOrientation) {
      window.screen.msLockOrientation("landscape");
    }
  } catch (err) {
    // Expected on iOS Safari or when hardware portrait lock rejects native lock
    console.info("Native orientation lock rejected or unsupported:", err);
  }
}

export async function exitFullscreenAndUnlockOrientation() {
  if (typeof document === "undefined") return;

  // 1. Unlock screen orientation
  try {
    if (window.screen?.orientation?.unlock) {
      window.screen.orientation.unlock();
    } else if (window.screen?.unlockOrientation) {
      window.screen.unlockOrientation();
    } else if (window.screen?.mozUnlockOrientation) {
      window.screen.mozUnlockOrientation();
    } else if (window.screen?.msUnlockOrientation) {
      window.screen.msUnlockOrientation();
    }
  } catch (_) {}

  // 2. Exit Fullscreen
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        await document.msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn("Exit fullscreen error:", err);
  }
}
