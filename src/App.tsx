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
  Redo,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ElementTransform, SelectedElementType, SmokeConfig, TextConfig, AppStateSnapshot, ErasePath } from './types';

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
import EditableCanvas from './components/EditableCanvas';
import TwitterPreview from './components/TwitterPreview';
import EraserCanvas from './components/EraserCanvas';
import { getSunglassesSVGMarkup as getSunglassesSVGMarkupShared, getJointSVGMarkup as getJointSVGMarkupShared } from './utils/svgMarkup';

// Procedurally renders real-time smoke plumes directly onto canvas context
const drawSmokeTrail = (
  ctx: CanvasRenderingContext2D,
  jointTransform: ElementTransform,
  smokeConfig: SmokeConfig,
  canvasSize: number
) => {
  if (smokeConfig.intensity <= 0) return;

  const cx = (jointTransform.x / 100) * canvasSize;
  const cy = (jointTransform.y / 100) * canvasSize;

  // Joint is 31% width of canvas
  const baseWidth = 0.31 * canvasSize;
  const currentHalfWidth = (baseWidth * jointTransform.scale) / 2;

  const angleRad = (jointTransform.rotateZ * Math.PI) / 180;
  const pitchRad = (jointTransform.rotateX * Math.PI) / 180;
  const yawRad = (jointTransform.rotateY * Math.PI) / 180;

  // Calculate coordinates of the joint tip in standard affine 3D projections:
  const dx = currentHalfWidth * Math.cos(angleRad) * Math.cos(yawRad);
  const dy = currentHalfWidth * Math.sin(angleRad) * Math.cos(pitchRad);

  const startX = cx + dx;
  const startY = cy + dy;

  // Parse color config
  let r = 255;
  let g = 255;
  let b = 255;
  const hex = smokeConfig.color;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    r = parseInt(result[1], 16);
    g = parseInt(result[2], 16);
    b = parseInt(result[3], 16);
  }

  const angle = jointTransform.rotateZ;
  const devRad = (angle * Math.PI) / 180;
  
  // Plumes draft upward relative to the roll rotation angle of the joint
  const vx = Math.sin(devRad) * 1.5;
  const vy = -Math.cos(devRad) * 1.2 - 2.5;

  ctx.save();
  if (smokeConfig.type === 'black') {
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.globalCompositeOperation = 'screen';
  }

  const puffCount = 12 + smokeConfig.intensity * 8;
  const scaleFactor = canvasSize / 400;

  for (let i = 0; i < puffCount; i++) {
    const t = i / puffCount;
    // Increase wiggle amplitude (18 -> 28) and spread it out more as it drifts (t + 0.15) for wider dispersion
    const wiggle = Math.sin(i * 1.5) * (28 * scaleFactor) * (t + 0.15);
    const px = startX + vx * (i * (8 * scaleFactor)) + wiggle;
    const py = startY + vy * (i * (8 * scaleFactor));

    // Puffs grow larger and drift wider
    const size = (16 + t * 54) * scaleFactor * (0.8 + smokeConfig.intensity * 0.4);
    // Lower base opacity (0.95 -> 0.65) to prevent dense stacking
    const alpha = Math.max(0, 0.65 * (1 - t) * (smokeConfig.intensity / 5));

    if (alpha <= 0.01) continue;

    const grad = ctx.createRadialGradient(px, py, size * 0.05, px, py, size);
    // Faster radial fade stops for soft cloud rendering instead of solid circles
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`);
    grad.addColorStop(0.25, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`);
    grad.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${alpha * 0.1})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

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
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgMarkup)));
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

  // Render vector SVG into an offscreen canvas at high resolution
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

  // Translate to the element's position on stage
  const cx = (transform.x / 100) * canvasSize;
  const cy = (transform.y / 100) * canvasSize;
  ctx.translate(cx, cy);

  // Apply roll rotation in 2D space
  const rz = (rotateZ * Math.PI) / 180;
  ctx.rotate(rz);

  // Degrees to radians for X and Y 3D rotations
  const rx = (rotateX * Math.PI) / 180;
  const ry = (rotateY * Math.PI) / 180;

  // Perspective camera distance matching CSS representation:
  const d = 2.0 * canvasSize;

  // Split offscreen horizontal slices for perspective mapping
  const numSlices = 100;
  const sliceW = offscreen.width / numSlices;

  const targetScale = scale * (canvasSize / 400);
  const baseTargetW = baseWidth * targetScale;
  const baseTargetH = baseHeight * targetScale;

  for (let i = 0; i < numSlices; i++) {
    const xPct = (i + 0.5) / numSlices - 0.5;
    const srcX = i * sliceW;
    const base3dX = xPct * baseTargetW;

    const base3dYTop = -0.5 * baseTargetH;
    const base3dYBot = 0.5 * baseTargetH;

    // Project Top edge
    const y1Top = base3dYTop * Math.cos(rx);
    const z1Top = base3dYTop * Math.sin(rx);
    const x2Top = base3dX * Math.cos(ry) + z1Top * Math.sin(ry);
    const y2Top = y1Top;
    const z2Top = -base3dX * Math.sin(ry) + z1Top * Math.cos(ry);

    // Project Bottom edge
    const y1Bot = base3dYBot * Math.cos(rx);
    const z1Bot = base3dYBot * Math.sin(rx);
    const x2Bot = base3dX * Math.cos(ry) + z1Bot * Math.sin(ry);
    const y2Bot = y1Bot;
    const z2Bot = -base3dX * Math.sin(ry) + z1Bot * Math.cos(ry);

    // Dynamic camera formula mapping:
    const denomTop = d - z2Top;
    const projXTop = (x2Top * d) / (denomTop > 0.1 ? denomTop : 0.1);
    const projYTop = (y2Top * d) / (denomTop > 0.1 ? denomTop : 0.1);

    const denomBot = d - z2Bot;
    const projXBot = (x2Bot * d) / (denomBot > 0.1 ? denomBot : 0.1);
    const projYBot = (y2Bot * d) / (denomBot > 0.1 ? denomBot : 0.1);

    const destX = (projXTop + projXBot) / 2;
    const destY = projYTop;
    const destH = projYBot - projYTop;

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
      destW + 0.6, // overlapping overlap margin to guarantee seamless connection
      destH
    );
  }

  ctx.restore();
};

const getSunglassesSVGMarkup = (variant: 'classic' | 'aviator' | 'goggles' | 'visor' | 'stacked') => {
  return getSunglassesSVGMarkupShared(variant);
};

