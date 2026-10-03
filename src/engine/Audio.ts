// Synthétiseur WebAudio : tous les effets sonores et la musique sont générés à la volée.

interface Tone {
  type: OscillatorType;
  freq: number;
  freqEnd?: number;
  dur: number;
  vol: number;
  delay?: number;
}

interface Noise {
  dur: number;
  vol: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  delay?: number;
}

interface Recipe {
  tones?: Tone[];
  noise?: Noise[];
  /** Intervalle minimal entre deux déclenchements (évite la saturation quand 100 ennemis meurent). */
  minInterval: number;
}

const SFX = {
  hit: { minInterval: 0.045, noise: [{ dur: 0.05, vol: 0.18, filter: 'bandpass', freq: 1800, q: 1.2 }], tones: [{ type: 'square', freq: 260, freqEnd: 120, dur: 0.05, vol: 0.05 }] },
  kill: { minInterval: 0.04, tones: [{ type: 'square', freq: 520, freqEnd: 180, dur: 0.08, vol: 0.06 }], noise: [{ dur: 0.06, vol: 0.08, filter: 'highpass', freq: 2500 }] },
  gem: { minInterval: 0.03, tones: [{ type: 'sine', freq: 1100, freqEnd: 1600, dur: 0.07, vol: 0.12 }] },
  coin: { minInterval: 0.05, tones: [{ type: 'square', freq: 988, dur: 0.06, vol: 0.06 }, { type: 'square', freq: 1319, dur: 0.12, vol: 0.06, delay: 0.06 }] },
  heal: { minInterval: 0.1, tones: [{ type: 'sine', freq: 520, freqEnd: 1040, dur: 0.25, vol: 0.14 }, { type: 'triangle', freq: 780, freqEnd: 1560, dur: 0.25, vol: 0.06, delay: 0.05 }] },
  levelup: { minInterval: 0.2, tones: [523, 659, 784, 1047].map((f, i) => ({ type: 'triangle' as const, freq: f, dur: 0.14, vol: 0.16, delay: i * 0.07 })) },
  hurt: { minInterval: 0.15, tones: [{ type: 'sawtooth', freq: 220, freqEnd: 70, dur: 0.22, vol: 0.14 }], noise: [{ dur: 0.12, vol: 0.12, filter: 'lowpass', freq: 900 }] },
  bolt: { minInterval: 0.05, tones: [{ type: 'triangle', freq: 880, freqEnd: 330, dur: 0.1, vol: 0.06 }] },
  slash: { minInterval: 0.06, noise: [{ dur: 0.12, vol: 0.12, filter: 'bandpass', freq: 3000, freqEnd: 900, q: 0.8 }] },
  throw: { minInterval: 0.05, noise: [{ dur: 0.08, vol: 0.07, filter: 'highpass', freq: 3000 }], tones: [{ type: 'sine', freq: 300, freqEnd: 520, dur: 0.08, vol: 0.05 }] },
  explosion: { minInterval: 0.08, noise: [{ dur: 0.45, vol: 0.3, filter: 'lowpass', freq: 1200, freqEnd: 120 }], tones: [{ type: 'sine', freq: 90, freqEnd: 35, dur: 0.4, vol: 0.25 }] },
  lightning: { minInterval: 0.07, noise: [{ dur: 0.25, vol: 0.16, filter: 'highpass', freq: 1200 }], tones: [{ type: 'sawtooth', freq: 1400, freqEnd: 90, dur: 0.18, vol: 0.06 }] },
  shatter: { minInterval: 0.06, noise: [{ dur: 0.15, vol: 0.12, filter: 'highpass', freq: 4000 }], tones: [{ type: 'sine', freq: 1800, freqEnd: 900, dur: 0.1, vol: 0.04 }] },
  chest: { minInterval: 0.3, tones: [392, 523, 659, 784, 1047, 1319].map((f, i) => ({ type: 'square' as const, freq: f, dur: 0.12, vol: 0.07, delay: i * 0.06 })) },
  select: { minInterval: 0.05, tones: [{ type: 'square', freq: 660, freqEnd: 880, dur: 0.07, vol: 0.07 }] },
  hover: { minInterval: 0.03, tones: [{ type: 'square', freq: 440, dur: 0.03, vol: 0.03 }] },
  denied: { minInterval: 0.1, tones: [{ type: 'square', freq: 180, dur: 0.12, vol: 0.07 }, { type: 'square', freq: 140, dur: 0.12, vol: 0.07, delay: 0.1 }] },
  boss: { minInterval: 1, tones: [{ type: 'sawtooth', freq: 110, freqEnd: 40, dur: 1.2, vol: 0.2 }, { type: 'square', freq: 55, freqEnd: 30, dur: 1.2, vol: 0.12 }], noise: [{ dur: 1.0, vol: 0.18, filter: 'lowpass', freq: 600, freqEnd: 100 }] },
  wave: { minInterval: 0.5, tones: [392, 523, 659, 784].map((f, i) => ({ type: 'triangle' as const, freq: f, dur: i === 3 ? 0.4 : 0.12, vol: 0.14, delay: i * 0.1 })) },
  dodge: { minInterval: 0.1, noise: [{ dur: 0.1, vol: 0.08, filter: 'bandpass', freq: 5000, freqEnd: 2000 }] },
  enemyShot: { minInterval: 0.08, tones: [{ type: 'square', freq: 300, freqEnd: 600, dur: 0.08, vol: 0.04 }] },
  death: { minInterval: 1, tones: [{ type: 'sawtooth', freq: 440, freqEnd: 40, dur: 1.2, vol: 0.18 }, { type: 'triangle', freq: 330, freqEnd: 30, dur: 1.4, vol: 0.12, delay: 0.1 }] },
  victory: { minInterval: 1, tones: [523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => ({ type: 'triangle' as const, freq: f, dur: i === 6 ? 0.7 : 0.16, vol: 0.16, delay: i * 0.14 })) },
  revive: { minInterval: 1, tones: [262, 330, 392, 523, 659, 784].map((f, i) => ({ type: 'sine' as const, freq: f, dur: 0.3, vol: 0.14, delay: i * 0.08 })) },
} satisfies Record<string, Recipe>;

