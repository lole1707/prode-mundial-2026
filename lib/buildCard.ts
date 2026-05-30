const CARD_W = 500;
const CARD_H = 700;
const FACE_CX = 0.47;
const FACE_CY = 0.17;
const FACE_R  = 0.18;
const INFO_Y  = 0.73;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

export async function buildCard(
  photoSrc: string,
  apellido: string,
  nombre: string,
  edad: string,
  altura: string,
  sector: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  const [template, photo] = await Promise.all([
    loadImage("/card-template.jpg"),
    loadImage(photoSrc),
  ]);

  ctx.drawImage(template, 0, 0, CARD_W, CARD_H);

  const fx = CARD_W * FACE_CX;
  const fy = CARD_H * FACE_CY;
  const fr = CARD_W * FACE_R;

  ctx.save();
  ctx.beginPath();
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.clip();
  const diameter = fr * 2;
  const photoScale = diameter / photo.width;
  const scaledH = photo.height * photoScale;
  ctx.drawImage(photo, fx - fr, fy - fr, diameter, scaledH);
  ctx.restore();

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
