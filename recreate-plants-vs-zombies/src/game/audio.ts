// Procedural Web-Audio sound effects and background music
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

const settings = {
  sfx: Number(localStorage.getItem('pvz-sfx') ?? '0.8'),
  music: Number(localStorage.getItem('pvz-music') ?? '0.45'),
};

export function getVolumes() {
  return { ...settings };
}

export function setVolumes(sfx: number, music: number) {
  settings.sfx = sfx;
  settings.music = music;
  localStorage.setItem('pvz-sfx', String(sfx));
  localStorage.setItem('pvz-music', String(music));
  if (sfxGain) sfxGain.gain.value = sfx;
  if (musicGain) musicGain.gain.value = music * 0.5;
}

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = settings.sfx;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = settings.music * 0.5;
    musicGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0, freqEnd?: number, dest?: AudioNode) {
  if (!ctx || !sfxGain) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 20), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest ?? sfxGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, vol = 0.3, filterFreq = 1000, type: BiquadFilterType = 'lowpass', delay = 0, filterEnd?: number) {
  if (!ctx || !sfxGain || !noiseBuf) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(filterFreq, t);
  if (filterEnd) f.frequency.exponentialRampToValueAtTime(filterEnd, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(sfxGain);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

const lastPlayed: Record<string, number> = {};
function throttle(key: string, ms: number) {
  const now = performance.now();
  if (lastPlayed[key] && now - lastPlayed[key] < ms) return false;
  lastPlayed[key] = now;
  return true;
}

export const sfx = {
  click() { tone(700, 0.06, 'square', 0.12); tone(1000, 0.05, 'square', 0.08, 0.03); },
  tap() { tone(520, 0.05, 'triangle', 0.2); },
  seedLift() { tone(400, 0.08, 'triangle', 0.25, 0, 800); },
  plant() {
    noise(0.18, 0.5, 600, 'lowpass', 0, 150);
    tone(160, 0.15, 'sine', 0.4, 0, 70);
  },
  shovel() { noise(0.25, 0.4, 2000, 'bandpass'); tone(220, 0.2, 'triangle', 0.2, 0.05, 110); },
  shoot() {
    if (!throttle('shoot', 45)) return;
    tone(420 + Math.random() * 60, 0.07, 'sine', 0.22, 0, 180);
    noise(0.04, 0.15, 1500, 'bandpass');
  },
  splat() {
    if (!throttle('splat', 40)) return;
    noise(0.1, 0.35, 900 + Math.random() * 400, 'bandpass', 0, 300);
    tone(180, 0.06, 'sine', 0.2, 0, 90);
  },
  plasticHit() {
    if (!throttle('plastic', 50)) return;
    tone(620, 0.08, 'square', 0.08, 0, 400);
    noise(0.06, 0.2, 2200, 'bandpass');
  },
  metalHit() {
    if (!throttle('metal', 50)) return;
    tone(1400, 0.18, 'triangle', 0.15, 0, 1300);
    tone(2130, 0.14, 'sine', 0.08);
    noise(0.05, 0.2, 5000, 'highpass');
  },
  frozen() { if (!throttle('frozen', 80)) return; tone(1800, 0.12, 'sine', 0.08, 0, 2600); },
  fireHit() { if (!throttle('fire', 60)) return; noise(0.2, 0.3, 3000, 'lowpass', 0, 400); },
  sunCollect() {
    tone(880, 0.1, 'triangle', 0.18);
    tone(1320, 0.14, 'triangle', 0.14, 0.06);
    tone(1760, 0.18, 'sine', 0.1, 0.12);
  },
  sunPop() { tone(600, 0.12, 'sine', 0.15, 0, 900); },
  chomp() {
    if (!throttle('chomp', 180)) return;
    noise(0.09, 0.28, 700 + Math.random() * 500, 'bandpass');
    tone(110, 0.07, 'square', 0.06);
  },
  bigChomp() { noise(0.25, 0.5, 500, 'lowpass'); tone(90, 0.2, 'square', 0.15, 0, 50); noise(0.15, 0.4, 900, 'bandpass', 0.25); },
  gulp() { tone(200, 0.2, 'sine', 0.3, 0, 80); },
  explode() {
    noise(1.2, 0.9, 1200, 'lowpass', 0, 60);
    tone(90, 0.8, 'sine', 0.7, 0, 30);
    tone(55, 1.0, 'triangle', 0.5, 0.05, 25);
  },
  potatoMine() {
    noise(0.8, 0.8, 1500, 'lowpass', 0, 80);
    tone(120, 0.5, 'sine', 0.6, 0, 40);
  },
  fireRow() {
    noise(1.4, 0.7, 2500, 'lowpass', 0, 200);
    tone(70, 1.2, 'sawtooth', 0.15, 0, 40);
  },
  squashJump() { tone(300, 0.25, 'triangle', 0.25, 0, 700); },
  squashLand() { noise(0.3, 0.8, 400, 'lowpass', 0, 60); tone(70, 0.3, 'sine', 0.7, 0, 30); },
  groan() {
    if (!ctx || !sfxGain) return;
    if (!throttle('groan', 1400)) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const base = 85 + Math.random() * 40;
    o.type = 'sawtooth';
    o2.type = 'sawtooth';
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.25, t + 0.35);
    o.frequency.linearRampToValueAtTime(base * 0.8, t + 1.1);
    o2.frequency.setValueAtTime(base * 1.01, t);
    o2.frequency.linearRampToValueAtTime(base * 0.78, t + 1.1);
    f.type = 'bandpass';
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(900, t + 0.4);
    f.frequency.linearRampToValueAtTime(400, t + 1.1);
    f.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxGain);
    o.start(t); o2.start(t); o.stop(t + 1.3); o2.stop(t + 1.3);
  },
  limbPop() { tone(300, 0.08, 'sine', 0.2, 0, 150); noise(0.08, 0.25, 1200, 'bandpass'); },
  zombieFall() { noise(0.3, 0.5, 300, 'lowpass', 0, 80); tone(80, 0.2, 'sine', 0.35, 0, 45); },
  mower() {
    if (!ctx || !sfxGain) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 70;
    lfo.frequency.value = 28;
    lg.gain.value = 30;
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.1);
    g.gain.setValueAtTime(0.2, t + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
    o.connect(g); g.connect(sfxGain);
    o.start(t); lfo.start(t); o.stop(t + 2.4); lfo.stop(t + 2.4);
  },
  hugeWave() {
    if (!ctx || !sfxGain) return;
    // air-raid siren
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 1.2);
    o.frequency.setValueAtTime(700, t + 1.8);
    o.frequency.exponentialRampToValueAtTime(250, t + 3.2);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.3);
    g.gain.setValueAtTime(0.18, t + 2.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.3);
    o.connect(f); f.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + 3.4);
  },
  finalWave() {
    [0, 0.18, 0.36, 0.6].forEach((d, i) => tone([392, 392, 392, 311][i], i === 3 ? 0.7 : 0.16, 'square', 0.15, d));
  },
  readySetPlant(step: number) {
    if (step < 2) tone(step === 0 ? 523 : 659, 0.25, 'square', 0.15);
    else { tone(784, 0.5, 'square', 0.15); tone(1046, 0.5, 'square', 0.1, 0.05); }
  },
  firstZombies() {
    // "The zombies are coming" horn
    tone(146, 0.6, 'sawtooth', 0.12); tone(155, 0.6, 'sawtooth', 0.1, 0.02);
    tone(146, 0.9, 'sawtooth', 0.12, 0.7); tone(138, 0.9, 'sawtooth', 0.1, 0.72);
  },
  lose() {
    stopMusic();
    tone(80, 2.2, 'sawtooth', 0.2, 0, 40);
    [392, 370, 349, 330, 311, 294].forEach((f, i) => tone(f, 0.45, 'square', 0.1, 0.3 + i * 0.35));
    noise(1.5, 0.3, 600, 'bandpass', 0.2, 2000);
  },
  win() {
    stopMusic();
    const seq = [523, 659, 784, 1046, 784, 1046, 1318];
    seq.forEach((f, i) => tone(f, 0.25, 'square', 0.12, i * 0.13));
    tone(1568, 0.8, 'triangle', 0.12, seq.length * 0.13);
  },
  reward() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.15, i * 0.08));
  },
  pause() { tone(440, 0.12, 'triangle', 0.2); tone(330, 0.14, 'triangle', 0.2, 0.1); },
  buzzer() { tone(140, 0.25, 'square', 0.15); },
};

