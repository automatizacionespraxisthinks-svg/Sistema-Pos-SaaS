/** Convert hex color string to [r, g, b] tuple, or null if invalid */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** Linear interpolation between two channel values */
function lerp(a: number, b: number, t: number) {
  return Math.min(255, Math.max(0, Math.round(a + (b - a) * t)));
}

/**
 * Generate all 10 Tailwind primary shades from a single hex color.
 * The input hex is treated as the `primary-600` value.
 * Returns an object mapping shade number → "R G B" CSS variable string.
 */
export function generatePrimaryShades(hex: string): Record<string, string> | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;

  const light = (t: number) => [lerp(r, 255, t), lerp(g, 255, t), lerp(b, 255, t)];
  const dark  = (t: number) => [lerp(r, 0, t),   lerp(g, 0, t),   lerp(b, 0, t)];
  const v     = (c: number[]) => `${c[0]} ${c[1]} ${c[2]}`;

  return {
    50:  v(light(0.94)),
    100: v(light(0.88)),
    200: v(light(0.75)),
    300: v(light(0.58)),
    400: v(light(0.36)),
    500: v(light(0.14)),
    600: `${r} ${g} ${b}`,
    700: v(dark(0.15)),
    800: v(dark(0.32)),
    900: v(dark(0.50)),
  };
}

/**
 * Apply a hex color as the primary palette via CSS custom properties on <html>.
 * All Tailwind `primary-*` classes update immediately — no rebuild needed.
 */
export function applyPrimaryColor(hex: string): void {
  if (typeof document === 'undefined') return;
  const shades = generatePrimaryShades(hex);
  if (!shades) return;
  const root = document.documentElement;
  Object.entries(shades).forEach(([shade, value]) => {
    root.style.setProperty(`--p-${shade}`, value);
  });
}
