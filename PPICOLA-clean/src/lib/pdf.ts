/* PDF helpers — pdf.js for reading/rendering, pdf-lib for creating/merging.
   Everything is dynamically imported so these heavy libs never land in the initial bundle. */

/* eslint-disable @typescript-eslint/no-explicit-any */

let pdfjs: any = null;

export async function getPdfJs(): Promise<any> {
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
  }
  return pdfjs;
}

export async function getPdfLib(): Promise<any> {
  return import("pdf-lib");
}

export class PdfOpenError extends Error {
  kind: "password" | "corrupt" | "unknown";
  constructor(kind: PdfOpenError["kind"], message?: string) {
    super(message ?? "Could not open this PDF.");
    this.kind = kind;
  }
}

/** Open a PDF from raw bytes. Throws PdfOpenError with a friendly kind. */
export async function loadPdfDocument(data: ArrayBuffer): Promise<any> {
  const pdfjs = await getPdfJs();
  try {
    const task = pdfjs.getDocument({ data });
    return await task.promise;
  } catch (err: any) {
    if (err?.name === "PasswordException") {
      throw new PdfOpenError("password", "This PDF is password-protected. PPICOLA can't open protected files.");
    }
    if (err?.name === "InvalidPDFException") {
      throw new PdfOpenError("corrupt", "This file seems to be corrupted or is not a valid PDF.");
    }
    throw new PdfOpenError("unknown", "Could not open this PDF. It may be corrupted.");
  }
}

export async function getPdfPageCount(data: ArrayBuffer): Promise<number> {
  const doc = await loadPdfDocument(data);
  try {
    return doc.numPages as number;
  } finally {
    doc.destroy?.();
  }
}

/** Render a 1-based page number to a canvas at the given absolute scale. */
export async function renderPageToCanvas(pdf: any, pageNumber: number, scale: number): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available on this device.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
    return canvas;
  } finally {
    page.cleanup?.();
  }
}

/** Render a page straight to a Blob (for PDF → Images export). */
export async function renderPageToBlob(
  pdf: any,
  pageNumber: number,
  scale: number,
  format: "jpg" | "png",
  quality: number
): Promise<Blob> {
  const canvas = await renderPageToCanvas(pdf, pageNumber, scale);
  const type = format === "png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not render this page."))),
      type,
      quality
    );
  });
}

/* ---------------- creation & merging (pdf-lib) ---------------- */

export const PAGE_SIZES = {
  a4: { label: "A4", width: 595.28, height: 841.89 },
  letter: { label: "Letter", width: 612, height: 792 },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES | "fit";

export type PdfLayoutOptions = {
  pageSize: PageSizeKey;
  orientation: "auto" | "portrait" | "landscape";
  margin: "none" | "small" | "medium";
};

const MARGIN_PT = { none: 0, small: 16, medium: 32 } as const;

function embedImage(doc: any, blob: Blob): Promise<{ img: any; w: number; h: number }> {
  // All caller blobs are JPEG at this point.
  return blob.arrayBuffer().then((bytes: ArrayBuffer) => doc.embedJpg(bytes)).then((img: any) => {
    // pdf-lib exposes width/height via scale(1)
    const dims = img.scale(1);
    return { img, w: dims.width, h: dims.height };
  });
}

function pageDims(opts: PdfLayoutOptions, imgW: number, imgH: number): { w: number; h: number } {
  const m = MARGIN_PT[opts.margin];
  if (opts.pageSize === "fit") {
    let w = imgW + m * 2;
    let h = imgH + m * 2;
    if (opts.orientation === "portrait" && w > h) [w, h] = [h, w];
    if (opts.orientation === "landscape" && h > w) [w, h] = [h, w];
    return { w, h };
  }
  const base = PAGE_SIZES[opts.pageSize];
  let w: number = base.width;
  let h: number = base.height;
  const imgLandscape = imgW >= imgH;
  const wantLandscape =
    opts.orientation === "landscape" || (opts.orientation === "auto" && imgLandscape);
  if (wantLandscape && h > w) [w, h] = [h, w];
  if (!wantLandscape && w > h) [w, h] = [h, w];
  return { w: w + m * 2, h: h + m * 2 };
}

/** Create a one-page PDF from an image blob. */
export async function imageToPdfBlob(
  blob: Blob,
  opts: PdfLayoutOptions
): Promise<Blob> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.create();
  const { img, w, h } = await embedImage(doc, blob);
  const dims = pageDims(opts, w, h);
  const page = doc.addPage([dims.w, dims.h]);
  const m = MARGIN_PT[opts.margin];
  const scale = Math.min((dims.w - m * 2) / w, (dims.h - m * 2) / h);
  const dw = w * scale;
  const dh = h * scale;
  page.drawImage(img, {
    x: (dims.w - dw) / 2,
    y: (dims.h - dh) / 2,
    width: dw,
    height: dh,
  });
  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

/** Merge several image blobs into a single PDF. */
export async function imagesToPdf(
  items: { blob: Blob }[],
  opts: PdfLayoutOptions,
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const doc = await PDFDocument.create();
  for (let i = 0; i < items.length; i++) {
    const { img, w, h } = await embedImage(doc, items[i].blob);
    const dims = pageDims(opts, w, h);
    const page = doc.addPage([dims.w, dims.h]);
    const m = MARGIN_PT[opts.margin];
    const scale = Math.min((dims.w - m * 2) / w, (dims.h - m * 2) / h);
    const dw = w * scale;
    const dh = h * scale;
    page.drawImage(img, {
      x: (dims.w - dw) / 2,
      y: (dims.h - dh) / 2,
      width: dw,
      height: dh,
    });
    onProgress?.(i + 1, items.length);
  }
  return doc.save();
}

/** Merge multiple PDFs (raw bytes) into one. Throws PdfOpenError on bad input. */
export async function mergePdfBytes(
  buffers: ArrayBuffer[],
  onProgress?: (done: number, total: number) => void
): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();
  for (let i = 0; i < buffers.length; i++) {
    const buf = buffers[i];
    const src = await PDFDocument.load(buf, { ignoreEncryption: false });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p: any) => out.addPage(p));
    onProgress?.(i + 1, buffers.length);
  }
  return out.save();
}

/** Concatenate original PDF blobs into one (fast path, no re-encoding). */
export async function concatPdfBytes(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const { PDFDocument } = await getPdfLib();
  const out = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p: any) => out.addPage(p));
  }
  return out.save();
}
