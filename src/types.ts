export interface ElementTransform {
  x: number; // percentage of canvas width (0-100)
  y: number; // percentage of canvas height (0-100)
  scale: number; // scale factor (0.1 to 5)
  rotateX: number; // pitch (-90 to 90 degrees)
  rotateY: number; // yaw (-90 to 90 degrees)
  rotateZ: number; // roll (-180 to 180 degrees)
  opacity?: number;
}

export type SelectedElementType = 'sunglasses' | 'joint' | 'text' | null;

export interface SmokeConfig {
  color: string;
  intensity: number; // 0 to 5
  type: 'classic' | 'neon' | 'haze' | 'sunset';
}

export interface TextConfig {
  content: string;
  fontFamily: string;
  colorPreset: string; // gradient preset name
  fontSizeValue: number; // relative size
  letterSpacing: number; // spacing
  glowColor: string;
}

export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
  attribution?: string;
}

export interface TextGradientPreset {
  name: string;
  class: string;
  color1: string;
  color2: string;
  shadow: string;
}
