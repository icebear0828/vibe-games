import type { ZombieType, ArmorKind } from '../data';
import { Ctx, ell, circ, rrect, mix, shadow, linear, clamp } from './util';

export interface ZombieVisual {
  type: ZombieType;
  phase: number;
  state: 'walk' | 'eat' | 'dying' | 'burnt' | 'vault' | 'idle' | 'angry';
  stateTime: number;
  armLost: boolean;
  headLost: boolean;
  armor: ArmorKind | null;
  armorRatio: number;
  slowed: boolean;
  flash: number;
  hasPole: boolean;
  angry: boolean;
  seed: number;
}

type Pal = Record<string, string>;
const BASE: Pal = {
  skin: '#a8b894', skinD: '#7c8c6a', coat: '#6d5738', coatD: '#473620', pants: '#5a4633', pantsD: '#3a2b1e',
  shirt: '#e6e0cc', tie: '#b3261e', shoe: '#2b2119', hair: '#34301f', out: '#1d1a12', eye: '#ffffff', mouth: '#2b0f0f',
  jersey: '#b52019', jerseyD: '#7a0f0b', track: '#2f5fb5', trackD: '#1c3a75',
};
const palCache = new Map<string, Pal>();
function palette(slowed: boolean, flash: boolean, ash: boolean): Pal {
  const key = `${slowed}${flash}${ash}`;
  const c = palCache.get(key);
  if (c) return c;
  const p: Pal = {};
  for (const k in BASE) {
    let col = BASE[k];
    if (ash) col = k === 'eye' ? '#333333' : mix(col, '#111111', 0.9);
    else {
      if (slowed) col = mix(col, '#6fb4ff', 0.45);
      if (flash) col = mix(col, '#ffffff', 0.35);
    }
    p[k] = col;
  }
  palCache.set(key, p);
  return p;
}

