import { normalize, type Vec2 } from './math';

/** Actions de navigation et de commande (menus et jeu). */
export type Action = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause' | 'reroll';

/** Commandes de jeu que le joueur peut réassigner. */
export type Bindable = 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight' | 'pause' | 'reroll';
export type Bindings = Record<Bindable, string[]>;

// event.code désigne la position physique de la touche : 'KeyW' correspond à Z sur un clavier AZERTY,
// donc ZQSD (AZERTY) et WASD (QWERTY) fonctionnent tous les deux par défaut.
export const DEFAULT_BINDINGS: Bindings = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  pause: ['Escape', 'KeyP'],
  reroll: ['KeyR'],
};

export const BINDABLE_LABELS: Record<Bindable, string> = {
  moveUp: 'Haut',
  moveDown: 'Bas',
  moveLeft: 'Gauche',
  moveRight: 'Droite',
  pause: 'Pause',
  reroll: 'Relancer les choix',
};

// Boutons de manette standard (disposition Xbox).
const PAD_BUTTONS: Partial<Record<Action, number[]>> = {
  up: [12],
  down: [13],
  left: [14],
  right: [15],
  confirm: [0],
  back: [1],
  pause: [9],
  reroll: [3],
};

const PREVENT_DEFAULT = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab']);

const KEY_NAMES: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Espace',
  Escape: 'Échap',
  Enter: 'Entrée',
  NumpadEnter: 'Entrée',
  Backspace: 'Retour',
  Tab: 'Tab',
  ShiftLeft: 'Maj',
  ShiftRight: 'Maj droite',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl droite',
  AltLeft: 'Alt',
  AltRight: 'Alt Gr',
  CapsLock: 'Verr. Maj',
};

/**
 * Renvoyer `true` indique que l'action a été consommée : les actions suivantes de la même touche sont ignorées.
 * `source` : clavier ou manette d'origine (la coop locale réserve un écran de choix à un seul joueur).
 */
type ActionListener = (action: Action, event?: KeyboardEvent, source?: Controller) => boolean | void;
/** Renvoyer `true` indique que la touche a été utilisée : elle ne déclenche alors aucune action. */
type KeyListener = (e: KeyboardEvent) => boolean | void;

export type Device = 'keyboard' | 'gamepad';

/** Source de commandes d'un joueur local. */
export type Controller = { type: 'any' } | { type: 'keyboard' } | { type: 'pad'; index: number };

const KEYBOARD: Controller = { type: 'keyboard' };

interface PadState {
  buttons: Set<number>;
  axes: Vec2;
}

export class Input {
  private keys = new Set<string>();
  private pads = new Map<number, PadState>();
  private padListeners = new Set<(padIndex: number, button: number) => void>();
  private listeners = new Set<ActionListener>();
  private keyListeners = new Set<KeyListener>();
  /** Répétition de la navigation au stick, par manette. */
  private padRepeat = new Map<number, { dir: string; timer: number }>();
  private bindings: Bindings = structuredClone(DEFAULT_BINDINGS);
  private capture: ((code: string | null) => void) | null = null;
  private layout = new Map<string, string>();
  device: Device = 'keyboard';
  onDeviceChange?: (device: Device) => void;

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => {
      if (this.capture) {
        e.preventDefault();
        const done = this.capture;
        this.capture = null;
        done(e.code === 'Escape' ? null : e.code);
        return;
      }
      this.setDevice('keyboard');
      // Saisie de texte (pseudo, code de partie, discussion) : seules Entrée et Échap restent des commandes.
      const typing = e.target instanceof HTMLInputElement && (e.target.type === 'text' || e.target.type === 'search');
      if (typing) {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') this.dispatch('confirm', e, KEYBOARD);
        else if (e.code === 'Escape') this.dispatch('back', e, KEYBOARD);
        return;
      }
      if (PREVENT_DEFAULT.has(e.code) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
      this.keys.add(e.code);
      // Une touche utilisée par un raccourci (ex. écran-titre) ne valide pas en plus l'écran suivant.
      let used = false;
      for (const fn of this.keyListeners) if (fn(e)) used = true;
      if (used || (e.repeat && !this.isNavigation(e.code))) return;
      for (const action of this.actionsFor(e.code)) if (this.dispatch(action, e, KEYBOARD)) break;
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    target.addEventListener('blur', () => this.keys.clear());
    target.addEventListener('mousemove', () => this.setDevice('keyboard'));

    // Noms des touches selon la disposition réelle du clavier (AZERTY affiche bien Z, Q...).
    const kb = (navigator as unknown as { keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> } }).keyboard;
    kb?.getLayoutMap?.()
      .then((map) => (this.layout = new Map(map)))
      .catch(() => undefined);
  }

