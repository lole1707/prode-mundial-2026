"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CARD_W, CARD_H, SIL_CX, SIL_CY, SIL_RX, SIL_RY, PhotoTransform, getProcessedTemplate } from "@/lib/buildCard";

interface Props {
  photoSrc: string;
  onConfirm: (transform: PhotoTransform) => void;
  onCancel: () => void;
}

export default function PhotoPositioner({ photoSrc, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayW, setDisplayW] = useState(320);

  // Photo state in display pixels
  const [px, setPx] = useState(0);
  const [py, setPy] = useState(0);
  const [scale, setScale] = useState(1);  // display scale multiplier

  const [natW, setNatW] = useState(1);
  const [natH, setNatH] = useState(1);
  const [ready, setReady] = useState(false);
  const [processedTpl, setProcessedTpl] = useState<string | null>(null);

  const displayH = displayW * (CARD_H / CARD_W);

  // Silhouette ellipse in display coords
  const scx = displayW * SIL_CX;
  const scy = displayH * SIL_CY;
  const srx = displayW * SIL_RX;
  const sry = displayH * SIL_RY;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = Math.min(el.clientWidth, 380);
    setDisplayW(w);
    // Preload processed template (dark pixels removed)
    getProcessedTemplate().then(setProcessedTpl).catch(() => {});
  }, []);

  // Load photo and init: fill silhouette bounding box, top-aligned
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNatW(img.naturalWidth);
      setNatH(img.naturalHeight);
      const bw = srx * 2;
      const bh = sry * 2;
      const initScale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
      const pw = img.naturalWidth * initScale;
      const ph = img.naturalHeight * initScale;
      setScale(initScale);
      // Center horizontally, top of ellipse vertically
      setPx(scx - srx + (bw - pw) / 2);
      setPy(scy - sry);
      setReady(true);
    };
    img.src = photoSrc;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoSrc, scx, scy, srx, sry]);

  const photoW = natW * scale;
  const photoH = natH * scale;

  // Drag
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, []);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPx(p => p + (e.clientX - lastMouse.current.x));
    setPy(p => p + (e.clientY - lastMouse.current.y));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);
  const stopDrag = useCallback(() => { dragging.current = false; }, []);

  // Touch: drag + pinch
  const lastTouch = useRef<{ x: number; y: number; dist: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: 0 };
    } else {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      lastTouch.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        dist: Math.sqrt(dx*dx + dy*dy),
      };
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!lastTouch.current) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      setPx(p => p + dx);
      setPy(p => p + dy);
      lastTouch.current = { ...lastTouch.current, x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && lastTouch.current.dist > 0) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.sqrt(dx*dx + dy*dy);
      const ratio = newDist / lastTouch.current.dist;
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      // Scale around pinch midpoint
      setScale(s => Math.max(0.05, s * ratio));
      setPx(p => midX + (p - midX) * ratio);
      setPy(p => midY + (p - midY) * ratio);
      lastTouch.current = { x: midX, y: midY, dist: newDist };
    }
  }, []);

  // Wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.93 : 1.07;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setScale(s => Math.max(0.05, s * factor));
    setPx(p => mx + (p - mx) * factor);
    setPy(p => my + (p - my) * factor);
  }, []);

  // Slider: scale around silhouette center
  function handleSlider(newScale: number) {
    const ratio = newScale / scale;
    setScale(newScale);
    setPx(p => scx + (p - scx) * ratio);
    setPy(p => scy + (p - scy) * ratio);
  }

  function handleConfirm() {
    const factor = CARD_W / displayW;
    onConfirm({ x: px * factor, y: py * factor, w: photoW * factor, h: photoH * factor });
  }

  // Slider value: map scale to a 0-100 range logarithmically
  const sliderVal = Math.round(Math.log(scale / 0.05) / Math.log(20 / 0.05) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ touchAction: "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button onClick={onCancel} className="text-gray-400 hover:text-white text-sm px-2 py-1">Cancelar</button>
        <p className="text-sm font-semibold text-white">Ajustá tu foto</p>
        <button onClick={handleConfirm} className="text-sm font-bold text-green-400 hover:text-green-300 px-2 py-1">Listo ✓</button>
      </div>

      <p className="text-center text-xs text-gray-500 py-2 flex-shrink-0">
        Arrastrá para mover · Pinzá o usá el slider para agrandar/achicar
      </p>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-3">
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-xl shadow-2xl"
          style={{ width: "100%", maxWidth: 380, aspectRatio: `${CARD_W}/${CARD_H}`, cursor: "grab" }}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onWheel={onWheel}
        >
          {/* Photo — behind template */}
          {ready && (
            <img
              src={photoSrc}
              alt="foto"
              draggable={false}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => { lastTouch.current = null; }}
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: photoW,
                height: photoH,
                touchAction: "none",
                userSelect: "none",
                pointerEvents: "all",
                cursor: "grab",
                zIndex: 2,
              }}
            />
          )}

          {/* White background so photo is visible before template loads */}
          <div className="absolute inset-0 bg-white" style={{ zIndex: 0 }} />

          {/* Processed template on top: silhouette + dark areas = transparent holes.
              Photo (z:2) shows through those holes. Card design (teal, logos) stays on top. */}
          {processedTpl ? (
            <img
              src={processedTpl}
              alt=""
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              style={{ zIndex: 3 }}
            />
          ) : (
            <img
              src="/card-template.jpg"
              alt=""
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              style={{ zIndex: 3, opacity: 0.5 }}
            />
          )}

          {/* Dashed guide showing silhouette ellipse boundary */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: "100%", height: "100%", zIndex: 4 }}
            viewBox={`0 0 ${displayW} ${displayH}`}
          >
            <ellipse cx={scx} cy={scy} rx={srx} ry={sry}
              fill="none" stroke="rgba(74,222,128,0.6)" strokeWidth="1.5" strokeDasharray="8 5" />
          </svg>
        </div>
      </div>

      {/* Scale slider */}
      <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="text-lg text-gray-400 w-6 text-center">−</span>
          <input
            type="range"
            min={0} max={100}
            value={sliderVal}
            onChange={e => {
              const v = parseInt(e.target.value);
              const newScale = 0.05 * Math.pow(20 / 0.05, v / 100);
              handleSlider(newScale);
            }}
            className="flex-1 accent-green-500 h-2 cursor-pointer"
          />
          <span className="text-lg text-gray-400 w-6 text-center">+</span>
        </div>
        <p className="text-center text-xs text-gray-600 mt-1">{Math.round(scale * 100 / (1 / displayW * CARD_W))}% del tamaño real</p>
      </div>
    </div>
  );
}
