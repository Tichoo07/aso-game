import type { AmbientMood } from './events';

/** D major pentatonic, two octaves, for the occasional distant note. */
const NOTES = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25, 739.99];

/**
 * A quiet generative bed: a low filtered drone that breathes slowly, plus a
 * soft note every few seconds through a short echo. Placeholder for a
 * composed track; swap it out by changing AudioManager.startAmbient.
 */
export class Ambient {
  private nodes: AudioNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private timer: number | null = null;
  private bus: GainNode | null = null;

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  start(mood: AmbientMood): void {
    this.stop();
    const { ctx } = this;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 3);
    bus.connect(this.out);
    this.bus = bus;

    // Drone: D2 + A2, slightly detuned, through a dark low-pass
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = mood === 'slow' ? 420 : 600;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    lp.connect(droneGain).connect(bus);
    for (const [f, detune] of [
      [73.42, -4],
      [110.0, 3],
      [146.83, 6],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(lp);
      osc.start();
      this.oscillators.push(osc);
    }

    // Slow breathing on the drone
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = mood === 'slow' ? 0.05 : 0.08;
    lfoDepth.gain.value = 0.02;
    lfo.connect(lfoDepth).connect(droneGain.gain);
    lfo.start();
    this.oscillators.push(lfo);

    // Echo for the plucks
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.42;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(bus);
    this.nodes.push(lp, droneGain, lfoDepth, delay, feedback, wet);

    const pluck = () => {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = NOTES[Math.floor(Math.random() * NOTES.length)];
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(0.03, t0 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
      osc.connect(env);
      env.connect(bus);
      env.connect(delay);
      osc.start(t0);
      osc.stop(t0 + 2.4);
      const [min, max] = mood === 'slow' ? [5000, 11000] : [3500, 8000];
      this.timer = window.setTimeout(pluck, min + Math.random() * (max - min));
    };
    this.timer = window.setTimeout(pluck, 1800);
  }

  stop(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
    const { ctx } = this;
    const bus = this.bus;
    const oscillators = this.oscillators;
    const nodes = this.nodes;
    this.bus = null;
    this.oscillators = [];
    this.nodes = [];
    if (!bus) return;
    // Fade out, then release everything
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    window.setTimeout(() => {
      for (const o of oscillators) {
        try {
          o.stop();
        } catch {
          // already stopped
        }
        o.disconnect();
      }
      for (const n of nodes) n.disconnect();
      bus.disconnect();
    }, 900);
  }
}
