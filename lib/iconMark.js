// Turns a business logo into a white "mark" for the app icon:
//   1. finds the drawn parts (anything darker/more colourful than the background)
//   2. keeps the main emblem and drops side text (e.g. "SONKHELA CAPITAL")
//   3. returns it as a white PNG, tightly cropped, ready to centre on the icon
// Returns null if the logo can't be read; the icon then falls back to a letter.
import { PNG } from "pngjs";
import jpeg from "jpeg-js";

function decode(dataUrl) {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  if (m[1] === "png") {
    const p = PNG.sync.read(buf);
    return { width: p.width, height: p.height, data: p.data };
  }
  const j = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 256 });
  return { width: j.width, height: j.height, data: j.data };
}

// 0..1: how much a pixel is "logo" rather than background
function inkFn(img) {
  const { width: w, height: h, data: d } = img;
  // background = average of the four corners (usually white or transparent)
  let br = 0, bg = 0, bb = 0, n = 0, transparentCorners = 0;
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const i = (y * w + x) * 4;
    if (d[i + 3] < 30) { transparentCorners++; continue; }
    br += d[i]; bg += d[i + 1]; bb += d[i + 2]; n++;
  }
  const bgc = n ? [br / n, bg / n, bb / n] : [255, 255, 255];
  return (i) => {
    const a = d[i + 3] / 255;
    if (a < 0.08) return 0;
    const dist = Math.hypot(d[i] - bgc[0], d[i + 1] - bgc[1], d[i + 2] - bgc[2]) / 441;
    // transparent-background logos: every opaque pixel is logo
    const v = transparentCorners >= 3 ? 1 : Math.min(1, Math.max(0, (dist - 0.12) / 0.35));
    return v * a;
  };
}

export function logoMark(dataUrl) {
  let img;
  try { img = decode(dataUrl); } catch { return null; }
  if (!img || !img.width || !img.height) return null;
  const { width: W, height: H } = img;
  const ink = inkFn(img);

  // Work on a small grid to find the separate shapes
  const scale = Math.min(1, 220 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * scale)), h = Math.max(1, Math.round(H * scale));
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(W - 1, Math.floor(x / scale)), sy = Math.min(H - 1, Math.floor(y / scale));
    mask[y * w + x] = ink((sy * W + sx) * 4) > 0.35 ? 1 : 0;
  }

  // Find the emblem by blank gaps: logos put text beside (or under) the emblem with
  // empty space between. Split into blocks at those gaps and keep the heaviest block.
  function pick(x0, y0, x1, y1, alongX, minGapFrac) {
    const len = alongX ? x1 - x0 + 1 : y1 - y0 + 1;
    const mass = new Array(len).fill(0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (mask[y * w + x]) mass[alongX ? x - x0 : y - y0]++;
    const minGap = Math.max(2, Math.round(len * minGapFrac));
    const blocks = [];
    let start = -1, gap = 0;
    for (let i = 0; i < len; i++) {
      if (mass[i] > 0) {
        if (start === -1) start = i;
        else if (gap >= minGap) { blocks.push([start, i - gap - 1]); start = i; }
        gap = 0;
      } else if (start !== -1) gap++;
    }
    if (start !== -1) blocks.push([start, len - 1 - gap]);
    if (!blocks.length) return null;
    const weight = ([s0, s1]) => mass.slice(s0, s1 + 1).reduce((t, v) => t + v, 0);
    const [s0, s1] = blocks.reduce((best, bl) => (weight(bl) > weight(best) ? bl : best));
    return alongX ? [x0 + s0, y0, x0 + s1, y1] : [x0, y0 + s0, x1, y0 + s1];
  }
  let box = [0, 0, w - 1, h - 1];
  box = pick(...box, true, 0.03);           // text beside the emblem
  if (box) box = pick(...box, false, 0.10); // text under the emblem (only clear, wide gaps)
  if (box) box = pick(...box, true, 0.03);  // tidy up
  if (box) box = pick(...box, false, 0.10); // trim empty rows
  if (!box) return null;
  box = { x0: box[0], y0: box[1], x1: box[2], y1: box[3] };

  // Back to full size, with a 1px margin
  const X0 = Math.max(0, Math.floor(box.x0 / scale) - 1), Y0 = Math.max(0, Math.floor(box.y0 / scale) - 1);
  const X1 = Math.min(W - 1, Math.ceil((box.x1 + 1) / scale)), Y1 = Math.min(H - 1, Math.ceil((box.y1 + 1) / scale));
  const cw = X1 - X0 + 1, ch = Y1 - Y0 + 1;
  if (cw < 4 || ch < 4) return null;

  // White mark: alpha follows how strongly each pixel is "logo"
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const sx = X0 + x, sy = Y0 + y, o = (y * cw + x) * 4;
    const v = ink((sy * W + sx) * 4);
    out.data[o] = out.data[o + 1] = out.data[o + 2] = 255;
    out.data[o + 3] = Math.round(Math.min(1, v * 1.4) * 255);
  }
  return { src: "data:image/png;base64," + PNG.sync.write(out).toString("base64"), width: cw, height: ch };
}
