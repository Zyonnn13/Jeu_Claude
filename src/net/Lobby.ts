// Salon d'attente en ligne : l'hôte accueille jusqu'à 3 amis, chacun choisit son héros et se déclare prêt.
import type { Connection, HostTransport, NetData } from './Transport';
import {
  decodeMessage,
  encodeMessage,
  PROTOCOL_VERSION,
  type ClientMessage,
  type HostMessage,
  type LobbyPlayer,
  type LobbySettings,
  type StartInfo,
} from './Protocol';

export const MAX_PLAYERS = 4;

export interface RemotePlayer {
  conn: Connection;
  id: string;
  meta: Record<string, number>;
}

export interface ChatLine {
  from: string;
  text: string;
}

/** Côté hôte. */
export class LobbyHost {
  players: LobbyPlayer[];
  settings: LobbySettings = { mode: 'waves', biome: 'cemetery', danger: 0 };
  readonly chat: ChatLine[] = [];
  private remotes = new Map<string, RemotePlayer>();
  private started = false;
  onChange: () => void = () => undefined;

  constructor(
    readonly transport: HostTransport,
    name: string,
    character: string,
  ) {
    this.players = [{ id: 'host', name, character, ready: true, host: true }];
    transport.onConnection((conn) => this.accept(conn));
  }

  get code(): string {
    return this.transport.code;
  }

  private accept(conn: Connection): void {
    conn.onMessage((data) => this.onMessage(conn, data));
    conn.onClose(() => this.remove(conn.id));
  }

  private send(conn: Connection, m: HostMessage): void {
    conn.send(encodeMessage(m));
  }

  broadcast(m: HostMessage): void {
    const data = encodeMessage(m);
    for (const r of this.remotes.values()) r.conn.send(data);
  }

  private broadcastLobby(): void {
    this.broadcast({ t: 'lobby', players: this.players, settings: this.settings, code: this.code });
    this.onChange();
  }

  private onMessage(conn: Connection, data: NetData): void {
    if (typeof data !== 'string') return;
    const m = decodeMessage<ClientMessage>(data);
    if (!m) return;
    if (m.t === 'hello') {
      if (this.remotes.has(conn.id)) return;
      if (this.started) return this.send(conn, { t: 'kick', reason: 'La partie a déjà commencé.' });
      if (m.version !== PROTOCOL_VERSION) return this.send(conn, { t: 'kick', reason: 'Version du jeu différente de celle de l’hôte.' });
      if (this.players.length >= MAX_PLAYERS) return this.send(conn, { t: 'kick', reason: 'La partie est complète (4 joueurs).' });
      this.remotes.set(conn.id, { conn, id: conn.id, meta: m.meta ?? {} });
      this.players.push({ id: conn.id, name: (m.name || 'Joueur').slice(0, 16), character: m.character, ready: false, host: false });
      this.send(conn, { t: 'welcome', you: conn.id });
      this.addChat('', `${m.name} a rejoint la partie.`);
      this.broadcastLobby();
      return;
    }
    const player = this.players.find((p) => p.id === conn.id);
    if (!player) return;
    if (m.t === 'lobby:set') {
      if (m.character) player.character = m.character;
      if (m.ready !== undefined) player.ready = m.ready;
      this.broadcastLobby();
    } else if (m.t === 'chat') {
      this.addChat(player.name, m.text.slice(0, 120));
    } else if (m.t === 'bye') {
      this.remove(conn.id);
    }
  }

  private addChat(from: string, text: string): void {
    this.chat.push({ from, text });
    if (this.chat.length > 50) this.chat.shift();
    this.broadcast({ t: 'chat', from, text });
    this.onChange();
  }

  sendChat(text: string): void {
    if (text.trim()) this.addChat(this.players[0].name, text.trim().slice(0, 120));
  }

