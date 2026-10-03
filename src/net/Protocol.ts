// Protocole réseau : messages de contrôle (JSON) et image d'état du monde (binaire compact).
import manifest from '../assets/sprites/manifest.json';
import { ENEMIES } from '../data/enemies';
import type { GameMode } from '../game/systems/Director';
import type { HudData } from '../game/render/WorldView';
import type { OfferView } from '../game/systems/Upgrades';
import type { PickupKind } from '../game/entities/Pickup';
import type { World } from '../game/World';

export const PROTOCOL_VERSION = 2;
/** Images d'état envoyées par seconde. */
export const SNAPSHOT_RATE = 15;
/** Secondes sans aucun message d'un joueur avant de le considérer comme parti (plantage, coupure). */
export const NET_TIMEOUT = 30;

// Tables d'indices partagées (identiques chez l'hôte et les clients).
export const SPRITE_NAMES = Object.keys(manifest).sort();
const SPRITE_INDEX = new Map(SPRITE_NAMES.map((n, i) => [n, i]));
export const ENEMY_IDS = Object.keys(ENEMIES);
const ENEMY_INDEX = new Map(ENEMY_IDS.map((n, i) => [n, i]));
export const PICKUP_KINDS: PickupKind[] = ['gem', 'coin', 'bag', 'chicken', 'magnet', 'bomb', 'chest'];
const COLOR_TABLE: string[] = ['#f0408a'];
function colorIndex(c: string): number {
  let i = COLOR_TABLE.indexOf(c);
  if (i === -1) {
    if (COLOR_TABLE.length >= 250) return 0;
    COLOR_TABLE.push(c);
    i = COLOR_TABLE.length - 1;
  }
  return i;
}
// Pré-remplissage pour que les indices soient stables des deux côtés.
for (const e of Object.values(ENEMIES) as { bulletColor?: string }[]) if (e.bulletColor) colorIndex(e.bulletColor);
['#ece0c2', '#c8f0ff', '#ffd84a'].forEach(colorIndex);
export const colorFromIndex = (i: number) => COLOR_TABLE[i] ?? '#f0408a';

// ---------------------------------------------------------------------------
// Messages de contrôle

export interface LobbyPlayer {
  id: string;
  name: string;
  character: string;
  ready: boolean;
  host: boolean;
}

export interface LobbySettings {
  mode: GameMode;
  biome: string;
  danger: number;
}

export interface StartInfo {
  mode: GameMode;
  biome: string;
  danger: number;
  seed: number;
  heroes: { id: string; name: string; character: string }[];
}

/** Effet visuel ou sonore à rejouer chez les clients. */
export type FxEvent = (string | number | boolean | null)[];

export type ClientMessage =
  | { t: 'hello'; name: string; character: string; meta: Record<string, number>; version: number }
  | { t: 'lobby:set'; character?: string; ready?: boolean }
  | { t: 'chat'; text: string }
  | { t: 'i'; s: number; x: number; y: number }
  | { t: 'pick'; req: number; key: string }
  | { t: 'reroll'; req: number }
  | { t: 'skip'; req: number }
  | { t: 'bye' };

export type HostMessage =
  | { t: 'welcome'; you: string }
  | { t: 'lobby'; players: LobbyPlayer[]; settings: LobbySettings; code: string }
  | { t: 'chat'; from: string; text: string }
  | { t: 'kick'; reason: string }
  | { t: 'start'; info: StartInfo; you: number }
  | { t: 'choice'; req: number; variant: 'levelup' | 'chest' | 'relic'; title: string; subtitle: string; offers: OfferView[]; rerolls: number; skip?: string }
  | { t: 'choice:close'; req: number }
  | { t: 'wait'; text: string | null }
  | { t: 'ui'; kind: 'banner'; title: string; sub: string; style: 'normal' | 'boss' | 'success' }
  | { t: 'ui'; kind: 'toast'; toast: 'achievement' | 'synergy' | 'info'; name: string; detail: string; icon: string }
  | { t: 'ui'; kind: 'music'; mood: 'menu' | 'battle' | 'boss' | null }
  | { t: 'end'; victory: boolean; wave: number; level: number; kills: number; gold: number; time: number; mode: GameMode }
  | { t: 'paused'; paused: boolean };