// ---------------- Background music ----------------
let musicTimer: number | null = null;
let musicStep = 0;
let musicNext = 0;
let currentSong: 'day' | 'menu' | 'chooser' | null = null;

const N: Record<string, number> = {};
const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let o = 1; o <= 6; o++) names.forEach((n, i) => (N[n + o] = 440 * Math.pow(2, (o * 12 + i - 57) / 12)));

// Original quirky, spooky-yet-cheerful day-lawn melody (16th grid)
const dayMelody: (string | null)[] = [
  'E4', null, 'G4', null, 'A4', null, 'E4', 'G4', null, 'A4', null, 'C5', 'B4', null, 'A4', null,
  'G4', null, 'E4', null, 'D4', null, 'E4', null, 'G4', null, null, null, null, null, null, null,
  'E4', null, 'G4', null, 'A4', null, 'E4', 'G4', null, 'A4', null, 'C5', 'D5', null, 'C5', null,
  'B4', null, 'G4', null, 'A4', null, null, null, 'E4', null, null, null, null, null, null, null,
  'A4', null, 'C5', null, 'E5', null, 'D5', 'C5', null, 'B4', null, 'A4', 'G4', null, 'A4', null,
  'B4', null, 'G4', null, 'E4', null, 'F#4', null, 'G4', null, null, null, 'B4', null, null, null,
  'A4', null, 'C5', null, 'E5', null, 'D5', 'C5', null, 'B4', null, 'C5', 'D5', null, 'E5', null,
  'D5', null, 'B4', null, 'C5', null, 'A4', null, 'A4', null, null, null, null, null, null, null,
];
const dayBass: (string | null)[] = [
  'A2', null, 'E3', null, 'A2', null, 'E3', null, 'A2', null, 'E3', null, 'A2', null, 'E3', null,
  'E2', null, 'B2', null, 'E2', null, 'B2', null, 'E2', null, 'B2', null, 'E2', null, 'G#2', null,
  'A2', null, 'E3', null, 'A2', null, 'E3', null, 'F2', null, 'C3', null, 'F2', null, 'C3', null,
  'G2', null, 'D3', null, 'E2', null, 'B2', null, 'A2', null, 'E3', null, 'A2', null, 'G2', null,
  'F2', null, 'C3', null, 'F2', null, 'C3', null, 'C2', null, 'G2', null, 'C2', null, 'G2', null,
  'G2', null, 'D3', null, 'E2', null, 'B2', null, 'E2', null, 'B2', null, 'E2', null, 'B2', null,
  'F2', null, 'C3', null, 'F2', null, 'C3', null, 'G2', null, 'D3', null, 'G2', null, 'D3', null,
  'E2', null, 'B2', null, 'E2', null, 'G#2', null, 'A2', null, 'E3', null, 'A2', null, null, null,
];
const menuMelody: (string | null)[] = [
  'A3', null, null, 'C4', null, null, 'E4', null, 'D4', null, null, 'C4', null, null, 'B3', null,
  'A3', null, null, 'C4', null, null, 'E4', null, 'G#4', null, null, null, 'E4', null, null, null,
  'F4', null, null, 'E4', null, null, 'D4', null, 'C4', null, null, 'B3', null, null, 'A3', null,
  'B3', null, null, 'C4', null, null, 'B3', null, 'A3', null, null, null, null, null, null, null,
];
const menuBass: (string | null)[] = [
  'A2', null, null, null, 'E2', null, null, null, 'A2', null, null, null, 'E2', null, null, null,
  'A2', null, null, null, 'E2', null, null, null, 'E2', null, null, null, 'G#2', null, null, null,
  'D2', null, null, null, 'A2', null, null, null, 'F2', null, null, null, 'C2', null, null, null,
  'E2', null, null, null, 'E2', null, null, null, 'A2', null, null, null, null, null, null, null,
];