function limb(ctx: Ctx, x: number, y: number, ang: number, len: number, w: number, fill: string, out: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  rrect(ctx, -w / 2, -2, w, len + 2, w / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = out;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

function leg(ctx: Ctx, p: Pal, x: number, y: number, ang: number, knee: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  limb(ctx, 0, 0, 0, 22, 12, p.pants, p.out);
  ctx.translate(0, 21);
  ctx.rotate(knee);
  limb(ctx, 0, 0, 0, 20, 11, p.pantsD, p.out);
  // shoe
  ell(ctx, -5, 21, 11, 5.5, p.shoe, p.out, 1.5);
  ctx.restore();
}

export function drawArm(ctx: Ctx, p: Pal, x: number, y: number, ang: number, sleeve: string, lost = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  limb(ctx, 0, 0, 0, lost ? 10 : 20, 11, sleeve, p.out);
  if (lost) {
    // torn stub
    ctx.beginPath();
    ctx.moveTo(-5, 10);
    ctx.lineTo(-2, 14);
    ctx.lineTo(1, 10);
    ctx.lineTo(4, 14);
    ctx.lineTo(5, 9);
    ctx.fillStyle = sleeve;
    ctx.fill();
    ell(ctx, 0, 12, 3, 2, '#e8e0d0');
    ctx.restore();
    return;
  }
  limb(ctx, 0, 19, 0, 16, 7, p.skin, p.out);
  // hand
  ell(ctx, 0, 37, 5.5, 6, p.skin, p.out, 1.5);
  ctx.beginPath();
  ctx.moveTo(-3, 40);
  ctx.lineTo(-4, 45);
  ctx.moveTo(0, 42);
  ctx.lineTo(0, 47);
  ctx.moveTo(3, 40);
  ctx.lineTo(4, 45);
  ctx.strokeStyle = p.out;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function drawHead(ctx: Ctx, p: Pal, v: Pick<ZombieVisual, 'type' | 'armor' | 'armorRatio' | 'state' | 'stateTime' | 'angry' | 'phase'>, x: number, y: number, mouthOpen = 0) {
  ctx.save();
  ctx.translate(x, y);
  // ear
  ell(ctx, 13, 0, 4, 6, p.skinD, p.out, 1.5);
  // skull
  ctx.beginPath();
  ctx.moveTo(-18, 2);
  ctx.bezierCurveTo(-22, -26, 16, -30, 16, -4);
  ctx.bezierCurveTo(17, 10, 8, 18, -2, 18);
  ctx.bezierCurveTo(-12, 18, -17, 12, -18, 2);
  ctx.closePath();
  ctx.fillStyle = p.skin;
  ctx.fill();
  ctx.strokeStyle = p.out;
  ctx.lineWidth = 2;
  ctx.stroke();
  // shading
  ell(ctx, 6, 6, 8, 9, 'rgba(0,0,0,0.08)');
  // jaw / mouth
  const mo = 3 + mouthOpen * 6;
  ctx.beginPath();
  ctx.moveTo(-17, 9);
  ctx.quadraticCurveTo(-10, 9 + mo, -1, 10);
  ctx.quadraticCurveTo(-8, 8, -17, 9);
  ctx.fillStyle = p.mouth;
  ctx.fill();
  ctx.strokeStyle = p.out;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#efe9c8';
  ctx.fillRect(-13, 8.5, 3, 3);
  ctx.fillRect(-7, 9, 3, 2.5);
  // eyes
  const isNews = v.type === 'newspaper';
  const angryEye = v.angry;
  ell(ctx, -10, -6, 6.5, 7, angryEye ? '#ffd0d0' : p.eye, p.out, 1.5);
  ell(ctx, 2, -7, 5, 5.5, angryEye ? '#ffd0d0' : p.eye, p.out, 1.5);
  circ(ctx, -12, -5, 1.6, angryEye ? '#c00' : '#111');
  circ(ctx, 0.5, -6.5, 1.3, angryEye ? '#c00' : '#111');
  if (angryEye) {
    ctx.beginPath();
    ctx.moveTo(-17, -15);
    ctx.lineTo(-5, -11);
    ctx.moveTo(7, -14);
    ctx.lineTo(-1, -11);
    ctx.strokeStyle = p.out;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  if (isNews) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1.5;
    circ(ctx, -10, -6, 7.5, undefined, '#222', 1.5);
    circ(ctx, 2, -7, 6.5, undefined, '#222', 1.5);
    ctx.beginPath();
    ctx.moveTo(-3, -7);
    ctx.lineTo(-4, -7);
    ctx.stroke();
  }
  // hair
  if (v.armor !== 'helmet') {
    ctx.strokeStyle = p.hair;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-2, -22);
    ctx.quadraticCurveTo(-6, -32, -12, -30);
    ctx.moveTo(2, -22);
    ctx.quadraticCurveTo(4, -32, 10, -31);
    ctx.moveTo(0, -22);
    ctx.lineTo(-1, -30);
    ctx.stroke();
  }
  if (v.type === 'pole') {
    // headband
    ctx.beginPath();
    ctx.moveTo(-19, -12);
    ctx.quadraticCurveTo(0, -18, 16, -12);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#d32f2f';
    ctx.stroke();
  }
  drawHeadArmor(ctx, v.armor, v.armorRatio);
  ctx.restore();
}

export function drawHeadArmor(ctx: Ctx, armor: ArmorKind | null, r: number) {
  if (armor === 'cone') {
    ctx.save();
    ctx.rotate(-0.08);
    const bent = r < 0.34 ? 6 : r < 0.67 ? 2 : 0;
    ctx.beginPath();
    ctx.moveTo(-22, -12);
    ctx.lineTo(-3 + bent, -52 + bent * 1.2);
    ctx.lineTo(18, -12);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, -20, 0, 18, 0, [[0, '#ffa040'], [0.5, '#f57c00'], [1, '#c45500']]);
    ctx.fill();
    ctx.strokeStyle = '#6b2c00';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fbe9d0';
    ctx.beginPath();
    ctx.moveTo(-16, -24);
    ctx.lineTo(12, -24);
    ctx.lineTo(10, -30);
    ctx.lineTo(-13, -30);
    ctx.closePath();
    ctx.fill();
    rrect(ctx, -26, -15, 48, 6, 2);
    ctx.fillStyle = '#e06a00';
    ctx.fill();
    ctx.strokeStyle = '#6b2c00';
    ctx.stroke();
    if (r < 0.67) {
      ctx.fillStyle = '#7a3500';
      ctx.beginPath();
      ctx.moveTo(8, -12);
      ctx.lineTo(12, -22);
      ctx.lineTo(16, -12);
      ctx.fill();
    }
    ctx.restore();
  } else if (armor === 'bucket') {
    ctx.save();
    ctx.rotate(-0.05);
    ctx.beginPath();
    ctx.moveTo(-22, -4);
    ctx.lineTo(-17, -40);
    ctx.lineTo(15, -40);
    ctx.lineTo(19, -4);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, -22, 0, 19, 0, [[0, '#9aa3a8'], [0.35, '#e3e8ea'], [0.7, '#a7b0b5'], [1, '#6b7479']]);
    ctx.fill();
    ctx.strokeStyle = '#333a3e';
    ctx.lineWidth = 2;
    ctx.stroke();
    rrect(ctx, -24, -7, 46, 6, 2);
    ctx.fillStyle = '#8c969b';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-2, -40, 16, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c6cdd1';
    ctx.fill();
    ctx.stroke();
    if (r < 0.67) {
      ctx.fillStyle = 'rgba(40,45,50,0.5)';
      ell(ctx, 6, -26, 6, 4, 'rgba(40,45,50,0.45)');
      ctx.strokeStyle = '#333a3e';
      ctx.beginPath();
      ctx.arc(6, -26, 6, 0.3, 2.8);
      ctx.stroke();
    }
    if (r < 0.34) {
      ell(ctx, -10, -18, 7, 5, 'rgba(40,45,50,0.5)');
      ctx.beginPath();
      ctx.moveTo(-18, -34);
      ctx.lineTo(-10, -28);
      ctx.lineTo(-14, -22);
      ctx.strokeStyle = '#222';
      ctx.stroke();
    }
    ctx.restore();
  } else if (armor === 'helmet') {
    ctx.beginPath();
    ctx.moveTo(-21, 2);
    ctx.bezierCurveTo(-26, -34, 22, -36, 19, 4);
    ctx.lineTo(10, 6);
    ctx.lineTo(-8, -2);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, -20, -30, 18, 0, [[0, '#ff4a3a'], [1, '#8e0e08']]);
    ctx.fill();
    ctx.strokeStyle = '#3b0402';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -30);
    ctx.quadraticCurveTo(-2, -12, 4, 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    // face guard
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-20, -2);
    ctx.lineTo(-24, 8);
    ctx.lineTo(-14, 16);
    ctx.moveTo(-22, 4);
    ctx.lineTo(-8, 6);
    ctx.stroke();
    if (r < 0.5) {
      ctx.strokeStyle = '#2a0200';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, -24);
      ctx.lineTo(4, -16);
      ctx.lineTo(10, -10);
      ctx.stroke();
    }
  }
}

