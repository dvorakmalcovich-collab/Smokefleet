import React, { useRef, useEffect, useState } from 'react';
import { ElementTransform, SelectedElementType, SmokeConfig, TextConfig, ErasePath } from '../types';
import { SunglassesSVG, JointSVG } from './AssetsSVG';
import JointSmoke from './JointSmoke';

interface EditableCanvasProps {
  imageSrc: string;
  sunglassesTransform: ElementTransform;
  jointTransform: ElementTransform;
  textTransform: ElementTransform;
  selectedElement: SelectedElementType;
  textConfig: TextConfig;
  smokeConfig: SmokeConfig;
  showTwitterMask: boolean;
  sunglassesErasePaths: ErasePath[];
  jointErasePaths: ErasePath[];
  onUpdateSunglasses: (t: ElementTransform) => void;
  onUpdateJoint: (t: ElementTransform) => void;
  onUpdateText: (t: ElementTransform) => void;
  setSelectedElement: (type: SelectedElementType) => void;
}

// Convert absolute points to SVG path format string
const getSvgPathData = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
};

export default function EditableCanvas({
  imageSrc,
  sunglassesTransform,
  jointTransform,
  textTransform,
  selectedElement,
  textConfig,
  smokeConfig,
  showTwitterMask,
  sunglassesErasePaths,
  jointErasePaths,
  onUpdateSunglasses,
  onUpdateJoint,
  onUpdateText,
  setSelectedElement,
}: EditableCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ offsetX: number; offsetY: number; type: SelectedElementType } | null>(null);
  const [parentSize, setParentSize] = useState({ width: 0, height: 0 });

  // Watch container resize for relative coordinate calculations
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setParentSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent, type: SelectedElementType) => {
    e.stopPropagation();
    setSelectedElement(type);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    const currentTransform =
      type === 'sunglasses'
        ? sunglassesTransform
        : type === 'joint'
        ? jointTransform
        : textTransform;

    const elXInPx = rect.left + (currentTransform.x / 100) * rect.width;
    const elYInPx = rect.top + (currentTransform.y / 100) * rect.height;

    dragStartRef.current = {
      offsetX: clientX - elXInPx,
      offsetY: clientY - elYInPx,
      type,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const { type, offsetX, offsetY } = dragStartRef.current;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    // Relative percentage of canvas
    let newX = ((clientX - offsetX - rect.left) / rect.width) * 100;
    let newY = ((clientY - offsetY - rect.top) / rect.height) * 100;

    newX = Math.max(-20, Math.min(120, newX));
    newY = Math.max(-20, Math.min(120, newY));

    if (type === 'sunglasses') {
      onUpdateSunglasses({ ...sunglassesTransform, x: newX, y: newY });
    } else if (type === 'joint') {
      onUpdateJoint({ ...jointTransform, x: newX, y: newY });
    } else if (type === 'text') {
      onUpdateText({ ...textTransform, x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  // Calculate tip of the joint to place smoke particles dynamically
  const getJointTipOffset = () => {
    if (!parentSize.width || !parentSize.height) return { x: 50, y: 50, angle: 0 };

    // Pixel center
    const cx = (jointTransform.x / 100) * parentSize.width;
    const cy = (jointTransform.y / 100) * parentSize.height;

    // The joint is nominally 31% of the canvas width
    const baseWidth = 0.31 * parentSize.width;
    const currentHalfWidth = (baseWidth * jointTransform.scale) / 2;

    const angleRad = (jointTransform.rotateZ * Math.PI) / 180;
    const pitchRad = (jointTransform.rotateX * Math.PI) / 180;
    const yawRad = (jointTransform.rotateY * Math.PI) / 180;

    // Standard 3D affine projection representation of burning right-end:
    const dx = currentHalfWidth * Math.cos(angleRad) * Math.cos(yawRad);
    const dy = currentHalfWidth * Math.sin(angleRad) * Math.cos(pitchRad);

    return {
      x: cx + dx,
      y: cy + dy,
      angle: jointTransform.rotateZ,
    };
  };

  const jointTip = getJointTipOffset();

  // Pick CSS style for text preset gradients
  const getTextPresetClass = () => {
    switch (textConfig.colorPreset) {
      case 'chrome':
        return 'bg-gradient-to-b from-indigo-200 via-neutral-100 to-indigo-400 bg-clip-text text-transparent filter drop-shadow-[0_4px_12px_rgba(139,92,246,0.8)]';
      case 'solar-flare':
        return 'bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent filter drop-shadow-[0_4px_10px_rgba(239,68,68,0.7)] font-black italic';
      case 'hyper-cyber':
        return 'bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent filter drop-shadow-[0_4px_8px_rgba(34,197,94,0.6)] font-mono uppercase tracking-wider';
      case 'brutalist':
        return 'text-white border-4 border-black stroke-slate-950 font-black tracking-tighter shadow-[4px_4px_0px_#000000]';
      case 'vaporwave':
        return 'bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent filter drop-shadow-[0_4px_10px_rgba(219,39,119,0.7)]';
      default:
        return 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]';
    }
  };

  const currentTextClass = getTextPresetClass();

  // Helper styles for selected state
  const getSelectedBorder = (type: SelectedElementType) => {
    return selectedElement === type
      ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 rounded shadow-lg'
      : 'hover:ring-1 hover:ring-white/30 rounded';
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => setSelectedElement(null)}
      className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden cursor-crosshair border border-slate-800 touch-none shadow-inner group-hover:border-slate-700/60 transition-all"
      id="smokefleet-editable-stage"
    >
      {/* Background Face Image */}
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="Editable Face Photo"
          className="w-full h-full object-cover select-none pointer-events-none"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 font-sans text-center">
          <p className="font-semibold text-lg text-slate-300">No photo uploaded</p>
          <p className="text-xs mt-1 text-slate-500 max-w-xs">
            Drop your selfie or tap a preset to bootstrap your Smokefleet starterkit.
          </p>
        </div>
      )}

      {/* 1. Sunglasses Container */}
      {imageSrc && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'sunglasses')}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 5 : -5;
            onUpdateSunglasses({
              ...sunglassesTransform,
              rotateZ: sunglassesTransform.rotateZ + delta,
            });
          }}
          className={`absolute cursor-grab active:cursor-grabbing select-none transition-shadow z-20 ${getSelectedBorder(
            'sunglasses'
          )}`}
          style={{
            left: `${sunglassesTransform.x}%`,
            top: `${sunglassesTransform.y}%`,
            width: '32%',
            transform: `perspective(800px) translate(-50%, -50%) 
                        rotateY(${sunglassesTransform.rotateY}deg)
                        rotateX(${sunglassesTransform.rotateX}deg) 
                        rotateZ(${sunglassesTransform.rotateZ}deg)
                        scale(${sunglassesTransform.scale})`,
            transformStyle: 'preserve-3d',
            opacity: sunglassesTransform.opacity ?? 1,
          }}
          id="sunglasses-overlay"
          title="Drag to move. Scroll wheel to rotate."
        >
          <svg
            viewBox="0 0 100 24"
            className="w-full h-full select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="sunglasses-interact-mask">
                <rect x="0" y="0" width="100" height="24" fill="white" />
                {sunglassesErasePaths.map((path, idx) => (
                  <path
                    key={idx}
                    d={getSvgPathData(path.points)}
                    stroke="black"
                    strokeWidth={path.brushSize}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
              </mask>
            </defs>
            <g mask="url(#sunglasses-interact-mask)">
              <SunglassesSVG />
            </g>
          </svg>
        </div>
      )}

      {/* 2. Joint Container */}
      {imageSrc && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'joint')}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 5 : -5;
            onUpdateJoint({
              ...jointTransform,
              rotateZ: jointTransform.rotateZ + delta,
            });
          }}
          className={`absolute cursor-grab active:cursor-grabbing select-none transition-shadow z-20 ${getSelectedBorder(
            'joint'
          )}`}
          style={{
            left: `${jointTransform.x}%`,
            top: `${jointTransform.y}%`,
            width: '31%',
            transform: `perspective(800px) translate(-50%, -50%) 
                        rotateY(${jointTransform.rotateY}deg)
                        rotateX(${jointTransform.rotateX}deg) 
                        rotateZ(${jointTransform.rotateZ}deg)
                        scale(${jointTransform.scale})`,
            transformStyle: 'preserve-3d',
            opacity: jointTransform.opacity ?? 1,
          }}
          id="joint-overlay"
          title="Drag to move. Scroll wheel to rotate."
        >
          <svg
            viewBox="0 0 140 30"
            className="w-full h-full select-none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="joint-interact-mask">
                <rect x="0" y="0" width="140" height="30" fill="white" />
                {jointErasePaths.map((path, idx) => (
                  <path
                    key={idx}
                    d={getSvgPathData(path.points)}
                    stroke="black"
                    strokeWidth={path.brushSize}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                ))}
              </mask>
            </defs>
            <g mask="url(#joint-interact-mask)">
              <JointSVG />
            </g>
          </svg>
        </div>
      )}

      {/* Interactive Floating Joint Smoke (Centered on tip) */}
      {imageSrc && (
        <div
          className="absolute pointer-events-none z-30"
          style={{
            left: `${jointTip.x}px`,
            top: `${jointTip.y}px`,
            width: '180px',
            height: '180px',
            transform: 'translate(-50%, -85%)', // Positions the canvas so puff floats upward from tip
          }}
          id="live-joint-smoke-holder"
        >
          <JointSmoke
            color={smokeConfig.color}
            intensity={smokeConfig.intensity}
            active={smokeConfig.intensity > 0}
            angle={jointTransform.rotateZ}
          />
        </div>
      )}

      {/* 3. Text Overlay Element */}
      {imageSrc && textConfig.content && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'text')}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY > 0 ? 5 : -5;
            onUpdateText({
              ...textTransform,
              rotateZ: textTransform.rotateZ + delta,
            });
          }}
          className={`absolute cursor-grab active:cursor-grabbing select-none z-20 text-center ${getSelectedBorder(
            'text'
          )}`}
          style={{
            left: `${textTransform.x}%`,
            top: `${textTransform.y}%`,
            transform: `perspective(800px) translate(-50%, -50%) 
                        rotateY(${textTransform.rotateY}deg)
                        rotateX(${textTransform.rotateX}deg) 
                        rotateZ(${textTransform.rotateZ}deg)
                        scale(${textTransform.scale})`,
            transformStyle: 'preserve-3d',
            fontFamily: textConfig.fontFamily,
            letterSpacing: `${textConfig.letterSpacing}px`,
            opacity: textTransform.opacity ?? 1,
          }}
          id="hashtag-overlay"
          title="Drag to move. Scroll wheel to rotate."
        >
          <span
            className={`block whitespace-nowrap font-bold select-none ${currentTextClass}`}
            style={{
              fontSize: `${0.095 * (parentSize.width || 400) * textTransform.scale}px`,
              lineHeight: 1.1,
              textShadow: textConfig.glowColor
                ? `0px 0px ${8 * textTransform.scale}px ${textConfig.glowColor}, 0 ${2 * textTransform.scale}px ${4 * textTransform.scale}px rgba(0,0,0,1)`
                : 'none',
              // Handle brutalist outline styling separately if requested
              WebkitTextStroke: textConfig.colorPreset === 'brutalist' ? `${2 * textTransform.scale}px #000000` : 'none',
            }}
          >
            {textConfig.content}
          </span>
        </div>
      )}

      {/* Twitter Mask Frame Circle Overlay */}
      {showTwitterMask && (
        <div
          className="absolute inset-0 pointer-events-none z-45 flex items-center justify-center bg-slate-950/40"
          id="twitter-mask-stencil"
        >
          {/* Border circle representation */}
          <div className="w-full h-full rounded-full border-[8px] border-solid border-slate-950/90 box-content -mx-[8px] -my-[8px] shadow-[0_0_0_9999px_rgba(2,6,23,0.85)] flex items-center justify-center">
            {/* Safe zone boundary */}
            <div className="w-full h-full rounded-full border border-dashed border-emerald-400/45 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Overlay Element Badge Informer inside Canvas */}
      {selectedElement && (
        <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded text-[10px] select-none pointer-events-none flex items-center gap-1.5 z-40 capitalize animate-pulse">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Adjusting {selectedElement}
        </div>
      )}
    </div>
  );
}
