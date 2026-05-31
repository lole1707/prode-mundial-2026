export const CARD_W = 500;
export const CARD_H = 700;

export const SIL_CX = 0.47;
export const SIL_CY = 0.37;
export const SIL_RX = 0.38;
export const SIL_RY = 0.35;
export const INFO_Y  = 0.73;

export interface PhotoTransform {
  x: number;
  y: number;
  w: number;
  h: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

const TPL_VERSION = "v5";
let _processedTemplate: string | null = null;
let _processedVersion = "";

export async function getProcessedTemplate(): Promise<string> {
  if (_processedTemplate && _processedVersion === TPL_VERSION) return _processedTemplate;

  const img = await loadImage("/card-template.jpg");
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;

  // Silhouette ellipse in image pixel coords
  const cx = c.width  * SIL_CX;
  const cy = c.height * SIL_CY;
  const rx = c.width  * SIL_RX;
  const ry = c.height * SIL_RY;

  for (let pi = 0; pi < d.length / 4; pi++) {
    const px = pi % c.width;
    const py = Math.floor(pi / c.width);
    const i  = pi * 4;

    // Everything inside the silhouette ellipse → fully transparent
    // This removes the "?" and any other element (dark outline, body fill)
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    if (dx * dx + dy * dy <= 1) {
      d[i + 3] = 0;
      continue;
    }

    // Outside ellipse: remove dark border pixels (outline, neck, ears)
    const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
    if (lum < 90) {
      d[i + 3] = 0;
    } else if (lum < 135) {
      d[i + 3] = Math.round(((lum - 90) / 45) * 255);
    }
  }

  ctx.putImageData(id, 0, 0);
  _processedTemplate = c.toDataURL("image/png");
  _processedVersion = TPL_VERSION;
  return _processedTemplate;
}

function defaultTransform(photo: HTMLImageElement): PhotoTransform {
  const cx = CARD_W * SIL_CX;
  const cy = CARD_H * SIL_CY;
  const rx = CARD_W * SIL_RX;
  const ry = CARD_H * SIL_RY;
  const bw = rx * 2;
  const bh = ry * 2;
  const scale = Math.max(bw / photo.width, bh / photo.height);
  const pw = photo.width * scale;
  const ph = photo.height * scale;
  return { x: cx - rx + (bw - pw) / 2, y: cy - ry, w: pw, h: ph };
}

export async function buildCard(
  photoSrc: string,
  apellido: string,
  nombre: string,
  edad: string,
  altura: string,
  sector: string,
  transform?: PhotoTransform
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  const [photo, processedTplSrc] = await Promise.all([
    loadImage(photoSrc),
    getProcessedTemplate(),
  ]);
  const tpl = await loadImage(processedTplSrc);

  const t = transform ?? defaultTransform(photo);

  // 1. White background so JPEG output has no black bleed
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 2. Photo behind
  ctx.drawImage(photo, t.x, t.y, t.w, t.h);

  // 3. Processed template on top — dark silhouette is now transparent,
  //    card design (teal, logos, numbers) overlays the photo
  ctx.drawImage(tpl, 0, 0, CARD_W, CARD_H);

  // 4. Info band overlay + text
  const bandY = CARD_H * INFO_Y;
  const bandH = CARD_H - bandY;
  ctx.fillStyle = "rgba(0,0,0,0.72)";
  ctx.fillRect(0, bandY, CARD_W, bandH);

  const pad = CARD_W * 0.06;
  const nameText = `${apellido.toUpperCase()} ${nombre.toUpperCase()}`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  let fs = Math.round(CARD_W * 0.072);
  ctx.font = `bold ${fs}px Arial, sans-serif`;
  while (ctx.measureText(nameText).width > CARD_W - pad * 2 && fs > 16) {
    fs -= 2;
    ctx.font = `bold ${fs}px Arial, sans-serif`;
  }
  ctx.fillText(nameText, pad, bandY + bandH * 0.06);

  const info = [edad ? `${edad} años` : "", altura ? `${altura}m` : ""].filter(Boolean).join("  |  ");
  ctx.fillStyle = "#cccccc";
  ctx.font = `${Math.round(CARD_W * 0.048)}px Arial, sans-serif`;
  ctx.fillText(info, pad, bandY + bandH * 0.38);

  ctx.fillStyle = "#4ade80";
  ctx.font = `bold ${Math.round(CARD_W * 0.052)}px Arial, sans-serif`;
  ctx.fillText(sector.toUpperCase(), pad, bandY + bandH * 0.64);

  return new Promise((res, rej) =>
    canvas.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9)
  );
}
