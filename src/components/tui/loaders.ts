interface LoaderInfo {
  badge: string;
  color: number;
  label: string;
}

const LOADERS = new Map<string, LoaderInfo>([
  ["babric", { badge: "BAB", color: 103, label: "Babric" }],
  ["bta-babric", { badge: "BTA", color: 82, label: "BTA (Babric)" }],
  ["bukkit", { badge: "BKT", color: 34, label: "Bukkit" }],
  ["bungeecord", { badge: "BUN", color: 214, label: "BungeeCord" }],
  ["canvas", { badge: "CVS", color: 111, label: "Canvas" }],
  ["datapack", { badge: "DP", color: 120, label: "Data Pack" }],
  ["fabric", { badge: "FAB", color: 180, label: "Fabric" }],
  ["folia", { badge: "FOL", color: 120, label: "Folia" }],
  ["forge", { badge: "FRG", color: 208, label: "Forge" }],
  ["geyser", { badge: "GEY", color: 215, label: "Geyser" }],
  ["iris", { badge: "IRS", color: 141, label: "Iris" }],
  ["java-agent", { badge: "JA", color: 244, label: "Java Agent" }],
  ["legacy-fabric", { badge: "LF", color: 109, label: "Legacy Fabric" }],
  ["liteloader", { badge: "LITE", color: 75, label: "LiteLoader" }],
  ["minecraft", { badge: "MC", color: 107, label: "Minecraft" }],
  ["modloader", { badge: "ML", color: 244, label: "Risugami's ModLoader" }],
  ["neoforge", { badge: "NF", color: 196, label: "NeoForge" }],
  ["nilloader", { badge: "NIL", color: 205, label: "NilLoader" }],
  ["optifine", { badge: "OF", color: 75, label: "OptiFine" }],
  ["ornithe", { badge: "ORN", color: 75, label: "Ornithe" }],
  ["paper", { badge: "PPR", color: 229, label: "Paper" }],
  ["purpur", { badge: "PUR", color: 171, label: "Purpur" }],
  ["quilt", { badge: "QLT", color: 141, label: "Quilt" }],
  ["rift", { badge: "RFT", color: 103, label: "Rift" }],
  ["spigot", { badge: "SPG", color: 214, label: "Spigot" }],
  ["sponge", { badge: "SPN", color: 220, label: "Sponge" }],
  ["vanilla", { badge: "VAN", color: 107, label: "Vanilla" }],
  ["velocity", { badge: "VEL", color: 39, label: "Velocity" }],
  ["waterfall", { badge: "WFL", color: 117, label: "Waterfall" }],
]);

export function loaderInfo(loader: string) {
  return LOADERS.get(loader.toLowerCase());
}

export function knownLoader(loader: string) {
  return LOADERS.has(loader.toLowerCase());
}
