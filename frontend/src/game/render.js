import { CFG, BOARD, INK } from "./constants";

export function drawBoard(ctx) {
  const { x, y, w, h } = BOARD;
  ctx.save();
  // Table mat (felt)
  const grd = ctx.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, "#2f6b4f");
  grd.addColorStop(1, "#1f4d38");
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = grd;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Subtle felt grid
  ctx.save();
  roundRect(ctx, x, y, w, h, 14);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let gx = x; gx < x + w; gx += 40) line(ctx, gx, y, gx, y + h);
  for (let gy = y; gy < y + h; gy += 40) line(ctx, x, gy, x + w, gy);
  ctx.restore();

  // Center divider line
  ctx.strokeStyle = "rgba(245,242,235,0.35)";
  ctx.setLineDash([10, 10]);
  ctx.lineWidth = 2;
  line(ctx, x, y + h / 2, x + w, y + h / 2);
  ctx.setLineDash([]);

  // Drawn table border (chalk/ink)
  ctx.strokeStyle = "rgba(245,242,235,0.75)";
  ctx.lineWidth = 3;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 12);
  ctx.stroke();

  ctx.restore();
}

export function drawPen(ctx, pen) {
  const { position, angle } = pen;
  const color = pen.penData.hue;
  const L = CFG.penLen;
  const W = CFG.penW;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);

  // shadow
  ctx.shadowColor = "rgba(20,10,0,0.45)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 4;

  // barrel with cylinder highlight
  const g = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  g.addColorStop(0, shade(color, -35));
  g.addColorStop(0.45, shade(color, 30));
  g.addColorStop(0.55, shade(color, 15));
  g.addColorStop(1, shade(color, -45));
  roundRect(ctx, -L / 2, -W / 2, L, W, W / 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = "transparent";

  // metallic tip (points toward -y after rotate: at one end)
  ctx.beginPath();
  ctx.moveTo(L / 2, -W / 2 + 1);
  ctx.lineTo(L / 2 + 10, 0);
  ctx.lineTo(L / 2, W / 2 - 1);
  ctx.closePath();
  ctx.fillStyle = "#9aa0a6";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(L / 2 + 10, 0, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = "#4b4f55";
  ctx.fill();

  // grip band
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(ctx, L / 2 - 22, -W / 2, 10, W, 2);
  ctx.fill();

  // cap / clip
  ctx.fillStyle = shade(color, -20);
  roundRect(ctx, -L / 2 - 4, -W / 2, 8, W, 3);
  ctx.fill();
  ctx.fillStyle = "#d9d2c2";
  roundRect(ctx, -L / 2 + 4, -W / 2 - 3, 3, W + 6, 2);
  ctx.fill();

  ctx.restore();
}

export function drawAim(ctx, aiming) {
  const pen = aiming.pen;
  const strike = aiming.start;
  const dv = { x: pen.position.x - aiming.current.x, y: pen.position.y - aiming.current.y };
  const mag = Math.min(CFG.maxDrag, Math.hypot(dv.x, dv.y));
  if (mag < 4) return;
  const dir = { x: dv.x / (mag || 1), y: dv.y / (mag || 1) };
  const ratio = mag / CFG.maxDrag;
  const len = 40 + ratio * 150;
  const ex = strike.x + dir.x * len;
  const ey = strike.y + dir.y * len;

  ctx.save();
  // selected pen ring
  ctx.strokeStyle = "rgba(245,215,110,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pen.position.x, pen.position.y, CFG.penLen / 2 + 6, 0, Math.PI * 2);
  ctx.stroke();

  // pull-back guide (from the strike point)
  ctx.strokeStyle = "rgba(245,215,110,0.5)";
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  line(ctx, strike.x, strike.y, aiming.current.x, aiming.current.y);
  ctx.setLineDash([]);

  // launch arrow from the strike point
  const col = ratio > 0.7 ? "#B42828" : "#F5D76E";
  ctx.strokeStyle = col;
  ctx.lineWidth = 4;
  line(ctx, strike.x, strike.y, ex, ey);
  const a = Math.atan2(dir.y, dir.x);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - 12 * Math.cos(a - 0.4), ey - 12 * Math.sin(a - 0.4));
  ctx.lineTo(ex - 12 * Math.cos(a + 0.4), ey - 12 * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();

  // strike point marker (where you're hitting the pen)
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#F5F2EB";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#B42828";
  ctx.stroke();

  // spin hint: curved arc if hit is off-center
  const rOff = Math.hypot(strike.x - pen.position.x, strike.y - pen.position.y);
  if (rOff > CFG.penLen * 0.18) {
    const cr = strike.x - pen.position.x >= 0 || strike.y - pen.position.y >= 0 ? 1 : -1;
    ctx.strokeStyle = "rgba(30,58,138,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pen.position.x, pen.position.y, CFG.penLen / 2 + 14, -0.6 * cr, 0.6 * cr);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function shade(hex, amt) {
  const c = hex.replace("#", "");
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r + amt));
  g = Math.max(0, Math.min(255, g + amt));
  b = Math.max(0, Math.min(255, b + amt));
  return `rgb(${r},${g},${b})`;
}

export { INK };
