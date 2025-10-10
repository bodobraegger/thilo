// Color utility functions for generating color palettes from base colors

/**
 * Convert hex color to HSL values
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL values to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate a complete Tailwind-style color palette from a base color
 */
export function generateColorPalette(baseColor: string): Record<string, string> {
  if (!baseColor || !baseColor.match(/^#[0-9A-F]{6}$/i)) {
    // Fallback to default primary color if invalid color
    baseColor = '#521d3a';
  }
  
  const hsl = hexToHsl(baseColor);
  
  // Use the base color as 500 or 600 depending on its lightness
  const isLight = hsl.l > 50;
  
  return {
    // Tailwind-style primary color scale (50-950) - same saturation but much closer to white
    'primary-50':  hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 70, 98)),
    'primary-100': hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 60, 96)),
    'primary-200': hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 50, 93)),
    'primary-300': hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 40, 89)),
    'primary-400': isLight ? baseColor : hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 8, 70)),
    'primary-500': isLight ? hslToHex(hsl.h, Math.min(hsl.s + 5, 100), Math.max(hsl.l - 5, 40)) : hslToHex(hsl.h, hsl.s, hsl.l),
    'primary-600': isLight ? hslToHex(hsl.h, Math.min(hsl.s + 10, 100), Math.max(hsl.l - 15, 25)) : baseColor,
    'primary-700': hslToHex(hsl.h, Math.min(hsl.s + 10, 100), Math.max(hsl.l - 18, 20)),
    'primary-800': hslToHex(hsl.h, Math.min(hsl.s + 15, 100), Math.max(hsl.l - 28, 15)),
    'primary-900': hslToHex(hsl.h, Math.min(hsl.s + 20, 100), Math.max(hsl.l - 38, 10)),
    'primary-950': hslToHex(hsl.h, Math.min(hsl.s + 25, 100), Math.max(hsl.l - 48, 5)),
    
    // Semantic aliases pointing to appropriate shades
    'primary': baseColor, // Original color
    'primary-light': hslToHex(hsl.h, Math.max(hsl.s - 20, 10), Math.min(hsl.l + 20, 85)), // ~300 equivalent
    'primary-dark': hslToHex(hsl.h, Math.min(hsl.s + 10, 100), Math.max(hsl.l - 20, 15)), // ~700 equivalent
    
    // Interactive states
    'primary-hover': hslToHex(hsl.h, Math.min(hsl.s + 5, 100), Math.max(hsl.l - 5, 20)),
    'primary-active': hslToHex(hsl.h, Math.min(hsl.s + 8, 100), Math.max(hsl.l - 10, 15)),
    'primary-focus': hslToHex(hsl.h, Math.max(hsl.s - 10, 15), Math.min(hsl.l + 10, 75)),
    'primary-muted': hslToHex(hsl.h, Math.max(hsl.s - 35, 5), Math.min(hsl.l + 30, 92)),
    
    // Border and background variants
    'primary-border': hslToHex(hsl.h, Math.max(hsl.s - 25, 10), Math.min(hsl.l + 25, 85)),
    'primary-bg': hslToHex(hsl.h, Math.max(hsl.s - 35, 5), Math.min(hsl.l + 40, 95)),
    'primary-fg': hsl.l > 50 ? '#ffffff' : hslToHex(hsl.h, Math.max(hsl.s - 30, 10), Math.min(hsl.l + 45, 95)),
    
    // Text variants
    'primary-text': baseColor,
    'primary-text-light': hslToHex(hsl.h, Math.max(hsl.s - 10, 15), Math.min(hsl.l + 15, 70)),
    'primary-text-muted': hslToHex(hsl.h, Math.max(hsl.s - 20, 10), hsl.l > 50 ? Math.max(hsl.l - 20, 30) : Math.min(hsl.l + 20, 70)),
  };
}

/**
 * Generate CSS custom property declarations for a color palette
 */
export function generateColorCSSProperties(baseColor: string): string {
  const palette = generateColorPalette(baseColor);
  
  // Generate CSS custom property string with new naming convention
  const newStyleProperties = Object.entries(palette)
    .map(([key, value]) => `--color-${key}: ${value};`)
    .join('\n  ');
  return `${newStyleProperties}`;
}
