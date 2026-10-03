// Écran générique de choix de bonus (montée de niveau, coffre, relique de fin de manche).
import { RARITY_INFO } from '../../data/balance';
import type { Assets } from '../../engine/Assets';
import type { Controller } from '../../engine/Input';
import type { Offer } from '../../game/systems/Upgrades';
import { button, h, levelPips, spriteEl } from '../dom';
import type { Screen } from '../UIManager';

export interface ChoiceOptions {
  assets: Assets;
  variant: 'levelup' | 'chest' | 'relic';
  title: string;
  subtitle?: string;
  /** Couleur du joueur concerné (coopération). */
  accent?: string;
  /** Coop locale : clavier ou manette du joueur concerné (seul à pouvoir choisir). */
  owner?: Controller;
  offers: Offer[];
  onPick(offer: Offer): void;
  /** Relances restantes, et fonction qui produit de nouvelles offres. */
  rerolls?: { remaining: () => number; reroll: () => Offer[] };
  skip?: { label: string; onSkip: () => void };
}

const KIND_LABEL: Record<Offer['kind'], string> = {
  weapon: 'Arme',
  passive: 'Objet',
  evolution: 'Évolution',
  relic: 'Relique',
  gold: 'Bonus',
  heal: 'Bonus',
};

export function choiceScreen(opts: ChoiceOptions): Screen {
  let offers = opts.offers;
  let locked = true;
  const cards = h('div', { class: 'choice-cards' });
  const actions = h('div', { class: 'screen-actions' });

  const pick = (offer: Offer) => {
    if (locked) return;
    locked = true;
    opts.onPick(offer);
  };

  const renderCards = () => {
    cards.replaceChildren(
      ...offers.map((offer, i) => {
        const rarity = offer.rarity ? RARITY_INFO[offer.rarity] : null;
        const card = h(
          'div',
          { class: `choice-card kind-${offer.kind}${offer.rarity ? ` rarity-${offer.rarity}` : ''}`, nav: true, style: rarity ? { '--rarity': rarity.color } : {} },
          h('div', { class: 'choice-key', text: String(i + 1) }),
          h('div', { class: 'choice-icon' }, spriteEl(opts.assets, offer.icon, 60, { animate: true })),
          h('div', { class: 'choice-tag', text: offer.tag }),
          h('div', { class: 'choice-name', text: offer.name }),
          h('div', { class: 'choice-kind', text: KIND_LABEL[offer.kind] }),
          h('div', { class: 'choice-desc', text: offer.description }),
          offer.synergy ? h('div', { class: 'choice-synergy', text: `Synergie : ${offer.synergy}` }) : null,
          offer.level && offer.level.max > 1 ? levelPips(offer.level.next, offer.level.max, 1) : null,
        );
        card.addEventListener('click', () => pick(offer));
        if (i === 0) card.setAttribute('data-autofocus', '');
        return card;
      }),
    );
  };

  const renderActions = () => {
    actions.replaceChildren();
    if (opts.rerolls) {
      const remaining = opts.rerolls.remaining();
      const reroll = button(`Relancer (${remaining}) [R]`, () => {
        if (opts.rerolls!.remaining() <= 0) return;
        offers = opts.rerolls!.reroll();
        renderCards();
        renderActions();
        (cards.firstElementChild as HTMLElement | null)?.focus();
      });
      reroll.title = 'Touche R ou bouton Y';
      reroll.classList.add('reroll-btn');
      if (remaining <= 0) reroll.classList.add('is-disabled');
      actions.append(reroll);
    }
    if (opts.skip) {
      const skip = opts.skip;
      actions.append(button(skip.label, () => {
        if (locked) return;
        locked = true;
        skip.onSkip();
      }));
    }
  };

  renderCards();
  renderActions();

  // Indications de touches : celles du périphérique du joueur concerné en coop locale, sinon du dernier utilisé.
  const device = opts.owner?.type === 'pad' ? 'pad' : opts.owner?.type === 'keyboard' ? 'kb' : null;
  const hint = (kind: 'kb' | 'pad', text: string) => (device && device !== kind ? null : h('div', { class: device ? 'choice-hint' : `choice-hint ${kind}-only`, text }));

  const el = h(
    'div',
    { class: `choice-screen variant-${opts.variant}`, style: opts.accent ? { '--accent': opts.accent } : {} },
    h('div', { class: 'choice-header' }, h('h2', { text: opts.title }), opts.subtitle ? h('div', { class: 'choice-subtitle', text: opts.subtitle }) : null),
    cards,
    actions,
    hint('kb', 'Touches 1 à 4 pour choisir directement · R pour relancer'),
    hint('pad', 'Ⓐ choisir · Ⓨ relancer'),
  );

  return {
    el,
    owner: opts.owner,
    onMount() {
      // Courte sécurité pour éviter un choix involontaire si une touche était déjà enfoncée.
      el.classList.add('locked');
      window.setTimeout(() => {
        locked = false;
        el.classList.remove('locked');
      }, 350);
    },
    onReroll() {
      if (opts.rerolls && opts.rerolls.remaining() > 0 && !locked) (actions.querySelector('.reroll-btn') as HTMLElement | null)?.click();
    },
    onKey(e) {
      if (e.repeat) return false;
      const n = Number(e.key);
      if (n >= 1 && n <= offers.length) {
        pick(offers[n - 1]);
        return true;
      }
      return false;
    },
  };
}
