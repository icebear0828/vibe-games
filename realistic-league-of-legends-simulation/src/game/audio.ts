let ctx: AudioContext | null = null;
let master: GainNode | null = null;
export const audioSettings = { sfx: 0.5, voice: true };
const last: Record<string, number> = {};

function ac() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slide = 0, delay = 0) {
  const c = ac(); if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(vol * audioSettings.sfx, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur: number, freq: number, vol = 0.3, q = 1, sweep = 0) {
  const c = ac(); if (!c || !master) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(); s.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(50, freq + sweep), c.currentTime + dur);
  const g = c.createGain(); g.gain.value = vol * audioSettings.sfx;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}

export function playSound(name: string) {
  const now = performance.now();
  if (last[name] && now - last[name] < 60) return;
  last[name] = now;
  switch (name) {
    case 'hit': noise(0.08, 1800, 0.35, 2); tone(160, 0.07, 'square', 0.08); break;
    case 'shoot': tone(900, 0.07, 'triangle', 0.12, -500); break;
    case 'cast': noise(0.25, 600, 0.25, 1.5, 2500); break;
    case 'laser': noise(0.6, 1200, 0.4, 0.8, -800); tone(220, 0.6, 'sawtooth', 0.1, 200); break;
    case 'gold': tone(1568, 0.08, 'sine', 0.12); tone(2093, 0.12, 'sine', 0.1, 0, 0.06); break;
    case 'buy': tone(1046, 0.1, 'triangle', 0.18); tone(1568, 0.16, 'triangle', 0.16, 0, 0.08); break;
    case 'levelup': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.15, 0, i * 0.07)); break;
    case 'levelskill': tone(880, 0.1, 'triangle', 0.15); break;
    case 'turret': tone(90, 0.35, 'sawtooth', 0.18, -40); noise(0.2, 400, 0.2); break;
    case 'death': tone(300, 1.2, 'sawtooth', 0.15, -250); break;
    case 'respawn': [392, 523, 659].forEach((f, i) => tone(f, 0.3, 'sine', 0.15, 0, i * 0.1)); break;
    case 'recall': tone(400, 1.5, 'sine', 0.08, 400); break;
    case 'recallDone': noise(0.4, 2000, 0.25, 1, -1500); break;
    case 'flash': noise(0.15, 3000, 0.35, 3); tone(1200, 0.12, 'sine', 0.15, 800); break;
    case 'ward': tone(700, 0.12, 'sine', 0.15, 300); break;
    case 'potion': tone(500, 0.2, 'sine', 0.15, 300); break;
    case 'stasis': tone(1500, 0.8, 'sine', 0.12, -1200); break;
    case 'error': tone(200, 0.12, 'square', 0.08); break;
    case 'click': tone(1200, 0.03, 'square', 0.04); break;
    case 'ping': tone(1320, 0.12, 'sine', 0.2); tone(1760, 0.2, 'sine', 0.15, 0, 0.1); break;
  }
}

let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const load = () => { voices = speechSynthesis.getVoices(); };
  load(); speechSynthesis.onvoiceschanged = load;
}
export function speak(text: string) {
  if (!audioSettings.voice || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/[!！]/g, ''));
    u.lang = 'zh-CN';
    const v = voices.find(v => /zh[-_]CN/i.test(v.lang)) || voices.find(v => /zh/i.test(v.lang));
    if (v) u.voice = v;
    u.rate = 1.05; u.pitch = 0.75; u.volume = 0.9;
    if (speechSynthesis.speaking) speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* */ }
}
