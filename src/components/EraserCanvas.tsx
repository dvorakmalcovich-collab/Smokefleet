import React, { useRef, useEffect, useState } from 'react';
import { ErasePath, ErasePoint } from '../types';
import { Highlighter, Undo2, Ban } from 'lucide-react';
import { getSunglassesSVGMarkup, getJointSVGMarkup } from '../utils/svgMarkup';

interface EraserCanvasProps {
  elementType: 'sunglasses' | 'joint';
  erasePaths: ErasePath[];
  onChangeErasePaths: (paths: ErasePath[]) => void;
  brushSize: number;
  sunglassesStyle: 'classic' | 'aviator' | 'goggles' | 'visor' | 'stacked';
  jointStyle: 'classic' | 'cigar' | 'cone' | 'photo';
}

export default function EraserCanvas({
  elementType,
  erasePaths,
  onChangeErasePaths,
  brushSize,
  sunglassesStyle,
  jointStyle,
}: EraserCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPathRef = useRef<ErasePoint[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(300);

  // Bounding dimensions matching original SVG viewBox
  const viewBoxW = elementType === 'sunglasses' ? 100 : 140;
  const viewBoxH = elementType === 'sunglasses' ? 24 : 30;

  // Render loop to draw elements and erased masks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw checkboard backdrop
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gridSz = 6;
    for (let x = 0; x < canvas.width; x += gridSz) {
      for (let y = 0; y < canvas.height; y += gridSz) {
        ctx.fillStyle = ((x / gridSz) + (y / gridSz)) % 2 === 0 ? '#1e293b' : '#0f172a';
        ctx.fillRect(x, y, gridSz, gridSz);
      }
    }

    // Set scales so SVG content fits perfectly
    const scale = canvas.width / viewBoxW;

    // Offscreen rendering of asset so we can composite it correctly
    const renderScale = 4;
    const offscreen = document.createElement('canvas');
    offscreen.width = viewBoxW * renderScale;
    offscreen.height = viewBoxH * renderScale;
    const oCtx = offscreen.getContext('2d');

    if (!oCtx) return;

    // Reconstruct SVG inline markup
    let svgMarkup = '';
    if (elementType === 'sunglasses') {
      svgMarkup = getSunglassesSVGMarkup(sunglassesStyle);
    } else {
      svgMarkup = getJointSVGMarkup(jointStyle);
    }

    const img = new Image();
    img.onload = () => {
      oCtx.drawImage(img, 0, 0, offscreen.width, offscreen.height);

      // Perform local erasures on the flat element
      oCtx.save();
      oCtx.scale(renderScale, renderScale);
      oCtx.globalCompositeOperation = 'destination-out';

      for (const path of erasePaths) {
        if (path.points.length === 0) continue;
        oCtx.beginPath();
        oCtx.lineWidth = path.brushSize;
        oCtx.lineCap = 'round';
        oCtx.lineJoin = 'round';
        oCtx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          oCtx.lineTo(path.points[i].x, path.points[i].y);
        }
        oCtx.stroke();
      }
      oCtx.restore();

      // Finally, paint masked offscreen buffer to active visible canvas
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgMarkup)));
  }, [elementType, erasePaths, viewBoxW, viewBoxH, sunglassesStyle, jointStyle]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * viewBoxW;
    const localY = ((e.clientY - rect.top) / rect.height) * viewBoxH;

    setIsDrawing(true);
    currentPathRef.current = [{ x: localX, y: localY }];

    // Instantly append a fresh path to render
    const newPath: ErasePath = {
      points: [{ x: localX, y: localY }],
      brushSize,
    };
    onChangeErasePaths([...erasePaths, newPath]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setCanvasWidth(rect.width);
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    if (!isDrawing) return;

    const localX = ((e.clientX - rect.left) / rect.width) * viewBoxW;
    const localY = ((e.clientY - rect.top) / rect.height) * viewBoxH;

    currentPathRef.current.push({ x: localX, y: localY });

    // Mutate the last active path
    const updatedPaths = [...erasePaths];
    const lastIdx = updatedPaths.length - 1;
    if (lastIdx >= 0) {
      updatedPaths[lastIdx] = {
        ...updatedPaths[lastIdx],
        points: [...currentPathRef.current],
      };
      onChangeErasePaths(updatedPaths);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
    currentPathRef.current = [];
  };

  const handleUndoLocal = () => {
    if (erasePaths.length > 0) {
      onChangeErasePaths(erasePaths.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    onChangeErasePaths([]);
  };

  return (
    <div className="flex flex-col gap-3 bg-slate-950/80 border border-slate-850 p-3 rounded-xl">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
          <Highlighter className="w-3.5 h-3.5 text-emerald-400" />
          Eraser Workspace
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndoLocal}
            disabled={erasePaths.length === 0}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            title="Undo eraser stroke"
          >
            <Undo2 className="w-3 h-3" />
            Undo Stroke
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={erasePaths.length === 0}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-950/40 border border-red-900/40 text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            title="Restore element completely"
          >
            <Ban className="w-3 h-3" />
            Clear Mask
          </button>
        </div>
      </div>

      <div className="relative border border-slate-800 rounded bg-slate-950 overflow-hidden select-none cursor-cell max-w-full">
        {/* Custom Checkerboard Interactive Brush Area */}
        <canvas
          ref={canvasRef}
          width={elementType === 'sunglasses' ? 300 : 300}
          height={elementType === 'sunglasses' ? 72 : 64}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => setMousePos(null)}
          className="w-full h-auto block touch-none"
        />
        {mousePos && (
          <div
            className="absolute rounded-full border border-emerald-400 bg-emerald-450/15 pointer-events-none -translate-x-1/2 -translate-y-1/2 hidden md:block"
            style={{
              left: `${mousePos.x}px`,
              top: `${mousePos.y}px`,
              width: `${brushSize * (canvasWidth / viewBoxW)}px`,
              height: `${brushSize * (canvasWidth / viewBoxW)}px`,
            }}
          />
        )}
      </div>
    </div>
  );
}
