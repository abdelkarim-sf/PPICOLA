export const IMAGE_EXT_RE = /\.(jpe?g|png|webp|avif|gif|bmp)$/i;
export const HEIC_EXT_RE = /\.(heic|heif)$/i;

export type AcceptKind = "images" | "pdf" | "pdfs" | "images+pdf";

export function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "0 KB";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

export function isImageFile(f: File): boolean {
  return f.type.startsWith("image/") || IMAGE_EXT_RE.test(f.name);
}

export function isPdfFile(f: File): boolean {
  return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
}

export function isHeicFile(f: File): boolean {
  return /\.(heic|heif)$/i.test(f.name) || f.type === "image/heic" || f.type === "image/heif";
}

export function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export function baseName(name: string): string {
  return stripExt(name).replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 80) || "file";
}

export function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as ArrayBuffer);
    r.onerror = () => reject(r.error ?? new Error("Could not read file"));
    r.readAsArrayBuffer(file);
  });
}

export function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

export type ValidationResult = {
  ok: File[];
  rejected: { file: string; reason: string }[];
};

/** Validate a list of dropped/picked files against an accept kind. */
export function validateFiles(
  incoming: File[],
  opts: {
    accept: AcceptKind;
    maxBytes: number;
    maxFiles: number;
    heicNote?: string;
    messages?: {
      unsupported?: string;
      tooBig?: (size: string, max: string) => string;
      maxFiles?: (n: number) => string;
    };
  }
): ValidationResult {
  const ok: File[] = [];
  const rejected: ValidationResult["rejected"] = [];
  const m = opts.messages ?? {};

  for (const f of incoming) {
    if (isHeicFile(f)) {
      rejected.push({
        file: f.name,
        reason: opts.heicNote ?? "HEIC images are not supported by this browser — please convert to JPG/PNG first.",
      });
      continue;
    }
    const imageOk = isImageFile(f);
    const pdfOk = isPdfFile(f);
    const matches =
      opts.accept === "images" ? imageOk : opts.accept === "pdf" || opts.accept === "pdfs" ? pdfOk : imageOk || pdfOk;
    if (!matches) {
      rejected.push({ file: f.name, reason: m.unsupported ?? "Unsupported file type. Please use JPG, PNG, WebP or PDF." });
      continue;
    }
    if (f.size > opts.maxBytes) {
      rejected.push({
        file: f.name,
        reason: m.tooBig
          ? m.tooBig(formatBytes(f.size), formatBytes(opts.maxBytes))
          : `Too big — ${formatBytes(f.size)} (max ${formatBytes(opts.maxBytes)}).`,
      });
      continue;
    }
    if (ok.length >= opts.maxFiles) {
      rejected.push({
        file: f.name,
        reason: m.maxFiles
          ? m.maxFiles(opts.maxFiles)
          : `You can add at most ${opts.maxFiles} files.`,
      });
      continue;
    }
    ok.push(f);
  }
  return { ok, rejected };
}

export function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
