import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Download,
  RefreshCw,
  Sparkles,
  Layers,
  Twitter,
  Image as ImageIcon,
  Check,
  RotateCcw,
  VolumeX,
  Volume2,
  Bookmark,
  Share2,
  CheckCircle2,
  ArrowRight,
  Shield,
  X,
  Undo,
  Redo
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ElementTransform, SelectedElementType, SmokeConfig, TextConfig, AppStateSnapshot, ErasePath } from './types';
import EditableCanvas from './components/EditableCanvas';
import TwitterPreview from './components/TwitterPreview';
import EraserCanvas from './components/EraserCanvas';

// High-Fidelity 3D Perspective Projection Slices Renderer
const drawPerspectiveVector = async (
  ctx: CanvasRenderingContext2D,
  svgMarkup: string,
  transform: ElementTransform,
  baseWidth: number,
  baseHeight: number,
  canvasSize: number,
  erasePaths?: ErasePath[]
) => {
  const img = new Image();
  img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgMarkup);
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
  });

  const scale = transform.scale;
  const rotateX = transform.rotateX;
  const rotateY = transform.rotateY;
  const rotateZ = transform.rotateZ;
  const opacity = transform.opacity ?? 1;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Render vector SVG into an offscreen canvas at high resolution (crisp vectors)
  const offscreen = document.createElement('canvas');
  const renderScale = 4;
  offscreen.width = baseWidth * renderScale;
  offscreen.height = baseHeight * renderScale;
  const oCtx = offscreen.getContext('2d');
  if (!oCtx) {
    ctx.restore();
    return;
  }
  oCtx.drawImage(img, 0, 0, offscreen.width, offscreen.height);

  // Apply eraser custom mask lines over the flat vector offscreen canvas
  if (erasePaths && erasePaths.length > 0) {
    oCtx.save();
    // Map viewBox coordinates (100x24 for Sunglasses, 140x30 for Joint) to renderScale dimensions
    const scaleFactor = (baseWidth * renderScale) / (baseWidth === 128 ? 100 : 140);
    oCtx.scale(scaleFactor, scaleFactor);
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
  }

  // Translate to the element's position
  const cx = (transform.x / 100) * canvasSize;
  const cy = (transform.y / 100) * canvasSize;
  ctx.translate(cx, cy);

  // Apply roll rotation (rotateZ) in 2D space
  const rz = (rotateZ * Math.PI) / 180;
  ctx.rotate(rz);

  // Degrees to radians for X and Y 3D rotations
  const rx = (rotateX * Math.PI) / 180;
  const ry = (rotateY * Math.PI) / 180;

  // Camera perspective distance d. Matches the CSS perspective(800px) on 400px stage.
  const d = 2.0 * canvasSize;

  // We split the offscreen canvas into multiple vertical slices and project them individually
  const numSlices = 100;
  const sliceW = offscreen.width / numSlices;

  // Scale target dimensions based on canvas size
  const targetScale = scale * (canvasSize / 400);
  const baseTargetW = baseWidth * targetScale;
  const baseTargetH = baseHeight * targetScale;

  for (let i = 0; i < numSlices; i++) {
    // Relative percentage of width from center (-0.5 to 0.5)
    const xPct = (i + 0.5) / numSlices - 0.5;
    const srcX = i * sliceW;

    const base3dX = xPct * baseTargetW;

    // Y coordinates for top and bottom edges of slice
    const base3dYTop = -0.5 * baseTargetH;
    const base3dYBot = 0.5 * baseTargetH;

    // Project Top point
    const y1Top = base3dYTop * Math.cos(rx);
    const z1Top = base3dYTop * Math.sin(rx);
    const x2Top = base3dX * Math.cos(ry) + z1Top * Math.sin(ry);
    const y2Top = y1Top;
    const z2Top = -base3dX * Math.sin(ry) + z1Top * Math.cos(ry);

    // Project Bottom point
    const y1Bot = base3dYBot * Math.cos(rx);
    const z1Bot = base3dYBot * Math.sin(rx);
    const x2Bot = base3dX * Math.cos(ry) + z1Bot * Math.sin(ry);
    const y2Bot = y1Bot;
    const z2Bot = -base3dX * Math.sin(ry) + z1Bot * Math.cos(ry);

    // Modern projective perspective mapping formulas
    const denomTop = d - z2Top;
    const projXTop = (x2Top * d) / (denomTop > 0.1 ? denomTop : 0.1);
    const projYTop = (y2Top * d) / (denomTop > 0.1 ? denomTop : 0.1);

    const denomBot = d - z2Bot;
    const projXBot = (x2Bot * d) / (denomBot > 0.1 ? denomBot : 0.1);
    const projYBot = (y2Bot * d) / (denomBot > 0.1 ? denomBot : 0.1);

    // Midpoint X of the drawn slice
    const destX = (projXTop + projXBot) / 2;
    const destY = projYTop;
    const destH = projYBot - projYTop;

    // Properly scale slice width for depth factor
    const sliceZCenter = (z2Top + z2Bot) / 2;
    const sliceDenom = d - sliceZCenter;
    const nominalStripeW = baseTargetW / numSlices;
    const destW = (nominalStripeW * d) / (sliceDenom > 0.1 ? sliceDenom : 0.1);

    ctx.drawImage(
      offscreen,
      srcX,
      0,
      sliceW,
      offscreen.height,
      destX - destW / 2,
      destY,
      destW + 0.6, // overlapping overlap margin to guarantee continuous seamless connections
      destH
    );
  }

  ctx.restore();
};