export type SfxName = keyof typeof SFX;

// ---------------------------------------------------------------------------
// Musique : progression d'accords + basse + arpège + batterie, selon l'ambiance.

export type MusicMood = 'menu' | 'battle' | 'boss';

interface Track {
  bpm: number;
  chords: number[][]; // notes MIDI par mesure
  bassSteps: number[];
  bassType: OscillatorType;
  arpSteps: number[];
  arpType: OscillatorType;
  drums: boolean;
  bassVol: number;
  arpVol: number;
}

const TRACKS: Record<MusicMood, Track> = {
  menu: {
    bpm: 76,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [55, 60, 64],
      [55, 59, 62],
    ],
    bassSteps: [0, 8],
    bassType: 'triangle',
    arpSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    arpType: 'triangle',
    drums: false,
    bassVol: 0.16,
    arpVol: 0.05,
  },
  battle: {
    bpm: 124,
    chords: [
      [57, 60, 64],
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62],
      [57, 60, 64],
      [57, 60, 64],
      [52, 55, 59],
      [55, 59, 62],
    ],
    bassSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    bassType: 'triangle',
    arpSteps: [0, 3, 6, 8, 11, 14],
    arpType: 'square',
    drums: true,
    bassVol: 0.14,
    arpVol: 0.025,
  },
  boss: {
    bpm: 140,
    chords: [
      [50, 53, 57],
      [50, 53, 57],
      [46, 50, 53],
      [45, 49, 52],
    ],
    bassSteps: [0, 1, 2, 4, 6, 8, 9, 10, 12, 14],
    bassType: 'sawtooth',
    arpSteps: [0, 2, 3, 6, 8, 10, 11, 14],
    arpType: 'square',
    drums: true,
    bassVol: 0.07,
    arpVol: 0.025,
  },
};

