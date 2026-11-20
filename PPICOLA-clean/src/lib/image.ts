/* Canvas helpers for image loading, transformation, cropping and export. */

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load this image. It may be corrupted or in an unsupported format."));
    img.src = url;
  });
}

export async function loadImageDims(url: string): Promise<{ width: number; height: number }> {
  const img = await loadImageElement(url);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

export type Rotation = 0 | 90 | 180 | 270;
export type CropArea = { x: number; y: number; width: number; height: number };

export type ImageEdits = {
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  crop: CropArea | null; // pixels in the *transformed* (rotated/flipped) image space
  zoom: number;
  brightness: number; // 50–150, default 100
  contrast: number; // 50–150, default 100
};

export const defaultEdits = (crop?: CropArea | null): ImageEdits => ({
  rotation: 0,
  flipH: false,
  flipV: false,
  crop: crop ?? null,
  zoom: 1,
  brightness: 100,
  contrast: 100,
});

/** Apply 90°-step rotation + flips and return the transformed image on a canvas. */
export function transformImage(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  rotation: Rotation,
  flipH: boolean,
  flipV: boolean
): HTMLCanvasElement {
  const swap = rotation === 90 || rotation === 270;
  const w = swap ? srcH : srcW;
  const h = swap ? srcW : srcH;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(source, -srcW / 2, -srcH / 2, srcW, srcH);
  return canvas;
}

/** Crop a region (natural px of the transformed image) and apply brightness/contrast. */
export function cropAndFilter(
  base: HTMLCanvasElement,
  crop: CropArea,
  brightness: number,
  contrast: number,
  maxDim = 4096
): HTMLCanvasElement {
  const sx = Math.max(0, Math.round(crop.x));
  const sy = Math.max(0, Math.round(crop.y));
  const sw = Math.min(base.width - sx, Math.max(1, Math.round(crop.width)));
  const sh = Math.min(base.height - sy, Math.max(1, Math.round(crop.height)));

  const scale = Math.min(1, maxDim / Math.max(sw, sh));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw * scale));
  out.height = Math.max(1, Math.round(sh * scale));
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  ctx.imageSmoothingQuality = "high";
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.drawImage(base, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

/** Downscale a canvas so its longest side ≤ maxDim (keeps phones from running out of memory). */
export function downscaleCanvas(source: HTMLCanvasElement, maxDim = 4096): HTMLCanvasElement {
  const longest = Math.max(source.width, source.height);
  if (longest <= maxDim) return source;
  const scale = maxDim / longest;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(source.width * scale));
  out.height = Math.max(1, Math.round(source.height * scale));
  const ctx = out.getContext("2d");
  if (!ctx) return source;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

/** Load any image Blob/File onto a white-flattened, downscaled canvas. */
export async function blobToCanvas(blob: Blob, maxDim = 6000): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    }
    return downscaleCanvas(canvas, maxDim);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not export this image — it may be too large for your device."))),
      type,
      quality
    );
  });
}

/** Convert any image file to a flattened JPEG blob at the given quality. */
export async function fileToJpegBlob(file: Blob, quality = 0.85, maxDim = 6000): Promise<Blob> {
  const canvas = await blobToCanvas(file, maxDim);
  return canvasToBlob(canvas, "image/jpeg", quality);
}

/** Run the full edit pipeline (rotate/flip → crop → filters) and return a JPEG blob. */
export async function applyEditsToBlob(
  original: Blob,
  edits: ImageEdits,
  quality = 0.92
): Promise<Blob> {
  const url = URL.createObjectURL(original);
  try {
    const img = await loadImageElement(url);
    const base = transformImage(img, img.naturalWidth, img.naturalHeight, edits.rotation, edits.flipH, edits.flipV);
    const full: CropArea = { x: 0, y: 0, width: base.width, height: base.height };
    const crop = edits.crop ?? full;
    const out = cropAndFilter(base, crop, edits.brightness, edits.contrast);
    return canvasToBlob(out, "image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Rough JPEG size estimate for a given pixel area and quality (0–100). */
export function estimateJpegBytes(width: number, height: number, quality = 85): number {
  const q = quality / 100;
  return Math.round(width * height * 3 * (0.08 + 0.22 * q)) + 4096;
}
