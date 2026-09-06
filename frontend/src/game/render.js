import { CFG, BOARD, INK } from "./constants";

/**
 * Procedural Teakwood Desk Canvas Renderer
 * Featuring realistic wood grain, compass carvings, pencil scratches, and 3D bevel.
 */
export function drawBoard(ctx) {
  const { x, y, w, h } = BOARD;
  ctx.save();

  // 1. 3D Outer Desk Slab Shadow
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = "#1e4733"; // Base green chalkboard / felt desk slab
  ctx.fill();
  ctx.shadowColor = "transparent";

  // 2. Teakwood & Classroom Felt Multi-stop Gradient
  const grd = ctx.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, "#28583f");
  grd.addColorStop(0.3, "#214b35");
  grd.addColorStop(0.7, "#1c402d");
  grd.addColorStop(1, "#153324");
  roundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = grd;
  ctx.fill();

  // 3. Realistic Surface Texture & Fine School Grid
  ctx.save();
  roundRect(ctx, x, y, w, h, 14);
  ctx.clip();

  // Subtle Desk Grid
  ctx.strokeStyle = "rgba(255,255,255,0.035)";
  ctx.lineWidth = 1;
  for (let gx = x; gx < x + w; gx += 40) line(ctx, gx, y, gx, y + h);
  for (let gy = y; gy < y + h; gy += 40) line(ctx, x, gy, x + w, gy);

  // Classroom Nostalgia Engravings (Faint compass circle & pencil scratches)
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x + 130, y + 140, 42, 0.4, Math.PI * 1.6);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + w - 150, y + h - 130, 36, 1.2, Math.PI * 1.9);
  ctx.stroke();

  // Faint ruler pencil line
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.beginPath();
  ctx.moveTo(x + 80, y + 90);
  ctx.lineTo(x + 240, y + 92);
  ctx.stroke();

  ctx.restore();

  // 4. Center Match Line (Chalk line with subtle texture)
  ctx.strokeStyle = "rgba(245,242,235,0.3)";
  ctx.setLineDash([12, 10]);
  ctx.lineWidth = 2;
  line(ctx, x + 8, y + h / 2, x + w - 8, y + h / 2);
  ctx.setLineDash([]);

  // 5. 3D Table Bevel Edge (Chalk / Oak border with specular top highlight)
  // Dark bottom bevel
  ctx.strokeStyle = "rgba(10,25,18,0.85)";
  ctx.lineWidth = 3.5;
  roundRect(ctx, x + 2, y + 3, w - 4, h - 4, 13);
  ctx.stroke();

  // Crisp top/inner chalk rim
  ctx.strokeStyle = "rgba(245,242,235,0.75)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 12);
  ctx.stroke();

  ctx.restore();
}

/**
 * High-Fidelity 3D Pen Renderer
 * Features asymmetric cap weight, internal ink refill core, rubber grip, metallic nib,
 * and 3D directional cast shadows.
 */
