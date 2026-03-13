export interface CompressionPreset {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  maxSizeKB: number;
  cropToAspect?: number;
}

export const LOGO_PRESET: CompressionPreset = {
  maxWidth: 512,
  maxHeight: 512,
  quality: 0.9,
  maxSizeKB: 200,
  cropToAspect: 1,
};

export const HERO_PRESET: CompressionPreset = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  maxSizeKB: 800,
  cropToAspect: 16 / 9,
};

export const GALLERY_PRESET: CompressionPreset = {
  maxWidth: 1200,
  maxHeight: 900,
  quality: 0.85,
  maxSizeKB: 500,
};

export const MENU_ITEM_PRESET: CompressionPreset = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.85,
  maxSizeKB: 300,
  cropToAspect: 4 / 3,
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function computeCropRegion(
  srcW: number,
  srcH: number,
  targetAspect: number
): { sx: number; sy: number; sw: number; sh: number } {
  const srcAspect = srcW / srcH;
  let sw: number, sh: number, sx: number, sy: number;

  if (srcAspect > targetAspect) {
    sh = srcH;
    sw = srcH * targetAspect;
    sx = (srcW - sw) / 2;
    sy = 0;
  } else {
    sw = srcW;
    sh = srcW / targetAspect;
    sx = 0;
    sy = (srcH - sh) / 2;
  }

  return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(sw), sh: Math.round(sh) };
}

function canvasToBase64(canvas: HTMLCanvasElement, quality: number): string {
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

function base64SizeKB(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}

export interface CompressionResult {
  base64: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  preset: CompressionPreset
): Promise<CompressionResult> {
  const originalSizeKB = Math.round(file.size / 1024);
  const img = await loadImage(file);

  let { sx, sy, sw, sh } = { sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };

  if (preset.cropToAspect) {
    ({ sx, sy, sw, sh } = computeCropRegion(
      img.naturalWidth,
      img.naturalHeight,
      preset.cropToAspect
    ));
  }

  const aspect = sw / sh;
  let drawW: number, drawH: number;
  if (sw > preset.maxWidth || sh > preset.maxHeight) {
    if (aspect > preset.maxWidth / preset.maxHeight) {
      drawW = preset.maxWidth;
      drawH = Math.round(preset.maxWidth / aspect);
    } else {
      drawH = preset.maxHeight;
      drawW = Math.round(preset.maxHeight * aspect);
    }
  } else {
    drawW = sw;
    drawH = sh;
  }

  const canvas = document.createElement('canvas');
  canvas.width = drawW;
  canvas.height = drawH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, drawW, drawH);

  let quality = preset.quality;
  let base64 = canvasToBase64(canvas, quality);
  const minQuality = 0.3;
  const step = 0.05;

  while (base64SizeKB(base64) > preset.maxSizeKB && quality > minQuality) {
    quality -= step;
    base64 = canvasToBase64(canvas, quality);
  }

  return {
    base64,
    originalSizeKB,
    compressedSizeKB: base64SizeKB(base64),
    width: drawW,
    height: drawH,
  };
}

export function formatFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
