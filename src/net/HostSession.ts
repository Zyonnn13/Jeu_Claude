// Côté hôte pendant la partie : reçoit les commandes des joueurs distants et leur envoie
// l'état du monde (15 fois par seconde), leurs choix de bonus et les annonces.
import { BALANCE } from '../data/balance';
import type { SfxName } from '../engine/Audio';
import type { Hero } from '../game/Hero';
import type { SoundPlayer, World } from '../game/World';
import type { RemotePlayer } from './Lobby';
import { buildSnapshot, decodeMessage, encodeEntities, encodeMessage, SNAPSHOT_RATE, type ClientMessage, type FxEvent, type HostMessage } from './Protocol';

interface Client {
  remote: RemotePlayer;
  heroIndex: number;
  ack: number;
  fx: FxEvent[];
  connected: boolean;
}

const MAX_FX = 160;
/** Au-delà, on saute des images d'état plutôt que d'accumuler du retard chez un joueur à la connexion lente. */
const MAX_BACKLOG = 256 * 1024;

export class HostSession {
  private clients: Client[];
  private fx: FxEvent[] = [];
  private timer = 0;
  onPick: (heroIndex: number, req: number, key: string) => void = () => undefined;
  onReroll: (heroIndex: number, req: number) => void = () => undefined;
  onSkip: (heroIndex: number, req: number) => void = () => undefined;
  onDisconnect: (heroIndex: number) => void = () => undefined;

  constructor(
    private readonly world: World,
    remotes: { remote: RemotePlayer; heroIndex: number }[],
  ) {
    this.clients = remotes.map((r) => ({ ...r, ack: 0, fx: [], connected: true }));
    for (const c of this.clients) {
      c.remote.conn.onMessage((data) => typeof data === 'string' && this.onMessage(c, data));
      c.remote.conn.onClose(() => this.disconnect(c));
    }
    // Effets, sons, tremblements et flashs de l'hôte retransmis aux autres joueurs.
    world.effects.recorder = (ev) => this.record(ev);
    world.camera.onShake = (i, d) => this.record(['shake', i, d]);
    world.onFlash = (color, alpha) => this.record(['flash', color, alpha]);
    world.events.on('player:hurt', ({ hero }) => {
      const c = this.clientFor(hero);
      if (c) c.fx.push(['shake', 3, 0.2], ['flash', '#e0413c', 0.18], ['sfx', 'hurt', 1, 1]);
    });
  }

  /** Lecteur de sons qui joue localement et retransmet. */
  wrapAudio(audio: SoundPlayer): SoundPlayer {
    return {
      play: (name: SfxName, opts = {}) => {
        const played = audio.play(name, opts);
        if (played && name !== 'hurt') this.record(['sfx', name, opts.pitch ?? 1, opts.volume ?? 1]);
        return played;
      },
    };
  }

  private record(ev: FxEvent): void {
    if (this.fx.length < MAX_FX * 2) this.fx.push(ev);
  }

  private clientFor(hero: Hero): Client | undefined {
    return this.clients.find((c) => c.heroIndex === hero.index && c.connected);
  }

  private onMessage(c: Client, data: string): void {
    const m = decodeMessage<ClientMessage>(data);
    if (!m) return;
    const hero = this.world.heroes[c.heroIndex];
    switch (m.t) {
      case 'i':
        if (m.s > c.ack) {
          c.ack = m.s;
          const len = Math.hypot(m.x, m.y);
          hero.move = len > 1 ? { x: m.x / len, y: m.y / len } : { x: m.x, y: m.y };
        }
        break;
      case 'pick':
        this.onPick(c.heroIndex, m.req, m.key);
        break;
      case 'reroll':
        this.onReroll(c.heroIndex, m.req);
        break;
      case 'skip':
        this.onSkip(c.heroIndex, m.req);
        break;
      case 'bye':
        this.disconnect(c);
        break;
    }
  }

  private disconnect(c: Client): void {
    if (!c.connected) return;
    c.connected = false;
    const hero = this.world.heroes[c.heroIndex];
    hero.left = true;
    hero.move = { x: 0, y: 0 };
    this.world.effects.text(hero.x, hero.y - 16, `${hero.name} s’est déconnecté`, '#b7b9c7', 7, 2);
    this.onDisconnect(c.heroIndex);
  }

  isRemote(heroIndex: number): boolean {
    return this.clients.some((c) => c.heroIndex === heroIndex && c.connected);
  }

  sendTo(heroIndex: number, m: HostMessage): void {
    const c = this.clients.find((cl) => cl.heroIndex === heroIndex && cl.connected);
    c?.remote.conn.send(encodeMessage(m));
  }

  broadcast(m: HostMessage): void {
    const data = encodeMessage(m);
    for (const c of this.clients) if (c.connected) c.remote.conn.send(data);
  }

  /** Envoie l'état du monde à intervalle régulier. */
  update(dt: number): void {
    this.timer += dt;
    if (this.timer < 1 / SNAPSHOT_RATE) return;
    this.timer = 0;
    const w = this.world;
    const entities = encodeEntities(w);
    const shared = this.fx.length > MAX_FX ? this.fx.slice(-MAX_FX) : this.fx;
    for (const c of this.clients) {
      if (!c.connected) continue;
      if (c.remote.conn.backlog > MAX_BACKLOG) {
        c.fx = c.fx.slice(-MAX_FX);
        continue;
      }
      const hero = w.heroes[c.heroIndex];
      const buf = buildSnapshot(
        {
          time: w.time,
          hud: w.hudData(c.heroIndex),
          boss: w.boss && !w.boss.dead ? w.boss.id : null,
          ack: c.ack,
          speed: BALANCE.playerSpeed * hero.stats.get('moveSpeed'),
          fx: [...shared, ...c.fx],
          lightRadius: w.mods.lightRadius,
        },
        entities,
      );
      c.remote.conn.send(buf);
      c.fx = [];
    }
    this.fx = [];
  }

  close(): void {
    for (const c of this.clients) c.remote.conn.close();
  }
}