export function drawPen(ctx, pen) {
  const { position, angle } = pen;
  const color = pen.penData.hue;
  const L = CFG.penLen;
  const W = CFG.penW;
  const fallProgress = pen.penData.fallProgress || 0;
  const isFalling = pen.penData.falling;
  const teeter = pen.penData.teeter || 0;

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);

  // If falling off the desk, apply 3D tumble perspective and fade
  if (isFalling) {
    const scale = Math.max(0.2, 1 - fallProgress * 0.4);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, 1 - fallProgress * 1.15);
  } else if (teeter > 0) {
    // Subtle teetering wobble near edge
    ctx.rotate(Math.sin(performance.now() * 0.018) * teeter * 0.06);
  }

  // ================= 1. DYNAMIC 3D DIRECTIONAL SHADOWS =================
  const shadowAlpha = isFalling ? Math.max(0, 0.45 - fallProgress * 0.5) : 0.45;
  const shadowDist = isFalling ? 8 + fallProgress * 35 : 5;
  const shadowBlur = isFalling ? 10 + fallProgress * 20 : 7;

  // Layer A: Soft Directional Cast Shadow (Light coming from top-left)
  ctx.save();
  ctx.shadowColor = `rgba(15, 8, 2, ${shadowAlpha})`;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowDist * 0.6;
  ctx.shadowOffsetY = shadowDist;
  ctx.fillStyle = "rgba(0,0,0,0.01)"; // Invisible carrier to project pure shadow
  roundRect(ctx, -L / 2, -W / 2, L, W, W / 2);
  ctx.fill();
  ctx.restore();

  // Layer B: Ambient Occlusion Contact Shadow (Directly under pen)
  if (!isFalling) {
    ctx.fillStyle = "rgba(10, 5, 0, 0.35)";
    roundRect(ctx, -L / 2 + 3, -W / 2 + 1.5, L - 6, W - 1, (W - 1) / 2);
    ctx.fill();
  }

  // ================= 2. TRANSLUCENT PEN BARREL & INTERNAL INK CORE =================
  // A. Outer Barrel Cylinder (Multi-stop glossy plastic shader)
  const barrelGrad = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  barrelGrad.addColorStop(0, shade(color, -45));
  barrelGrad.addColorStop(0.18, shade(color, -10));
  barrelGrad.addColorStop(0.35, shade(color, 40)); // Specular cylinder glint
  barrelGrad.addColorStop(0.5, shade(color, 55)); // Bright reflection line
  barrelGrad.addColorStop(0.68, shade(color, 10));
  barrelGrad.addColorStop(0.9, shade(color, -35));
  barrelGrad.addColorStop(1, shade(color, -55));

  roundRect(ctx, -L / 2, -W / 2, L, W, W / 2);
  ctx.fillStyle = barrelGrad;
  ctx.fill();

  // B. Internal Ink Refill Tube (visible through semi-translucent barrel)
  const tubeW = W * 0.42;
  const tubeL = L * 0.62;
  const tubeX = -L / 2 + 18;

  // Clear Refill Polypropylene Tube
  roundRect(ctx, tubeX, -tubeW / 2, tubeL, tubeW, tubeW / 2);
  ctx.fillStyle = "rgba(245, 245, 240, 0.28)";
  ctx.fill();

  // Liquid Ink Column inside Refill
  const inkL = tubeL * 0.85;
  roundRect(ctx, tubeX + 4, -tubeW / 2 + 0.6, inkL, tubeW - 1.2, (tubeW - 1.2) / 2);
  ctx.fillStyle = shade(color, -15);
  ctx.fill();

  // ================= 3. TEXTURED RUBBER GRIP ZONE =================
  const gripL = 22;
  const gripX = L / 2 - 30;
  // Grip base
  roundRect(ctx, gripX, -W / 2, gripL, W, 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fill();

  // 4 Micro Grip Ridges
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  for (let r = 0; r < 4; r++) {
    const rx = gripX + 3 + r * 5;
    line(ctx, rx, -W / 2 + 1, rx, W / 2 - 1);
  }

  // ================= 4. MACHINED METALLIC TIP & BALLPOINT NIB =================
  // Metal Cone (Stainless Steel with specular taper)
  const tipGrad = ctx.createLinearGradient(L / 2, -W / 2, L / 2, W / 2);
  tipGrad.addColorStop(0, "#858C96");
  tipGrad.addColorStop(0.4, "#E2E6EB");
  tipGrad.addColorStop(0.6, "#CBD0D6");
  tipGrad.addColorStop(1, "#666C74");

  ctx.beginPath();
  ctx.moveTo(L / 2, -W / 2 + 0.6);
  ctx.lineTo(L / 2 + 13, 0);
  ctx.lineTo(L / 2, W / 2 - 0.6);
  ctx.closePath();
  ctx.fillStyle = tipGrad;
  ctx.fill();

  // Dark Tungsten Ballpoint Bead
  ctx.beginPath();
  ctx.arc(L / 2 + 13, 0, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = "#1E2228";
  ctx.fill();

  // ================= 5. WEIGHTED CAP & CHROME POCKET CLIP =================
  // Cap body (Heavier plastic end)
  const capL = 16;
  const capX = -L / 2 - 2;
  const capGrad = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  capGrad.addColorStop(0, shade(color, -35));
  capGrad.addColorStop(0.35, shade(color, 25));
  capGrad.addColorStop(0.5, shade(color, 45));
  capGrad.addColorStop(1, shade(color, -45));

  roundRect(ctx, capX, -W / 2, capL, W, 2.5);
  ctx.fillStyle = capGrad;
  ctx.fill();

  // Cap Ring Accent
  ctx.fillStyle = "#EAE6DC";
  roundRect(ctx, capX + capL - 2.5, -W / 2 - 0.5, 2.5, W + 1, 1);
  ctx.fill();

  // Chrome Pocket Clip (Stamped metal with clip shadow)
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)"; // Clip drop shadow
  roundRect(ctx, -L / 2 + 6, -W / 2 - 2.5, 3, W + 5, 1.5);
  ctx.fill();

  const clipGrad = ctx.createLinearGradient(-L / 2 + 5, -W / 2, -L / 2 + 9, W / 2);
  clipGrad.addColorStop(0, "#F2EFE9");
  clipGrad.addColorStop(0.5, "#D8D2C4");
  clipGrad.addColorStop(1, "#A09A8C");

  roundRect(ctx, -L / 2 + 5, -W / 2 - 2, 2.5, W + 4, 1.5);
  ctx.fillStyle = clipGrad;
  ctx.fill();

  ctx.restore();
}

