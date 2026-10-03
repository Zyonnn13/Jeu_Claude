import type { WeaponDef, WeaponKind } from '../../data/types';
import { getWeapon } from '../../data/weapons';
import { AxeWeapon } from './AxeWeapon';
import { BoomerangWeapon } from './BoomerangWeapon';
import { FlaskWeapon } from './FlaskWeapon';
import { GarlicWeapon } from './GarlicWeapon';
import { KnivesWeapon } from './KnivesWeapon';
import { LightningWeapon } from './LightningWeapon';
import { OrbsWeapon } from './OrbsWeapon';
import { SwordWeapon } from './SwordWeapon';
import { WandWeapon } from './WandWeapon';
import type { Weapon } from './Weapon';
import type { Hero } from '../Hero';

/** Associe chaque type d'arme (défini dans les données) à sa classe de comportement. */
const WEAPON_CLASSES: Record<WeaponKind, new (def: WeaponDef, owner: Hero) => Weapon> = {
  sword: SwordWeapon,
  wand: WandWeapon,
  knives: KnivesWeapon,
  orbs: OrbsWeapon,
  garlic: GarlicWeapon,
  lightning: LightningWeapon,
  axe: AxeWeapon,
  boomerang: BoomerangWeapon,
  flask: FlaskWeapon,
};

export function createWeapon(id: string, owner: Hero): Weapon {
  const def = getWeapon(id);
  return new WEAPON_CLASSES[def.kind](def, owner);
}
