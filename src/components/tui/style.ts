export function bold(value: string) {
  return style(value, "1");
}

export function italic(value: string) {
  return style(value, "3");
}

export function muted(value: string) {
  return style(value, "2");
}

export function gray(value: string) {
  return style(value, "90");
}

export function badge(value: string) {
  return style(` ${value} `, "90;40");
}

export function colorize(value: string, color: number) {
  return style(value, `38;5;${color}`);
}

export function clearLine() {
  return "\u001b[2K\r";
}

export function visibleLength(value: string) {
  let length = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 27 && value[index + 1] === "[") {
      index += 2;

      while (index < value.length && value[index] !== "m") {
        index += 1;
      }

      continue;
    }

    length += 1;
  }

  return length;
}

export function style(value: string, code: string) {
  if (process.env.NO_COLOR) {
    return value;
  }

  return `\u001b[${code}m${value}\u001b[0m`;
}
