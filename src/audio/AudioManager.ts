import { Ambient } from './ambient';
import type { AmbientMood, SoundEvent } from './events';
import { synthesize, type SynthOptions } from './synth';

/**
 * The one place the game makes sound. Scenes call play('line_clear') and
 * never touch Web Audio directly.
 *
 * Browsers only allow audio after a user gesture, so the context is created
 * lazily on the first tap or key press.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private ambient: Ambient | null = null;
  private samples = new Map<SoundEvent, AudioBuffer>();
  private pendingSamples = new Map<SoundEvent, string>();
  private wantedMood: AmbientMood | null = null;
  private playingMood: AmbientMood | null = null;
  private soundOn = true;
  private musicOn = true;

  constructor() {
    const unlock = () => {
      this.ensureContext();
      if (this.ctx?.state === 'suspended') void this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  setSoundEnabled(on: boolean): void {
    this.soundOn = on;
  }

  setMusicEnabled(on: boolean): void {
    this.musicOn = on;
    if (!on) {
      this.ambient?.stop();
      this.playingMood = null;
    } else if (this.wantedMood) {
      this.startAmbient(this.wantedMood);
    }
  }

  /**
   * Swap a placeholder for a recorded sample, e.g.
   * registerSample('piece_place', 'audio/place.ogg'). Files go in public/.
   */
  registerSample(event: SoundEvent, url: string): void {
    this.pendingSamples.set(event, url);
    if (this.ctx) void this.loadPending();
  }

  play(event: SoundEvent, opts?: SynthOptions): void {
    if (!this.soundOn) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus || ctx.state !== 'running') return;
    const sample = this.samples.get(event);
    if (sample) {
      const src = ctx.createBufferSource();
      src.buffer = sample;
      src.connect(this.sfxBus);
      src.start();
      return;
    }
    synthesize(ctx, this.sfxBus, event, opts);
  }

  /** Request background ambience. It starts once audio is unlocked and music is on. */
  startAmbient(mood: AmbientMood): void {
    this.wantedMood = mood;
    if (!this.musicOn || this.playingMood === mood) return;
    // Never create the context here: outside a user gesture it would start suspended
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    if (!this.ambient) this.ambient = new Ambient(ctx, this.musicBus);
    this.ambient.start(mood);
    this.playingMood = mood;
  }

  stopAmbient(): void {
    this.wantedMood = null;
    this.playingMood = null;
    this.ambient?.stop();
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      return null;
    }
    const master = this.ctx.createGain();
    master.gain.value = 0.9;
    // Gentle limiter so overlapping sounds never spike
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp).connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.8;
    this.sfxBus.connect(master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.6;
    this.musicBus.connect(master);
    void this.loadPending();
    // Ambience requested before the first gesture starts now
    if (this.wantedMood && this.musicOn) {
      const mood = this.wantedMood;
      queueMicrotask(() => this.startAmbient(mood));
    }
    return this.ctx;
  }

  private async loadPending(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    const entries = [...this.pendingSamples.entries()];
    this.pendingSamples.clear();
    await Promise.all(
      entries.map(async ([event, url]) => {
        try {
          const res = await fetch(url);
          this.samples.set(event, await ctx.decodeAudioData(await res.arrayBuffer()));
        } catch {
          // Keep the synthesised placeholder
        }
      }),
    );
  }
}
