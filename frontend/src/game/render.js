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
  ctx.strokeStyle = "rgba(10,25,18,0.85)";
  ctx.lineWidth = 3.5;
  roundRect(ctx, x + 2, y + 3, w - 4, h - 4, 13);
  ctx.stroke();

  ctx.strokeStyle = "rgba(245,242,235,0.75)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 12);
  ctx.stroke();

  ctx.restore();
}

/**
 * Authentic Reynolds 045 Fine Carbure Pen Renderer
 * Features:
 * - Off-white matte cylindrical barrel with authentic "045 REYNOLDS FINE CARBURE" imprint.
 * - Long aerodynamic blue/red cap with top chisel fin, glossy collar, and extended pocket clip.
 * - Smooth rear tail plug.
 * - Dynamic 3D directional cast shadow + contact ambient occlusion.
 */
export function drawPen(ctx, pen) {
  const { position, angle } = pen;
  const isP1 = pen.penData.owner === "p1";
  const capHue = isP1 ? "#0A65C2" : "#D11A38"; // Reynolds Royal Blue vs Crimson Red
  const collarHue = isP1 ? "#00A2E8" : "#FF3355"; // Cyan/Red metallic collar
  const textHue = "#7A1C1C"; // Authentic Reynolds maroon/burgundy imprint
  const L = CFG.penLen; // ~106px
  const W = CFG.penW; // ~13px
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
  const shadowAlpha = isFalling ? Math.max(0, 0.45 - fallProgress * 0.5) : 0.42;
  const shadowDist = isFalling ? 8 + fallProgress * 35 : 5.5;
  const shadowBlur = isFalling ? 10 + fallProgress * 20 : 7;

  // Soft Directional Cast Shadow
  ctx.save();
  ctx.shadowColor = "rgba(15, 8, 2, " + shadowAlpha + ")";
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowDist * 0.6;
  ctx.shadowOffsetY = shadowDist;
  ctx.fillStyle = "rgba(0,0,0,0.01)";
  roundRect(ctx, -L / 2 - 4, -W / 2, L + 6, W, W / 2);
  ctx.fill();
  ctx.restore();

  // Ambient Occlusion Contact Shadow
  if (!isFalling) {
    ctx.fillStyle = "rgba(10, 5, 0, 0.32)";
    roundRect(ctx, -L / 2 - 2, -W / 2 + 1.2, L + 2, W - 1, (W - 1) / 2);
    ctx.fill();
  }

  // ================= 2. REYNOLDS 045 OFF-WHITE BARREL =================
  // Barrel span: from cap collar (-L/2 + 38) to rear plug (L/2)
  const barrelStart = -L / 2 + 38;
  const barrelEnd = L / 2;
  const barrelLen = barrelEnd - barrelStart;

  // Off-white cylindrical gradient (with realistic top highlight & bottom shade)
  const barrelGrad = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  barrelGrad.addColorStop(0, "#D6D4CE");
  barrelGrad.addColorStop(0.2, "#E8E7E2");
  barrelGrad.addColorStop(0.42, "#FFFFFF"); // Specular plastic glint
  barrelGrad.addColorStop(0.65, "#EDECE7");
  barrelGrad.addColorStop(0.85, "#DCDAD3");
  barrelGrad.addColorStop(1, "#C2C0B8");

  // Draw main white body
  ctx.beginPath();
  ctx.rect(barrelStart, -W / 2 + 0.3, barrelLen - 2, W - 0.6);
  ctx.fillStyle = barrelGrad;
  ctx.fill();

  // Rear rounded tail plug
  ctx.beginPath();
  ctx.arc(barrelEnd - 2, 0, (W - 1) / 2, -Math.PI / 2, Math.PI / 2);
  ctx.fillStyle = "#D6D4CE";
  ctx.fill();
  ctx.strokeStyle = "#B5B3AA";
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // ================= 3. AUTHENTIC REYNOLDS 045 TYPOGRAPHY IMPRINT =================
  ctx.save();
  ctx.fillStyle = textHue;
  ctx.font = "bold 4.2px sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "0.5px";
  // Subtly stamp on barrel
  ctx.fillText("045 REYNOLDS", barrelStart + 8, -0.4);
  ctx.font = "italic 3.2px sans-serif";
  ctx.fillStyle = "#8A2A2A";
  ctx.fillText("FINE CARBURE.", barrelStart + 43, -0.4);
  ctx.restore();

  // ================= 4. GLOSSY METALLIC COLLAR RING =================
  const collarX = barrelStart - 3.5;
  const collarW = 3.5;
  const collarGrad = ctx.createLinearGradient(0, -W / 2, 0, W / 2);
  collarGrad.addColorStop(0, shade(collarHue, -40));
  collarGrad.addColorStop(0.35, shade(collarHue, 35));
  collarGrad.addColorStop(0.5, "#FFFFFF"); // Metallic glint
  collarGrad.addColorStop(0.75, shade(collarHue, -15));
  collarGrad.addColorStop(1, shade(collarHue, -50));

  ctx.beginPath();
  ctx.rect(collarX, -W / 2 - 0.2, collarW, W + 0.4);
  ctx.fillStyle = collarGrad;
  ctx.fill();

  // ================= 5. ICONIC REYNOLDS LONG AERODYNAMIC CAP =================
  // Cap body: from -L/2 - 6 to collarX
  const capTipX = -L / 2 - 6;
  const capBaseX = collarX;
  const capGrad = ctx.createLinearGradient(0, -W / 2 - 0.5, 0, W / 2 + 0.5);
  capGrad.addColorStop(0, shade(capHue, -35));
  capGrad.addColorStop(0.2, shade(capHue, -5));
  capGrad.addColorStop(0.42, shade(capHue, 45)); // Glossy cylindrical reflex
  capGrad.addColorStop(0.55, shade(capHue, 60)); // Bright highlight
  capGrad.addColorStop(0.75, shade(capHue, -10));
  capGrad.addColorStop(1, shade(capHue, -45));

  // Cap contour with aerodynamic top fin / chisel tip
  ctx.beginPath();
  ctx.moveTo(capBaseX, -W / 2 - 0.4);
  ctx.lineTo(capTipX + 8, -W / 2 - 0.4);
  ctx.lineTo(capTipX, -W / 4); // Chisel fin top
  ctx.lineTo(capTipX, W / 4);
  ctx.lineTo(capTipX + 8, W / 2 + 0.4);
  ctx.lineTo(capBaseX, W / 2 + 0.4);
  ctx.closePath();
  ctx.fillStyle = capGrad;
  ctx.fill();

  // Subtle fin highlight line
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 0.8;
  line(ctx, capTipX + 2, 0, capBaseX - 2, 0);

  // ================= 6. LONG REYNOLDS POCKET CLIP =================
  // The clip originates near the top of the cap and extends down over the white barrel
  const clipStartX = capTipX + 8;
  const clipEndX = barrelStart + 16; // Overhangs 16px past the cap onto the barrel
  const clipY = -W / 2 - 3.2; // Rests along top ridge
  const clipThickness = 2.4;

  // Clip drop shadow onto the barrel/cap
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.beginPath();
  ctx.moveTo(clipStartX + 4, clipY + 3.2);
  ctx.lineTo(clipEndX, clipY + 3.2);
  ctx.lineTo(clipEndX - 2, clipY + 4.8);
  ctx.lineTo(clipStartX + 4, clipY + 4.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Clip body
  const clipGrad = ctx.createLinearGradient(0, clipY, 0, clipY + clipThickness);
  clipGrad.addColorStop(0, shade(capHue, 35));
  clipGrad.addColorStop(0.4, shade(capHue, 55));
  clipGrad.addColorStop(0.7, shade(capHue, 5));
  clipGrad.addColorStop(1, shade(capHue, -35));

  ctx.beginPath();
  ctx.moveTo(clipStartX, clipY + 1.8);
  ctx.lineTo(clipStartX + 4, clipY);
  ctx.lineTo(clipEndX - 3, clipY);
  ctx.lineTo(clipEndX, clipY + 1.2); // angled tip
  ctx.lineTo(clipEndX - 2, clipY + clipThickness);
  ctx.lineTo(clipStartX + 4, clipY + clipThickness);
  ctx.lineTo(clipStartX, clipY + 1.8);
  ctx.closePath();
  ctx.fillStyle = clipGrad;
  ctx.fill();

  // Clip edge bevel stroke
  ctx.strokeStyle = shade(capHue, -40);
  ctx.lineWidth = 0.5;
  ctx.stroke();

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
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
