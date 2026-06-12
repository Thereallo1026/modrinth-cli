import { minecraftVersions } from "@/lib/minecraft-versions";

interface VersionOrder {
  positionInType: number;
  type: string;
}

interface OrderedVersion {
  order: VersionOrder;
  value: string;
}

const FALLBACK_GAME_VERSION_PATTERN = /^\d+(?:\.\d+)+$/;
let officialVersionOrder = new Map<string, VersionOrder>();

export async function loadMinecraftVersions() {
  const versions = await minecraftVersions();
  const typePositions = new Map<string, number>();

  officialVersionOrder = new Map(
    versions.map((version) => {
      const positionInType = typePositions.get(version.type) ?? 0;
      typePositions.set(version.type, positionInType + 1);

      return [
        version.id,
        {
          positionInType,
          type: version.type,
        },
      ];
    })
  );
}

export function versionRange(versions: string[]) {
  const ranges = versionRanges(versions);

  if (ranges.length === 0) {
    return "unknown versions";
  }

  return ranges.join(", ");
}

export function versionRanges(versions: string[]) {
  const officialVersions = versions
    .map((version) => ({
      order: officialVersionOrder.get(version),
      value: version,
    }))
    .filter(hasOrder);

  if (officialVersions.length > 0) {
    return collapseOfficialVersions(officialVersions);
  }

  return collapseFallbackVersions(versions);
}

function collapseOfficialVersions(versions: OrderedVersion[]) {
  const ranges: string[] = [];
  let rangeStart = versions[0] as OrderedVersion;
  let previous = versions[0] as OrderedVersion;

  for (const version of versions.slice(1)) {
    if (previous.order.type === version.order.type) {
      const distance =
        version.order.positionInType - previous.order.positionInType;

      if (distance === 1) {
        previous = version;
        continue;
      }
    }

    ranges.push(formatRange(rangeStart.value, previous.value));
    rangeStart = version;
    previous = version;
  }

  ranges.push(formatRange(rangeStart.value, previous.value));

  return ranges;
}

function collapseFallbackVersions(versions: string[]) {
  const gameVersions = versions.filter((version) =>
    FALLBACK_GAME_VERSION_PATTERN.test(version)
  );

  if (gameVersions.length === 0) {
    return [];
  }

  const first = gameVersions[0] ?? "unknown";
  const last = gameVersions.at(-1) ?? first;

  return [formatRange(first, last)];
}

function formatRange(start: string, end: string) {
  return start === end ? start : `${start} - ${end}`;
}

function hasOrder(version: {
  order: VersionOrder | undefined;
  value: string;
}): version is OrderedVersion {
  return version.order !== undefined;
}