  private setDevice(device: Device): void {
    if (device === this.device) return;
    this.device = device;
    this.onDeviceChange?.(device);
  }

  setBindings(bindings: Partial<Bindings> | null): void {
    this.bindings = { ...structuredClone(DEFAULT_BINDINGS), ...(bindings ?? {}) };
  }

  getBindings(): Bindings {
    return structuredClone(this.bindings);
  }

  /** Attend la prochaine touche pressée (Échap annule) ; utilisé pour réassigner une commande. */
  captureNextKey(callback: (code: string | null) => void): void {
    this.capture = callback;
  }

  keyLabel(code: string): string {
    if (KEY_NAMES[code]) return KEY_NAMES[code];
    const fromLayout = this.layout.get(code);
    if (fromLayout && fromLayout.trim()) return fromLayout.toUpperCase();
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Numpad')) return `Pavé ${code.slice(6)}`;
    return code;
  }

  private isNavigation(code: string): boolean {
    return this.actionsFor(code).some((a) => a === 'up' || a === 'down' || a === 'left' || a === 'right');
  }

  private actionsFor(code: string): Action[] {
    const b = this.bindings;
    const out: Action[] = [];
    if (code === 'ArrowUp' || b.moveUp.includes(code)) out.push('up');
    if (code === 'ArrowDown' || b.moveDown.includes(code)) out.push('down');
    if (code === 'ArrowLeft' || b.moveLeft.includes(code)) out.push('left');
    if (code === 'ArrowRight' || b.moveRight.includes(code)) out.push('right');
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') out.push('confirm');
    if (code === 'Escape' || code === 'Backspace') out.push('back');
    if (b.pause.includes(code)) out.push('pause');
    if (b.reroll.includes(code)) out.push('reroll');
    return out;
  }

  private dispatch(action: Action, event: KeyboardEvent | undefined, source: Controller): boolean {
    for (const fn of [...this.listeners]) if (fn(action, event, source)) return true;
    return false;
  }

