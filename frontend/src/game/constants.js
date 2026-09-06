export const CFG = {
  W: 900,
  H: 600,
  penLen: 106,
  penW: 13,
  pensPerSide: 4,
  maxDrag: 160,
  maxSpeed: 22,
  frictionAir: 0.015, // Base air friction (fine-tuned by anisotropic friction loop)
  rollFriction: 0.012, // Low resistance when rolling across cylinder width
  slideFriction: 0.048, // High resistance when sliding along pen length
  angularDamping: 0.035, // Natural rotational decay on wooden desk
  capMassRatio: 1.35, // Cap end is 35% heavier than nib end
  comOffset: 0.12, // Center of mass shifted 12% towards the cap (-x in local coords)
  restThreshold: 0.12,
  maxMovingMs: 6500,
  spinFactor: 0.72,
  maxOmega: 0.5,
  clipHeight3D: 3.5, // 3D extension height of the clip
  gravityZ: 0.28, // Downward table gravity in Z-axis
  bounceZ: 0.35, // Restitution bounce when hitting table
  zoomAmt: 0.18,
  zoomMin: 0.82,
};

// The playable table surface. Expands to ~90% of screen with thin desk margin
export const BOARD = { x: 35, y: 30, w: 830, h: 540 };

export const INK = {
  p1: "#1E3A8A", // blue player
  p2: "#B42828", // red opponent
};

export const ASSETS = {
  desk: "https://images.unsplash.com/photo-1576092762791-dd9e2220abd1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxkYXJrJTIwd29vZGVuJTIwZGVzayUyMHRleHR1cmUlMjBmbGF0JTIwbGF5fGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85",
};

// Canvas drawing buffer padding to allow complete 360-degree rotation of full-size table without corner clipping
export const CANVAS_PAD = {
  x: 150,
  y: 250,
};

export const CANVAS_DIM = {
  w: CFG.W + 2 * CANVAS_PAD.x, // 1200
  h: CFG.H + 2 * CANVAS_PAD.y, // 1100
};

export const SUB_STEPS = 6;

/**
 * Returns table scale during rotation. Maintained at 1.0 so table keeps
 * natural full size across 360° rotation with complete, uncut corners.
 */
export function getTableFitScale(_ang) {
  return 1.0;
}

