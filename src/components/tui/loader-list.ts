import { knownLoader, loaderInfo } from "@/components/tui/loaders";
import { colorize } from "@/components/tui/style";

export function loaderNames(loaders: string[], separator = "  ") {
  const loaderNames = loaders.filter(knownLoader);
  const displayLoaders = loaderNames.length > 0 ? loaderNames : loaders;

  return displayLoaders.map(loaderName).join(separator);
}

export function loaderBadges(loaders: string[]) {
  const loaderNames = loaders.filter(knownLoader);
  const displayLoaders = loaderNames.length > 0 ? loaderNames : loaders;

  return displayLoaders.map(loaderBadge).join(" ");
}

export function loaderName(loader: string) {
  const info = loaderInfo(loader);
  const label = info?.label ?? titleCase(loader);

  if (!info) {
    return label;
  }

  return colorize(label, info.color);
}

function loaderBadge(loader: string) {
  const info = loaderInfo(loader);
  const label = info?.badge ?? titleCase(loader);

  if (!info) {
    return label;
  }

  return colorize(label, info.color);
}

function titleCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
