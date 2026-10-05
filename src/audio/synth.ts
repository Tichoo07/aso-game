/**
 * Placeholder sounds, synthesised with Web Audio so the MVP ships without
 * audio files. Everything is quiet, short and soft-edged: taps on cloth and
 * gentle plucks, never arcade bleeps. Replace any of them with recorded
 * samples via AudioManager.registerSample.
 */
import type { SoundEvent } from './events';

/** D major pentatonic, in Hz, low to high. */
const SCALE = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99, 880.0, 987.77];

let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: BaseAudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    const length = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  at?: number;
  attack?: number;
  decay: number;
  gain: number;
  cutoff?: number;
}

function tone(ctx: AudioContext, out: AudioNode, o: ToneOpts): void {
  const t0 = ctx.currentTime + (o.at ?? 0);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  osc.type = o.type ?? 'sine';
  osc.frequency.value = o.freq;
  lp.type = 'lowpass';
  lp.frequency.value = o.cutoff ?? 2400;
  const attack = o.attack ?? 0.006;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(o.gain, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + o.decay);
  osc.connect(lp).connect(env).connect(out);
  osc.start(t0);
  osc.stop(t0 + attack + o.decay + 0.05);
}

function brush(ctx: AudioContext, out: AudioNode, at: number, dur: number, gain: number, freq: number, q = 0.8): void {
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(env).connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

export interface SynthOptions {
  /** Lines cleared, combo streak, etc. Used to vary pitch. */
  intensity?: number;
}

export function synthesize(ctx: AudioContext, out: AudioNode, event: SoundEvent, opts: SynthOptions = {}): void {
  const n = Math.max(1, opts.intensity ?? 1);
  switch (event) {
    case 'piece_place':
      // A soft press of cloth onto cloth
      brush(ctx, out, 0, 0.07, 0.18, 520, 0.7);
      tone(ctx, out, { freq: 150, decay: 0.09, gain: 0.12, cutoff: 600 });
      break;
    case 'piece_pickup':
      brush(ctx, out, 0, 0.04, 0.05, 1800, 1.2);
      break;
    case 'invalid':
      tone(ctx, out, { freq: 110, decay: 0.12, gain: 0.06, cutoff: 400 });
      break;
    case 'line_clear': {
      brush(ctx, out, 0, 0.22, 0.04, 2600, 0.5);
      const notes = Math.min(5, 2 + n);
      for (let i = 0; i < notes; i++) {
        tone(ctx, out, { freq: SCALE[Math.min(SCALE.length - 1, i * 2)], type: 'triangle', at: i * 0.06, decay: 0.5, gain: 0.05 });
      }
      break;
    }
    case 'pattern_complete': {
      const chord = [SCALE[0], SCALE[2], SCALE[3], SCALE[5]];
      chord.forEach((f, i) => tone(ctx, out, { freq: f, at: i * 0.05, attack: 0.12, decay: 1.6, gain: 0.045, cutoff: 1800 }));
      [SCALE[7], SCALE[8], SCALE[9]].forEach((f, i) =>
        tone(ctx, out, { freq: f, type: 'triangle', at: 0.35 + i * 0.09, decay: 0.6, gain: 0.025 }),
      );
      break;
    }
    case 'combo':
      tone(ctx, out, { freq: SCALE[Math.min(SCALE.length - 1, 3 + n)], type: 'triangle', at: 0.12, decay: 0.45, gain: 0.04 });
      break;
    case 'game_over':
      tone(ctx, out, { freq: SCALE[3] / 2, attack: 0.05, decay: 0.9, gain: 0.07, cutoff: 900 });
      tone(ctx, out, { freq: SCALE[2] / 2, at: 0.35, attack: 0.05, decay: 1.2, gain: 0.07, cutoff: 900 });
      break;
    case 'button_press':
      brush(ctx, out, 0, 0.03, 0.06, 3000, 1.5);
      tone(ctx, out, { freq: 660, decay: 0.04, gain: 0.025 });
      break;
  }
}
