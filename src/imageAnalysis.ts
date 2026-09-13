export type ImageAnalysis = {
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  megapixels: number;
  aspectRatio: string;
  hasAlpha: boolean;
  bitDepth: number | null;
  colorModel: string | null;
  animated: boolean;
  colorCount: number;
  palette: string[];
  averageColor: string;
  averageLuminance: number;
  dynamicRange: number;
  shadowClipping: number;
  highlightClipping: number;
  perceptualHash: string;
  signature: string;
  sha256: string;
  metadata: Record<string, string>;
};

const loadImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした'));
    };
    image.src = url;
  });

const greatestCommonDivisor = (a: number, b: number): number =>
  b === 0 ? a : greatestCommonDivisor(b, a % b);

const valueToText = (value: unknown) => {
  if (value instanceof Date) return value.toLocaleString('ja-JP');
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value);
};

const includesAscii = (bytes: Uint8Array, text: string) => {
  const pattern = new TextEncoder().encode(text);
  outer: for (let index = 0; index <= bytes.length - pattern.length; index += 1) {
    for (let offset = 0; offset < pattern.length; offset += 1) {
      if (bytes[index + offset] !== pattern[offset]) continue outer;
    }
    return true;
  }
  return false;
};

const inspectFileHeader = (bytes: Uint8Array, mimeType: string) => {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const colorTypes: Record<number, string> = {
      0: 'グレースケール',
      2: 'RGB',
      3: 'インデックスカラー',
      4: 'グレースケール＋アルファ',
      6: 'RGBA',
    };
    return {
      signature: 'PNG',
      bitDepth: bytes[24] ?? null,
      colorModel: colorTypes[bytes[25]] ?? null,
      animated: includesAscii(bytes, 'acTL'),
    };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let bitDepth: number | null = null;
    for (let index = 2; index < bytes.length - 9;) {
      if (bytes[index] !== 0xff) {
        index += 1;
        continue;
      }
      const marker = bytes[index + 1];
      const length = (bytes[index + 2] << 8) + bytes[index + 3];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        bitDepth = bytes[index + 4];
        break;
      }
      index += Math.max(2, length + 2);
    }
    return { signature: 'JPEG', bitDepth, colorModel: 'YCbCr / RGB', animated: false };
  }
  const header = new TextDecoder('latin1').decode(bytes.slice(0, 32));
  if (header.startsWith('GIF8')) {
    return {
      signature: header.slice(0, 6),
      bitDepth: ((bytes[10] ?? 0) & 0b111) + 1,
      colorModel: 'インデックスカラー',
      animated: includesAscii(bytes, 'NETSCAPE2.0'),
    };
  }
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') {
    return {
      signature: 'WebP',
      bitDepth: 8,
      colorModel: 'YUV / RGB',
      animated: header.includes('VP8X') && Boolean((bytes[20] ?? 0) & 0b10),
    };
  }
  if (mimeType === 'image/svg+xml') {
    return { signature: 'SVG', bitDepth: null, colorModel: 'ベクター', animated: false };
  }
  return {
    signature: Array.from(bytes.slice(0, 8), (byte) => byte.toString(16).padStart(2, '0')).join(' '),
    bitDepth: null,
    colorModel: null,
    animated: false,
  };
};

const differenceHash = (image: HTMLImageElement) => {
  const canvas = document.createElement('canvas');
  canvas.width = 9;
  canvas.height = 8;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, 9, 8);
  const pixels = context.getImageData(0, 0, 9, 8).data;
  let bits = '';
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const left = (y * 9 + x) * 4;
      const right = left + 4;
      const leftLuma = pixels[left] * 0.299 + pixels[left + 1] * 0.587 + pixels[left + 2] * 0.114;
      const rightLuma = pixels[right] * 0.299 + pixels[right + 1] * 0.587 + pixels[right + 2] * 0.114;
      bits += leftLuma > rightLuma ? '1' : '0';
    }
  }
  return bits.match(/.{4}/g)!.map((part) => Number.parseInt(part, 2).toString(16)).join('');
};

export async function analyzeImage(file: File): Promise<ImageAnalysis> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const header = inspectFileHeader(bytes, file.type);
  const image = await loadImage(file);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const sample = document.createElement('canvas');
  const scale = Math.min(1, 160 / Math.max(width, height));
  sample.width = Math.max(1, Math.round(width * scale));
  sample.height = Math.max(1, Math.round(height * scale));
  const context = sample.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
  const colors = new Map<string, number>();
  let hasAlpha = false;
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let opaqueSamples = 0;
  let shadows = 0;
  let highlights = 0;
  const luminances: number[] = [];

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3];
    if (alpha < 255) hasAlpha = true;
    if (alpha < 32) continue;
    const luminance = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    redTotal += pixels[index];
    greenTotal += pixels[index + 1];
    blueTotal += pixels[index + 2];
    opaqueSamples += 1;
    luminances.push(luminance);
    if (luminance <= 4) shadows += 1;
    if (luminance >= 251) highlights += 1;
    const red = Math.round(pixels[index] / 32) * 32;
    const green = Math.round(pixels[index + 1] / 32) * 32;
    const blue = Math.round(pixels[index + 2] / 32) * 32;
    const key = [red, green, blue].map((channel) => Math.min(255, channel).toString(16).padStart(2, '0')).join('');
    colors.set(key, (colors.get(key) ?? 0) + 1);
  }

  const { parse } = await import('exifr');
  const rawMetadata = await parse(file, {
    tiff: true,
    exif: true,
    gps: true,
    xmp: true,
    iptc: true,
    icc: true,
    jfif: true,
    ihdr: true,
  }).catch(() => undefined) as Record<string, unknown> | undefined;
  const metadata = Object.fromEntries(
    Object.entries(rawMetadata ?? {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, valueToText(value)]),
  );
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const divisor = greatestCommonDivisor(width, height);
  luminances.sort((left, right) => left - right);
  const low = luminances[Math.floor(luminances.length * 0.05)] ?? 0;
  const high = luminances[Math.floor(luminances.length * 0.95)] ?? 0;
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');

  return {
    fileSize: file.size,
    mimeType: file.type || '不明',
    width,
    height,
    megapixels: (width * height) / 1_000_000,
    aspectRatio: `${width / divisor}:${height / divisor}`,
    hasAlpha,
    bitDepth: header.bitDepth,
    colorModel: header.colorModel,
    animated: header.animated,
    colorCount: colors.size,
    palette: [...colors.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([color]) => `#${color}`),
    averageColor: `#${toHex(redTotal / Math.max(1, opaqueSamples))}${toHex(greenTotal / Math.max(1, opaqueSamples))}${toHex(blueTotal / Math.max(1, opaqueSamples))}`,
    averageLuminance: luminances.reduce((sum, value) => sum + value, 0) / Math.max(1, luminances.length),
    dynamicRange: high - low,
    shadowClipping: (shadows / Math.max(1, opaqueSamples)) * 100,
    highlightClipping: (highlights / Math.max(1, opaqueSamples)) * 100,
    perceptualHash: differenceHash(image),
    signature: header.signature,
    sha256,
    metadata,
  };
}