const midiToFreq = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private noiseBuffer!: AudioBuffer;
  private lastPlayed = new Map<string, number>();
  private sfxVolume = 0.7;
  private musicVolume = 0.5;
  private masterVolume = 0.9;
  private muted = false;

  private mood: MusicMood | null = null;
  private step = 0;
  private nextStepTime = 0;
  private schedulerId: number | null = null;

  /** Le navigateur exige une interaction utilisateur avant de produire du son. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 6;
    this.master.connect(compressor).connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain.connect(this.master);
    this.musicGain.connect(this.master);
    this.applyVolumes();

    const len = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    if (this.mood) this.startScheduler();
  }

  setVolumes(sfx: number, music: number, master = this.masterVolume): void {
    this.sfxVolume = sfx;
    this.musicVolume = music;
    this.masterVolume = master;
    this.applyVolumes();
  }

  /** Coupe le son (fenêtre en arrière-plan). */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : this.masterVolume * 0.9;
    this.sfxGain.gain.value = this.sfxVolume;
    this.musicGain.gain.value = this.musicVolume * 0.6;
  }

  /** Joue un effet sonore ; renvoie faux s'il a été ignoré (trop rapproché du précédent). */
  play(name: SfxName, opts: { pitch?: number; volume?: number } = {}): boolean {
    const ctx = this.ctx;
    if (!ctx) return true;
    const recipe: Recipe = SFX[name];
    const now = ctx.currentTime;
    const last = this.lastPlayed.get(name) ?? -1;
    if (now - last < recipe.minInterval) return false;
    this.lastPlayed.set(name, now);
    const pitch = opts.pitch ?? 1;
    const vol = opts.volume ?? 1;
    if (this.sfxVolume > 0) {
      for (const t of recipe.tones ?? []) this.tone(t, pitch, vol, this.sfxGain);
      for (const n of recipe.noise ?? []) this.noise(n, vol, this.sfxGain);
    }
    return true;
  }

  private tone(t: Tone, pitch: number, vol: number, out: AudioNode, at?: number): void {
    const ctx = this.ctx!;
    const start = (at ?? ctx.currentTime) + (t.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = t.type;
    osc.frequency.setValueAtTime(t.freq * pitch, start);
    if (t.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.freqEnd * pitch), start + t.dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, t.vol * vol), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + t.dur + 0.02);
  }

  private noise(n: Noise, vol: number, out: AudioNode, at?: number): void {
    const ctx = this.ctx!;
    const start = (at ?? ctx.currentTime) + (n.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, n.vol * vol), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
    let node: AudioNode = src;
    if (n.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = n.filter;
      filter.frequency.setValueAtTime(n.freq ?? 1000, start);
      if (n.freqEnd) filter.frequency.exponentialRampToValueAtTime(n.freqEnd, start + n.dur);
      filter.Q.value = n.q ?? 0.7;
      node = node.connect(filter);
    }
    node.connect(gain).connect(out);
    src.start(start, Math.random() * 0.5);
    src.stop(start + n.dur + 0.02);
  }

  // --- Musique ---------------------------------------------------------------

  setMusic(mood: MusicMood | null): void {
    if (mood === this.mood) return;
    this.mood = mood;
    this.step = 0;
    if (!mood) {
      this.stopScheduler();
      return;
    }
    if (this.ctx) this.startScheduler();
  }

  private startScheduler(): void {
    this.stopScheduler();
    this.nextStepTime = this.ctx!.currentTime + 0.1;
    this.schedulerId = window.setInterval(() => this.schedule(), 25);
  }

  private stopScheduler(): void {
    if (this.schedulerId !== null) window.clearInterval(this.schedulerId);
    this.schedulerId = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.mood) return;
    const track = TRACKS[this.mood];
    const stepDur = 60 / track.bpm / 4;
    // Si l'onglet a été mis en veille, on recale l'horloge au lieu de rattraper le retard.
    if (this.nextStepTime < ctx.currentTime - 0.5) this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + 0.15) {
      this.playStep(track, this.step, this.nextStepTime, stepDur);
      this.step++;
      this.nextStepTime += stepDur;
    }
  }

  private playStep(track: Track, step: number, time: number, stepDur: number): void {
    const bar = Math.floor(step / 16) % track.chords.length;
    const s = step % 16;
    const chord = track.chords[bar];
    const out = this.musicGain;
    if (track.bassSteps.includes(s)) {
      const root = chord[0] - 12;
      const note = track.bassType === 'sawtooth' && s % 4 === 2 ? root + 12 : root;
      this.tone({ type: track.bassType, freq: midiToFreq(note), dur: stepDur * 1.8, vol: track.bassVol }, 1, 1, out, time);
    }
    if (track.arpSteps.includes(s)) {
      const idx = track.arpSteps.indexOf(s);
      const octave = idx % 4 === 3 ? 12 : 0;
      const note = chord[idx % chord.length] + 12 + octave;
      this.tone({ type: track.arpType, freq: midiToFreq(note), dur: stepDur * 1.5, vol: track.arpVol }, 1, 1, out, time);
    }
    if (track.drums) {
      if (s === 0 || s === 8 || (this.mood === 'boss' && s === 10)) {
        this.tone({ type: 'sine', freq: 140, freqEnd: 40, dur: 0.18, vol: 0.28 }, 1, 1, out, time);
      }
      if (s === 4 || s === 12) this.noise({ dur: 0.12, vol: 0.09, filter: 'bandpass', freq: 1800, q: 0.9 }, 1, out, time);
      if (s % 2 === 0) this.noise({ dur: 0.03, vol: s % 4 === 2 ? 0.05 : 0.025, filter: 'highpass', freq: 7000 }, 1, out, time);
    }
  }
}
