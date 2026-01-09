export function deriveColorFromPubkey(pubkey: string): {
  red: number;
  green: number;
  blue: number;
} {
  const hue = Number(BigInt("0x" + pubkey) % 356n);
  const h = hue / 60;
  const s = hue >= 216 && hue <= 273 ? 0.9 : 0.8;
  const v = hue >= 32 && hue <= 212 ? 0.65 : 0.85;

  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;

  // Determine RGB values based on hue sector
  const sector = Math.floor(h);
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector] || [c, 0, x];

  return {
    red: Math.round((r + m) * 255),
    green: Math.round((g + m) * 255),
    blue: Math.round((b + m) * 255),
  };
}

export function pubkeyToHslString(pubkey: string): string {
  const { red, green, blue } = deriveColorFromPubkey(pubkey);
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const l = (max + min) / 2;

  if (diff === 0) return `hsl(0, 0%, ${Math.round(l * 100)}%)`;

  const s = diff / (1 - Math.abs(2 * l - 1));
  let h =
    max === r
      ? ((g - b) / diff) % 6
      : max === g
        ? (b - r) / diff + 2
        : (r - g) / diff + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export function rgbToHex({
  red,
  green,
  blue,
}: {
  red: number;
  green: number;
  blue: number;
}): string {
  return `#${[red, green, blue].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function pubkeyToHex(pubkey: string): string {
  const color = deriveColorFromPubkey(pubkey);
  return rgbToHex(color);
}