function musicNote(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
  if (!ctx || !musicGain) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(vol * 0.5, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function perc(t: number, hi: boolean) {
  if (!ctx || !musicGain || !noiseBuf) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = hi ? 'highpass' : 'lowpass';
  f.frequency.value = hi ? 7000 : 200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(hi ? 0.05 : 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (hi ? 0.04 : 0.12));
  s.connect(f); f.connect(g); g.connect(musicGain);
  s.start(t, Math.random()); s.stop(t + 0.15);
}

function scheduler() {
  if (!ctx) return;
  const song = currentSong;
  const stepDur = song === 'day' ? 0.115 : 0.16;
  const mel = song === 'day' ? dayMelody : menuMelody;
  const bass = song === 'day' ? dayBass : menuBass;
  while (musicNext < ctx.currentTime + 0.25) {
    const i = musicStep % mel.length;
    const m = mel[i];
    const b = bass[i % bass.length];
    if (m) {
      musicNote(N[m], musicNext, stepDur * 2.2, song === 'day' ? 'triangle' : 'sine', song === 'day' ? 0.16 : 0.14);
      if (song === 'day') musicNote(N[m] * 2, musicNext, stepDur * 1.2, 'sine', 0.03);
    }
    if (b) musicNote(N[b], musicNext, stepDur * 1.8, song === 'day' ? 'square' : 'triangle', song === 'day' ? 0.05 : 0.12);
    if (song === 'day') {
      if (i % 8 === 0) perc(musicNext, false);
      if (i % 4 === 2) perc(musicNext, true);
    }
    musicNext += stepDur;
    musicStep++;
  }
}

export function playMusic(song: 'day' | 'menu' | 'chooser') {
  if (!ctx) return;
  if (currentSong === song && musicTimer) return;
  stopMusic();
  currentSong = song;
  musicStep = 0;
  musicNext = ctx.currentTime + 0.1;
  musicTimer = window.setInterval(scheduler, 60);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  currentSong = null;
}

export function suspendAudio(s: boolean) {
  if (!ctx) return;
  if (s) ctx.suspend(); else ctx.resume();
}
