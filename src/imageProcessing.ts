export type ExportFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type ImageOptions = {
  outlineWidth: number;
  outlineColor: string;
  backgroundColor: string | null;
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  highlights: number;
  shadows: number;
  blackPoint: number;
  vibrance: number;
  warmth: number;
  tint: number;
  hdr: number;
  sharpness: number;
  vignette: number;
  grayscale: number;
  blur: number;
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  trim: boolean;
  cropAspect: number | null;
  padding: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowColor: string;
  outputWidth: number | null;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像を読み込めませんでした'));
    image.src = src;
  });

const alphaBounds = (canvas: HTMLCanvasElement) => {
  const { width, height } = canvas;
  const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 4) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  return right < left
    ? { x: 0, y: 0, width, height }
    : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
};

const canvasToBlob = (canvas: HTMLCanvasElement, format: ExportFormat, quality = 0.92) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像を書き出せませんでした'))),
      format,
      quality,
    );
  });

const clamp = (value: number) => Math.max(0, Math.min(255, value));

const applyPixelAdjustments = (canvas: HTMLCanvasElement, options: ImageOptions) => {
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const exposure = 2 ** (options.exposure / 100);
  const black = options.blackPoint * 0.8;
  const blackScale = 255 / Math.max(1, 255 - black);
  const hdr = options.hdr / 100;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    let red = data[index] * exposure;
    let green = data[index + 1] * exposure;
    let blue = data[index + 2] * exposure;
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const shadowWeight = Math.max(0, 1 - luminance / 150);
    const highlightWeight = Math.max(0, (luminance - 105) / 150);
    const tonalShift =
      (options.shadows * 0.85 * shadowWeight)
      + (options.highlights * 0.85 * highlightWeight)
      + (hdr * 48 * (shadowWeight - highlightWeight));
    red += tonalShift + options.warmth * 0.45 + options.tint * 0.18;
    green += tonalShift - options.tint * 0.35;
    blue += tonalShift - options.warmth * 0.45 + options.tint * 0.18;

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const vibrance = (options.vibrance / 100) * (1 - (max - min) / 255);
    const average = (red + green + blue) / 3;
    red += (red - average) * vibrance;
    green += (green - average) * vibrance;
    blue += (blue - average) * vibrance;

    data[index] = clamp((red - black) * blackScale);
    data[index + 1] = clamp((green - black) * blackScale);
    data[index + 2] = clamp((blue - black) * blackScale);
  }

  context.putImageData(imageData, 0, 0);

  if (options.sharpness > 0) {
    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = context.createImageData(canvas.width, canvas.height);
    result.data.set(source.data);
    const amount = options.sharpness / 100;
    const width = canvas.width;
    for (let y = 1; y < canvas.height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const offset = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          const center = source.data[offset + channel];
          const neighbors =
            source.data[offset - 4 + channel]
            + source.data[offset + 4 + channel]
            + source.data[offset - width * 4 + channel]
            + source.data[offset + width * 4 + channel];
          result.data[offset + channel] = clamp(center + (center * 4 - neighbors) * amount);
        }
        result.data[offset + 3] = source.data[offset + 3];
      }
    }
    context.putImageData(result, 0, 0);
  }

  if (options.vignette > 0) {
    const radius = Math.hypot(canvas.width, canvas.height) / 2;
    const gradient = context.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      radius * 0.35,
      canvas.width / 2,
      canvas.height / 2,
      radius,
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${options.vignette / 125})`);
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';
  }
};

export async function renderImage(
  sourceUrl: string,
  options: ImageOptions,
  format: ExportFormat = 'image/png',
  maxDimension?: number,
) {
  const image = await loadImage(sourceUrl);
  const rotated = options.rotation === 90 || options.rotation === 270;
  const naturalWidth = rotated ? image.naturalHeight : image.naturalWidth;
  const naturalHeight = rotated ? image.naturalWidth : image.naturalHeight;
  const requestedScale = options.outputWidth ? options.outputWidth / naturalWidth : 1;
  const previewScale = maxDimension ? maxDimension / Math.max(naturalWidth, naturalHeight) : requestedScale;
  const scale = maxDimension ? Math.min(requestedScale, previewScale) : requestedScale;
  const workWidth = Math.max(1, Math.round(naturalWidth * scale));
  const workHeight = Math.max(1, Math.round(naturalHeight * scale));

  const work = document.createElement('canvas');
  work.width = workWidth;
  work.height = workHeight;
  const workContext = work.getContext('2d')!;
  workContext.imageSmoothingEnabled = true;
  workContext.imageSmoothingQuality = 'high';
  workContext.filter = `brightness(${options.brightness}%) contrast(${options.contrast}%) saturate(${options.saturation}%) grayscale(${options.grayscale}%) blur(${options.blur}px)`;
  workContext.translate(workWidth / 2, workHeight / 2);
  workContext.rotate((options.rotation * Math.PI) / 180);
  workContext.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
  workContext.drawImage(
    image,
    (-image.naturalWidth * scale) / 2,
    (-image.naturalHeight * scale) / 2,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  );
  workContext.setTransform(1, 0, 0, 1, 0, 0);
  workContext.filter = 'none';
  applyPixelAdjustments(work, options);

  let bounds = options.trim ? alphaBounds(work) : { x: 0, y: 0, width: workWidth, height: workHeight };
  if (options.cropAspect) {
    const currentAspect = bounds.width / bounds.height;
    if (currentAspect > options.cropAspect) {
      const width = Math.round(bounds.height * options.cropAspect);
      bounds = { ...bounds, x: bounds.x + Math.floor((bounds.width - width) / 2), width };
    } else {
      const height = Math.round(bounds.width / options.cropAspect);
      bounds = { ...bounds, y: bounds.y + Math.floor((bounds.height - height) / 2), height };
    }
  }
  const content = document.createElement('canvas');
  content.width = bounds.width;
  content.height = bounds.height;
  content.getContext('2d')!.drawImage(
    work,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  );

  const edge = Math.max(0, Math.round(options.outlineWidth * scale));
  const padding = Math.max(0, Math.round(options.padding * scale));
  const shadowSpace = options.shadowBlur > 0
    ? Math.ceil((options.shadowBlur * 2 + Math.max(Math.abs(options.shadowOffsetX), Math.abs(options.shadowOffsetY))) * scale)
    : 0;
  const inset = edge + padding + shadowSpace;
  const outputWidth = content.width + inset * 2;
  const outputHeight = content.height + inset * 2;
  if (!maxDimension && (outputWidth > 8192 || outputHeight > 8192)) {
    throw new Error('加工後の画像を縦横8192px以下にしてください');
  }
  const output = document.createElement('canvas');
  output.width = outputWidth;
  output.height = outputHeight;
  const context = output.getContext('2d')!;

  if (options.backgroundColor || format === 'image/jpeg') {
    context.fillStyle = options.backgroundColor ?? '#ffffff';
    context.fillRect(0, 0, output.width, output.height);
  }

  if (edge > 0) {
    const silhouette = document.createElement('canvas');
    silhouette.width = content.width;
    silhouette.height = content.height;
    const silhouetteContext = silhouette.getContext('2d')!;
    silhouetteContext.drawImage(content, 0, 0);
    silhouetteContext.globalCompositeOperation = 'source-in';
    silhouetteContext.fillStyle = options.outlineColor;
    silhouetteContext.fillRect(0, 0, silhouette.width, silhouette.height);

    const steps = Math.max(24, edge * 8);
    for (let i = 0; i < steps; i += 1) {
      const angle = (i / steps) * Math.PI * 2;
      context.drawImage(
        silhouette,
        inset + Math.cos(angle) * edge,
        inset + Math.sin(angle) * edge,
      );
    }
  }

  if (options.shadowBlur > 0) {
    context.save();
    context.shadowBlur = options.shadowBlur * scale;
    context.shadowOffsetX = options.shadowOffsetX * scale;
    context.shadowOffsetY = options.shadowOffsetY * scale;
    context.shadowColor = options.shadowColor;
    context.drawImage(content, inset, inset);
    context.restore();
  }
  context.drawImage(content, inset, inset);
  return { blob: await canvasToBlob(output, format), width: output.width, height: output.height };
}
