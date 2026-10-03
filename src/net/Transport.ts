// Couche de transport réseau : une connexion bidirectionnelle par joueur.
// Implémentation en ligne : WebRTC pair-à-pair (PeerJS), avec un code de salon à 5 caractères.
import Peer, { type DataConnection } from 'peerjs';

export type NetData = string | ArrayBuffer;

export interface Connection {
  readonly id: string;
  send(data: NetData): void;
  onMessage(cb: (data: NetData) => void): void;
  onClose(cb: () => void): void;
  close(): void;
}

export interface HostTransport {
  /** Code à communiquer aux amis pour rejoindre. */
  readonly code: string;
  onConnection(cb: (conn: Connection) => void): void;
  close(): void;
}

const PREFIX = 'nuit-eternelle-v2-';
// Lettres sans ambiguïté (pas de O/0, I/1...).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(): string {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
}

class PeerConnection implements Connection {
  private messageCb: ((data: NetData) => void) | null = null;
  private closeCb: (() => void) | null = null;
  private closed = false;

  constructor(private readonly dc: DataConnection) {
    dc.on('data', (data) => {
      if (typeof data === 'string' || data instanceof ArrayBuffer) this.messageCb?.(data);
      else if (ArrayBuffer.isView(data)) this.messageCb?.(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
    });
    const end = () => {
      if (this.closed) return;
      this.closed = true;
      this.closeCb?.();
    };
    dc.on('close', end);
    dc.on('error', end);
  }

  get id(): string {
    return this.dc.peer;
  }

  send(data: NetData): void {
    if (this.closed || !this.dc.open) return;
    try {
      void this.dc.send(data);
    } catch {
      // Canal saturé ou fermé : le message est perdu, la prochaine image d'état le remplacera.
    }
  }

  onMessage(cb: (data: NetData) => void): void {
    this.messageCb = cb;
  }

  onClose(cb: () => void): void {
    this.closeCb = cb;
  }

  close(): void {
    this.closed = true;
    this.dc.close();
  }
}

function describeError(err: { type?: string; message?: string }): string {
  switch (err.type) {
    case 'peer-unavailable':
      return 'Aucune partie trouvée avec ce code.';
    case 'unavailable-id':
      return 'Ce code est déjà utilisé, réessayez.';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'Impossible de joindre le serveur de mise en relation. Vérifiez votre connexion Internet.';
    case 'browser-incompatible':
      return 'Votre navigateur ne gère pas le jeu en ligne.';
    default:
      return err.message ?? 'Erreur réseau inconnue.';
  }
}

/** Crée une partie en ligne et attend les joueurs. */
export function hostOnline(): Promise<HostTransport> {
  return new Promise((resolve, reject) => {
    const code = randomCode();
    const peer = new Peer(PREFIX + code, { debug: 0 });
    let connectionCb: ((conn: Connection) => void) | null = null;
    const timeout = window.setTimeout(() => {
      peer.destroy();
      reject(new Error('Le serveur de mise en relation ne répond pas.'));
    }, 12000);
    peer.on('open', () => {
      window.clearTimeout(timeout);
      resolve({
        code,
        onConnection: (cb) => (connectionCb = cb),
        close: () => peer.destroy(),
      });
    });
    peer.on('connection', (dc) => {
      dc.on('open', () => connectionCb?.(new PeerConnection(dc)));
    });
    peer.on('error', (err) => {
      window.clearTimeout(timeout);
      reject(new Error(describeError(err as { type?: string; message?: string })));
    });
  });
}

/** Rejoint une partie en ligne à partir de son code. */
export function joinOnline(rawCode: string): Promise<{ conn: Connection; close: () => void }> {
  return new Promise((resolve, reject) => {
    const code = normalizeCode(rawCode);
    if (code.length !== 5) {
      reject(new Error('Le code doit contenir 5 caractères.'));
      return;
    }
    const peer = new Peer({ debug: 0 });
    const timeout = window.setTimeout(() => {
      peer.destroy();
      reject(new Error('La partie ne répond pas. Vérifiez le code.'));
    }, 15000);
    peer.on('open', () => {
      const dc = peer.connect(PREFIX + code, { reliable: true, serialization: 'raw' });
      dc.on('open', () => {
        window.clearTimeout(timeout);
        resolve({ conn: new PeerConnection(dc), close: () => peer.destroy() });
      });
    });
    peer.on('error', (err) => {
      window.clearTimeout(timeout);
      peer.destroy();
      reject(new Error(describeError(err as { type?: string; message?: string })));
    });
  });
}