export default function App() {
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // Element "drip" Transforms
  const [sunglassesTransform, setSunglassesTransform] = useState<ElementTransform>({
    x: 50, y: 45, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1
  });
  const [jointTransform, setJointTransform] = useState<ElementTransform>({
    x: 50, y: 55, scale: 0.8, rotateX: 0, rotateY: 0, rotateZ: 10, opacity: 1
  });
  const [textTransform, setTextTransform] = useState<ElementTransform>({
    x: 50, y: 80, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1
  });

  // 3D Masking/Eraser Paths
  const [sunglassesErasePaths, setSunglassesErasePaths] = useState<ErasePath[]>([]);
  const [jointErasePaths, setJointErasePaths] = useState<ErasePath[]>([]);
  const [eraserBrushSize, setEraserBrushSize] = useState<number>(6);

  // Active Element Focus
  const [selectedElement, setSelectedElement] = useState<SelectedElementType>('sunglasses');

  // Text Config
  const [textConfig, setTextConfig] = useState<TextConfig>({
    content: '#smokefleet',
    fontFamily: 'JetBrains Mono',
    colorPreset: 'hyper-cyber',
    fontSizeValue: 36,
    letterSpacing: 2,
    glowColor: '#22d3ee'
  });

  // Smoke config
  const [smokeConfig, setSmokeConfig] = useState<SmokeConfig>({
    color: '#34d399',
    intensity: 3,
    type: 'neon',
  });

  // Toggles and indicators
  const [showTwitterMask, setShowTwitterMask] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedImage, setExportedImage] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // History State for Undo / Redo
  const [history, setHistory] = useState<AppStateSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isActionFromHistory = React.useRef<boolean>(false);
  const historyRef = React.useRef<AppStateSnapshot[]>([]);
  const historyIndexRef = React.useRef<number>(-1);

  // Keep refs in sync so the state tracker doesn't need outer state dependency loop
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Track state changes to push snapshots onto history list
  useEffect(() => {
    if (isActionFromHistory.current) {
      isActionFromHistory.current = false;
      return;
    }

    const currentSnapshot: AppStateSnapshot = {
      sunglassesTransform,
      jointTransform,
      textTransform,
      textConfig,
      smokeConfig,
      isMirrored,
      imageSrc,
      sunglassesErasePaths,
      jointErasePaths,
    };

    const handler = setTimeout(() => {
      const currentHistory = historyRef.current;
      const currentIndex = historyIndexRef.current;

      if (currentHistory.length === 0) {
        setHistory([currentSnapshot]);
        setHistoryIndex(0);
        return;
      }

      const activeHistoryState = currentHistory[currentIndex];
      const hasChanged = !activeHistoryState || (
        JSON.stringify(activeHistoryState.sunglassesTransform) !== JSON.stringify(sunglassesTransform) ||
        JSON.stringify(activeHistoryState.jointTransform) !== JSON.stringify(jointTransform) ||
        JSON.stringify(activeHistoryState.textTransform) !== JSON.stringify(textTransform) ||
        JSON.stringify(activeHistoryState.textConfig) !== JSON.stringify(textConfig) ||
        JSON.stringify(activeHistoryState.smokeConfig) !== JSON.stringify(smokeConfig) ||
        activeHistoryState.isMirrored !== isMirrored ||
        activeHistoryState.imageSrc !== imageSrc ||
        JSON.stringify(activeHistoryState.sunglassesErasePaths) !== JSON.stringify(sunglassesErasePaths) ||
        JSON.stringify(activeHistoryState.jointErasePaths) !== JSON.stringify(jointErasePaths)
      );

      if (hasChanged) {
        const cleanHistory = currentHistory.slice(0, currentIndex + 1);
        setHistory([...cleanHistory, currentSnapshot]);
        setHistoryIndex(cleanHistory.length);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [
    sunglassesTransform,
    jointTransform,
    textTransform,
    textConfig,
    smokeConfig,
    isMirrored,
    imageSrc,
    sunglassesErasePaths,
    jointErasePaths,
  ]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isActionFromHistory.current = true;
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const snapshot = history[prevIndex];
      setImageSrc(snapshot.imageSrc);
      setSunglassesTransform(snapshot.sunglassesTransform);
      setJointTransform(snapshot.jointTransform);
      setTextTransform(snapshot.textTransform);
      setTextConfig(snapshot.textConfig);
      setSmokeConfig(snapshot.smokeConfig);
      setIsMirrored(snapshot.isMirrored);
      setSunglassesErasePaths(snapshot.sunglassesErasePaths || []);
      setJointErasePaths(snapshot.jointErasePaths || []);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isActionFromHistory.current = true;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const snapshot = history[nextIndex];
      setImageSrc(snapshot.imageSrc);
      setSunglassesTransform(snapshot.sunglassesTransform);
      setJointTransform(snapshot.jointTransform);
      setTextTransform(snapshot.textTransform);
      setTextConfig(snapshot.textConfig);
      setSmokeConfig(snapshot.smokeConfig);
      setIsMirrored(snapshot.isMirrored);
      setSunglassesErasePaths(snapshot.sunglassesErasePaths || []);
      setJointErasePaths(snapshot.jointErasePaths || []);
    }
  };
  
  // Cache for loaded base image to make sliders 105% smooth and responsive
  const baseImageCacheRef = React.useRef<HTMLImageElement | null>(null);
  const [baseImageLoaded, setBaseImageLoaded] = useState<boolean>(false);

  // Synchronize base image source changes to image element cache
  useEffect(() => {
    if (!imageSrc) {
      baseImageCacheRef.current = null;
      setBaseImageLoaded(false);
      return;
    }
    setBaseImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      baseImageCacheRef.current = img;
      setBaseImageLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Drag-and-drop selfie photo loader
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        setImageSrc(event.target.result);
        // Reset transforms to balanced central alignment values for uploaded photos
        setSunglassesTransform({ x: 50, y: 45, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
        setJointTransform({ x: 50, y: 55, scale: 0.8, rotateX: 0, rotateY: 0, rotateZ: 10, opacity: 1 });
        setTextTransform({ x: 50, y: 80, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset function
  const handleResetAlignment = () => {
    setSunglassesTransform({ x: 50, y: 45, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
    setJointTransform({ x: 50, y: 55, scale: 0.8, rotateX: 0, rotateY: 0, rotateZ: 10, opacity: 1 });
    setTextTransform({ x: 50, y: 80, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
  };

  // Get current active transform
  const getActiveTransform = (): ElementTransform => {
    if (selectedElement === 'sunglasses') return sunglassesTransform;
    if (selectedElement === 'joint') return jointTransform;
    return textTransform;
  };

  // Set active transform value
  const updateActiveTransform = (field: keyof ElementTransform, value: number) => {
    if (selectedElement === 'sunglasses') {
      setSunglassesTransform({ ...sunglassesTransform, [field]: value });
    } else if (selectedElement === 'joint') {
      setJointTransform({ ...jointTransform, [field]: value });
    } else if (selectedElement === 'text') {
      setTextTransform({ ...textTransform, [field]: value });
    }
  };

  const adjustX = (amount: number) => {
    const current = getActiveTransform().rotateX;
    updateActiveTransform('rotateX', Math.max(-75, Math.min(75, current + amount)));
  };
  const adjustY = (amount: number) => {
    const current = getActiveTransform().rotateY;
    updateActiveTransform('rotateY', Math.max(-75, Math.min(75, current + amount)));
  };
  const adjustZ = (amount: number) => {
    const current = getActiveTransform().rotateZ;
    updateActiveTransform('rotateZ', Math.max(-180, Math.min(180, current + amount)));
  };
  const adjustScale = (amount: number) => {
    const current = getActiveTransform().scale;
    const next = parseFloat((current + amount).toFixed(2));
    updateActiveTransform('scale', Math.max(0.3, Math.min(3.5, next)));
  };
  const adjustOpacity = (amount: number) => {
    const current = getActiveTransform().opacity ?? 1;
    const next = parseFloat((current + amount).toFixed(2));
    updateActiveTransform('opacity', Math.max(0.1, Math.min(1.0, next)));
  };

  // High-Resolution Composite PNG compiler with support for 3D perspective projection representation
  const compileAndDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw original base photographic image (preset or uploaded photo)
      const baseImg = new Image();
      baseImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        baseImg.onload = () => resolve();
        baseImg.onerror = () => reject(new Error('Canvas source loader failed.'));
        baseImg.src = imageSrc;
      });

      // Handle custom mirrored rendering with CSS-matching object-cover crop strategy
      const sWidthRef = baseImg.width;
      const sHeightRef = baseImg.height;
      const aspect = sWidthRef / sHeightRef;
      let sx = 0;
      let sy = 0;
      let sw = sWidthRef;
      let sh = sHeightRef;

      if (aspect > 1) { // wider than square: crop left and right
        sw = sHeightRef;
        sx = (sWidthRef - sHeightRef) / 2;
      } else if (aspect < 1) { // taller than square: crop top and bottom
        sh = sWidthRef;
        sy = (sHeightRef - sWidthRef) / 2;
      }

      if (isMirrored) {
        ctx.save();
        ctx.translate(1200, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, 1200, 1200);
        ctx.restore();
      } else {
        ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, 1200, 1200);
      }

      const sunglassesMarkup = `<svg viewBox="0 0 100 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h92v4H4V4z" fill="#000000" />
        <path d="M8 8h32v4H8V8zm4 4h24v4H12V12zm4 4h16v4H16V16z" fill="#000000" />
        <path d="M60 8h32v4H60V8zm4 4h24v4H64V12zm4 4h16v4H68V16z" fill="#000000" />
        <path d="M12 8h4v4h-4V8z" fill="#ffffff" />
        <path d="M16 12h4v4h-4v-4z" fill="#ffffff" />
        <path d="M20 16h4v4h-4v-4z" fill="#ffffff" />
        <path d="M64 8h4v4h-4V8z" fill="#ffffff" />
        <path d="M68 12h4v4h-4v-4z" fill="#ffffff" />
        <path d="M72 16h4v4h-4v-4z" fill="#ffffff" />
      </svg>`;

      const jointMarkup = `<svg viewBox="0 0 140 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g>
          <path d="M 5 13.5 L 115 6 L 115 24 L 5 16.5 C 3.5 16.5 3.5 13.5 5 13.5 Z" fill="#edf2f7" stroke="#2d3748" stroke-width="1" />
          <path d="M 30 11.8 Q 33 15 30 18.2" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
          <path d="M 55 10.1 Q 58 15 55 19.9" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
          <path d="M 80 8.4 Q 83 15 80 21.6" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
          <path d="M 105 6.7 Q 108 15 105 23.3" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
          <path d="M 115 6 L 122 8.5 L 123 15 L 122 21.5 L 115 24 L 117 15 Z" fill="#ef4444" />
          <path d="M 122 8.5 L 128 10.5 L 130 15 L 128 19.5 L 122 21.5 L 120 15 Z" fill="#718096" />
        </g>
      </svg>`;

      // Render Sunglasses with real 3D projection
      await drawPerspectiveVector(ctx, sunglassesMarkup, sunglassesTransform, 128, 30.72, 1200, sunglassesErasePaths);

      // Render Joint with real 3D projection
      await drawPerspectiveVector(ctx, jointMarkup, jointTransform, 124, 26.57, 1200, jointErasePaths);

      // Render custom designed typography
      if (textConfig.content) {
        ctx.save();
        const tx = (textTransform.x / 100) * 1200;
        const ty = (textTransform.y / 100) * 1200;
        
        ctx.translate(tx, ty);

        const rz = (textTransform.rotateZ * Math.PI) / 180;
        const ry = (textTransform.rotateY * Math.PI) / 180;
        const rx = (textTransform.rotateX * Math.PI) / 180;

        ctx.rotate(rz);
        ctx.scale(Math.cos(ry), Math.cos(rx));

        const finalScale = textTransform.scale * (1200 / 400);
        ctx.scale(finalScale, finalScale);
        ctx.globalAlpha = textTransform.opacity ?? 1;

        // Recreate design effects inside high-res 2D Canvas context
        ctx.font = `bold 38px "${textConfig.fontFamily}", "Impact", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Select exact composite gradient
        let gradientFill: string | CanvasGradient = '#ffffff';
        if (textConfig.colorPreset === 'chrome') {
          const grad = ctx.createLinearGradient(0, -20, 0, 20);
          grad.addColorStop(0, '#e0e7ff');
          grad.addColorStop(0.5, '#ffffff');
          grad.addColorStop(1, '#818cf8');
          gradientFill = grad;
          ctx.shadowColor = 'rgba(139,92,246,0.85)';
          ctx.shadowBlur = 18;
        } else if (textConfig.colorPreset === 'solar-flare') {
          const grad = ctx.createLinearGradient(-150, 0, 150, 0);
          grad.addColorStop(0, '#ef4444');
          grad.addColorStop(0.5, '#f97316');
          grad.addColorStop(1, '#facc15');
          gradientFill = grad;
          ctx.shadowColor = 'rgba(239,68,68,0.8)';
          ctx.shadowBlur = 18;
        } else if (textConfig.colorPreset === 'hyper-cyber') {
          const grad = ctx.createLinearGradient(-120, 0, 120, 0);
          grad.addColorStop(0, '#4ade80');
          grad.addColorStop(1, '#06b6d4');
          gradientFill = grad;
          ctx.shadowColor = 'rgba(34,197,94,0.7)';
          ctx.shadowBlur = 12;
        } else if (textConfig.colorPreset === 'vaporwave') {
          const grad = ctx.createLinearGradient(-120, 0, 120, 0);
          grad.addColorStop(0, '#f472b6');
          grad.addColorStop(0.5, '#c084fc');
          grad.addColorStop(1, '#22d3ee');
          gradientFill = grad;
          ctx.shadowColor = 'rgba(219,39,119,0.75)';
          ctx.shadowBlur = 15;
        } else if (textConfig.colorPreset === 'brutalist') {
          gradientFill = '#ffffff';
        }

        // Apply fallback standard glowing shadow
        if (textConfig.glowColor && textConfig.colorPreset !== 'brutalist') {
          ctx.shadowColor = textConfig.glowColor;
          ctx.shadowBlur = 16;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = gradientFill;

        if (textConfig.colorPreset === 'brutalist') {
          ctx.lineWidth = 10;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(textConfig.content, 0, 0);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        } else {
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(0,0,0,0.85)';
          ctx.strokeText(textConfig.content, 0, 0);
        }

        ctx.fillText(textConfig.content, 0, 0);
        ctx.restore();
      }

      // 3. Compile output
      const url = canvas.toDataURL('image/png');
      setExportedImage(url);
      setShowExportModal(true);

      // Trigger standard browser download handler
      const tempLink = document.createElement('a');
      tempLink.download = `smokefleet-pfp-${Date.now()}.png`;
      tempLink.href = url;
      tempLink.click();
    } catch (e) {
      console.error('Smokefleet vector compilation crash:', e);
    } finally {
      setIsExporting(false);
    }
  };



  // Synchronize 400x400 fast preview to circular crop in real-time on every orientation shift
  useEffect(() => {
    let active = true;
    const handleSyncPreview = async () => {
      try {
        if (!imageSrc) {
          setExportedImage('');
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get preloaded image from cache
        let baseImg = baseImageCacheRef.current;
        if (!baseImg) {
          // Fallback loading if cache is not ready yet
          baseImg = new Image();
          baseImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            baseImg!.onload = () => resolve();
            baseImg!.onerror = () => reject(new Error('Canvas source loader failed.'));
            baseImg!.src = imageSrc;
          });
        }

        if (!active) return;

        // Draw base photo with CSS-matching object-cover crop strategy
        const sWidthRef = baseImg.width;
        const sHeightRef = baseImg.height;
        const aspect = sWidthRef / sHeightRef;
        let sx = 0;
        let sy = 0;
        let sw = sWidthRef;
        let sh = sHeightRef;

        if (aspect > 1) { // wider
          sw = sHeightRef;
          sx = (sWidthRef - sHeightRef) / 2;
        } else if (aspect < 1) { // taller
          sh = sWidthRef;
          sy = (sHeightRef - sWidthRef) / 2;
        }

        if (isMirrored) {
          ctx.save();
          ctx.translate(400, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, 400, 400);
          ctx.restore();
        } else {
          ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, 400, 400);
        }

        const sunglassesMarkup = `<svg viewBox="0 0 100 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4h92v4H4V4z" fill="#000000" />
          <path d="M8 8h32v4H8V8zm4 4h24v4H12V12zm4 4h16v4H16V16z" fill="#000000" />
          <path d="M60 8h32v4H60V8zm4 4h24v4H64V12zm4 4h16v4H68V16z" fill="#000000" />
          <path d="M12 8h4v4h-4V8z" fill="#ffffff" />
          <path d="M16 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M20 16h4v4h-4v-4z" fill="#ffffff" />
          <path d="M64 8h4v4h-4V8z" fill="#ffffff" />
          <path d="M68 12h4v4h-4v-4z" fill="#ffffff" />
          <path d="M72 16h4v4h-4v-4z" fill="#ffffff" />
        </svg>`;

        const jointMarkup = `<svg viewBox="0 0 140 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path d="M 5 13.5 L 115 6 L 115 24 L 5 16.5 C 3.5 16.5 3.5 13.5 5 13.5 Z" fill="#edf2f7" stroke="#2d3748" stroke-width="1" />
            <path d="M 30 11.8 Q 33 15 30 18.2" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
            <path d="M 55 10.1 Q 58 15 55 19.9" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
            <path d="M 80 8.4 Q 83 15 80 21.6" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
            <path d="M 105 6.7 Q 108 15 105 23.3" stroke="#cbd5e1" stroke-width="0.7" opacity="0.6" />
            <path d="M 115 6 L 122 8.5 L 123 15 L 122 21.5 L 115 24 L 117 15 Z" fill="#ef4444" />
            <path d="M 122 8.5 L 128 10.5 L 130 15 L 128 19.5 L 122 21.5 L 120 15 Z" fill="#718096" />
          </g>
        </svg>`;

        await drawPerspectiveVector(ctx, sunglassesMarkup, sunglassesTransform, 128, 30.72, 400, sunglassesErasePaths);
        await drawPerspectiveVector(ctx, jointMarkup, jointTransform, 124, 26.57, 400, jointErasePaths);

        // Render typography
        if (textConfig.content) {
          ctx.save();
          const tx = (textTransform.x / 100) * 400;
          const ty = (textTransform.y / 100) * 400;
          ctx.translate(tx, ty);

          const rz = (textTransform.rotateZ * Math.PI) / 180;
          const ry = (textTransform.rotateY * Math.PI) / 180;
          const rx = (textTransform.rotateX * Math.PI) / 180;

          ctx.rotate(rz);
          ctx.scale(Math.cos(ry), Math.cos(rx));
          ctx.scale(textTransform.scale, textTransform.scale);
          ctx.globalAlpha = textTransform.opacity ?? 1;

          ctx.font = `bold 38px "${textConfig.fontFamily}", "Impact", "Inter", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let gradientFill: string | CanvasGradient = '#ffffff';
          if (textConfig.colorPreset === 'chrome') {
            const grad = ctx.createLinearGradient(0, -20, 0, 20);
            grad.addColorStop(0, '#e0e7ff');
            grad.addColorStop(0.5, '#ffffff');
            grad.addColorStop(1, '#818cf8');
            gradientFill = grad;
            ctx.shadowColor = 'rgba(139,92,246,0.85)';
            ctx.shadowBlur = 18;
          } else if (textConfig.colorPreset === 'solar-flare') {
            const grad = ctx.createLinearGradient(-150, 0, 150, 0);
            grad.addColorStop(0, '#ef4444');
            grad.addColorStop(0.5, '#f97316');
            grad.addColorStop(1, '#facc15');
            gradientFill = grad;
            ctx.shadowColor = 'rgba(239,68,68,0.8)';
            ctx.shadowBlur = 18;
          } else if (textConfig.colorPreset === 'hyper-cyber') {
            const grad = ctx.createLinearGradient(-120, 0, 120, 0);
            grad.addColorStop(0, '#4ade80');
            grad.addColorStop(1, '#06b6d4');
            gradientFill = grad;
            ctx.shadowColor = 'rgba(34,197,94,0.7)';
            ctx.shadowBlur = 12;
          } else if (textConfig.colorPreset === 'vaporwave') {
            const grad = ctx.createLinearGradient(-120, 0, 120, 0);
            grad.addColorStop(0, '#f472b6');
            grad.addColorStop(0.5, '#c084fc');
            grad.addColorStop(1, '#22d3ee');
            gradientFill = grad;
            ctx.shadowColor = 'rgba(219,39,119,0.75)';
            ctx.shadowBlur = 15;
          }

          if (textConfig.glowColor && textConfig.colorPreset !== 'brutalist') {
            ctx.shadowColor = textConfig.glowColor;
            ctx.shadowBlur = 15;
          } else {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }

          if (textConfig.colorPreset === 'brutalist') {
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(textConfig.content, 0, 0);
          } else {
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.strokeText(textConfig.content, 0, 0);
          }

          ctx.fillStyle = gradientFill;
          ctx.fillText(textConfig.content, 0, 0);
          ctx.restore();
        }

        if (active) {
          const previewUrl = canvas.toDataURL('image/png');
          setExportedImage(previewUrl);
        }
      } catch (err) {
        if (active) {
          setExportedImage(imageSrc);
        }
      }
    };

    const delayDebounceFn = setTimeout(() => {
      handleSyncPreview();
    }, 16);

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [
    imageSrc,
    baseImageLoaded,
    sunglassesTransform,
    jointTransform,
    textTransform,
    textConfig,
    isMirrored
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" id="smokefleet-app-root">
      {/* Dynamic Cosmic Header */}
      <header className="bg-slate-950 border-b border-slate-900 sticky top-0 z-50 px-4 py-4 backdrop-blur-md/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Headline */}
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2 rounded-xl shadow-glow shadow-emerald-500/20">
              <span className="font-mono font-black text-slate-950 tracking-tighter text-sm">SF</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <h1 className="font-sans font-black text-white text-base tracking-tight uppercase">
                  Smokefleet Workshop
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">PFP Editor v2.0</span>
          </div>
        </div>
      </header>

      {/* Main Studio Arena */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow w-full">
        {/* LEFT COLUMN: ACTIVE VIEWPORT & TACTICAL TOGGLES */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-4 md:p-5 shadow-2xl relative">
            
            {/* Viewport Action Badges */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
                  Active Canvas
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Undo Button */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={`flex items-center justify-center p-1.5 rounded-full border transition-all ${
                    historyIndex > 0
                      ? 'text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800 cursor-pointer active:scale-95'
                      : 'text-slate-600 bg-slate-950/40 border-slate-900 cursor-not-allowed opacity-50'
                  }`}
                  title="Undo last change"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>

                {/* Redo Button */}
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex < 0 || historyIndex >= history.length - 1}
                  className={`flex items-center justify-center p-1.5 rounded-full border transition-all ${
                    historyIndex >= 0 && historyIndex < history.length - 1
                      ? 'text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800 cursor-pointer active:scale-95'
                      : 'text-slate-600 bg-slate-950/40 border-slate-900 cursor-not-allowed opacity-50'
                  }`}
                  title="Redo next change"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>

                {/* Reset to baseline button */}
                <button
                  onClick={handleResetAlignment}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-800"
                  title="Reset active elements to center presets"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Elements
                </button>
              </div>
            </div>

            {/* Interactive Canvas Stage */}
            <EditableCanvas
              imageSrc={imageSrc}
              sunglassesTransform={sunglassesTransform}
              jointTransform={jointTransform}
              textTransform={textTransform}
              selectedElement={selectedElement}
              textConfig={textConfig}
              smokeConfig={smokeConfig}
              showTwitterMask={showTwitterMask}
              sunglassesErasePaths={sunglassesErasePaths}
              jointErasePaths={jointErasePaths}
              onUpdateSunglasses={setSunglassesTransform}
              onUpdateJoint={setJointTransform}
              onUpdateText={setTextTransform}
              setSelectedElement={setSelectedElement}
            />

            {/* Stage Accessory Indicators */}
            <div className="mt-4 flex flex-wrap gap-2.5 items-center justify-between">
              {/* Overlay Toggle: Twitter mask visualization */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTwitterMask(!showTwitterMask)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    showTwitterMask
                       ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${showTwitterMask ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  X Crop Overlay
                </button>

                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                    isMirrored
                      ? 'bg-purple-500/10 border-purple-500/40 text-purple-300 shadow-[0_0_8px_rgba(139,92,246,0.15)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                  title="Horizontally flip the background to match alternative profiles"
                >
                  <RefreshCw className="w-3 h-3" />
                  Flip Image
                </button>
              </div>

              {/* Micro Drag Instruction Label */}
              <span className="text-[10px] font-mono text-slate-500">
                👉 Hover and scroll wheel to rotate elements
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WORKSPACE TOOL CONTROLLERS */}
        <div className="lg:col-span-6 flex flex-col gap-6" id="smokefleet-editor-suite">
          
          {/* STEP 1: INITIAL COMPOSITION - PHOTOGRAPH SELECTION */}
          <section className="bg-slate-950 border border-slate-900 rounded-2xl p-4 md:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <h3 className="text-xs font-bold text-slate-350 font-mono tracking-wider uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded bg-indigo-500 shrink-0" />
                1. Upload Face Photograph
              </h3>
            </div>

            {/* Premium Upload Dropzone / Trigger Area */}
            <label className="border-2 border-dashed border-slate-800 hover:border-emerald-500/60 bg-slate-900/10 hover:bg-slate-900/40 rounded-2xl flex flex-col items-center justify-center p-6 md:p-8 cursor-pointer text-slate-400 hover:text-white transition-all text-center min-h-[140px] group relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-500 opacity-20 group-hover:opacity-100 transition-opacity" />
              <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl mb-3 shrink-0 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-5 h-5 text-indigo-400 group-hover:text-emerald-400 transition-colors" />
              </div>
              <span className="text-xs font-sans font-bold text-slate-200 group-hover:text-white">
                Drag &amp; drop your selfie photo
              </span>
              <span className="text-[10px] font-sans text-slate-550 mt-1 max-w-xs leading-relaxed">
                Supports PNG, JPEG, or WEBP. Upload to instantly dress up your new pilot identity!
              </span>
              <div className="mt-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-sans font-bold text-[10px] px-3.5 py-1.5 rounded-full transition-all">
                Select Photo File
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload-input"
              />
            </label>

            {/* Privacy Disclaimer */}
            <div className="flex items-start gap-2 px-1.5 py-1 text-[11px] text-slate-500 font-sans leading-relaxed">
              <Shield className="w-3.5 h-3.5 text-emerald-500/80 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-400">Privacy Assurance:</strong> All uploaded images are processed entirely inside your local browser. No files are saved, stored, or transmitted to any server.
              </span>
            </div>
          </section>

          {/* STEP 2: DESIGN DECK - PERSRECTIVE TRANSFORM DESK */}
          <section className="bg-slate-950 border border-slate-900 rounded-2xl p-4 md:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase flex items-center gap-2">
                2. Prop Alignment sliders
              </h3>
              
              {/* Active element display badge */}
              <div className="bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded text-[10px] font-mono text-slate-400 uppercase">
                {selectedElement}
              </div>
            </div>

            {/* Element Targets selection toggles */}
            <div className="grid grid-cols-3 bg-slate-900/60 p-1.5 rounded-xl border border-slate-900 gap-1 animate-fadeIn">
              <button
                onClick={() => setSelectedElement('sunglasses')}
                className={`py-2 rounded-lg text-xs font-sans font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedElement === 'sunglasses'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🕶️ Shades
              </button>
              <button
                onClick={() => setSelectedElement('joint')}
                className={`py-2 rounded-lg text-xs font-sans font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedElement === 'joint'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🚬 Joint
              </button>
              <button
                onClick={() => setSelectedElement('text')}
                className={`py-2 rounded-lg text-xs font-sans font-semibold transition-all flex items-center justify-center gap-2 ${
                  selectedElement === 'text'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💬 Watermark
              </button>
            </div>

            {/* Transform Sliders Box */}
            <div className="flex flex-col gap-4 bg-slate-900/30 border border-slate-900/50 p-4 rounded-xl">
              {/* Rotate X Slider: Pitch */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Pitch (3D Vertical Tilt)</span>
                  <span className="text-emerald-400">{getActiveTransform().rotateX}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustX(-5)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="-5°"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="-75"
                    max="75"
                    value={getActiveTransform().rotateX}
                    onChange={(e) => updateActiveTransform('rotateX', parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-ew-resize opacity-90 hover:opacity-100 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => adjustX(5)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="+5°"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rotate Y Slider: Yaw */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Yaw (3D Left/Right Rotate)</span>
                  <span className="text-emerald-400">{getActiveTransform().rotateY}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustY(-5)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="-5°"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="-75"
                    max="75"
                    value={getActiveTransform().rotateY}
                    onChange={(e) => updateActiveTransform('rotateY', parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-ew-resize opacity-90 hover:opacity-100 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => adjustY(5)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="+5°"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rotate Z Slider: Roll */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Roll (2D Rotation Angle)</span>
                  <span className="text-emerald-400">{getActiveTransform().rotateZ}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustZ(-5)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="-5°"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={getActiveTransform().rotateZ}
                    onChange={(e) => updateActiveTransform('rotateZ', parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-ew-resize opacity-90 hover:opacity-100 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => adjustZ(5)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="+5°"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Scale Slider */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Size (Scale)</span>
                  <span className="text-emerald-400">{getActiveTransform().scale.toFixed(2)}x</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustScale(-0.1)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="-0.1x"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0.3"
                    max="3.5"
                    step="0.05"
                    value={getActiveTransform().scale}
                    onChange={(e) => updateActiveTransform('scale', parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-ew-resize opacity-90 hover:opacity-100 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => adjustScale(0.1)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="+0.1x"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Opacity</span>
                  <span className="text-emerald-400">{Math.round((getActiveTransform().opacity ?? 1) * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => adjustOpacity(-0.1)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="-10%"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={getActiveTransform().opacity ?? 1}
                    onChange={(e) => updateActiveTransform('opacity', parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 cursor-ew-resize opacity-90 hover:opacity-100 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => adjustOpacity(0.1)}
                    className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold hover:text-white transition-all shrink-0 active:scale-90 flex items-center justify-center border border-slate-800 text-sm select-none"
                    title="+10%"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Optional 3D Eraser Workspace for active elements */}
              {(selectedElement === 'sunglasses' || selectedElement === 'joint') && (
                <div className="pt-4 border-t border-slate-900 mt-4">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>Eraser Brush Size</span>
                    <span className="text-emerald-400">{eraserBrushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="18"
                    step="1"
                    value={eraserBrushSize}
                    onChange={(e) => setEraserBrushSize(parseInt(e.target.value))}
                    className="w-full accent-emerald-400 cursor-ew-resize opacity-90 hover:opacity-100 py-1 mb-2"
                  />
                  <EraserCanvas
                    elementType={selectedElement}
                    erasePaths={selectedElement === 'sunglasses' ? sunglassesErasePaths : jointErasePaths}
                    onChangeErasePaths={selectedElement === 'sunglasses' ? setSunglassesErasePaths : setJointErasePaths}
                    brushSize={eraserBrushSize}
                  />
                </div>
              )}
            </div>
          </section>

          {/* STEP 3: SMOKE ALCHEMY */}
          <section className="bg-slate-950 border border-slate-900 rounded-2xl p-4 md:p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase select-none">
                3. Smoke Particle Color
              </h3>
            </div>

            {/* Smoke preset styles select layout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { name: 'Vapor Neon', hex: '#34d399', preset: 'neon' },
                { name: 'Purple Haze', hex: '#a855f7', preset: 'haze' },
                { name: 'Sunset Glow', hex: '#f97316', preset: 'sunset' },
                { name: 'Ice Blizzard', hex: '#ffffff', preset: 'classic' },
              ].map((smoke) => (
                <button
                  key={smoke.preset}
                  onClick={() => setSmokeConfig({ ...smokeConfig, color: smoke.hex, type: smoke.preset as any })}
                  className={`p-2 rounded-xl text-xs font-sans font-medium border text-left flex flex-col justify-between h-14 transition-all ${
                    smokeConfig.color === smoke.hex
                      ? 'bg-slate-900 border-purple-450 shadow-lg'
                      : 'border-slate-900 bg-slate-950 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: smoke.hex }} />
                  <span className="text-[10px] text-slate-300 font-sans font-medium mt-1 leading-none">
                    {smoke.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Smoke Intensity */}
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-900">
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>Smoke Intensity</span>
                <span className="text-purple-400">{smokeConfig.intensity}/5</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={smokeConfig.intensity}
                onChange={(e) => setSmokeConfig({ ...smokeConfig, intensity: parseInt(e.target.value) })}
                className="w-full accent-purple-400 cursor-ew-resize"
              />
            </div>
          </section>

          {/* STEP 4: HASHTAG STYLIST */}
          <section className="bg-slate-950 border border-slate-900 rounded-2xl p-4 md:p-5 flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase select-none">
                4. Custom Typography Styled Watermark
              </h3>
            </div>

            {/* Custom text edit */}
            <div className="flex flex-col gap-3">
              <div>
                <input
                  type="text"
                  maxLength={24}
                  value={textConfig.content}
                  onChange={(e) => setTextConfig({ ...textConfig, content: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-850 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none font-mono"
                  placeholder="e.g. #smokefleet"
                />
              </div>

              {/* Gradient Styling Select options */}
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1.5 font-semibold">
                  Visual Gradient Preset
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { name: 'Hyper Cyber', key: 'hyper-cyber', preview: 'bg-gradient-to-r from-green-400 to-cyan-400 text-transparent bg-clip-text' },
                    { name: 'Chrome Burner', key: 'chrome', preview: 'bg-gradient-to-b from-slate-200 via-neutral-100 to-slate-400 text-transparent bg-clip-text' },
                    { name: 'Solar Flare', key: 'solar-flare', preview: 'bg-gradient-to-r from-red-500 to-yellow-300 text-transparent bg-clip-text' },
                    { name: 'Vapor Dream', key: 'vaporwave', preview: 'bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-300 text-transparent bg-clip-text' },
                    { name: 'Brutalist Card', key: 'brutalist', preview: 'text-white border' },
                  ].map((style) => (
                    <button
                      key={style.key}
                      onClick={() => {
                        let finalGlow = '#22d3ee';
                        if (style.key === 'chrome') finalGlow = 'rgba(139,92,246,0.85)';
                        else if (style.key === 'solar-flare') finalGlow = 'rgba(239,68,68,0.8)';
                        else if (style.key === 'vaporwave') finalGlow = 'rgba(219,39,119,0.75)';
                        else if (style.key === 'brutalist') finalGlow = '';
                        setTextConfig({ ...textConfig, colorPreset: style.key, glowColor: finalGlow });
                      }}
                      className={`p-2 rounded-xl text-center border font-sans text-xs flex justify-center items-center transition-all min-h-[40px] ${
                        textConfig.colorPreset === style.key
                          ? 'bg-slate-900 border-cyan-400 text-white font-bold'
                          : 'border-slate-900 bg-slate-950 text-slate-450 hover:text-slate-200'
                      }`}
                    >
                      <span className={`${style.preview} font-black uppercase text-[10px] leading-tight`}>
                        {style.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Picker */}
              <div>
                <label className="text-[10px] uppercase font-mono text-slate-405 block mb-1">Choose Font Theme</label>
                <div className="flex flex-wrap gap-1.5">
                  {['JetBrains Mono', 'Impact', 'Space Grotesk', 'Playfair Display', 'Inter'].map((font) => (
                    <button
                      key={font}
                      onClick={() => setTextConfig({ ...textConfig, fontFamily: font })}
                      className={`px-3 py-1 rounded-full text-xs transition-colors border ${
                        textConfig.fontFamily === font
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SIMULATED X/TWITTER CARD PREVIEW */}
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase select-none">
                Live X Profile Crop Preview
              </h3>
            </div>
            
            <TwitterPreview imageSrc={exportedImage} />
          </section>

          {/* STEP 5: PIPELINE EXPORT CENTER */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-white text-base">Export Composite Avatar</h3>
                <p className="text-xs text-slate-450">Download high resolution PNG directly to download drawer</p>
              </div>
            </div>

            <div className="w-full">
              {/* Compile Button */}
              <button
                onClick={compileAndDownload}
                disabled={isExporting}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-sans font-black text-sm py-4.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    Rendering ...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 stroke-[2.5]" />
                    Download 1200px PNG
                  </>
                )}
              </button>
            </div>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900/60 mt-12 py-8 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <span>🛸 Smokefleet Workshop © 2026</span>
        </div>
      </footer>

      {/* Export Modal for Mobile Downloading support */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 md:gap-5 relative my-auto max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Close Button (for desktop / large viewports) */}
              <button
                onClick={() => setShowExportModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 p-2 rounded-full border border-slate-750 transition-colors cursor-pointer"
                title="Close overlay"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center pt-2 md:pt-4">
                <span className="inline-block bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase border border-emerald-500/20 px-2.5 py-1 rounded-full mb-1.5">
                  Image Rendered!
                </span>
                <h3 className="font-sans font-black text-white text-base md:text-lg leading-tight uppercase">
                  Your High-Res Avatar
                </h3>
              </div>

              {/* High-res Image Preview */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner group max-h-[300px] md:max-h-full">
                {exportedImage ? (
                  <img
                    src={exportedImage}
                    alt="Smokefleet High-Res PFP"
                    className="w-full h-full object-contain cursor-pointer"
                    referrerPolicy="no-referrer"
                    onClick={() => {
                      // Attempt download on click
                      const tempLink = document.createElement('a');
                      tempLink.download = `smokefleet-pfp-${Date.now()}.png`;
                      tempLink.href = exportedImage;
                      tempLink.click();
                    }}
                  />
                ) : (
                  <div className="text-slate-500 text-xs font-mono">Generating render ...</div>
                )}
                {/* Visual hint on image hover/tap */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-2 md:p-3 text-center pointer-events-none">
                  <span className="text-[9px] md:text-[10px] font-sans text-slate-300 font-semibold uppercase tracking-wider">
                    👆 Tap &amp; Hold to Save Image
                  </span>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="bg-slate-950 border border-slate-850 p-3 md:p-4 rounded-xl flex flex-col gap-1.5 text-xs text-slate-350 leading-relaxed font-sans">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>How to Save:</span>
                </div>
                <div className="space-y-1 text-slate-450 text-[10px] md:text-[11px] leading-normal">
                  <p><strong className="text-white">📱 Mobile / Tablets:</strong> Tap and hold (long press) the image above and select <span className="text-emerald-400 font-bold">"Save Image"</span>.</p>
                  <p><strong className="text-white">💻 Computer:</strong> Right-click and choose <span className="text-emerald-400 font-bold">"Save Image As..."</span>, or click the download button below.</p>
                </div>
              </div>

              {/* Highly Accessible Dual Action Button Bar at Bottom */}
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (exportedImage) {
                      const tempLink = document.createElement('a');
                      tempLink.download = `smokefleet-pfp-${Date.now()}.png`;
                      tempLink.href = exportedImage;
                      tempLink.click();
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-sans font-bold text-xs py-3 md:py-3.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  Download File
                </button>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 font-sans font-bold text-xs py-3 md:py-3.5 rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Close Overlay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
