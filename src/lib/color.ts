export function deriveColorFromPubkey(pubkey: string): {
  hue: number;
  saturation: number;
  brightness: number;
} {
  // Convert HEX pubkey to Int
  const pubkeyInt = parseInt(pubkey, 16);

  // Calculate the Hue value: Int % 356
  const hue = pubkeyInt % 356;

  // Set Saturation to 90 for Hues between 216 and 273, use 80 for the rest
  const saturation = hue >= 216 && hue <= 273 ? 90 : 80;

  // Set Brightness to 65 for Hues between 32 and 212, use 85 for the rest
  const brightness = hue >= 32 && hue <= 212 ? 65 : 85;

  return { hue, saturation, brightness };
}

export function pubkeyToHslString(pubkey: string): string {
  const { hue, saturation, brightness } = deriveColorFromPubkey(pubkey);
  return `hsl(${hue}, ${saturation}%, ${brightness}%)`;
}

export function hslToHex({
  hue,
  saturation,
  brightness,
}: {
  hue: number;
  saturation: number;
  brightness: number;
}): string {
  const s = saturation / 100;
  const l = brightness / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (0 <= hue && hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= hue && hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= hue && hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= hue && hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= hue && hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= hue && hue < 360) {
    r = c;
    g = 0;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function pubkeyToHex(pubkey: string): string {
  const color = deriveColorFromPubkey(pubkey);
  return hslToHex(color);
}
