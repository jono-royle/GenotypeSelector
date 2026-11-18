import type { Colour, WellState } from './types';

interface Options {
  gene: string;
  plateName: string;
  rows: string[]; // across the top
  cols: number[]; // down the side
  get: (id: string) => WellState;
}

const WIDTH = 480; // CSS px, matches the max width of the page
const SCALE = 2; // render at 2x so the image is sharp
const PAD = 16;
const HEADER_W = 24;
const GAP = 6;

/**
 * Draws the plate as it appears on screen onto a canvas and returns a JPEG.
 * Drawn by hand (rather than screenshotting the DOM) so it works reliably
 * in every browser, including iOS Safari.
 */
export function renderPlateJpeg({ gene, plateName, rows, cols, get }: Options): Promise<Blob> {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const c = {
    bg: v('--bg', '#ffffff'),
    fg: v('--fg', '#1a1a1a'),
    muted: v('--muted', '#6b6b6b'),
    border: v('--border', '#9a9a9a'),
    green: v('--green', '#2e9e4f'),
    blue: v('--blue', '#2f6fd6'),
    red: v('--red', '#d63b3b'),
  };
  const fill: Record<Colour, string | null> = { blank: null, green: c.green, blue: c.blue, red: c.red };
  const font = css.fontFamily || 'system-ui, sans-serif';

  const contentW = WIDTH - PAD * 2;
  const cell = (contentW - HEADER_W - GAP * rows.length) / rows.length;
  const fieldH = 38;

  const titleH = 28;
  const fieldsH = 2 * (fieldH + 10);
  const headerRowH = 18;
  const gridH = headerRowH + cols.length * (cell + GAP);
  const keyH = 22;
  const height = PAD + titleH + 12 + fieldsH + 4 + gridH + 14 + keyH + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = Math.ceil(height * SCALE);
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas not supported'));
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = 'middle';

  let y = PAD;

  // Title
  ctx.fillStyle = c.fg;
  ctx.font = `700 20px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('Genotype Selector', WIDTH / 2, y + titleH / 2);
  y += titleH + 12;

  // Gene / Plate fields
  const labelW = 48 + 8;
  for (const [label, value] of [
    ['Gene', gene],
    ['Plate', plateName],
  ] as const) {
    ctx.textAlign = 'left';
    ctx.fillStyle = c.fg;
    ctx.font = `600 16px ${font}`;
    ctx.fillText(label, PAD, y + fieldH / 2);

    const bx = PAD + labelW;
    const bw = contentW - labelW;
    roundRect(ctx, bx + 0.5, y + 0.5, bw - 1, fieldH - 1, 8);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = `400 16px ${font}`;
    ctx.fillStyle = c.fg;
    ctx.fillText(fitText(ctx, value.trim(), bw - 20), bx + 10, y + fieldH / 2);
    y += fieldH + 10;
  }
  y += 4;

  // Column headers (A–H)
  const colX = (i: number) => PAD + HEADER_W + GAP + i * (cell + GAP) + cell / 2;
  ctx.font = `600 13px ${font}`;
  ctx.fillStyle = c.muted;
  ctx.textAlign = 'center';
  rows.forEach((r, i) => ctx.fillText(r, colX(i), y + headerRowH / 2));
  y += headerRowH + GAP;

  // Wells
  const radius = cell / 2;
  const labelSize = Math.min(13, Math.max(10, cell * 0.28));
  for (const col of cols) {
    const cy = y + radius;
    ctx.font = `600 13px ${font}`;
    ctx.fillStyle = c.muted;
    ctx.textAlign = 'center';
    ctx.fillText(String(col), PAD + HEADER_W / 2, cy);

    rows.forEach((r, i) => {
      const id = `${r}${col}`;
      const state = get(id);
      const cx = colX(i);
      const f = fill[state.colour];

      ctx.beginPath();
      ctx.arc(cx, cy, f ? radius : radius - 1, 0, Math.PI * 2);
      if (f) {
        ctx.fillStyle = f;
        ctx.fill();
      } else {
        ctx.strokeStyle = c.border;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.font = `600 ${labelSize}px ${font}`;
      ctx.fillStyle = f ? '#ffffff' : c.muted;
      ctx.fillText(id, cx, cy);

      if (state.note.trim()) {
        // Yellow note dot at the top-right, like on screen
        const dx = cx + radius * 0.75;
        const dy = cy - radius * 0.75;
        ctx.beginPath();
        ctx.arc(dx, dy, 6, 0, Math.PI * 2);
        ctx.fillStyle = c.bg;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f5b700';
        ctx.fill();
      }
    });
    y += cell + GAP;
  }
  y += 14 - GAP;

  // Key
  const items: [string, string][] = [
    [c.green, 'Homozygous'],
    [c.blue, 'Heterozygous'],
    [c.red, 'Wildtype'],
  ];
  ctx.font = `400 15px ${font}`;
  const swatch = 16;
  const itemW = items.map(([, t]) => swatch + 6 + ctx.measureText(t).width);
  const totalW = itemW.reduce((a, b) => a + b, 0) + 18 * (items.length - 1);
  let x = (WIDTH - totalW) / 2;
  const ky = y + keyH / 2;
  ctx.textAlign = 'left';
  items.forEach(([colour, text], i) => {
    ctx.beginPath();
    ctx.arc(x + swatch / 2, ky, swatch / 2, 0, Math.PI * 2);
    ctx.fillStyle = colour;
    ctx.fill();
    ctx.fillStyle = c.fg;
    ctx.fillText(text, x + swatch + 6, ky);
    x += itemW[i] + 18;
  });

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode JPEG'))), 'image/jpeg', 0.95),
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Truncate with an ellipsis if the text is wider than maxW. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
