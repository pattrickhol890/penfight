import React, { useRef, useState, useCallback, useEffect } from "react";
import { RotateCcw, Compass } from "lucide-react";

/**
 * 360-degree Table Rotation Joystick / Dial
 * Placed outside the table area in the bottom-right corner.
 * Allows rotating the desk view 360 degrees to line up edge pens and awkward angles.
 */
export default function TableJoystick({ viewAngle = 0, onRotate, onReset }) {
  const dialRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ initialAngle: 0, startPointerAngle: 0 });

  // Calculate pointer angle relative to dial center
  const getAngleFromEvent = useCallback((e) => {
    if (!dialRef.current) return 0;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
    return Math.atan2(clientY - centerY, clientX - centerX);
  }, []);

  const handlePointerDown = (e) => {
    // Ignore clicks directly on the center reset button
    if (e.target.closest("button")) return;
    setIsDragging(true);
    const pointerAngle = getAngleFromEvent(e);
    dragStartRef.current = {
      initialAngle: viewAngle,
      startPointerAngle: pointerAngle,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const currentPointerAngle = getAngleFromEvent(e);
    const delta = currentPointerAngle - dragStartRef.current.startPointerAngle;
    let newAngle = (dragStartRef.current.initialAngle + delta) % (Math.PI * 2);
    if (newAngle < 0) newAngle += Math.PI * 2;
    onRotate(newAngle);
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
    }
  };

  // Convert radians to degrees for display (0 to 360)
  const deg = Math.round(((viewAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)) * (180 / Math.PI));
  const isRotated = deg > 1 && deg < 359;

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex flex-col items-center select-none"
      title="Rotate table 360° to find perfect flick angle"
    >
      {/* Live Angle Tag */}
      {isRotated && (
        <div className="mb-1.5 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-0.5 border border-white/25 text-[#F5D76E] font-mono text-[10px] sm:text-[11px] font-bold tracking-wider shadow-lg">
          {deg}°
        </div>
      )}

      {/* Circular Rotation Dial - Enlarged & Tactile */}
      <div
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative grid place-items-center w-20 h-20 sm:w-24 sm:h-24 rounded-full cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
          isDragging
            ? "shadow-[0_0_24px_rgba(245,215,110,0.55)] ring-2 ring-[#F5D76E]"
            : "shadow-[3px_8px_20px_rgba(0,0,0,0.65)] hover:shadow-[3px_8px_24px_rgba(0,0,0,0.85)]"
        }`}
        style={{
          background: "radial-gradient(circle, #2A1A0F 0%, #160D07 80%, #0D0804 100%)",
          border: "2.5px solid #8C6A48",
        }}
      >
        {/* Outer Compass Tick Ring (8 directions: N, NE, E, SE, S, SW, W, NW) */}
        <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none">
          {/* Compass 90-degree major marks */}
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 sm:h-2.5 bg-[#F5D76E]/80 rounded-full" />
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-2 sm:h-2.5 bg-[#F5D76E]/80 rounded-full" />
          <span className="absolute left-0.5 top-1/2 -translate-y-1/2 h-0.5 w-2 sm:w-2.5 bg-[#F5D76E]/80 rounded-full" />
          <span className="absolute right-0.5 top-1/2 -translate-y-1/2 h-0.5 w-2 sm:w-2.5 bg-[#F5D76E]/80 rounded-full" />

          {/* Compass 45-degree minor marks */}
          <span className="absolute top-2 left-2 w-1 h-1 rounded-full bg-white/20" />
          <span className="absolute top-2 right-2 w-1 h-1 rounded-full bg-white/20" />
          <span className="absolute bottom-2 left-2 w-1 h-1 rounded-full bg-white/20" />
          <span className="absolute bottom-2 right-2 w-1 h-1 rounded-full bg-white/20" />
        </div>

        {/* Rotating Needle / Marker */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-75"
          style={{
            transform: `rotate(${deg}deg)`,
          }}
        >
          {/* Pointer Thumb Indicator */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#F5D76E] shadow-[0_0_10px_#F5D76E]" />
            <div className="w-0.5 h-3.5 sm:h-4 bg-gradient-to-b from-[#F5D76E] to-transparent" />
          </div>
        </div>

        {/* Center Quick-Reset Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset?.();
          }}
          title={isRotated ? "Reset to 0° standard view" : "Drag to rotate table"}
          className={`relative z-10 grid place-items-center w-9 h-9 sm:w-11 sm:h-11 rounded-full transition-transform duration-150 active:scale-90 ${
            isRotated
              ? "bg-[#B42828] text-white hover:bg-[#D11A38] shadow-md hover:scale-110"
              : "bg-[#F5F2EB]/90 text-[#141E50] hover:bg-white"
          }`}
        >
          {isRotated ? (
            <RotateCcw className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          ) : (
            <Compass className="w-5 h-5 sm:w-5.5 sm:h-5.5 opacity-80" />
          )}
        </button>
      </div>

      {/* Subtle Caption */}
      <span className="mt-1.5 font-mono text-[9px] sm:text-[10px] font-bold text-white/55 uppercase tracking-wider pointer-events-none">
        {isRotated ? "Tap to Reset" : "Rotate 360°"}
      </span>
    </div>
  );
}
