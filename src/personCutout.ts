import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
} from '@mediapipe/tasks-vision';

const wasmRoot =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite';

let segmenterPromise: Promise<ImageSegmenter> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (!segmenterPromise) return;
    void segmenterPromise.then((segmenter) => segmenter.close());
    segmenterPromise = null;
  }, { once: true });
}

async function createSegmenter() {
  const vision = await FilesetResolver.forVisionTasks(wasmRoot);
  const options = {
    baseOptions: { modelAssetPath: modelUrl },
    runningMode: 'IMAGE' as const,
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  };

  try {
    return await ImageSegmenter.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'GPU' },
    });
  } catch {
    return ImageSegmenter.createFromOptions(vision, options);
  }
}

function getSegmenter() {
  segmenterPromise ??= createSegmenter();
  return segmenterPromise;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像を読み込めませんでした'));
    image.src = url;
  });
}

function toPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('画像を作成できませんでした')),
      'image/png',
    );
  });
}

function applyMask(image: HTMLImageElement, result: ImageSegmenterResult) {
  const mask = result.categoryMask;
  if (!mask) throw new Error('人物を検出できませんでした');

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を処理できませんでした');

  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height);
  const values = mask.getAsUint8Array();
  const maskWidth = mask.width;
  const maskHeight = mask.height;

  for (let y = 0; y < height; y += 1) {
    const maskY = Math.min(maskHeight - 1, Math.floor(y * maskHeight / height));
    for (let x = 0; x < width; x += 1) {
      const maskX = Math.min(maskWidth - 1, Math.floor(x * maskWidth / width));
      const pixelIndex = y * width + x;
      pixels.data[pixelIndex * 4 + 3] = values[maskY * maskWidth + maskX] === 0 ? 0 : 255;
    }
  }

  context.putImageData(pixels, 0, 0);
  mask.close();
  return canvas;
}

export async function cutOutPerson(
  sourceUrl: string,
  onProgress?: (progress: number) => void,
) {
  onProgress?.(10);
  const [segmenter, image] = await Promise.all([getSegmenter(), loadImage(sourceUrl)]);
  onProgress?.(45);
  const result = segmenter.segment(image);
  onProgress?.(80);
  const canvas = applyMask(image, result);
  const blob = await toPng(canvas);
  onProgress?.(100);
  return blob;
}