function drawFlag(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#5b4020';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, -60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -58);
  for (let i = 0; i <= 6; i++) ctx.lineTo(-i * 6, -58 + Math.sin(t * 6 + i) * 2.5);
  for (let i = 6; i >= 0; i--) ctx.lineTo(-i * 6 + (i === 6 ? 2 : 0), -30 + Math.sin(t * 6 + i) * 2.5 + (i === 6 ? -3 : 0));
  ctx.closePath();
  ctx.fillStyle = '#b3261e';
  ctx.fill();
  ctx.strokeStyle = '#4a0906';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // brain emblem
  ell(ctx, -18, -44, 7, 5.5, '#f0a0b8', '#7a2a40', 1.2);
  ctx.beginPath();
  ctx.moveTo(-18, -49);
  ctx.lineTo(-18, -39);
  ctx.stroke();
  ctx.restore();
}

function drawNewspaper(ctx: Ctx, x: number, y: number, ratio: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.05);
  const torn = ratio < 0.5;
  ctx.beginPath();
  ctx.moveTo(-16, -30);
  ctx.lineTo(16, -32);
  ctx.lineTo(18, 16);
  if (torn) { ctx.lineTo(8, 10); ctx.lineTo(2, 18); ctx.lineTo(-6, 8); }
  ctx.lineTo(-14, 16);
  ctx.closePath();
  ctx.fillStyle = '#efece0';
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#333';
  ctx.fillRect(-12, -26, 24, 5);
  ctx.fillStyle = '#999';
  for (let i = 0; i < 6; i++) ctx.fillRect(-12, -18 + i * 5, i % 3 === 2 ? 10 : 24, 2);
  ctx.fillStyle = '#bbb';
  ctx.fillRect(2, -16, 10, 10);
  ctx.restore();
}

