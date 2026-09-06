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
      className="fixed bottom-3.5 right-3.5 z-30 flex flex-col items-center select-none"
      title="Rotate table 360° to find perfect flick angle"
    >
      {/* Live Angle Tag */}
      {isRotated && (
        <div className="mb-1 rounded-full bg-black/65 backdrop-blur-md px-2 py-0.5 border border-white/20 text-[#F5D76E] font-mono text-[9px] font-bold tracking-wider shadow-md">
          {deg}°
        </div>
      )}

      {/* Circular Rotation Dial */}
      <div
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative grid place-items-center w-16 h-16 sm:w-18 sm:h-18 rounded-full cursor-grab active:cursor-grabbing transition-shadow duration-200 ${
          isDragging
            ? "shadow-[0_0_20px_rgba(245,215,110,0.45)] ring-2 ring-[#F5D76E]"
            : "shadow-[2px_6px_16px_rgba(0,0,0,0.6)] hover:shadow-[2px_6px_20px_rgba(0,0,0,0.8)]"
        }`}
        style={{
          background: "radial-gradient(circle, #2A1A0F 0%, #160D07 80%, #0D0804 100%)",
          border: "2px solid #8C6A48",
        }}
      >
        {/* Outer Compass Tick Ring */}
        <div className="absolute inset-1 rounded-full border border-white/10 pointer-events-none">
          {/* Compass 90-degree marks */}
          <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-[#F5D76E]/60 rounded-full" />
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-[#F5D76E]/60 rounded-full" />
          <span className="absolute left-0.5 top-1/2 -translate-y-1/2 h-0.5 w-1.5 bg-[#F5D76E]/60 rounded-full" />
          <span className="absolute right-0.5 top-1/2 -translate-y-1/2 h-0.5 w-1.5 bg-[#F5D76E]/60 rounded-full" />
        </div>

        {/* Rotating Needle / Marker */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-75"
          style={{
            transform: `rotate(${deg}deg)`,
          }}
        >
          {/* Pointer Thumb Indicator */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-[#F5D76E] shadow-[0_0_8px_#F5D76E]" />
            <div className="w-0.5 h-3 bg-gradient-to-b from-[#F5D76E] to-transparent" />
          </div>
        </div>

        {/* Center Quick-Reset Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReset?.();
          }}
          title={isRotated ? "Reset to 0° standard view" : "Drag to rotate table"}
          className={`relative z-10 grid place-items-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-transform duration-150 active:scale-90 ${
            isRotated
              ? "bg-[#B42828] text-white hover:bg-[#D11A38] shadow-md hover:scale-110"
              : "bg-[#F5F2EB]/90 text-[#141E50] hover:bg-white"
          }`}
        >
          {isRotated ? (
            <RotateCcw className="w-3.5 h-3.5" />
          ) : (
            <Compass className="w-4 h-4 opacity-75" />
          )}
        </button>
      </div>

      {/* Subtle Caption */}
      <span className="mt-1 font-mono text-[8px] sm:text-[9px] font-bold text-white/50 uppercase tracking-wider pointer-events-none">
        {isRotated ? "Tap to Reset" : "Rotate 360°"}
      </span>
    </div>
  );
}
