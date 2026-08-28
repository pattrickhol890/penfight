import React, { useState, useEffect } from 'react';
import { RotateCw, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RotateOverlay() {
  const [isPortraitMobile, setIsPortraitMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth <= 850 || /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsPortraitMobile(isMobile && isPortrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleFullscreen = () => {
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <AnimatePresence>
      {isPortraitMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#141E50]/95 p-6 text-center text-[#F5F2EB] backdrop-blur-md"
        >
          <motion.div
            animate={{ rotate: [0, 90, 90, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="mb-6 rounded-2xl border-2 border-[#F5D76E] bg-[#141E50] p-5 shadow-2xl"
          >
            <RotateCw className="h-12 w-12 text-[#F5D76E]" />
          </motion.div>

          <h2 className="mb-2 font-mono text-xl font-bold tracking-wider text-[#F5D76E]">
            ROTATE TO LANDSCAPE
          </h2>

          <p className="mb-6 max-w-xs font-mono text-xs leading-relaxed text-[#F5F2EB]/80">
            Pen Fight is designed for widescreen battle desks. Please turn your device sideways to play!
          </p>

          <button
            onClick={handleFullscreen}
            className="flex items-center gap-2 rounded-lg border-2 border-[#F5D76E] bg-[#F5D76E] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#141E50] shadow-md transition-transform active:scale-95"
          >
            <Maximize2 className="h-4 w-4" />
            <span>Enter Fullscreen</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