function drawDoor(ctx: Ctx, x: number, y: number, ratio: number) {
  ctx.save();
  ctx.translate(x, y);
  const w = 34, h = 96;
  rrect(ctx, -w / 2, -h, w, h, 3);
  ctx.fillStyle = 'rgba(80,90,95,0.25)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#6d777c';
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#2d3336';
  ctx.stroke();
  // mesh
  ctx.save();
  rrect(ctx, -w / 2 + 3, -h + 3, w - 6, h - 6, 2);
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,70,75,0.55)';
  ctx.lineWidth = 1;
  for (let i = -h; i < w; i += 5) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + i, -h);
    ctx.lineTo(-w / 2 + i + h, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + i + h, -h);
    ctx.lineTo(-w / 2 + i, 0);
    ctx.stroke();
  }
  if (ratio < 0.5) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ell(ctx, 4, -60, 8, 10, 'rgba(20,20,20,0.35)');
  }
  ctx.restore();
  ctx.fillStyle = '#6d777c';
  ctx.fillRect(-w / 2, -h / 2 - 2, w, 4);
  circ(ctx, w / 2 - 6, -h / 2 + 8, 2.5, '#c9a23a', '#553', 1);
  ctx.restore();
}

function drawPole(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = '#d8b25a';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function drawZombie(ctx: Ctx, v: ZombieVisual, t: number) {
  const ash = v.state === 'burnt';
  const p = palette(v.slowed, v.flash > 0, ash);
  const type = v.type;
  const coat = type === 'football' ? p.jersey : type === 'pole' ? p.track : p.coat;
  const coatD = type === 'football' ? p.jerseyD : type === 'pole' ? p.trackD : p.coatD;

  let alpha = 1;
  let fallAng = 0;
  let lift = 0;
  let dx = 0;
  if (v.state === 'dying') {
    const k = clamp(v.stateTime / 0.9, 0, 1);
    fallAng = k * k * 1.45;
    if (v.stateTime > 1.8) alpha = clamp(1 - (v.stateTime - 1.8) / 0.6, 0, 1);
  }
  if (ash && v.stateTime > 1.0) alpha = clamp(1 - (v.stateTime - 1.0) / 0.7, 0, 1);
  if (v.state === 'vault') {
    const k = clamp(v.stateTime / 0.9, 0, 1);
    lift = Math.sin(k * Math.PI) * 70;
    dx = 0;
  }
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (v.state !== 'dying' || fallAng < 1.2) shadow(ctx, 0, 0, 26, 7, 0.28 * alpha);
  else shadow(ctx, 30, 0, 50, 8, 0.25 * alpha);

  ctx.translate(dx, -lift);
  if (fallAng) ctx.rotate(fallAng);

  const walking = v.state === 'walk' || v.state === 'angry';
  const eating = v.state === 'eat';
  const ph = v.phase;
  const swing = walking ? Math.sin(ph) * (type === 'football' || v.angry || (type === 'pole' && v.hasPole) ? 0.5 : 0.35) : 0;
  const bob = walking ? Math.abs(Math.cos(ph)) * 2 : eating ? Math.sin(t * 9) * 1 : Math.sin(t * 1.5 + v.seed) * 0.8;
  const lean = type === 'football' ? -0.25 : -0.1;

  // legs
  if (v.state === 'vault') {
    const k = clamp(v.stateTime / 0.9, 0, 1);
    leg(ctx, p, 4, -42, 0.5 - k * 0.6, -0.9);
    leg(ctx, p, -4, -42, 0.2 - k * 0.6, -0.6);
  } else {
    leg(ctx, p, 4, -42, swing, Math.max(0, -swing) * 0.6);
    leg(ctx, p, -4, -42, -swing, Math.max(0, swing) * 0.6);
  }

  ctx.save();
  ctx.translate(0, -42 - bob);
  ctx.rotate(lean + (eating ? Math.sin(t * 9) * 0.03 : 0) + Math.sin(t * 1.2 + v.seed) * 0.02);

  const armWob = walking ? Math.sin(ph) * 0.12 : 0;
  const eatArm = eating ? Math.sin(t * 9) * 0.25 : 0;
  const reach = type === 'newspaper' && v.armor ? 1.2 : type === 'door' && v.armor ? 1.35 : 1.45;
  // back arm
  if (type === 'flag') {
    drawArm(ctx, p, 8, -38, 0.9, coatD);
  } else if (type === 'pole' && v.hasPole) {
    drawArm(ctx, p, 8, -38, 1.1, coatD);
  } else {
    drawArm(ctx, p, 8, -38, reach + armWob + eatArm, coatD);
  }
  if (type === 'flag') drawFlag(ctx, 22, -18, t + v.seed);

  // torso
  ctx.beginPath();
  ctx.moveTo(-15, 2);
  ctx.lineTo(15, 2);
  ctx.lineTo(16, -42);
  ctx.quadraticCurveTo(0, -48, -17, -42);
  ctx.closePath();
  ctx.fillStyle = coat;
  ctx.fill();
  ctx.strokeStyle = p.out;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (type === 'football') {
    // number & pads
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('8', 2, -12);
    ell(ctx, 0, -42, 22, 8, p.jersey, p.out, 2);
  } else if (type === 'pole') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-15, -26, 30, 4);
  } else {
    // shirt & tie
    ctx.beginPath();
    ctx.moveTo(-9, -44);
    ctx.lineTo(7, -44);
    ctx.lineTo(-1, -18);
    ctx.closePath();
    ctx.fillStyle = p.shirt;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, -42);
    ctx.lineTo(1, -42);
    ctx.lineTo(3, -20);
    ctx.lineTo(-1, -15);
    ctx.lineTo(-5, -20);
    ctx.closePath();
    ctx.fillStyle = p.tie;
    ctx.fill();
    ctx.strokeStyle = p.out;
    ctx.lineWidth = 1;
    ctx.stroke();
    // lapels
    ctx.strokeStyle = coatD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -43);
    ctx.lineTo(-4, -22);
    ctx.moveTo(8, -43);
    ctx.lineTo(1, -22);
    ctx.stroke();
    // torn patch
    ell(ctx, 9, -8, 3, 2, coatD);
  }

  // head
  const mouth = eating ? (Math.sin(t * 9) + 1) / 2 : 0.1;
  const headX = -6;
  const headY = -58;
  if (!v.headLost) {
    const hb = eating ? Math.sin(t * 9) * 1.5 : 0;
    ctx.save();
    ctx.translate(headX, headY + hb);
    ctx.rotate(Math.sin(t * 1.3 + v.seed) * 0.05);
    drawHead(ctx, p, v, 0, 0, mouth);
    ctx.restore();
  } else {
    // neck stump
    ell(ctx, -2, -46, 6, 3, '#6b1a12', p.out, 1);
  }

  // front arm
  if (type === 'newspaper' && v.armor) {
    drawNewspaper(ctx, -30, -34, v.armorRatio);
    drawArm(ctx, p, -4, -38, 1.25 + armWob * 0.3, coat, v.armLost);
  } else if (type === 'door' && v.armor) {
    drawArm(ctx, p, -4, -38, 1.3, coat, v.armLost);
    ctx.save();
    ctx.rotate(-lean);
    drawDoor(ctx, -30, 38 + bob, v.armorRatio);
    ctx.restore();
  } else if (type === 'pole' && v.hasPole) {
    const handX = -18, handY = -20;
    drawArm(ctx, p, -4, -38, 0.9, coat, v.armLost);
    if (v.state === 'vault') {
      const k = clamp(v.stateTime / 0.9, 0, 1);
      drawPole(ctx, handX, handY, handX - 40 + k * 20, handY + 60 + lift);
    } else {
      drawPole(ctx, handX + 40, handY + 6, handX - 70, handY - 8);
    }
  } else {
    drawArm(ctx, p, -4, -38, reach - 0.05 - armWob - eatArm, coat, v.armLost);
  }
  ctx.restore();
  ctx.restore();
}

export function drawZombieHeadPart(ctx: Ctx, type: ZombieType, slowed: boolean) {
  const p = palette(slowed, false, false);
  drawHead(ctx, p, { type, armor: null, armorRatio: 1, state: 'dying', stateTime: 0, angry: false, phase: 0 }, 0, 0, 0.6);
}

export function drawZombieArmPart(ctx: Ctx, type: ZombieType, slowed: boolean) {
  const p = palette(slowed, false, false);
  const coat = type === 'football' ? p.jersey : type === 'pole' ? p.track : p.coat;
  drawArm(ctx, p, 0, -20, 0, coat);
}

export function drawArmorPart(ctx: Ctx, kind: ArmorKind) {
  if (kind === 'newspaper') return drawNewspaper(ctx, 0, 0, 0.2);
  if (kind === 'door') return drawDoor(ctx, 0, 40, 0.2);
  drawHeadArmor(ctx, kind, 0.2);
}