  /** Écoute les actions « appuyées » (clavier ou manette), utile pour les menus et la pause. */
  onAction(fn: ActionListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Écoute brute du clavier (raccourcis numériques des menus, debug...). */
  onKey(fn: KeyListener): () => void {
    this.keyListeners.add(fn);
    return () => this.keyListeners.delete(fn);
  }

  private bindingDown(b: Bindable): boolean {
    return this.bindings[b].some((code) => this.keys.has(code));
  }

  /** Direction du clavier seul. */
  keyboardVector(): Vec2 {
    let x = 0;
    let y = 0;
    if (this.bindingDown('moveLeft')) x -= 1;
    if (this.bindingDown('moveRight')) x += 1;
    if (this.bindingDown('moveUp')) y -= 1;
    if (this.bindingDown('moveDown')) y += 1;
    return normalize(x, y);
  }

  /** Direction d'une manette (stick gauche ou croix). */
  padVector(index: number): Vec2 {
    const pad = this.pads.get(index);
    if (!pad) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    if (pad.buttons.has(14)) x -= 1;
    if (pad.buttons.has(15)) x += 1;
    if (pad.buttons.has(12)) y -= 1;
    if (pad.buttons.has(13)) y += 1;
    if (x || y) return normalize(x, y);
    if (pad.axes.x || pad.axes.y) {
      const len = Math.min(1, Math.hypot(pad.axes.x, pad.axes.y));
      const n = normalize(pad.axes.x, pad.axes.y);
      return { x: n.x * len, y: n.y * len };
    }
    return { x: 0, y: 0 };
  }

  /** Direction pour un joueur selon sa source de commandes. */
  vectorFor(controller: Controller): Vec2 {
    if (controller.type === 'keyboard') return this.keyboardVector();
    if (controller.type === 'pad') return this.padVector(controller.index);
    return this.moveVector();
  }

  /** Direction de déplacement normalisée (clavier ou n'importe quelle manette). */
  moveVector(): Vec2 {
    const kb = this.keyboardVector();
    if (kb.x || kb.y) return kb;
    for (const index of this.pads.keys()) {
      const v = this.padVector(index);
      if (v.x || v.y) return v;
    }
    return { x: 0, y: 0 };
  }

  /** Indices des manettes branchées. */
  connectedPads(): number[] {
    return [...this.pads.keys()];
  }

  /** Écoute les appuis de boutons par manette (pour rejoindre la coop locale). */
  onPadButton(fn: (padIndex: number, button: number) => void): () => void {
    this.padListeners.add(fn);
    return () => this.padListeners.delete(fn);
  }

  private gamepads(): Gamepad[] {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    return Array.from(pads).filter((p): p is Gamepad => !!p && p.connected);
  }

  /** Vibration de la manette (une manette précise, ou toutes). */
  rumble(strength: number, ms: number, padIndex?: number): void {
    for (const pad of this.gamepads()) {
      if (padIndex !== undefined && pad.index !== padIndex) continue;
      const actuator = (pad as Gamepad & { vibrationActuator?: { playEffect?: (t: string, p: object) => Promise<unknown> } }).vibrationActuator;
      actuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 })?.catch(() => undefined);
    }
  }

  /** À appeler une fois par frame : lit l'état des manettes et émet les actions correspondantes. */
  poll(dt: number): void {
    const pads = this.gamepads();
    const seen = new Set<number>();
    for (const pad of pads) {
      seen.add(pad.index);
      const source: Controller = { type: 'pad', index: pad.index };
      const prev = this.pads.get(pad.index);
      const pressed = new Set<number>();
      pad.buttons.forEach((b, i) => {
        if (b.pressed) pressed.add(i);
      });
      if (pressed.size) this.setDevice('gamepad');
      for (const b of pressed) if (!prev?.buttons.has(b)) for (const fn of this.padListeners) fn(pad.index, b);
      for (const action of Object.keys(PAD_BUTTONS) as Action[]) {
        for (const b of PAD_BUTTONS[action] ?? []) {
          if (pressed.has(b) && !prev?.buttons.has(b) && this.dispatch(action, undefined, source)) break;
        }
      }
      const dead = 0.22;
      const x = pad.axes[0] ?? 0;
      const y = pad.axes[1] ?? 0;
      const axes = { x: Math.abs(x) > dead ? x : 0, y: Math.abs(y) > dead ? y : 0 };
      if (axes.x || axes.y) this.setDevice('gamepad');
      this.pads.set(pad.index, { buttons: pressed, axes });

      // Navigation des menus au stick, avec répétition (chaque manette séparément : un stick
      // incliné sur une manette n'empêche pas les autres de naviguer).
      const dir = Math.abs(x) > 0.6 ? (x > 0 ? 'right' : 'left') : Math.abs(y) > 0.6 ? (y > 0 ? 'down' : 'up') : '';
      const repeat = this.padRepeat.get(pad.index);
      if (dir !== (repeat?.dir ?? '')) {
        this.padRepeat.set(pad.index, { dir, timer: 0.35 });
        if (dir) this.dispatch(dir as Action, undefined, source);
      } else if (dir && repeat) {
        repeat.timer -= dt;
        if (repeat.timer <= 0) {
          repeat.timer = 0.12;
          this.dispatch(dir as Action, undefined, source);
        }
      }
    }
    for (const index of [...this.pads.keys()]) {
      if (seen.has(index)) continue;
      this.pads.delete(index);
      this.padRepeat.delete(index);
    }
  }
}
