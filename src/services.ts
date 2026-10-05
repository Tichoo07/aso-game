import { AudioManager } from './audio/AudioManager';
import type { SoundEvent } from './audio/events';
import { setLocale } from './data/i18n';
import { SaveStore, withSettings, type Settings } from './storage/save';
import { Haptics, type HapticEvent } from './utils/haptics';

/**
 * App-wide singletons: the save, audio and haptics. Created once in main.ts
 * before Phaser boots; scenes read them through the helpers below.
 */
interface Services {
  save: SaveStore;
  audio: AudioManager;
  haptics: Haptics;
}

let services: Services | null = null;

function safeLocalStorage(): Storage | null {
  try {
    const probe = '__aso_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function initServices(): Services {
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  services = {
    save: new SaveStore(safeLocalStorage(), prefersReducedMotion),
    audio: new AudioManager(),
    haptics: new Haptics(),
  };
  applySettings(services.save.data.settings);
  return services;
}

export function app(): Services {
  if (!services) throw new Error('initServices() has not run');
  return services;
}

export function settings(): Settings {
  return app().save.data.settings;
}

function applySettings(s: Settings): void {
  const { audio, haptics } = app();
  audio.setSoundEnabled(s.sound);
  audio.setMusicEnabled(s.music);
  haptics.enabled = s.haptics;
  setLocale(s.language);
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = app().save.update((save) => withSettings(save, patch)).settings;
  applySettings(next);
  return next;
}

/** Sound + haptic for a game event, in one call. */
export function feedback(sound: SoundEvent, haptic?: HapticEvent, intensity?: number): void {
  const { audio, haptics } = app();
  audio.play(sound, { intensity });
  if (haptic) haptics.trigger(haptic);
}
