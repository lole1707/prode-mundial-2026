export const CARD_W = 500;
export const CARD_H = 700;

// Full silhouette ellipse (head + body)
export const SIL_CX = 0.47;
export const SIL_CY = 0.37;
export const SIL_RX = 0.38;
export const SIL_RY = 0.35;

export const INFO_Y  = 0.73;

export interface PhotoTransform {
  x: number;      // photo left edge in canvas pixels
  y: number;      // photo top edge in canvas pixels
  w: number;      // drawn width in canvas pixels
  h: number;      // drawn height in canvas pixels
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function defaultTransform(photo: HTMLImageElement): PhotoTransform {
  // Fill the silhouette ellipse bounding box, top-aligned
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

  const [template, photo] = await Promise.all([
    loadImage("/card-template.jpg"),
    loadImage(photoSrc),
  ]);

  const t = transform ?? defaultTransform(photo);

  // Draw photo first (behind everything)
  ctx.drawImage(photo, t.x, t.y, t.w, t.h);

  // Draw template on top with multiply blend:
  // — dark silhouette stays dark (frames the photo)
  // — light/teal areas tint the photo giving the sticker look
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(template, 0, 0, CARD_W, CARD_H);
  ctx.globalCompositeOperation = "source-over";

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