/**
 * Interactive Aim Vector & Short Directional Cue
 */
export function drawAim(ctx, aiming) {
  const pen = aiming.pen;
  const strike = aiming.start;
  const isForward = aiming.aimMode === "forward";
  const dv = isForward
    ? { x: aiming.current.x - strike.x, y: aiming.current.y - strike.y }
    : { x: pen.position.x - aiming.current.x, y: pen.position.y - aiming.current.y };

  const maxDist = isForward ? 110 : CFG.maxDrag;
  const mag = Math.min(maxDist, Math.hypot(dv.x, dv.y));
  if (mag < 4) return;
  const dir = { x: dv.x / (mag || 1), y: dv.y / (mag || 1) };
  const ratio = Math.min(1, mag / maxDist);
  const len = isForward ? 25 + ratio * 55 : 40 + ratio * 150;
  const ex = strike.x + dir.x * len;
  const ey = strike.y + dir.y * len;

  ctx.save();
  // Selected pen glowing ring
  ctx.strokeStyle = "rgba(245,215,110,0.95)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(pen.position.x, pen.position.y, CFG.penLen / 2 + 6, 0, Math.PI * 2);
  ctx.stroke();

  if (!isForward) {
    // Pull-back slingshot dashed guide
    ctx.strokeStyle = "rgba(245,215,110,0.5)";
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    line(ctx, strike.x, strike.y, aiming.current.x, aiming.current.y);
    ctx.setLineDash([]);
  } else {
    // Forward swipe track
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2.5;
    line(ctx, strike.x, strike.y, aiming.current.x, aiming.current.y);
  }

  // Launch cue arrow from the strike point
  const col = ratio > 0.7 ? "#FF1A53" : "#F5D76E";
  ctx.strokeStyle = col;
  ctx.lineWidth = isForward ? 4.5 : 4;
  line(ctx, strike.x, strike.y, ex, ey);
  const a = Math.atan2(dir.y, dir.x);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - 12 * Math.cos(a - 0.4), ey - 12 * Math.sin(a - 0.4));
  ctx.lineTo(ex - 12 * Math.cos(a + 0.4), ey - 12 * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();

  // Strike point marker (contact dot)
  ctx.beginPath();
  ctx.arc(strike.x, strike.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#F5F2EB";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#B42828";
  ctx.stroke();

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

function shade(hex, percent) {
  let num = parseInt(hex.replace("#", ""), 16);
  if (isNaN(num)) num = 0x1e3a8a;
  let r = (num >> 16) + Math.round(2.55 * percent);
  let g = ((num >> 8) & 0x00ff) + Math.round(2.55 * percent);
  let b = (num & 0x0000ff) + Math.round(2.55 * percent);
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
