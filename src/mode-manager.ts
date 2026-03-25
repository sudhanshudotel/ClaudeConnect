import { Mode, MODE_LABELS } from "./types";

let currentMode: Mode = "ask";

export function getMode(): Mode {
  return currentMode;
}

export function setMode(mode: Mode): void {
  const previous = currentMode;
  currentMode = mode;
  if (previous !== mode) {
    console.log(`Mode changed: ${MODE_LABELS[previous]} → ${MODE_LABELS[mode]}`);
  }
}