export function encodeMessage(m: ClientMessage | HostMessage): string {
  return JSON.stringify(m);
}

export function decodeMessage<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Image d'état binaire

class Writer {
  private buf = new ArrayBuffer(64 * 1024);
  private view = new DataView(this.buf);
  private bytes = new Uint8Array(this.buf);
  pos = 0;

  private ensure(n: number): void {
    if (this.pos + n <= this.buf.byteLength) return;
    const next = new ArrayBuffer(Math.max(this.buf.byteLength * 2, this.pos + n));
    new Uint8Array(next).set(this.bytes);
    this.buf = next;
    this.view = new DataView(next);
    this.bytes = new Uint8Array(next);
  }
  u8(v: number): void {
    this.ensure(1);
    this.view.setUint8(this.pos, Math.max(0, Math.min(255, Math.round(v))));
    this.pos += 1;
  }
  i8(v: number): void {
    this.ensure(1);
    this.view.setInt8(this.pos, Math.max(-128, Math.min(127, Math.round(v))));
    this.pos += 1;
  }
  u16(v: number): void {
    this.ensure(2);
    this.view.setUint16(this.pos, Math.max(0, Math.min(65535, Math.round(v))), true);
    this.pos += 2;
  }
  u32(v: number): void {
    this.ensure(4);
    this.view.setUint32(this.pos, v >>> 0, true);
    this.pos += 4;
  }
  f32(v: number): void {
    this.ensure(4);
    this.view.setFloat32(this.pos, v, true);
    this.pos += 4;
  }
  raw(data: Uint8Array): void {
    this.ensure(data.length);
    this.bytes.set(data, this.pos);
    this.pos += data.length;
  }
  result(): Uint8Array {
    return this.bytes.slice(0, this.pos);
  }
}

export class Reader {
  private view: DataView;
  pos = 0;
  constructor(readonly buf: ArrayBuffer, offset = 0) {
    this.view = new DataView(buf);
    this.pos = offset;
  }
  u8(): number {
    return this.view.getUint8(this.pos++);
  }
  i8(): number {
    return this.view.getInt8(this.pos++);
  }
  u16(): number {
    const v = this.view.getUint16(this.pos, true);
    this.pos += 2;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return v;
  }
  f32(): number {
    const v = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return v;
  }
}

/** En-tête propre à chaque joueur (HUD de son héros, effets, accusé de réception des commandes). */
export interface SnapshotHeader {
  time: number;
  hud: HudData;
  boss: number | null;
  ack: number;
  speed: number;
  fx: FxEvent[];
  lightRadius: number;
}

const AURA_COLORS = ['#c8f0ff', '#ffd84a'];

