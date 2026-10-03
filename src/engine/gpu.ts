// Détection de la carte graphique pour recommander un préréglage de qualité.

export type GpuTier = 'low' | 'medium' | 'high' | 'ultra';

export interface GpuInfo {
  /** Nom lisible, ex. « NVIDIA GeForce RTX 3060 ». */
  name: string;
  tier: GpuTier;
  /** Carte graphique dédiée (et non intégrée au processeur). */
  dedicated: boolean;
}

/** Extrait le nom de la carte à partir de la chaîne ANGLE (« ANGLE (NVIDIA, NVIDIA GeForce ... Direct3D11 ...) »). */
function cleanName(raw: string): string {
  const angle = /ANGLE \(([^,]+),\s*([^,]+?)(?:\s+\(0x[0-9a-f]+\))?\s*(?:Direct3D|OpenGL|Vulkan|Metal|,)/i.exec(raw);
  if (angle) return angle[2].trim();
  return raw.replace(/^ANGLE \(|\)$/g, '').trim();
}

export function detectGpu(gl: WebGL2RenderingContext): GpuInfo {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const raw = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  const name = cleanName(raw);
  const n = name.toLowerCase();
  let tier: GpuTier = 'medium';
  let dedicated = false;
  if (/swiftshader|llvmpipe|software|basic render|microsoft basic/.test(n)) {
    tier = 'low';
  } else if (/rtx\s*(40|50)\d0|rtx\s*30[6-9]0|rx\s*(7\d{3}|6[7-9]\d{2})|arc\s*a7/.test(n)) {
    tier = 'ultra';
    dedicated = true;
  } else if (/rtx|gtx\s*1[0-9]{3}|gtx\s*16|radeon\s*rx|quadro|arc\s*a|radeon pro/.test(n)) {
    tier = 'high';
    dedicated = true;
  } else if (/gtx|geforce|mx\s*\d/.test(n)) {
    tier = 'medium';
    dedicated = true;
  } else if (/iris|radeon\(tm\)|radeon graphics|vega|uhd graphics 7|xe graphics|apple m/.test(n)) {
    tier = 'medium';
  } else if (/intel.*(hd|uhd)|mali|adreno|powervr/.test(n)) {
    tier = 'low';
  }
  return { name, tier, dedicated };
}
