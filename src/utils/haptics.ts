export type HapticEvent = 'place' | 'clear' | 'pattern' | 'gameOver';

/** Vibration patterns in ms: short and light, like a tap on cloth. */
const PATTERNS: Record<HapticEvent, number | number[]> = {
  place: 8,
  clear: [12, 40, 14],
  pattern: [10, 30, 10, 30, 22],
  gameOver: [24, 70, 24],
};

/** Native wrappers (e.g. Capacitor Haptics) can replace the web driver. */
export type HapticDriver = (event: HapticEvent, pattern: number | number[]) => void;

const webDriver: HapticDriver = (_event, pattern) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw outside a user gesture; haptics are optional.
  }
};

export class Haptics {
  enabled = true;
  private driver: HapticDriver = webDriver;

  /** True when the web Vibration API exists. iOS Safari does not have it. */
  static get supported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  }

  setDriver(driver: HapticDriver): void {
    this.driver = driver;
  }

  trigger(event: HapticEvent): void {
    if (this.enabled) this.driver(event, PATTERNS[event]);
  }
}