/** Encode la partie commune à tous les joueurs (entités). */
export function encodeEntities(world: World): Uint8Array {
  const w = new Writer();
  // Héros
  w.u8(world.heroes.length);
  for (const h of world.heroes) {
    const p = h.entity;
    w.u8(h.index);
    w.f32(p.x);
    w.f32(p.y);
    w.i8(p.facing);
    w.u8((p.moving ? 1 : 0) | (p.dead || h.left ? 2 : 0) | (h.downed ? 4 : 0));
    w.u16((p.anim * 100) % 65535);
    w.u8(p.invulnerable * 50);
    w.u8(p.flash * 255);
    w.f32(Math.max(0, p.hp));
    w.f32(h.maxHp);
    w.u8(h.reviveProgress * 255);
    const auras = h.inventory.weapons.map((wp) => wp.aura()).filter((a) => !!a);
    w.u8(auras.length);
    for (const a of auras) {
      w.f32(a!.radius);
      w.u8(Math.max(0, AURA_COLORS.indexOf(a!.color)));
      w.u8(a!.pulse * 255);
    }
  }
  // Ennemis
  const enemies = world.enemies.filter((e) => !e.dead);
  w.u16(enemies.length);
  for (const e of enemies) {
    w.u32(e.id);
    w.u8(ENEMY_INDEX.get(e.def.id) ?? 0);
    w.f32(e.x);
    w.f32(e.y);
    const flags =
      (e.facing < 0 ? 1 : 0) |
      (e.elite ? 2 : 0) |
      (e.enraged ? 4 : 0) |
      (e.state === 1 ? 8 : 0) |
      (e.state === 3 ? 16 : 0) |
      (e.invulnerable > 0 ? 32 : 0) |
      (e.flash > 0 ? 64 : 0);
    w.u8(flags);
    w.u16((e.anim * 100) % 65535);
    w.u8(e.hitPulse * 255);
    w.u8(e.spawnFade * 255);
    w.u16(e.scale * 100);
    w.u8((e.hp / e.maxHp) * 255);
  }
  // Projectiles des joueurs
  const projs = world.projectiles.filter((p) => !p.dead);
  w.u16(projs.length);
  for (const p of projs) {
    w.u32(p.uid);
    w.u8(SPRITE_INDEX.get(p.sprite) ?? 0);
    w.f32(p.x);
    w.f32(p.y);
    w.f32(p.rotation);
    const lob = p.motion === 'lob';
    w.u8((p.flip ? 1 : 0) | (lob ? 2 : 0));
    w.u16(p.scale * 100);
    w.u8(p.alpha * 255);
    w.u16(p.age * 100);
    w.u8(p.frameRate);
    if (lob) {
      w.f32(p.lobFromX);
      w.f32(p.lobFromY);
      w.f32(p.lobToX);
      w.f32(p.lobToY);
      w.u16(p.life * 100);
    }
  }
  // Tirs ennemis
  const bullets = world.bullets.filter((b) => !b.dead);
  w.u16(bullets.length);
  for (const b of bullets) {
    w.u32(b.id);
    w.f32(b.x);
    w.f32(b.y);
    w.u8(colorIndex(b.color));
    w.u16(b.age * 100);
  }
  // Objets au sol
  const pickups = world.pickups.filter((p) => !p.dead);
  w.u16(pickups.length);
  for (const p of pickups) {
    w.u32(p.id);
    w.u8(PICKUP_KINDS.indexOf(p.kind));
    w.f32(p.x);
    w.f32(p.y);
    w.u16(Math.min(65535, p.value));
    w.u8(p.attracted ? 1 : 0);
    w.u16(p.age * 100);
  }
  // Zones de feu
  w.u16(world.zones.length);
  for (const z of world.zones) {
    w.u32(z.id);
    w.f32(z.x);
    w.f32(z.y);
    w.f32(z.radius);
    w.u16(z.age * 100);
    w.u16(z.life * 100);
  }
  return w.result();
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Assemble une image d'état : [longueur de l'en-tête][en-tête JSON][entités]. */
export function buildSnapshot(header: SnapshotHeader, entities: Uint8Array): ArrayBuffer {
  const json = encoder.encode(JSON.stringify(header));
  const out = new Uint8Array(4 + json.length + entities.length);
  new DataView(out.buffer).setUint32(0, json.length, true);
  out.set(json, 4);
  out.set(entities, 4 + json.length);
  return out.buffer;
}

export function readSnapshotHeader(buf: ArrayBuffer): { header: SnapshotHeader; reader: Reader } {
  const len = new DataView(buf).getUint32(0, true);
  const header = JSON.parse(decoder.decode(new Uint8Array(buf, 4, len))) as SnapshotHeader;
  return { header, reader: new Reader(buf, 4 + len) };
}

export { AURA_COLORS };
