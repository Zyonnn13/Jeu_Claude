// Interface en jeu : expérience, manche, chrono, éliminations, or, armes/objets, barre de boss, annonces.
import { BALANCE } from '../data/balance';
import type { Assets } from '../engine/Assets';
import type { HudData, HudParty, HudSlot } from '../game/render/WorldView';
import { formatNumber, h, spriteEl } from './dom';

export class Hud {
  private readonly xpFill: HTMLDivElement;
  private readonly levelText: HTMLSpanElement;
  private readonly waveText: HTMLDivElement;
  private readonly timerText: HTMLDivElement;
  private readonly killsText: HTMLSpanElement;
  private readonly goldText: HTMLSpanElement;
  private readonly weaponSlots: HTMLDivElement;
  private readonly passiveSlots: HTMLDivElement;
  private readonly bossBar: HTMLDivElement;
  private readonly bossName: HTMLDivElement;
  private readonly bossFill: HTMLDivElement;
  private readonly bossTrack: HTMLDivElement;
  private readonly bossPhase: HTMLSpanElement;
  private readonly banner: HTMLDivElement;
  private readonly hpText: HTMLSpanElement;
  private readonly hintText: HTMLDivElement;
  private readonly party: HTMLDivElement;
  private cache: Record<string, string | number> = {};
  private bannerTimer: number | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly assets: Assets,
  ) {
    this.xpFill = h('div', { class: 'xp-fill' });
    this.levelText = h('span', { class: 'xp-level', text: 'Niv. 1' });
    this.waveText = h('div', { class: 'wave-label' });
    this.timerText = h('div', { class: 'wave-timer' });
    this.killsText = h('span', { text: '0' });
    this.goldText = h('span', { text: '0' });
    this.hpText = h('span', { text: '100' });
    this.hintText = h('div', { class: 'wave-hint hidden' });
    this.party = h('div', { class: 'party' });
    this.weaponSlots = h('div', { class: 'slots' });
    this.passiveSlots = h('div', { class: 'slots passives' });
    this.bossName = h('div', { class: 'boss-name' });
    this.bossPhase = h('span', { class: 'boss-phase' });
    this.bossFill = h('div', { class: 'boss-fill' });
    this.bossTrack = h('div', { class: 'boss-track' }, this.bossFill);
    this.bossBar = h('div', { class: 'boss-bar hidden' }, h('div', { class: 'boss-head' }, this.bossName, this.bossPhase), this.bossTrack);
    this.banner = h('div', { class: 'banner' });

    root.append(
      h('div', { class: 'xp-bar' }, this.xpFill, this.levelText),
      h(
        'div',
        { class: 'hud-row' },
        h('div', { class: 'hud-left' }, this.weaponSlots, this.passiveSlots, this.party),
        h('div', { class: 'hud-center' }, this.waveText, this.timerText, this.hintText),
        h(
          'div',
          { class: 'hud-right' },
          h('div', { class: 'hud-stat' }, spriteEl(assets, 'icon_heart', 20), this.hpText),
          h('div', { class: 'hud-stat' }, spriteEl(assets, 'icon_skull', 20), this.killsText),
          h('div', { class: 'hud-stat gold' }, spriteEl(assets, 'coin', 16), this.goldText),
        ),
      ),
      this.bossBar,
      this.banner,
    );
  }

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
    this.bossBar.classList.add('hidden');
    this.cache = {};
  }

  /** Met à jour un texte seulement s'il a changé (évite de réécrire le DOM à chaque frame). */
  private set(key: string, value: string | number, apply: () => void): void {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply();
  }

  update(d: HudData): void {
    this.set('xp', Math.round(d.xpRatio * 400), () => (this.xpFill.style.width = `${d.xpRatio * 100}%`));
    this.set('level', d.level, () => (this.levelText.textContent = `Niv. ${d.level}`));
    const dir = d.director;
    this.set('wave', dir.title, () => (this.waveText.textContent = dir.title));
    this.set('timer', `${dir.timer}|${dir.boss}|${dir.urgent}`, () => {
      this.timerText.textContent = dir.timer;
      this.timerText.classList.toggle('boss', dir.boss);
      this.timerText.classList.toggle('urgent', dir.urgent);
    });
    this.set('hint', dir.hint, () => {
      this.hintText.textContent = dir.hint;
      this.hintText.classList.toggle('hidden', !dir.hint);
    });
    this.set('kills', d.kills, () => (this.killsText.textContent = formatNumber(d.kills)));
    this.set('gold', d.gold, () => (this.goldText.textContent = formatNumber(d.gold)));
    const hp = `${Math.ceil(d.hp)}/${Math.round(d.maxHp)}`;
    this.set('hp', hp, () => (this.hpText.textContent = hp));
    const wKey = d.weapons.map((w) => `${w.icon}:${w.level}`).join(',');
    this.set('weapons', wKey, () => this.renderSlots(this.weaponSlots, d.weapons, BALANCE.maxWeapons));
    const pKey = d.passives.map((w) => `${w.icon}:${w.level}`).join(',');
    this.set('passives', pKey, () => this.renderSlots(this.passiveSlots, d.passives, BALANCE.maxPassives));
    const partyKey = d.party.map((p) => `${p.name}:${Math.ceil(p.hp)}:${p.maxHp}:${p.downed}`).join('|');
    this.set('party', partyKey, () => this.renderParty(d.party));

    const boss = d.boss;
    this.set('bossOn', boss ? boss.name : '', () => {
      this.bossBar.classList.toggle('hidden', !boss);
      if (!boss) return;
      this.bossName.textContent = boss.name;
      this.bossTrack.querySelectorAll('.boss-mark').forEach((m) => m.remove());
      for (const t of boss.phases) this.bossTrack.append(h('div', { class: 'boss-mark', style: { left: `${t * 100}%` } }));
    });
    if (boss) {
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      this.set('boss', Math.round(ratio * 500), () => (this.bossFill.style.width = `${ratio * 100}%`));
      const total = boss.phases.length + 1;
      this.set('bossPhase', boss.phase, () => {
        this.bossPhase.textContent = total > 1 ? `Phase ${boss.phase}/${total}` : '';
        this.bossBar.classList.toggle('enraged', boss.phase >= 2);
      });
    }
  }

  private renderParty(party: HudParty[]): void {
    this.party.replaceChildren(
      ...party.map((p) =>
        h(
          'div',
          { class: `party-member${p.downed ? ' downed' : ''}`, style: { '--accent': p.color } },
          spriteEl(this.assets, p.sprite, 20),
          h('div', { class: 'party-info' }, h('div', { class: 'party-name', text: p.name }), h('div', { class: 'party-hp' }, h('div', { class: 'party-hp-fill', style: { width: `${Math.max(0, (p.hp / p.maxHp) * 100)}%` } }))),
        ),
      ),
    );
  }

  private renderSlots(container: HTMLElement, items: HudSlot[], capacity: number): void {
    container.replaceChildren();
    for (let i = 0; i < capacity; i++) {
      const item = items[i];
      if (!item) {
        container.append(h('div', { class: 'slot empty' }));
        continue;
      }
      container.append(
        h('div', { class: `slot${item.evolved ? ' evolved' : ''}${item.max ? ' max' : ''}` }, spriteEl(this.assets, item.icon, 24), h('span', { class: 'slot-level', text: item.level })),
      );
    }
  }

  /** Grande annonce animée au centre de l'écran. */
  showBanner(title: string, subtitle = '', kind: 'normal' | 'boss' | 'success' = 'normal', duration = 2.2): void {
    this.banner.replaceChildren(h('div', { class: 'banner-title', text: title }));
    if (subtitle) this.banner.append(h('div', { class: 'banner-sub', text: subtitle }));
    // Relance l'animation même si l'annonce précédente est encore affichée (sinon la nouvelle reste invisible).
    this.banner.className = 'banner';
    void this.banner.offsetWidth;
    this.banner.className = `banner show ${kind}`;
    if (this.bannerTimer !== null) window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      this.banner.className = 'banner';
      this.bannerTimer = null;
    }, duration * 1000);
  }
}
