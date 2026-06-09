import React, { useRef, useEffect, useState } from 'react';
import { ElementTransform, SelectedElementType, SmokeConfig, TextConfig, ErasePath } from '../types';
import { SunglassesSVG, JointSVG } from './AssetsSVG';
import JointSmoke from './JointSmoke';

const hexToRgba = (colorStr: string, alpha: number): string => {
  if (!colorStr) return 'transparent';
  if (colorStr.startsWith('rgba')) {
    return colorStr.replace(/[\d\.]+\)$/, `${alpha})`);
  }
  if (colorStr.startsWith('rgb')) {
    return colorStr.replace('rgb', 'rgba').replace(/\)$/, `, ${alpha})`);
  }
  if (colorStr.startsWith('#')) {
    const hex = colorStr.trim();
    if (hex.length === 4) {
      const r = parseInt(hex[1] + hex[1], 16);
      const g = parseInt(hex[2] + hex[2], 16);
      const b = parseInt(hex[3] + hex[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (hex.length === 7) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return colorStr;
};

interface EditableCanvasProps {
  imageSrc: string;
  imageTransform: ElementTransform;
  sunglassesTransform: ElementTransform;
  jointTransform: ElementTransform;
  textTransform: ElementTransform;
  selectedElement: SelectedElementType;
  textConfig: TextConfig;
  smokeConfig: SmokeConfig;
  showTwitterMask: boolean;
  sunglassesErasePaths: ErasePath[];
  jointErasePaths: ErasePath[];
  onUpdateImage: (t: ElementTransform) => void;
  onUpdateSunglasses: (t: ElementTransform) => void;
  onUpdateJoint: (t: ElementTransform) => void;
  onUpdateText: (t: ElementTransform) => void;
  setSelectedElement: (type: SelectedElementType) => void;
  isMirrored?: boolean;
  sunglassesStyle?: 'classic' | 'aviator' | 'goggles' | 'visor' | 'stacked';
  jointStyle?: 'classic' | 'cigar' | 'cone' | 'photo';
  activeStep?: 'photo' | 'customize' | 'download';
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
  imageTransform,
  sunglassesTransform,
  jointTransform,
  textTransform,
  selectedElement,
  textConfig,
  smokeConfig,
  showTwitterMask,
  sunglassesErasePaths,
  jointErasePaths,
  onUpdateImage,
  onUpdateSunglasses,
  onUpdateJoint,
  onUpdateText,
  setSelectedElement,
  isMirrored,
  sunglassesStyle = 'classic',
  jointStyle = 'classic',
  activeStep = 'photo',
}: EditableCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    offsetX: number;
    offsetY: number;
    type: SelectedElementType;
    mode: 'move' | 'scale' | 'rotate';
    startX: number;
    startY: number;
    startScale: number;
    startRotate: number;
    startDist: number;
    startAngle: number;
  } | null>(null);
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
        : type === 'text'
        ? textTransform
        : imageTransform;

    const elXInPx = rect.left + (currentTransform.x / 100) * rect.width;
    const elYInPx = rect.top + (currentTransform.y / 100) * rect.height;

    dragStartRef.current = {
      offsetX: clientX - elXInPx,
      offsetY: clientY - elYInPx,
      type,
      mode: 'move',
      startX: clientX,
      startY: clientY,
      startScale: currentTransform.scale,
      startRotate: currentTransform.rotateZ,
      startDist: 1,
      startAngle: 0,
    };
  };

  const handleStartTransform = (e: React.PointerEvent, type: SelectedElementType, mode: 'scale' | 'rotate') => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElement(type);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentTransform =
      type === 'sunglasses'
        ? sunglassesTransform
        : type === 'joint'
        ? jointTransform
        : type === 'text'
        ? textTransform
        : imageTransform;

    const cx = rect.left + (currentTransform.x / 100) * rect.width;
    const cy = rect.top + (currentTransform.y / 100) * rect.height;

    const startDist = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));
    const startAngleRad = Math.atan2(e.clientY - cy, e.clientX - cx);
    const startAngleDeg = (startAngleRad * 180) / Math.PI;

    dragStartRef.current = {
      offsetX: 0,
      offsetY: 0,
      type,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startScale: currentTransform.scale,
      startRotate: currentTransform.rotateZ,
      startDist: startDist > 0 ? startDist : 1,
      startAngle: startAngleDeg,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const { type, mode, offsetX, offsetY, startScale, startRotate, startDist, startAngle } = dragStartRef.current;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    const currentTransform =
      type === 'sunglasses'
        ? sunglassesTransform
        : type === 'joint'
        ? jointTransform
        : type === 'text'
        ? textTransform
        : imageTransform;

    const onUpdate =
      type === 'sunglasses'
        ? onUpdateSunglasses
        : type === 'joint'
        ? onUpdateJoint
        : type === 'text'
        ? onUpdateText
        : onUpdateImage;

    if (mode === 'move') {
      // Relative percentage of canvas
      let newX = ((clientX - offsetX - rect.left) / rect.width) * 100;
      let newY = ((clientY - offsetY - rect.top) / rect.height) * 100;

      newX = Math.max(-100, Math.min(200, newX));
      newY = Math.max(-100, Math.min(200, newY));

      onUpdate({ ...currentTransform, x: newX, y: newY });
    } else if (mode === 'scale') {
      // Scale based on distance ratio from center
      const cx = rect.left + (currentTransform.x / 100) * rect.width;
      const cy = rect.top + (currentTransform.y / 100) * rect.height;
      const dist = Math.sqrt(Math.pow(clientX - cx, 2) + Math.pow(clientY - cy, 2));
      
      let newScale = startScale * (dist / startDist);
      newScale = Math.max(0.15, Math.min(4.5, newScale));

      onUpdate({ ...currentTransform, scale: newScale });
    } else if (mode === 'rotate') {
      // Rotate based on angle difference around center
      const cx = rect.left + (currentTransform.x / 100) * rect.width;
      const cy = rect.top + (currentTransform.y / 100) * rect.height;
      
      const angleRad = Math.atan2(clientY - cy, clientX - cx);
      const angleDeg = (angleRad * 180) / Math.PI;

      let deltaAngle = angleDeg - startAngle;
      
      // Normalize angle difference to avoid wrap-around jumps
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;

      const newRotate = (startRotate + deltaAngle) % 360;

      onUpdate({ ...currentTransform, rotateZ: newRotate });
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

  const getTextPresetClass = () => {
    switch (textConfig.colorPreset) {
      case 'chrome':
        return 'bg-gradient-to-b from-indigo-200 via-neutral-100 to-indigo-400 bg-clip-text text-transparent';
      case 'solar-flare':
        return 'bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 bg-clip-text text-transparent font-black italic';
      case 'hyper-cyber':
        return 'bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent uppercase tracking-wider';
      case 'brutalist':
        return 'text-white stroke-slate-950 font-black tracking-tighter';
      case 'vaporwave':
        return 'bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent';
      case 'maga-tears':
        return 'bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent font-black italic uppercase tracking-wider';
      default:
        return 'text-white';
    }
  };

  const getTextFilterStyle = () => {
    const scale = textTransform.scale;
    const shadowOpacity = textConfig.shadowOpacity ?? 0.3;
    const hasShadow = textConfig.dropShadow !== false;
    
    let glowFilter = '';
    
    switch (textConfig.colorPreset) {
      case 'chrome':
        glowFilter = `drop-shadow(0px 0px ${6 * scale}px rgba(139, 92, 246, 0.85))`;
        break;
      case 'solar-flare':
        glowFilter = `drop-shadow(0px 0px ${5 * scale}px rgba(239, 68, 68, 0.85))`;
        break;
      case 'hyper-cyber':
        glowFilter = `drop-shadow(0px 0px ${4 * scale}px rgba(34, 197, 94, 0.85))`;
        break;
      case 'vaporwave':
        glowFilter = `drop-shadow(0px 0px ${5 * scale}px rgba(219, 39, 119, 0.85))`;
        break;
      case 'maga-tears':
        glowFilter = `drop-shadow(0px 0px ${5 * scale}px rgba(6, 182, 212, 0.85))`;
        break;
      case 'brutalist':
        glowFilter = '';
        break;
      default:
        if (textConfig.glowColor) {
          glowFilter = `drop-shadow(0px 0px ${6 * scale}px ${hexToRgba(textConfig.glowColor, 0.85)})`;
        }
        break;
    }

    const blackShadowFilter = hasShadow
      ? `drop-shadow(0px ${2 * scale}px ${1.5 * scale}px rgba(0, 0, 0, ${shadowOpacity}))`
      : '';

    return [glowFilter, blackShadowFilter].filter(Boolean).join(' ');
  };

  const getTextShadowStyle = () => {
    return 'none';
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
      onClick={() => {
        if (activeStep === 'photo') {
          setSelectedElement('background');
        }
      }}
      className="relative w-full aspect-square bg-slate-900 rounded-2xl overflow-hidden cursor-crosshair border border-slate-800 touch-none shadow-inner group-hover:border-slate-700/60 transition-all"
      id="smokefleet-editable-stage"
    >
      {/* Background Face Image Box */}
      {imageSrc ? (
        <div
          onPointerDown={(e) => {
            if (activeStep === 'photo') {
              handlePointerDown(e, 'background');
            }
          }}
          className={`w-full h-full select-none absolute inset-0 overflow-hidden ${
            activeStep === 'photo' ? 'cursor-move' : ''
          } ${
            selectedElement === 'background' && activeStep === 'photo' ? 'ring-2 ring-indigo-500/50' : ''
          }`}
          id="background-canvas-box"
        >
          <img
            src={imageSrc}
            alt="Editable Face Photo"
            className="w-full h-full object-cover select-none pointer-events-none"
            style={{
              transform: `translate(${imageTransform.x - 50}%, ${imageTransform.y - 50}%) scale(${imageTransform.scale}) ${isMirrored ? 'scaleX(-1)' : ''}`,
              transformOrigin: 'center center',
            }}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div
          onClick={(e) => { e.stopPropagation(); setSelectedElement('background'); }}
          className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-4 font-sans text-center bg-slate-900"
        >
          <p className="font-semibold text-sm text-slate-300">No profile photo uploaded yet</p>
          <p className="text-[11px] mt-1 text-slate-500 max-w-xs leading-normal">
            Upload your picture or drag it below to build your original pilot avatar.
          </p>
        </div>
      )}

      {/* 1. Sunglasses Container */}
      {imageSrc && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'sunglasses')}
          onClick={(e) => e.stopPropagation()}
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
          title="Drag to move. Drag corners to scale. Drag top node to rotate."
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
              <SunglassesSVG variant={sunglassesStyle} />
            </g>
          </svg>

          {/* Interactive Bounding Box & Transform Handles (Photoshop style) */}
          {selectedElement === 'sunglasses' && (
            <>
              {/* Bounding box outline */}
              <div className="absolute -inset-2 border border-dashed border-emerald-400 pointer-events-none rounded z-50" />

              {/* Center rotation line extension */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-emerald-400/80 pointer-events-none z-50" />

              {/* Rotator Handle dial at top */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'sunglasses', 'rotate')}
                className="w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full absolute -top-7.5 left-1/2 -translate-x-1/2 cursor-alias z-55 pointer-events-auto shadow-md hover:bg-white active:scale-125 transition-all flex items-center justify-center"
                title="Drag to rotate"
              >
                <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
              </div>

              {/* Corner Scale Coordinates Handle (Top Left) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'sunglasses', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -top-3.5 -left-3.5 cursor-nwse-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Top Right) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'sunglasses', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -top-3.5 -right-3.5 cursor-nesw-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Bottom Left) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'sunglasses', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -bottom-3.5 -left-3.5 cursor-nesw-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Bottom Right) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'sunglasses', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -bottom-3.5 -right-3.5 cursor-nwse-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
            </>
          )}
        </div>
      )}

      {/* 2. Joint Container */}
      {imageSrc && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'joint')}
          onClick={(e) => e.stopPropagation()}
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
          title="Drag to move. Drag corners to scale. Drag top node to rotate."
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
              <JointSVG variant={jointStyle} />
            </g>
          </svg>

          {/* Interactive Bounding Box & Transform Handles (Photoshop style) */}
          {selectedElement === 'joint' && (
            <>
              {/* Bounding box outline */}
              <div className="absolute -inset-2 border border-dashed border-emerald-400 pointer-events-none rounded z-50" />

              {/* Center rotation line extension */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-emerald-400/80 pointer-events-none z-50" />

              {/* Rotator Handle dial at top */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'joint', 'rotate')}
                className="w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full absolute -top-7.5 left-1/2 -translate-x-1/2 cursor-alias z-55 pointer-events-auto shadow-md hover:bg-white active:scale-125 transition-all flex items-center justify-center"
                title="Drag to rotate"
              >
                <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
              </div>

              {/* Corner Scale Coordinates Handle (Top Left) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'joint', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -top-3.5 -left-3.5 cursor-nwse-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Top Right) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'joint', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -top-3.5 -right-3.5 cursor-nesw-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Bottom Left) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'joint', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -bottom-3.5 -left-3.5 cursor-nesw-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Bottom Right) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'joint', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -bottom-3.5 -right-3.5 cursor-nwse-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
            </>
          )}
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
            type={smokeConfig.type}
          />
        </div>
      )}

      {/* 3. Text Overlay Element */}
      {imageSrc && textConfig.content && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'text')}
          onClick={(e) => e.stopPropagation()}
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
          title="Drag to move. Drag corners to scale. Drag top node to rotate."
        >
          <span
            className={`block whitespace-nowrap font-bold select-none ${currentTextClass}`}
            style={{
              fontSize: `${0.095 * (parentSize.width || 400) * textTransform.scale}px`,
              lineHeight: 1.1,
              textShadow: getTextShadowStyle(),
              filter: getTextFilterStyle(),
              // Handle brutalist outline styling separately if requested
              WebkitTextStroke: textConfig.colorPreset === 'brutalist' ? `${2 * textTransform.scale}px #000000` : '0px transparent',
              padding: textConfig.colorPreset === 'brutalist' ? '0.25em 0.8em' : undefined,
              border: textConfig.colorPreset === 'brutalist' ? '0.1em solid #000000' : undefined,
              backgroundColor: textConfig.colorPreset === 'brutalist' ? 'rgba(0, 0, 0, 0.3)' : undefined,
              boxShadow: textConfig.colorPreset === 'brutalist' && textConfig.dropShadow !== false
                ? `0.1em 0.1em 0px rgba(0, 0, 0, ${textConfig.shadowOpacity ?? 0.3})`
                : undefined,
            }}
          >
            {textConfig.content}
          </span>

          {/* Interactive Bounding Box & Transform Handles (Photoshop style) */}
          {selectedElement === 'text' && (
            <>
              {/* Bounding box outline */}
              <div className="absolute -inset-2 border border-dashed border-emerald-400 pointer-events-none rounded z-50" />

              {/* Center rotation line extension */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-emerald-400/80 pointer-events-none z-50" />

              {/* Rotator Handle dial at top */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'text', 'rotate')}
                className="w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full absolute -top-7.5 left-1/2 -translate-x-1/2 cursor-alias z-55 pointer-events-auto shadow-md hover:bg-white active:scale-125 transition-all flex items-center justify-center"
                title="Drag to rotate"
              >
                <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
              </div>

              {/* Corner Scale Coordinates Handle (Top Left) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'text', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -top-3.5 -left-3.5 cursor-nwse-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Top Right) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'text', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -top-3.5 -right-3.5 cursor-nesw-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Bottom Left) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'text', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -bottom-3.5 -left-3.5 cursor-nesw-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
              {/* Corner Scale Coordinates Handle (Bottom Right) */}
              <div
                onPointerDown={(e) => handleStartTransform(e, 'text', 'scale')}
                className="w-3 h-3 bg-white border border-emerald-500 rounded-full absolute -bottom-3.5 -right-3.5 cursor-nwse-resize z-55 pointer-events-auto shadow hover:bg-emerald-100 active:scale-125 transition-transform"
                title="Drag to resize"
              />
            </>
          )}
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
