"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CARD_W, CARD_H, FACE_CX, FACE_CY, FACE_R, PhotoTransform } from "@/lib/buildCard";

interface Props {
  photoSrc: string;
  onConfirm: (transform: PhotoTransform) => void;
  onCancel: () => void;
}

export default function PhotoPositioner({ photoSrc, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayW, setDisplayW] = useState(320);

  // Photo position in display pixels (top-left corner of photo)
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  const [pScale, setPScale] = useState(1); // photo display scale

  const [photoNatW, setPhotoNatW] = useState(1);
  const [photoNatH, setPhotoNatH] = useState(1);
  const [ready, setReady] = useState(false);

  const displayH = displayW * (CARD_H / CARD_W);

  // Face circle in display coords
  const fcx = displayW * FACE_CX;
  const fcy = displayH * FACE_CY;
  const fr  = displayW * FACE_R;

  useEffect(() => {
    const el = containerRef.current;
    if (el) setDisplayW(el.clientWidth);
  }, []);

  // Load photo and init position so it fills the face circle
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setPhotoNatW(img.naturalWidth);
      setPhotoNatH(img.naturalHeight);
      // Fill face circle width
      const initW = fr * 2;
      const initScale = initW / img.naturalWidth;
      const initH = img.naturalHeight * initScale;
      setPScale(initScale);
      // Center on face circle
      setPx(fcx - fr);
      setPy(fcy - fr);
      setReady(true);
    };
    img.src = photoSrc;
  }, [photoSrc, fcx, fcy, fr]);

  const photoW = photoNatW * pScale;
  const photoH = photoNatH * pScale;

  // Drag
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPx(p => p + dx);
    setPy(p => p + dy);
  }, []);

  const onMouseUp = useCallback(() => { dragging.current = false; }, []);

  // Touch drag + pinch
  const lastTouches = useRef<{ x: number; y: number; dist: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      lastTouches.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    } else if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      lastTouches.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx*dx + dy*dy),
      };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!lastTouches.current) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouches.current.x;
      const dy = e.touches[0].clientY - lastTouches.current.y;
      lastTouches.current = { ...lastTouches.current, x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPx(p => p + dx);
      setPy(p => p + dy);
    } else if (e.touches.length === 2 && lastTouches.current.dist > 0) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.sqrt(dx*dx + dy*dy);
      const ratio = newDist / lastTouches.current.dist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      // Scale around midpoint
      setPScale(s => Math.max(0.1, Math.min(s * ratio, 10)));
      setPx(p => midX + (p - midX) * ratio);
      setPy(p => midY + (p - midY) * ratio);
      lastTouches.current = { x: midX, y: midY, dist: newDist };
    }
  }, []);

  // Wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setPScale(s => Math.max(0.1, Math.min(s * delta, 10)));
    setPx(p => mx + (p - mx) * delta);
    setPy(p => my + (p - my) * delta);
  }, []);

  function zoom(factor: number) {
    setPScale(s => Math.max(0.1, Math.min(s * factor, 10)));
    setPx(p => fcx + (p - fcx) * factor);
    setPy(p => fcy + (p - fcy) * factor);
  }

  function handleConfirm() {
    // Convert display coords → canvas coords
    const scale = CARD_W / displayW;
    const transform: PhotoTransform = {
      x: px * scale,
      y: py * scale,
      w: photoW * scale,
      h: photoH * scale,
    };
    onConfirm(transform);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onCancel} className="text-gray-400 hover:text-white text-sm">Cancelar</button>
        <p className="text-sm font-semibold text-white">Posicioná tu foto</p>
        <button onClick={handleConfirm} className="text-sm font-bold text-green-400 hover:text-green-300">Listo ✓</button>
      </div>

      <p className="text-center text-xs text-gray-500 py-2 flex-shrink-0">Arrastrá y pinzá para ajustar la foto sobre la cara</p>

      {/* Card + photo overlay */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-2">
        <div
          ref={containerRef}
          className="relative select-none"
          style={{ width: "100%", maxWidth: 360, aspectRatio: `${CARD_W}/${CARD_H}` }}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          {/* Card template */}
          <img src="/card-template.jpg" alt="template" className="w-full h-full object-fill pointer-events-none rounded-xl" />

          {/* Draggable photo */}
          {ready && (
            <img
              src={photoSrc}
              alt="foto"
              draggable={false}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => { lastTouches.current = null; }}
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: photoW,
                height: photoH,
                cursor: "grab",
                touchAction: "none",
                userSelect: "none",
                opacity: 0.85,
              }}
            />
          )}

          {/* Face circle guide overlay */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: displayW, height: displayH }}
          >
            {/* Dark mask with circle cutout */}
            <defs>
              <mask id="facemask">
                <rect width="100%" height="100%" fill="white" />
                <circle cx={fcx} cy={fcy} r={fr} fill="black" />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#facemask)" />
            <circle cx={fcx} cy={fcy} r={fr} fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="6 4" />
          </svg>
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-4 py-4 flex-shrink-0 bg-gray-900 border-t border-gray-800">
        <button onClick={() => zoom(0.85)} className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-2xl flex items-center justify-center transition-colors">−</button>
        <span className="text-sm text-gray-400 w-16 text-center">{Math.round(pScale * 100)}%</span>
        <button onClick={() => zoom(1.15)} className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 text-white text-2xl flex items-center justify-center transition-colors">+</button>
      </div>
    </div>
  );
}