const getJointSVGMarkup = (variant: 'classic' | 'cigar' | 'cone' | 'photo') => {
  return getJointSVGMarkupShared(variant);
};

export default function App() {
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // Custom design style selections
  const [sunglassesStyle, setSunglassesStyle] = useState<'classic' | 'aviator' | 'goggles' | 'visor' | 'stacked'>('aviator');
  const [jointStyle, setJointStyle] = useState<'classic' | 'cigar' | 'cone' | 'photo'>('photo');

  // Back Photo Zoom / Path placement values
  const [imageTransform, setImageTransform] = useState<ElementTransform>({
    x: 50, y: 50, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1
  });

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

  // Active Element Focus (Default to sunglasses)
  const [selectedElement, setSelectedElement] = useState<SelectedElementType>('sunglasses');

  // Text Config
  const [textConfig, setTextConfig] = useState<TextConfig>({
    content: '#smokefleet',
    fontFamily: 'JetBrains Mono',
    colorPreset: 'hyper-cyber',
    fontSizeValue: 36,
    letterSpacing: 2,
    glowColor: '#22d3ee',
    dropShadow: true,
    shadowOpacity: 0.3
  });

  // Smoke config
  const [smokeConfig, setSmokeConfig] = useState<SmokeConfig>({
    color: '#34d399',
    intensity: 3,
    type: 'neon',
  });

  // Toggles and indicators
  const [showTwitterMask, setShowTwitterMask] = useState<boolean>(true);
  const [activeStep, setActiveStep] = useState<'photo' | 'customize' | 'download'>('photo');
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedImage, setExportedImage] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showXPreviewModal, setShowXPreviewModal] = useState<boolean>(false);

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
      imageTransform,
      sunglassesTransform,
      jointTransform,
      textTransform,
      textConfig,
      smokeConfig,
      isMirrored,
      imageSrc,
      sunglassesErasePaths,
      jointErasePaths,
      sunglassesStyle,
      jointStyle,
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
        JSON.stringify(activeHistoryState.imageTransform) !== JSON.stringify(imageTransform) ||
        JSON.stringify(activeHistoryState.sunglassesTransform) !== JSON.stringify(sunglassesTransform) ||
        JSON.stringify(activeHistoryState.jointTransform) !== JSON.stringify(jointTransform) ||
        JSON.stringify(activeHistoryState.textTransform) !== JSON.stringify(textTransform) ||
        JSON.stringify(activeHistoryState.textConfig) !== JSON.stringify(textConfig) ||
        JSON.stringify(activeHistoryState.smokeConfig) !== JSON.stringify(smokeConfig) ||
        activeHistoryState.isMirrored !== isMirrored ||
        activeHistoryState.imageSrc !== imageSrc ||
        JSON.stringify(activeHistoryState.sunglassesErasePaths) !== JSON.stringify(sunglassesErasePaths) ||
        JSON.stringify(activeHistoryState.jointErasePaths) !== JSON.stringify(jointErasePaths) ||
        activeHistoryState.sunglassesStyle !== sunglassesStyle ||
        activeHistoryState.jointStyle !== jointStyle
      );

      if (hasChanged) {
        const cleanHistory = currentHistory.slice(0, currentIndex + 1);
        setHistory([...cleanHistory, currentSnapshot]);
        setHistoryIndex(cleanHistory.length);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [
    imageTransform,
    sunglassesTransform,
    jointTransform,
    textTransform,
    textConfig,
    smokeConfig,
    isMirrored,
    imageSrc,
    sunglassesErasePaths,
    jointErasePaths,
    sunglassesStyle,
    jointStyle,
  ]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      isActionFromHistory.current = true;
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      const snapshot = history[prevIndex];
      setImageSrc(snapshot.imageSrc);
      setImageTransform(snapshot.imageTransform || { x: 50, y: 50, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
      setSunglassesTransform(snapshot.sunglassesTransform);
      setJointTransform(snapshot.jointTransform);
      setTextTransform(snapshot.textTransform);
      setTextConfig(snapshot.textConfig);
      setSmokeConfig(snapshot.smokeConfig);
      setIsMirrored(snapshot.isMirrored);
      setSunglassesErasePaths(snapshot.sunglassesErasePaths || []);
      setJointErasePaths(snapshot.jointErasePaths || []);
      setSunglassesStyle(snapshot.sunglassesStyle || 'classic');
      setJointStyle(snapshot.jointStyle || 'classic');
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isActionFromHistory.current = true;
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      const snapshot = history[nextIndex];
      setImageSrc(snapshot.imageSrc);
      setImageTransform(snapshot.imageTransform || { x: 50, y: 50, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
      setSunglassesTransform(snapshot.sunglassesTransform);
      setJointTransform(snapshot.jointTransform);
      setTextTransform(snapshot.textTransform);
      setTextConfig(snapshot.textConfig);
      setSmokeConfig(snapshot.smokeConfig);
      setIsMirrored(snapshot.isMirrored);
      setSunglassesErasePaths(snapshot.sunglassesErasePaths || []);
      setJointErasePaths(snapshot.jointErasePaths || []);
      setSunglassesStyle(snapshot.sunglassesStyle || 'classic');
      setJointStyle(snapshot.jointStyle || 'classic');
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
        setImageTransform({ x: 50, y: 50, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
        setSelectedElement('background');
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset function
  const handleResetAlignment = () => {
    setSunglassesTransform({ x: 50, y: 45, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
    setJointTransform({ x: 50, y: 55, scale: 0.8, rotateX: 0, rotateY: 0, rotateZ: 10, opacity: 1 });
    setTextTransform({ x: 50, y: 80, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
    setImageTransform({ x: 50, y: 50, scale: 1.0, rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1 });
  };

  // Get current active transform
  const getActiveTransform = (): ElementTransform => {
    if (selectedElement === 'sunglasses') return sunglassesTransform;
    if (selectedElement === 'joint') return jointTransform;
    if (selectedElement === 'text') return textTransform;
    return imageTransform; // 'background'
  };

  // Set active transform value
  const updateActiveTransform = (field: keyof ElementTransform, value: number) => {
    if (selectedElement === 'sunglasses') {
      setSunglassesTransform({ ...sunglassesTransform, [field]: value });
    } else if (selectedElement === 'joint') {
      setJointTransform({ ...jointTransform, [field]: value });
    } else if (selectedElement === 'text') {
      setTextTransform({ ...textTransform, [field]: value });
    } else if (selectedElement === 'background') {
      setImageTransform({ ...imageTransform, [field]: value });
    }
  };

  const adjustX = (amount: number) => {
    const current = getActiveTransform().rotateX;
    updateActiveTransform('rotateX', Math.max(-90, Math.min(90, current + amount)));
  };

  const adjustY = (amount: number) => {
    const current = getActiveTransform().rotateY;
    updateActiveTransform('rotateY', Math.max(-90, Math.min(90, current + amount)));
  };

  const adjustZ = (amount: number) => {
    const current = getActiveTransform().rotateZ;
    updateActiveTransform('rotateZ', Math.max(-180, Math.min(180, current + amount)));
  };

  const adjustScale = (amount: number) => {
    const current = getActiveTransform().scale;
    updateActiveTransform('scale', Math.max(0.2, Math.min(4.5, current + amount)));
  };

  const adjustOpacity = (amount: number) => {
    const current = getActiveTransform().opacity ?? 1;
    updateActiveTransform('opacity', Math.max(0.1, Math.min(1.0, current + amount)));
  };

  // High-Resolution Composite PNG compiler supporting horizontal panning, zoom factor and 3D perspectives
  const compileAndDownload = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw backdrop image with full pan and zoom transform matching CSS object-cover
      const baseImg = new Image();
      baseImg.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        baseImg.onload = () => resolve();
        baseImg.onerror = () => reject(new Error('Canvas source loader failed.'));
        baseImg.src = imageSrc;
      });

      ctx.save();
      if (isMirrored) {
        ctx.translate(1200, 0);
        ctx.scale(-1, 1);
      }

      // Pan coordinates (relative to canvas space)
      const tx = ((imageTransform.x - 50) / 100) * 1200;
      const ty = ((imageTransform.y - 50) / 100) * 1200;

      ctx.translate(1200 / 2 + tx, 1200 / 2 + ty);
      ctx.scale(imageTransform.scale, imageTransform.scale);

      // Object cover calculation
      const sWidthRef = baseImg.width;
      const sHeightRef = baseImg.height;
      const aspect = sWidthRef / sHeightRef;
      let sx = 0, sy = 0, sw = sWidthRef, sh = sHeightRef;

      if (aspect > 1) {
        sw = sHeightRef;
        sx = (sWidthRef - sHeightRef) / 2;
      } else if (aspect < 1) {
        sh = sWidthRef;
        sy = (sHeightRef - sWidthRef) / 2;
      }

      ctx.drawImage(baseImg, sx, sy, sw, sh, -1200 / 2, -1200 / 2, 1200, 1200);
      ctx.restore();

      const sunglassesMarkup = getSunglassesSVGMarkup(sunglassesStyle);

      const jointMarkup = getJointSVGMarkup(jointStyle);

      // Render Sunglasses with real 3D projection
      await drawPerspectiveVector(ctx, sunglassesMarkup, sunglassesTransform, 128, 30.72, 1200, sunglassesErasePaths);

      // Render Joint with real 3D projection
      await drawPerspectiveVector(ctx, jointMarkup, jointTransform, 124, 26.57, 1200, jointErasePaths);

      // Render procedurally drawn upward smoke plumes (Uncropped, scales dynamically!)
      drawSmokeTrail(ctx, jointTransform, smokeConfig, 1200);

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

        ctx.font = `bold 38px "${textConfig.fontFamily}", "Impact", "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const shadowOpacity = textConfig.shadowOpacity ?? 0.3;
        let gradientFill: string | CanvasGradient = '#ffffff';
        if (textConfig.colorPreset === 'chrome') {
          const grad = ctx.createLinearGradient(0, -20, 0, 20);
          grad.addColorStop(0, '#e0e7ff');
          grad.addColorStop(0.5, '#ffffff');
          grad.addColorStop(1, '#818cf8');
          gradientFill = grad;
        } else if (textConfig.colorPreset === 'solar-flare') {
          const grad = ctx.createLinearGradient(-150, 0, 150, 0);
          grad.addColorStop(0, '#ef4444');
          grad.addColorStop(0.5, '#f97316');
          grad.addColorStop(1, '#facc15');
          gradientFill = grad;
        } else if (textConfig.colorPreset === 'hyper-cyber') {
          const grad = ctx.createLinearGradient(-120, 0, 120, 0);
          grad.addColorStop(0, '#4ade80');
          grad.addColorStop(1, '#06b6d4');
          gradientFill = grad;
        } else if (textConfig.colorPreset === 'vaporwave') {
          const grad = ctx.createLinearGradient(-120, 0, 120, 0);
          grad.addColorStop(0, '#f472b6');
          grad.addColorStop(0.5, '#c084fc');
          grad.addColorStop(1, '#22d3ee');
          gradientFill = grad;
        } else if (textConfig.colorPreset === 'maga-tears') {
          const grad = ctx.createLinearGradient(-120, 0, 120, 0);
          grad.addColorStop(0, '#22d3ee'); // cyan-400
          grad.addColorStop(0.5, '#5eead4'); // teal-300
          grad.addColorStop(1, '#3b82f6'); // blue-500
          gradientFill = grad;
        } else if (textConfig.colorPreset === 'brutalist') {
          gradientFill = '#ffffff';
        }

        // Determine glow parameters
        let glowColor = '';
        let glowBlur = 0;

        if (textConfig.colorPreset === 'chrome') {
          glowColor = 'rgba(139, 92, 246, 0.85)';
          glowBlur = 6;
        } else if (textConfig.colorPreset === 'solar-flare') {
          glowColor = 'rgba(239, 68, 68, 0.85)';
          glowBlur = 5;
        } else if (textConfig.colorPreset === 'hyper-cyber') {
          glowColor = 'rgba(34, 197, 94, 0.85)';
          glowBlur = 4;
        } else if (textConfig.colorPreset === 'vaporwave') {
          glowColor = 'rgba(219, 39, 119, 0.85)';
          glowBlur = 5;
        } else if (textConfig.colorPreset === 'maga-tears') {
          glowColor = 'rgba(6, 182, 212, 0.85)';
          glowBlur = 5;
        } else if (textConfig.glowColor && textConfig.colorPreset !== 'brutalist') {
          glowColor = hexToRgba(textConfig.glowColor, 0.85);
          glowBlur = 6;
        }

        // Clear native shadows for manual layered shadow rendering
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Render shadows & glow if not brutalist
        if (textConfig.colorPreset !== 'brutalist') {
          // 1. Draw deepest layer: Black drop shadow (if enabled)
          if (textConfig.dropShadow !== false) {
            ctx.save();
            ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
            ctx.shadowBlur = 1.5 * finalScale;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2 * finalScale;
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
            ctx.fillText(textConfig.content, 0, 0);
            ctx.restore();
          }

          // 2. Draw middle layer: Glow shadow (if glowColor is defined)
          if (glowColor && glowBlur > 0) {
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowBlur * finalScale;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = glowColor;
            ctx.fillText(textConfig.content, 0, 0);
            ctx.restore();
          }
        }

        // Brutalist layout box & outline rendering
        if (textConfig.colorPreset === 'brutalist') {
          const textWidth = ctx.measureText(textConfig.content).width;
          const paddingX = 0.8 * 38; // 0.8em matching HTML
          const paddingY = 0.25 * 38; // 0.25em matching HTML
          const boxWidth = textWidth + paddingX * 2;
          const boxHeight = 38 + paddingY * 2;
          const x = -boxWidth / 2;
          const y = -boxHeight / 2;

          // 1. Draw flat shadow if dropShadow is active
          if (textConfig.dropShadow !== false) {
            ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
            ctx.fillRect(x + 0.1 * 38, y + 0.1 * 38, boxWidth, boxHeight);
          }

          // 2. Draw background box
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(x, y, boxWidth, boxHeight);

          // 3. Draw border box
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 0.1 * 38; // 0.1em matching HTML
          ctx.strokeRect(x, y, boxWidth, boxHeight);

          // 4. Draw text outline (WebkitTextStroke: 2px -> lineWidth = 4)
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#000000';
          ctx.strokeText(textConfig.content, 0, 0);
        }

        ctx.fillStyle = gradientFill;

        ctx.fillText(textConfig.content, 0, 0);
        ctx.restore();
      }

      const url = canvas.toDataURL('image/png');
      setExportedImage(url);
      setShowExportModal(true);

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

  // Synchronize 400x400 fast live preview with circular crop matching exactly
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

        let baseImg = baseImageCacheRef.current;
        if (!baseImg) {
          baseImg = new Image();
          baseImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            baseImg!.onload = () => resolve();
            baseImg!.onerror = () => reject(new Error('Canvas source loader failed.'));
            baseImg!.src = imageSrc;
          });
        }

        if (!active) return;

        // Render base photo with CSS-matching translate coordinates and scalezoom
        ctx.save();
        if (isMirrored) {
          ctx.translate(400, 0);
          ctx.scale(-1, 1);
        }

        const tx = ((imageTransform.x - 50) / 100) * 400;
        const ty = ((imageTransform.y - 50) / 100) * 400;
        ctx.translate(400 / 2 + tx, 400 / 2 + ty);
        ctx.scale(imageTransform.scale, imageTransform.scale);

        const sWidthRef = baseImg.width;
        const sHeightRef = baseImg.height;
        const aspect = sWidthRef / sHeightRef;
        let sx = 0, sy = 0, sw = sWidthRef, sh = sHeightRef;

        if (aspect > 1) {
          sw = sHeightRef;
          sx = (sWidthRef - sHeightRef) / 2;
        } else if (aspect < 1) {
          sh = sWidthRef;
          sy = (sHeightRef - sWidthRef) / 2;
        }

        ctx.drawImage(baseImg, sx, sy, sw, sh, -400 / 2, -400 / 2, 400, 400);
        ctx.restore();

        const sunglassesMarkup = getSunglassesSVGMarkup(sunglassesStyle);

        const jointMarkup = getJointSVGMarkup(jointStyle);

        await drawPerspectiveVector(ctx, sunglassesMarkup, sunglassesTransform, 128, 30.72, 400, sunglassesErasePaths);
        await drawPerspectiveVector(ctx, jointMarkup, jointTransform, 124, 26.57, 400, jointErasePaths);

        // Procedural smoke plumes drawn live onto output matching final high-res precisely
        drawSmokeTrail(ctx, jointTransform, smokeConfig, 400);

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

          const shadowOpacity = textConfig.shadowOpacity ?? 0.3;
          let gradientFill: string | CanvasGradient = '#ffffff';
          if (textConfig.colorPreset === 'chrome') {
            const grad = ctx.createLinearGradient(0, -20, 0, 20);
            grad.addColorStop(0, '#e0e7ff');
            grad.addColorStop(0.5, '#ffffff');
            grad.addColorStop(1, '#818cf8');
            gradientFill = grad;
          } else if (textConfig.colorPreset === 'solar-flare') {
            const grad = ctx.createLinearGradient(-150, 0, 150, 0);
            grad.addColorStop(0, '#ef4444');
            grad.addColorStop(0.5, '#f97316');
            grad.addColorStop(1, '#facc15');
            gradientFill = grad;
          } else if (textConfig.colorPreset === 'hyper-cyber') {
            const grad = ctx.createLinearGradient(-120, 0, 120, 0);
            grad.addColorStop(0, '#4ade80');
            grad.addColorStop(1, '#06b6d4');
            gradientFill = grad;
          } else if (textConfig.colorPreset === 'vaporwave') {
            const grad = ctx.createLinearGradient(-120, 0, 120, 0);
            grad.addColorStop(0, '#f472b6');
            grad.addColorStop(0.5, '#c084fc');
            grad.addColorStop(1, '#22d3ee');
            gradientFill = grad;
          } else if (textConfig.colorPreset === 'maga-tears') {
            const grad = ctx.createLinearGradient(-120, 0, 120, 0);
            grad.addColorStop(0, '#22d3ee');
            grad.addColorStop(0.5, '#5eead4');
            grad.addColorStop(1, '#3b82f6');
            gradientFill = grad;
          }

          // Determine glow parameters
          let glowColor = '';
          let glowBlur = 0;

          if (textConfig.colorPreset === 'chrome') {
            glowColor = 'rgba(139, 92, 246, 0.85)';
            glowBlur = 6;
          } else if (textConfig.colorPreset === 'solar-flare') {
            glowColor = 'rgba(239, 68, 68, 0.85)';
            glowBlur = 5;
          } else if (textConfig.colorPreset === 'hyper-cyber') {
            glowColor = 'rgba(34, 197, 94, 0.85)';
            glowBlur = 4;
          } else if (textConfig.colorPreset === 'vaporwave') {
            glowColor = 'rgba(219, 39, 119, 0.85)';
            glowBlur = 5;
          } else if (textConfig.colorPreset === 'maga-tears') {
            glowColor = 'rgba(6, 182, 212, 0.85)';
            glowBlur = 5;
          } else if (textConfig.glowColor && textConfig.colorPreset !== 'brutalist') {
            glowColor = hexToRgba(textConfig.glowColor, 0.85);
            glowBlur = 6;
          }

          // Clear native shadows for manual layered shadow rendering
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;

          // Render shadows & glow if not brutalist
          if (textConfig.colorPreset !== 'brutalist') {
            // 1. Draw deepest layer: Black drop shadow (if enabled)
            if (textConfig.dropShadow !== false) {
              ctx.save();
              ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
              ctx.shadowBlur = 1.5 * textTransform.scale;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 2 * textTransform.scale;
              ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
              ctx.fillText(textConfig.content, 0, 0);
              ctx.restore();
            }

            // 2. Draw middle layer: Glow shadow (if glowColor is defined)
            if (glowColor && glowBlur > 0) {
              ctx.save();
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = glowBlur * textTransform.scale;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
              ctx.fillStyle = glowColor;
              ctx.fillText(textConfig.content, 0, 0);
              ctx.restore();
            }
          }

          // Brutalist layout box & outline rendering
          if (textConfig.colorPreset === 'brutalist') {
            const textWidth = ctx.measureText(textConfig.content).width;
            const paddingX = 0.8 * 38; // 0.8em matching HTML
            const paddingY = 0.25 * 38; // 0.25em matching HTML
            const boxWidth = textWidth + paddingX * 2;
            const boxHeight = 38 + paddingY * 2;
            const x = -boxWidth / 2;
            const y = -boxHeight / 2;

            // 1. Draw flat shadow if dropShadow is active
            if (textConfig.dropShadow !== false) {
              ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
              ctx.fillRect(x + 0.1 * 38, y + 0.1 * 38, boxWidth, boxHeight);
            }

            // 2. Draw background box
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(x, y, boxWidth, boxHeight);

            // 3. Draw border box
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.1 * 38; // 0.1em matching HTML
            ctx.strokeRect(x, y, boxWidth, boxHeight);

            // 4. Draw text outline (WebkitTextStroke: 2px -> lineWidth = 4)
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#000000';
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
    imageTransform,
    sunglassesTransform,
    jointTransform,
    textTransform,
    textConfig,
    smokeConfig,
    isMirrored,
    sunglassesStyle,
    jointStyle
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" id="smokefleet-app-root">
      {/* Dynamic Cosmic Header */}
      <header className="bg-slate-950 border-b border-slate-900 sticky top-0 z-50 px-4 py-4 backdrop-blur-md/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Headline */}
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-emerald-500 to-cyan-500 p-2 rounded-xl shadow-glow shadow-emerald-500/20">
              <span className="font-mono font-black text-slate-955 tracking-tighter text-sm">#SF</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* X Preview Trigger */}
            <button
              onClick={() => setShowXPreviewModal(true)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-3 py-1.5 h-8.5 rounded-xl font-sans font-bold text-xs flex items-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer select-none"
              title="Open X Profile Live Simulator"
            >
              <Twitter className="w-3.5 h-3.5" />
              <span>X Preview</span>
            </button>

            {/* Download Avatar */}
            <button
              onClick={compileAndDownload}
              disabled={!imageSrc || isExporting}
              className={`font-sans font-black text-xs py-1.5 px-3.5 h-8.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all select-none
                ${(!imageSrc || isExporting)
                  ? 'bg-slate-900 border border-slate-850/60 text-slate-600 cursor-not-allowed opacity-60' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-slate-100 hover:to-slate-105 text-slate-955 shadow-lg shadow-emerald-500/10 cursor-pointer'
                }`}
              title={!imageSrc ? "Please upload a profile photo first" : "Render and download composite image"}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Download Avatar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Arena */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow w-full">
        <div className="lg:col-span-12 flex flex-col gap-2 border-b border-slate-900 pb-4 mb-2">
          <h2 className="font-sans font-black text-2xl md:text-3xl text-white tracking-tight">
            #smokefleet avatar creator
          </h2>
          <p className="text-xs md:text-sm text-slate-400 font-mono leading-relaxed">
            Create your own smokefleet avatar, 100% AI free and 100% anonymous, nothing is sent to a server, everything stays in your browser.
          </p>
        </div>
        
        {/* LEFT COLUMN: STICKY HERO VIEWPORT */}
        <div className="lg:col-span-6 lg:sticky lg:top-[88px] z-20 h-fit flex flex-col gap-5">
          
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-4 md:p-5 shadow-2xl relative">
            
            {/* Viewport Action Badges */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
                  Avatar Preview
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
                      ? 'text-slate-305 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800 cursor-pointer active:scale-95'
                      : 'text-slate-600 bg-slate-950/40 border-slate-900 cursor-not-allowed opacity-40'
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
                      ? 'text-slate-305 hover:text-white bg-slate-900 hover:bg-slate-800 border-slate-800 cursor-pointer active:scale-95'
                      : 'text-slate-600 bg-slate-950/40 border-slate-900 cursor-not-allowed opacity-40'
                  }`}
                  title="Redo next change"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>

                {/* Reset Elements */}
                <button
                  onClick={handleResetAlignment}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-mono bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-800"
                  title="Reset positions to default alignments"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Interactive Canvas Grid */}
            <EditableCanvas
              imageSrc={imageSrc}
              imageTransform={imageTransform}
              sunglassesTransform={sunglassesTransform}
              jointTransform={jointTransform}
              textTransform={textTransform}
              selectedElement={selectedElement}
              textConfig={textConfig}
              smokeConfig={smokeConfig}
              showTwitterMask={showTwitterMask}
              sunglassesErasePaths={sunglassesErasePaths}
              jointErasePaths={jointErasePaths}
              onUpdateImage={setImageTransform}
              onUpdateSunglasses={setSunglassesTransform}
              onUpdateJoint={setJointTransform}
              onUpdateText={setTextTransform}
              setSelectedElement={setSelectedElement}
              isMirrored={isMirrored}
              sunglassesStyle={sunglassesStyle}
              jointStyle={jointStyle}
              activeStep={activeStep}
            />

          </div>

        </div>

        {/* RIGHT COLUMN: WORKSPACE TOOL SUITE & COMPACT DECK */}
        <div className="lg:col-span-6 flex flex-col gap-6" id="smokefleet-editor-suite">

          {/* 3-STEP FLOW NAVIGATION */}
          <div className="grid grid-cols-6 gap-3 bg-slate-900/40 p-1.5 rounded-2xl border border-slate-900">
            <button
              type="button"
              onClick={() => setActiveStep('photo')}
              className={`col-span-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                activeStep === 'photo'
                  ? 'bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/50 text-white font-bold shadow-lg shadow-indigo-500/10'
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeStep === 'photo' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-950 text-slate-500'}`}>
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold leading-none">Step 1</span>
                <span className="text-xs font-sans mt-0.5 font-bold uppercase leading-none">Photo</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveStep('customize');
                if (selectedElement === 'background') {
                  setSelectedElement('sunglasses');
                }
              }}
              className={`col-span-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                activeStep === 'customize'
                  ? 'bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/50 text-white font-bold shadow-lg shadow-emerald-500/10'
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeStep === 'customize' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-950 text-slate-500'}`}>
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold leading-none">Step 2</span>
                <span className="text-xs font-sans mt-0.5 font-bold uppercase leading-none">Customize</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('download')}
              className={`col-span-2 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center select-none cursor-pointer ${
                activeStep === 'download'
                  ? 'bg-gradient-to-tr from-purple-500/20 to-pink-500/20 border border-purple-500/50 text-white font-bold shadow-lg shadow-purple-500/10'
                  : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${activeStep === 'download' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-950 text-slate-500'}`}>
                <Download className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold leading-none">Step 3</span>
                <span className="text-xs font-sans mt-0.5 font-bold uppercase leading-none">Download</span>
              </div>
            </button>
          </div>

          {/* STEP 1: PHOTO */}
          {activeStep === 'photo' && (
            <div className="flex flex-col gap-5">
              {/* UPLOAD PROFILE PHOTO */}
              <section className="bg-slate-955 border border-indigo-950/40 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.03)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full pointer-events-none" />
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/10 p-3 rounded-2xl text-indigo-400 shrink-0">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-205 uppercase tracking-wide">
                      Upload Profile Photo
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                      Select or drag-and-drop a portrait photo.
                    </p>
                  </div>
                </div>

                <div className="border border-dashed border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-6 text-center transition-all bg-slate-900/20 flex flex-col items-center justify-center gap-3 relative">
                  <span className="text-xs text-slate-400 font-medium">Drag &amp; drop your image here, or click below</span>
                  <label className="bg-indigo-500 hover:bg-indigo-400 text-slate-955 font-sans font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer select-none uppercase tracking-wider shadow-md">
                    Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </section>

              {/* PHOTO ADJUSTMENTS */}
              <section className="bg-slate-955 border border-slate-900 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold font-mono tracking-wider text-slate-305 uppercase">
                      Photo Adjustments
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsMirrored(!isMirrored)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-medium transition-all flex items-center gap-2 cursor-pointer ${
                      isMirrored
                         ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-[0_0_8px_rgba(139,92,246,0.15)]'
                         : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-355'
                    }`}
                    title="Horizontally flip the background image"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Flip Image
                  </button>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                      <span>Zoom Level (Scale)</span>
                      <span className="text-indigo-400">{imageTransform.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.00"
                      max="4.50"
                      step="0.05"
                      value={imageTransform.scale}
                      onChange={(e) => {
                        setImageTransform({ ...imageTransform, scale: parseFloat(e.target.value) });
                        setSelectedElement('background');
                      }}
                      className="w-full accent-indigo-500 cursor-ew-resize py-1"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* STEP 2: CUSTOMIZE */}
          {activeStep === 'customize' && (
            <div className="flex flex-col gap-4">
              {/* DYNAMIC LAYER INSPECTOR POPUP PANEL */}
              <div className="bg-slate-955 border border-slate-900 rounded-3xl p-3.5 shadow-xl flex flex-col gap-3">
                {/* Quick-switch layout tabs */}
                <div className="grid grid-cols-3 bg-slate-900/60 p-1 rounded-2xl border border-slate-900/80 gap-1">
                  {[
                    { key: 'sunglasses', label: '🕶️ Shades' },
                    { key: 'joint', label: '🚬 Joint' },
                    { key: 'text', label: '💬 Watermark' },
                  ].map((layer) => (
                    <button
                      key={layer.key}
                      type="button"
                      onClick={() => setSelectedElement(layer.key as SelectedElementType)}
                      className={`py-3 px-2 rounded-xl text-xs md:text-sm font-sans font-bold transition-all cursor-pointer ${
                        selectedElement === layer.key
                          ? 'bg-slate-800 text-white shadow-md border border-slate-700/50'
                          : 'text-slate-455 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
                      }`}
                    >
                      {layer.label}
                    </button>
                  ))}
                </div>

                {/* Transform settings tailored exactly to the selected layer */}
                <div className="space-y-4 pt-1">
                  
                  {/* SHADES TAB CONTENT */}
                  {selectedElement === 'sunglasses' && (
                    <div className="space-y-4">
                      {/* Sunglasses Style selection */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-mono font-medium text-slate-400">
                          Choose Sunglasses Style:
                        </label>
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { id: 'aviator', label: 'Aviator' },
                            { id: 'classic', label: 'Classic' },
                            { id: 'goggles', label: 'Goggles' },
                            { id: 'visor', label: 'Visor' },
                            { id: 'stacked', label: 'Stacked' },
                          ].map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setSunglassesStyle(style.id as any)}
                              className={`p-1 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center min-h-[36px] ${
                                sunglassesStyle === style.id
                                  ? 'bg-emerald-500/10 border-emerald-500/80 text-white shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-755 hover:text-slate-205'
                              }`}
                            >
                              <div className="text-[10px] font-sans font-bold">{style.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Masking Eraser deck (only relevant for overlays) */}
                      <div className="pt-4 border-t border-slate-900 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                          <span>Background Eraser Brush</span>
                          <span className="text-emerald-400">{eraserBrushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="18"
                          step="1"
                          value={eraserBrushSize}
                          onChange={(e) => setEraserBrushSize(parseInt(e.target.value))}
                          className="w-full accent-emerald-400 cursor-ew-resize py-1 mb-2.5"
                        />
                        <EraserCanvas
                          elementType="sunglasses"
                          erasePaths={sunglassesErasePaths}
                          onChangeErasePaths={setSunglassesErasePaths}
                          brushSize={eraserBrushSize}
                          sunglassesStyle={sunglassesStyle}
                          jointStyle={jointStyle}
                        />
                      </div>
                    </div>
                  )}

                  {/* JOINT TAB CONTENT */}
                  {selectedElement === 'joint' && (
                    <div className="space-y-4">
                      {/* Joint Style selection */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-mono font-medium text-slate-400">
                          Choose Joint Style:
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                          {[
                            { id: 'photo', label: '☘️ OG Kush' },
                            { id: 'classic', label: '🚬 Ganja' },
                            { id: 'cigar', label: '🪵 El Blunto' },
                            { id: 'cone', label: '📐 Purple Haze' },
                          ].map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setJointStyle(style.id as any)}
                              className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center min-h-[36px] ${
                                jointStyle === style.id
                                  ? 'bg-emerald-500/10 border-emerald-500/80 text-white shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-755 hover:text-slate-205'
                              }`}
                            >
                              <div className="text-[10px] font-sans font-bold">{style.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Smoke Color selection */}
                      <div className="pt-4 border-t border-slate-900 space-y-2">
                        <label className="block text-[11px] font-mono font-medium text-slate-400">
                          Smoke Color:
                        </label>
                        <div className="flex items-center gap-3.5 py-1">
                          {[
                            { name: 'Vapor Neon', hex: '#34d399', preset: 'neon' },
                            { name: 'Purple Haze', hex: '#a855f7', preset: 'haze' },
                            { name: 'Sunset Glow', hex: '#f97316', preset: 'sunset' },
                            { name: 'Coal Black', hex: '#18181b', preset: 'black' },
                            { name: 'Ice Classic', hex: '#ffffff', preset: 'classic' },
                          ].map((smoke) => (
                            <button
                              key={smoke.preset}
                              type="button"
                              onClick={() => setSmokeConfig({ ...smokeConfig, color: smoke.hex, type: smoke.preset as any })}
                              className={`w-10 h-10 rounded-full shrink-0 aspect-square transition-all cursor-pointer border-2 ${
                                smokeConfig.type === smoke.preset
                                  ? 'border-purple-500 scale-110 shadow-lg shadow-purple-500/30'
                                  : 'border-slate-800 hover:border-slate-600 hover:scale-105'
                              }`}
                              style={{ backgroundColor: smoke.hex }}
                              title={smoke.name}
                            />
                          ))}
                        </div>

                        {/* Smoke Intensity slider */}
                        <div className="bg-slate-900/30 p-2 rounded-xl border border-slate-900/60 mt-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-455 mb-0.5">
                            <span>Smoke Intensity level</span>
                            <span className="text-purple-400">{smokeConfig.intensity}/5</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="5"
                            step="1"
                            value={smokeConfig.intensity}
                            onChange={(e) => setSmokeConfig({ ...smokeConfig, intensity: parseInt(e.target.value) })}
                            className="w-full accent-purple-400 cursor-ew-resize py-1"
                          />
                        </div>
                      </div>

                      {/* Masking Eraser deck (only relevant for overlays) */}
                      <div className="pt-4 border-t border-slate-900 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
                          <span>Background Eraser Brush</span>
                          <span className="text-emerald-400">{eraserBrushSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="18"
                          step="1"
                          value={eraserBrushSize}
                          onChange={(e) => setEraserBrushSize(parseInt(e.target.value))}
                          className="w-full accent-emerald-400 cursor-ew-resize py-1 mb-2.5"
                        />
                        <EraserCanvas
                          elementType="joint"
                          erasePaths={jointErasePaths}
                          onChangeErasePaths={setJointErasePaths}
                          brushSize={eraserBrushSize}
                          sunglassesStyle={sunglassesStyle}
                          jointStyle={jointStyle}
                        />
                      </div>
                    </div>
                  )}

                  {/* WATERMARK / TEXT TAB CONTENT */}
                  {selectedElement === 'text' && (
                    <div className="space-y-4">
                      {/* Watermark input & settings */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-mono font-medium text-slate-400">
                          Edit Text:
                        </label>
                        <input
                          type="text"
                          maxLength={24}
                          value={textConfig.content}
                          onChange={(e) => {
                            setTextConfig({ ...textConfig, content: e.target.value });
                            setSelectedElement('text');
                          }}
                          className="w-full bg-slate-900 border border-slate-850 focus:border-cyan-500/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                          placeholder="e.g. #smokefleet"
                        />

                        <div className="flex items-center justify-between gap-4 mt-0.5">
                          {/* Drop Shadow Checkbox */}
                          <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-mono text-slate-400 font-bold uppercase">
                            <input
                              type="checkbox"
                              checked={textConfig.dropShadow !== false}
                              onChange={(e) => {
                                setTextConfig({ ...textConfig, dropShadow: e.target.checked });
                                setSelectedElement('text');
                              }}
                              className="w-4 h-4 rounded bg-slate-900 border-slate-800 text-cyan-500 focus:ring-cyan-500/20 focus:ring-offset-slate-950 accent-cyan-500"
                            />
                            <span>Drop Shadow</span>
                          </label>

                          {/* Opacity Slider */}
                          <div className="flex-grow max-w-[150px]">
                            <div className="flex justify-between text-[9px] font-mono text-slate-455 mb-0.5">
                              <span>Shadow Opacity</span>
                              <span className="text-cyan-400">{Math.round((textConfig.shadowOpacity ?? 0.3) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max="1.0"
                              step="0.05"
                              value={textConfig.shadowOpacity ?? 0.3}
                              onChange={(e) => {
                                setTextConfig({ ...textConfig, shadowOpacity: parseFloat(e.target.value) });
                                setSelectedElement('text');
                              }}
                              className="w-full accent-cyan-500 cursor-ew-resize py-0.5"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Preset selector */}
                      <div className="pt-4 border-t border-slate-900 space-y-1.5">
                        <label className="block text-[11px] font-mono font-medium text-slate-400">
                          Choose Preset:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { name: 'Stable Genius', key: 'hyper-cyber', preview: 'bg-gradient-to-r from-green-400 to-cyan-400 text-transparent bg-clip-text' },
                            { name: 'Fake News', key: 'chrome', preview: 'bg-gradient-to-b from-slate-200 to-slate-450 text-transparent bg-clip-text' },
                            { name: 'Orange Man', key: 'solar-flare', preview: 'bg-gradient-to-r from-red-500 to-yellow-350 text-transparent bg-clip-text' },
                            { name: 'Woke Mind Virus', key: 'vaporwave', preview: 'bg-gradient-to-r from-pink-400 to-cyan-300 text-transparent bg-clip-text' },
                            { name: 'Total Immunity', key: 'brutalist', preview: 'text-white' },
                            { name: 'MAGA Tears', key: 'maga-tears', preview: 'bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 text-transparent bg-clip-text' },
                          ].map((style) => (
                            <button
                              key={style.key}
                              type="button"
                              onClick={() => {
                                let finalGlow = '#22d3ee';
                                if (style.key === 'chrome') finalGlow = 'rgba(139,92,246,0.85)';
                                else if (style.key === 'solar-flare') finalGlow = 'rgba(239,68,68,0.8)';
                                else if (style.key === 'vaporwave') finalGlow = 'rgba(219,39,119,0.75)';
                                else if (style.key === 'brutalist') finalGlow = '';
                                else if (style.key === 'maga-tears') finalGlow = 'rgba(6, 182, 212, 0.8)';
                                setTextConfig({ ...textConfig, colorPreset: style.key, glowColor: finalGlow });
                                setSelectedElement('text');
                              }}
                              className={`py-2.5 px-2.5 rounded-xl border text-center font-sans transition-all cursor-pointer ${
                                textConfig.colorPreset === style.key
                                  ? 'bg-slate-900 border-cyan-400 text-white font-bold'
                                  : 'border-slate-900 bg-slate-955 text-slate-455 hover:text-slate-225 hover:bg-slate-900/30'
                              }`}
                            >
                              <span className={`${style.preview} font-black uppercase text-xs md:text-sm tracking-wider`}>
                                {style.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Font selector */}
                      <div className="pt-4 border-t border-slate-900 space-y-1.5">
                        <label className="block text-[11px] font-mono font-medium text-slate-400">
                          Choose Font Typography:
                        </label>
                        <div className="flex flex-wrap gap-2 items-center">
                          {['JetBrains Mono', 'Impact', 'Space Grotesk', 'Playfair Display', 'Inter'].map((font) => (
                            <button
                              key={font}
                              type="button"
                              onClick={() => {
                                setTextConfig({ ...textConfig, fontFamily: font });
                                setSelectedElement('text');
                              }}
                              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border cursor-pointer ${
                                textConfig.fontFamily === font
                                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                              style={{ fontFamily: font }}
                            >
                              {font}
                            </button>
                          ))}

                          {/* "Other" Dropdown */}
                          <div className="relative">
                            <select
                              value={['JetBrains Mono', 'Impact', 'Space Grotesk', 'Playfair Display', 'Inter'].includes(textConfig.fontFamily) ? '' : textConfig.fontFamily}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setTextConfig({ ...textConfig, fontFamily: e.target.value });
                                  setSelectedElement('text');
                                }
                              }}
                              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all border bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer ${
                                !['JetBrains Mono', 'Impact', 'Space Grotesk', 'Playfair Display', 'Inter'].includes(textConfig.fontFamily)
                                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold'
                                  : ''
                              }`}
                              style={{
                                fontFamily: !['JetBrains Mono', 'Impact', 'Space Grotesk', 'Playfair Display', 'Inter'].includes(textConfig.fontFamily)
                                  ? textConfig.fontFamily
                                  : undefined
                              }}
                            >
                              <option value="" disabled className="bg-slate-950 text-slate-500 font-sans">
                                Other Fonts...
                              </option>
                              {[
                                'Bebas Neue',
                                'Poppins',
                                'Montserrat',
                                'Oswald',
                                'Permanent Marker',
                                'Press Start 2P',
                                'Cinzel',
                                'Righteous',
                                'Syne',
                                'Creepster',
                                'Lobster',
                                'Pacifico',
                                'Russo One',
                                'Syncopate'
                              ].map((f) => (
                                <option key={f} value={f} className="bg-slate-950 text-slate-200" style={{ fontFamily: f }}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOWNLOAD */}
          {activeStep === 'download' && (
            <div className="flex flex-col gap-5">
              {/* DOWNLOAD BUTTON BOX */}
              <section className="bg-slate-950 border border-slate-900 rounded-3xl p-6 shadow-xl flex flex-col gap-5 items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-full pointer-events-none" />
                <div className="bg-emerald-500/10 p-4 rounded-full text-emerald-400 shrink-0">
                  <Download className="w-8 h-8 stroke-[2]" />
                </div>
                
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide">
                    Compile and Download PFP
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                    Ready to launch? Click the button below to compile all vector layers, 3D rotations, and smoke particles into a high-res 1200x1200px PNG.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={compileAndDownload}
                  disabled={!imageSrc || isExporting}
                  className={`w-full font-sans font-black text-sm py-3 px-5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all select-none shadow-lg cursor-pointer
                    ${(!imageSrc || isExporting)
                      ? 'bg-slate-900 border border-slate-850/60 text-slate-600 cursor-not-allowed opacity-60' 
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-slate-100 hover:to-slate-100 text-slate-950 shadow-emerald-500/20 shadow-xl'
                    }`}
                  title={!imageSrc ? "Please upload a profile photo first" : "Render and download composite image"}
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Compiling avatar...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 stroke-[2.5]" />
                      <span>Download High-Res Avatar</span>
                    </>
                  )}
                </button>
              </section>
            </div>
          )}

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
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 relative my-auto max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* High-res Image Preview */}
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-955 border border-slate-805 flex items-center justify-center shadow-inner group max-h-[260px] md:max-h-full">
                {exportedImage ? (
                   <img
                     src={exportedImage}
                     alt="Smokefleet High-Res PFP"
                     className="w-full h-full object-contain cursor-pointer rounded-2xl"
                     referrerPolicy="no-referrer"
                     onClick={() => {
                       const tempLink = document.createElement('a');
                       tempLink.download = `smokefleet-pfp-${Date.now()}.png`;
                       tempLink.href = exportedImage;
                       tempLink.click();
                     }}
                   />
                ) : (
                  <div className="text-slate-500 text-xs font-mono">Generating render ...</div>
                )}
              </div>

              {/* Accessibility dual actions */}
              <div className="flex flex-col gap-2">
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
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-sans font-black text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  Download File
                </button>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="w-full bg-slate-800 hover:bg-slate-755 text-slate-300 font-sans font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1 border border-slate-705 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* X Preview Modal */}
      <AnimatePresence>
        {showXPreviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowXPreviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 relative my-auto max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Close Button */}
              <button
                onClick={() => setShowXPreviewModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 p-1.5 rounded-full border border-slate-750 transition-colors cursor-pointer z-50"
                title="Close overlay"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* TwitterPreview Component inside Modal */}
              <div className="w-full">
                <TwitterPreview imageSrc={exportedImage || imageSrc} />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowXPreviewModal(false)}
                  className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 hover:text-white font-sans font-black text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
