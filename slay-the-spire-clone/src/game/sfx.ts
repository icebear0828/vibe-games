let ctx: AudioContext | null = null;
let enabled = localStorage.getItem('sts_sound') !== 'off';
let master: GainNode | null = null;

export const sound = {
  get on() { return enabled; },
  toggle() { enabled = !enabled; localStorage.setItem('sts_sound', enabled ? 'on' : 'off'); },
};

function ac() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slide = 0, delay = 0) {
  if (!enabled) return;
  const a = ac(); if (!a || !master) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.3, filter = 1200, delay = 0, type: BiquadFilterType = 'lowpass') {
  if (!enabled) return;
  const a = ac(); if (!a || !master) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = type; f.frequency.value = filter;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

export const sfx = {
  hit: (heavy = false) => { noise(heavy ? 0.35 : 0.18, heavy ? 0.6 : 0.45, heavy ? 900 : 2200); tone(heavy ? 90 : 140, 0.18, 'square', 0.15, -60); },
  slash: () => { noise(0.15, 0.4, 3000, 0, 'highpass'); tone(600, 0.12, 'sawtooth', 0.06, -400); },
  block: () => { tone(420, 0.12, 'triangle', 0.25); tone(840, 0.2, 'sine', 0.12, 0, 0.03); noise(0.08, 0.2, 5000, 0, 'highpass'); },
  blocked: () => { tone(900, 0.08, 'square', 0.12); tone(1300, 0.15, 'triangle', 0.1, -300, 0.02); },
  card: () => { noise(0.07, 0.2, 4000, 0, 'bandpass'); },
  draw: () => { noise(0.05, 0.12, 6000, 0, 'highpass'); },
  buff: () => { tone(330, 0.2, 'triangle', 0.2, 300); tone(495, 0.25, 'triangle', 0.15, 300, 0.08); },
  debuff: () => { tone(300, 0.3, 'sawtooth', 0.12, -200); },
  heal: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.3, 'sine', 0.15, 0, i * 0.07)); },
  gold: () => { [1200, 1600, 2000].forEach((f, i) => tone(f, 0.12, 'square', 0.06, 0, i * 0.05)); },
  death: () => { tone(200, 0.8, 'sawtooth', 0.2, -170); noise(0.6, 0.3, 600); },
  click: () => { tone(700, 0.05, 'square', 0.08); },
  hover: () => { tone(1100, 0.03, 'sine', 0.04); },
  endTurn: () => { tone(220, 0.25, 'triangle', 0.2); tone(165, 0.35, 'triangle', 0.18, 0, 0.12); },
  turn: () => { tone(392, 0.2, 'triangle', 0.15); tone(523, 0.3, 'triangle', 0.15, 0, 0.1); },
  energy: () => { tone(600, 0.15, 'sine', 0.15, 600); },
  exhaust: () => { noise(0.4, 0.25, 1500); tone(180, 0.3, 'sine', 0.1, 200); },
  potion: () => { tone(500, 0.1, 'sine', 0.2, 400); tone(900, 0.2, 'sine', 0.12, -200, 0.1); },
  error: () => { tone(160, 0.15, 'square', 0.1); },
  victory: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, 'triangle', 0.18, 0, i * 0.12)); },
  relic: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.35, 'sine', 0.15, 0, i * 0.08)); },
  map: () => { noise(0.25, 0.15, 800); },
};
