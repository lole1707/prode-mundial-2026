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

const TPL_VERSION = "v8";
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

  // Cut out the entire black head silhouette (including the ?)
  // using destination-out so the photo behind shows through
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.ellipse(
    c.width  * 0.47,  // cx — centered
    c.height * 0.16,  // cy — upper area of card (head position)
    c.width  * 0.27,  // rx — wide enough to cover ears
    c.height * 0.16,  // ry — tall enough to cover full head + neck top
    0, 0, Math.PI * 2
  );
  ctx.fill();
  ctx.restore();

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

  // 1. Dark background behind photo (head cutout shows photo, not white)
  ctx.fillStyle = "#111111";
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
