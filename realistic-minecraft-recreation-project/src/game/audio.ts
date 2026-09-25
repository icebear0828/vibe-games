import type { SoundType } from './blocks';

class SoundEngine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  sfx!: GainNode;
  music!: GainNode;
  reverb!: ConvolverNode;
  noise!: AudioBuffer;
  musicEnabled = true;
  private musicTimer = 0;
  private nextPhrase = 8;
  volume = 0.8;

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
    } catch { return; }
    const ctx = this.ctx!;
    this.master = ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master);
    this.music = ctx.createGain(); this.music.gain.value = 0.22; 
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2);
    this.music.connect(this.reverb); this.reverb.connect(this.master);
    const dry = ctx.createGain(); dry.gain.value = 0.5; this.music.connect(dry); dry.connect(this.master);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  setVolume(v: number) { this.volume = v; if (this.ctx) this.master.gain.value = v; }

  private impulse(sec: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    return b;
  }

  private burst(t: number, o: { f: number; q: number; type: BiquadFilterType; dur: number; gain: number; attack?: number }, dest?: AudioNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = o.type; f.frequency.value = o.f; f.Q.value = o.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.gain, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfx);
    src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.05);
  }

  private tone(t: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', endFreq?: number, dest?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private material(type: SoundType, vol: number, long: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const k = long ? 1 : 0.6;
    switch (type) {
      case 'grass':
        for (let i = 0; i < (long ? 4 : 2); i++) this.burst(t + i * 0.025 + Math.random() * 0.01, { f: 2200 + Math.random() * 1500, q: 0.9, type: 'bandpass', dur: 0.09 * k, gain: 0.5 * vol });
        break;
      case 'gravel':
        for (let i = 0; i < (long ? 5 : 3); i++) this.burst(t + i * 0.02, { f: 900 + Math.random() * 800, q: 1.2, type: 'bandpass', dur: 0.1 * k, gain: 0.6 * vol });
        break;
      case 'stone':
        this.burst(t, { f: 2600, q: 1.5, type: 'bandpass', dur: 0.08 * k, gain: 0.7 * vol });
        this.burst(t + 0.01, { f: 500, q: 1, type: 'lowpass', dur: 0.1 * k, gain: 0.6 * vol });
        this.tone(t, 180 + Math.random() * 40, 0.06, 0.15 * vol, 'triangle');
        break;
      case 'wood':
        this.burst(t, { f: 700, q: 2, type: 'bandpass', dur: 0.12 * k, gain: 0.8 * vol });
        this.tone(t, 150 + Math.random() * 40, 0.12 * k, 0.35 * vol, 'triangle', 90);
        break;
      case 'sand':
        this.burst(t, { f: 3500, q: 0.5, type: 'highpass', dur: 0.16 * k, gain: 0.35 * vol, attack: 0.02 });
        break;
      case 'snow':
        for (let i = 0; i < 3; i++) this.burst(t + i * 0.03, { f: 1600 + Math.random() * 600, q: 1.5, type: 'bandpass', dur: 0.08 * k, gain: 0.4 * vol });
        break;
      case 'cloth':
        this.burst(t, { f: 500, q: 0.7, type: 'lowpass', dur: 0.15 * k, gain: 0.7 * vol, attack: 0.02 });
        break;
      case 'glass':
        this.burst(t, { f: 4000, q: 1, type: 'highpass', dur: 0.1 * k, gain: 0.5 * vol });
        if (long) for (let i = 0; i < 6; i++) this.tone(t + Math.random() * 0.12, 2000 + Math.random() * 3000, 0.25, 0.08 * vol);
        else this.tone(t, 2500 + Math.random() * 1500, 0.1, 0.06 * vol);
        break;
    }
  }

  dig(type: SoundType) { this.material(type, 1, true); }
  hit(type: SoundType) { this.material(type, 0.45, false); }
  step(type: SoundType) { this.material(type, 0.32, false); }
  place(type: SoundType) { this.material(type, 0.9, true); }

  pop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(t, 900 + Math.random() * 400, 0.08, 0.25, 'sine', 1800);
  }
  click() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(t, 1200, 0.04, 0.2, 'square', 800);
    this.burst(t, { f: 3000, q: 2, type: 'bandpass', dur: 0.03, gain: 0.2 });
  }
  hurt() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(t, 320, 0.18, 0.35, 'sawtooth', 180);
    this.burst(t, { f: 800, q: 1, type: 'lowpass', dur: 0.15, gain: 0.5 });
  }
  splash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, { f: 1200, q: 0.5, type: 'lowpass', dur: 0.5, gain: 0.6, attack: 0.02 });
    this.burst(t + 0.05, { f: 3000, q: 0.5, type: 'bandpass', dur: 0.35, gain: 0.3 });
  }
  swim() {
    if (!this.ctx) return;
    this.burst(this.ctx.currentTime, { f: 900, q: 0.8, type: 'lowpass', dur: 0.25, gain: 0.25, attack: 0.05 });
  }
  explode() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.burst(t, { f: 300, q: 0.5, type: 'lowpass', dur: 1.6, gain: 1.2 });
    this.tone(t, 70, 0.8, 0.6, 'sine', 30);
  }
  fuse() {
    if (!this.ctx) return;
    this.burst(this.ctx.currentTime, { f: 5000, q: 0.5, type: 'highpass', dur: 1.2, gain: 0.25, attack: 0.1 });
  }
  mob(kind: string, vol = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3;
    o.type = 'sawtooth';
    let dur = 0.3;
    if (kind === 'pig') {
      o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(130, t + 0.25); f.frequency.value = 700; dur = 0.28;
    } else if (kind === 'cow') {
      o.frequency.setValueAtTime(110, t); o.frequency.linearRampToValueAtTime(95, t + 0.9); f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(700, t + 0.4); f.frequency.linearRampToValueAtTime(350, t + 0.9); dur = 1.0;
    } else {
      o.frequency.setValueAtTime(330, t); f.frequency.value = 1100; dur = 0.6;
      const lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = 18; lg.gain.value = 25;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur);
    }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35 * vol, t + 0.04); g.gain.linearRampToValueAtTime(0.25 * vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f); f.connect(g); g.connect(this.sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ---- generative ambient piano ----
  private piano(t: number, midi: number, vel: number, dur = 4) {
    const ctx = this.ctx!;
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    lp.connect(g); g.connect(this.music);
    const partials: [number, number][] = [[1, 1], [2, 0.35], [3, 0.12], [4, 0.06]];
    for (const [m, a] of partials) {
      const o = ctx.createOscillator();
      o.type = m === 1 ? 'triangle' : 'sine';
      o.frequency.value = f * m * (1 + (Math.random() - 0.5) * 0.001);
      const og = ctx.createGain(); og.gain.value = a;
      o.connect(og); og.connect(lp);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }

  updateMusic(dt: number) {
    if (!this.ctx || !this.musicEnabled) return;
    this.musicTimer += dt;
    if (this.musicTimer < this.nextPhrase) return;
    this.musicTimer = 0;
    this.nextPhrase = 9 + Math.random() * 14;
    const scales = [[60, 62, 64, 67, 69, 72, 74, 76, 79], [57, 60, 62, 64, 67, 69, 72, 74], [55, 59, 62, 64, 66, 67, 71, 74]];
    const sc = scales[Math.floor(Math.random() * scales.length)];
    const t0 = this.ctx.currentTime + 0.1;
    const bass = sc[0] - 12 - (Math.random() < 0.5 ? 0 : 5);
    this.piano(t0, bass, 0.22, 6);
    this.piano(t0 + 0.02, bass + 7, 0.12, 6);
    let tt = t0 + 0.6 + Math.random() * 0.5;
    const n = 3 + Math.floor(Math.random() * 5);
    let pi = Math.floor(Math.random() * sc.length);
    for (let i = 0; i < n; i++) {
      pi = Math.max(0, Math.min(sc.length - 1, pi + Math.floor(Math.random() * 5) - 2));
      this.piano(tt, sc[pi], 0.1 + Math.random() * 0.08, 4);
      if (Math.random() < 0.25) this.piano(tt, sc[Math.max(0, pi - 2)], 0.07, 4);
      tt += [0.45, 0.6, 0.9, 1.2][Math.floor(Math.random() * 4)];
    }
  }
}

export const Sound = new SoundEngine();
