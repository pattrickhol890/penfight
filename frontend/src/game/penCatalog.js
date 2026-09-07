// Pen Fight Official Pen Catalog

export const PEN_CATALOG = {
  classic: {
    id: "classic",
    name: "Reynolds 045 Ballpoint",
    shortName: "Classic 045",
    subtitle: "The Legendary Classroom Warrior",
    model: "/models/pen.glb",
    modelAxis: "x",
    modelScaleDivider: 1.8992,
    rarity: "Common",
    badgeColor: "border-blue-400 bg-blue-50 text-blue-800",
    inkColor: {
      p1: "#1473E6", // Electric Blue
      p2: "#E02424", // Radiant Red
    },
    // Matter.js Physics Attributes
    massMultiplier: 1.0,
    friction: 0.05,
    frictionAir: 0.015,
    slideFriction: 0.048,
    restitution: 0.35,
    // RPG / Display Stats (1 to 10 scale)
    stats: {
      weight: 5,
      glide: 6,
      impact: 5,
      control: 8,
    },
    description:
      "The ubiquitous Indian classroom staple. Balanced weight, agile pivot spins, and dependable ink flow.",
    trait: "Agile Pivot: Sharp rotational snap on glancing hits.",
  },

  ocean_gel: {
    id: "ocean_gel",
    name: "Ocean Gel 0.5",
    shortName: "Ocean Gel",
    subtitle: "Smooth Flow Heavyweight",
    model: "/models/pen2.glb",
    modelAxis: "y", // Needs 90 deg rotation around Z to align with X axis
    modelScaleDivider: 1.8996,
    rarity: "Rare",
    badgeColor: "border-cyan-400 bg-cyan-50 text-cyan-800",
    inkColor: {
      p1: "#0284C7", // Deep Ocean Cyan
      p2: "#DC2626", // Crimson Gel
    },
    // Matter.js Physics Attributes (Heavier body, slicker glide, harder punch)
    massMultiplier: 1.28, // 28% heavier: harder for opponents to push off desk!
    friction: 0.04,
    frictionAir: 0.013,
    slideFriction: 0.036, // Lower sliding friction gives a smooth, gliding feel
    restitution: 0.44, // Higher elastic rebound on collisions
    // RPG / Display Stats (1 to 10 scale)
    stats: {
      weight: 8,
      glide: 9,
      impact: 8,
      control: 6,
    },
    description:
      "Premium gel pen with ergonomic grip and heavy barrel. Glides effortlessly across the wooden desk and hits with devastating kinetic force.",
    trait: "Heavy Tank: Resists opponent pushes; delivers punchy knock-backs.",
  },
};

export const DEFAULT_LINEUP = ["classic", "classic", "ocean_gel", "classic"];

export const DEFAULT_INVENTORY = {
  classic: 4,
  ocean_gel: 2,
};

/**
 * Ensures a 4-slot lineup does not exceed the count of pens owned in inventory.
 * If a player owns 2 Ocean Gels, they can equip at most 2 Ocean Gels.
 */
export function sanitizeLineup(lineup, inventory) {
  const counts = {};
  const inv = inventory || DEFAULT_INVENTORY;
  const raw = Array.isArray(lineup) && lineup.length === 4 ? lineup : DEFAULT_LINEUP;

  return raw.map((penId) => {
    const owned = inv[penId] !== undefined ? inv[penId] : (penId === "classic" ? 4 : 0);
    const used = counts[penId] || 0;
    if (used < owned) {
      counts[penId] = used + 1;
      return penId;
    }
    // Cannot equip more copies than owned: fallback to classic
    return "classic";
  });
}

