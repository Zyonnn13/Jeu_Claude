import type { Settings } from '../core/SaveManager';
import type { RenderOptions } from '../game/render/WorldRenderer';

/** Options de rendu dérivées des paramètres du joueur. */
export function renderOptions(s: Settings): RenderOptions {
  return {
    lighting: s.graphics.lighting,
    bloom: s.graphics.bloom,
    shadows: s.graphics.shadows,
    vignette: s.graphics.vignette,
    highContrastBullets: s.accessibility.highContrastBullets,
    nameTags: s.gameplay.nameTags,
    offscreenIndicators: s.gameplay.offscreenIndicators,
  };
}
