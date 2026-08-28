// Core game configuration (logical canvas units)
export const CFG = {
  W: 900,
  H: 600,
  penLen: 78,
  penW: 13,
  pensPerSide: 4,
  maxDrag: 190,
  maxSpeed: 22,
  frictionAir: 0.045,
  restThreshold: 0.12,
  maxMovingMs: 6500,
  spinFactor: 0.6,
  maxOmega: 0.45,
};

// The playable table surface. Outside this rect = pen fell off the table.
export const BOARD = { x: 70, y: 60, w: 760, h: 480 };

export const INK = {
  p1: "#1E3A8A", // blue player
  p2: "#B42828", // red opponent
};

export const ASSETS = {
  desk: "https://images.unsplash.com/photo-1576092762791-dd9e2220abd1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTF8MHwxfHNlYXJjaHwxfHxkYXJrJTIwd29vZGVuJTIwZGVzayUyMHRleHR1cmUlMjBmbGF0JTIwbGF5fGVufDB8fHx8MTc4NzkyMjg0MXww&ixlib=rb-4.1.0&q=85",
};