  private remove(id: string): void {
    if (!this.remotes.has(id)) return;
    const p = this.players.find((pl) => pl.id === id);
    this.remotes.delete(id);
    this.players = this.players.filter((pl) => pl.id !== id);
    if (p && !this.started) this.addChat('', `${p.name} a quitté la partie.`);
    if (!this.started) this.broadcastLobby();
  }

  kick(id: string): void {
    const r = this.remotes.get(id);
    if (!r) return;
    this.send(r.conn, { t: 'kick', reason: 'Vous avez été exclu par l’hôte.' });
    r.conn.close();
    this.remove(id);
  }

  setHost(character: string): void {
    this.players[0].character = character;
    this.broadcastLobby();
  }

  setSettings(s: Partial<LobbySettings>): void {
    this.settings = { ...this.settings, ...s };
    this.broadcastLobby();
  }

  get allReady(): boolean {
    return this.players.every((p) => p.ready);
  }

  /** Lance la partie : chaque joueur reçoit les informations et l'indice de son héros. */
  start(): { info: StartInfo; remotes: { remote: RemotePlayer; heroIndex: number }[] } {
    this.started = true;
    const info: StartInfo = {
      ...this.settings,
      seed: Math.floor(Math.random() * 2 ** 31),
      heroes: this.players.map((p) => ({ id: p.id, name: p.name, character: p.character })),
    };
    const remotes: { remote: RemotePlayer; heroIndex: number }[] = [];
    this.players.forEach((p, i) => {
      const r = this.remotes.get(p.id);
      if (!r) return;
      this.send(r.conn, { t: 'start', info, you: i });
      remotes.push({ remote: r, heroIndex: i });
    });
    return { info, remotes };
  }

  close(): void {
    this.broadcast({ t: 'kick', reason: 'L’hôte a fermé la partie.' });
    for (const r of this.remotes.values()) r.conn.close();
    this.transport.close();
  }
}

/** Côté invité. */
export class LobbyClient {
  myId = '';
  players: LobbyPlayer[] = [];
  settings: LobbySettings = { mode: 'waves', biome: 'cemetery', danger: 0 };
  code = '';
  readonly chat: ChatLine[] = [];
  onChange: () => void = () => undefined;
  onStart: (info: StartInfo, you: number) => void = () => undefined;
  onKicked: (reason: string) => void = () => undefined;
  private active = true;

  constructor(
    readonly conn: Connection,
    private readonly closeTransport: () => void,
    name: string,
    character: string,
    meta: Record<string, number>,
  ) {
    conn.onMessage((data) => this.onMessage(data));
    conn.onClose(() => {
      if (this.active) this.onKicked('Connexion perdue avec l’hôte.');
    });
    this.send({ t: 'hello', name, character, meta, version: PROTOCOL_VERSION });
  }

  send(m: ClientMessage): void {
    this.conn.send(encodeMessage(m));
  }

  private onMessage(data: NetData): void {
    if (!this.active || typeof data !== 'string') return;
    const m = decodeMessage<HostMessage>(data);
    if (!m) return;
    switch (m.t) {
      case 'welcome':
        this.myId = m.you;
        break;
      case 'lobby':
        this.players = m.players;
        this.settings = m.settings;
        this.code = m.code;
        this.onChange();
        break;
      case 'chat':
        this.chat.push({ from: m.from, text: m.text });
        if (this.chat.length > 50) this.chat.shift();
        this.onChange();
        break;
      case 'kick':
        this.active = false;
        this.closeTransport();
        this.onKicked(m.reason);
        break;
      case 'start':
        this.active = false;
        this.onStart(m.info, m.you);
        break;
    }
  }

  set(change: { character?: string; ready?: boolean }): void {
    this.send({ t: 'lobby:set', ...change });
  }

  sendChat(text: string): void {
    if (text.trim()) this.send({ t: 'chat', text: text.trim() });
  }

  leave(): void {
    this.active = false;
    this.send({ t: 'bye' });
    window.setTimeout(() => this.closeTransport(), 200);
  }

  /** Ferme la connexion (fin de partie). */
  dispose(): void {
    this.active = false;
    this.closeTransport();
  }
}
