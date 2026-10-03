// Moteur de rendu WebGL2 : sprites instanciés regroupés par texture (des milliers par appel),
// carte de lumière basse résolution pour l'éclairage nocturne, et passe finale (vignette, flash).
import type { Assets, Sprite } from '../Assets';
import type { Camera } from '../Camera';
import { AtlasBuilder, makeCanvas, type GLTexture, type TextureRegion } from './Atlas';
import { BitmapFont } from './BitmapFont';

import { rgb, type RGB } from '../color';

export { rgb, type RGB };

export interface DrawOptions {
  frame?: number;
  flip?: boolean;
  /** Mélange vers le blanc (0..1), pour le flash de dégâts. */
  flash?: number;
  tint?: string;
  tintAmount?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  alpha?: number;
  anchorX?: number;
  anchorY?: number;
}

export interface TextOptions {
  size?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
  alpha?: number;
}

export interface PostEffects {
  vignette: number;
  flash: readonly [number, number, number, number];
  lowHp: number;
  time: number;
}

type BlendMode = 'normal' | 'add';

const FLOATS = 17;
const MAX_INSTANCES = 8192;

const SPRITE_VS = `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec4 a_rect;
layout(location = 2) in vec4 a_xform;
layout(location = 3) in vec4 a_uv;
layout(location = 4) in vec4 a_color;
layout(location = 5) in float a_alpha;
uniform vec4 u_view;
out vec2 v_uv;
out vec4 v_color;
out float v_alpha;
out float v_flash;
void main() {
  vec2 local = (a_corner - a_xform.xy) * a_rect.zw;
  float c = cos(a_xform.z);
  float s = sin(a_xform.z);
  vec2 p = a_rect.xy + vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  gl_Position = vec4(p * u_view.xy + u_view.zw, 0.0, 1.0);
  v_uv = mix(a_uv.xy, a_uv.zw, a_corner);
  v_color = a_color;
  v_alpha = a_alpha;
  v_flash = a_xform.w;
}`;

// Textures en alpha prémultiplié. color.a >= 0 : mélange vers la teinte ; color.a < 0 : multiplication.
const SPRITE_FS = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
in vec4 v_color;
in float v_alpha;
in float v_flash;
out vec4 outColor;
void main() {
  vec4 t = texture(u_tex, v_uv);
  vec3 c = v_color.a < 0.0 ? t.rgb * v_color.rgb : mix(t.rgb, v_color.rgb * t.a, v_color.a);
  c = mix(c, vec3(t.a), v_flash);
  outColor = vec4(c, t.a) * v_alpha;
}`;

const FULLSCREEN_VS = `#version 300 es
layout(location = 0) in vec2 a_corner;
out vec2 v_uv;
void main() {
  v_uv = a_corner;
  gl_Position = vec4(a_corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const COMPOSITE_FS = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 outColor;
void main() {
  outColor = vec4(texture(u_tex, v_uv).rgb, 1.0);
}`;

const POST_FS = `#version 300 es
precision mediump float;
uniform vec2 u_res;
uniform float u_vignette;
uniform vec4 u_flash;
uniform float u_lowHp;
uniform float u_time;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec2 d = v_uv - 0.5;
  d.x *= u_res.x / u_res.y;
  float dist = length(d);
  float vig = smoothstep(0.35, 1.0, dist) * u_vignette;
  vec4 col = vec4(0.02, 0.01, 0.05, 1.0) * vig;
  float red = u_lowHp * smoothstep(0.2, 0.95, dist) * (0.6 + 0.25 * sin(u_time * 6.0));
  col = col * (1.0 - red) + vec4(0.88, 0.2, 0.2, 1.0) * red;
  col = col * (1.0 - u_flash.a) + vec4(u_flash.rgb, 1.0) * u_flash.a;
  outColor = col;
}`;

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader : ${gl.getShaderInfoLog(s)}`);
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`Programme : ${gl.getProgramInfoLog(p)}`);
  return p;
}

export class GLRenderer {
  readonly gl: WebGL2RenderingContext;
  width = 0;
  height = 0;
  zoom = 3;
  viewW = 0;
  viewH = 0;
  /** Résolution de rendu (1 = native ; moins = plus rapide sur les petites cartes graphiques). */
  renderScale = 1;
  readonly font = new BitmapFont('"Pixelify Sans", monospace');

  private spriteProgram: WebGLProgram;
  private compositeProgram: WebGLProgram;
  private postProgram: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private fsVao: WebGLVertexArrayObject;
  private instanceBuffer: WebGLBuffer;
  private data = new Float32Array(MAX_INSTANCES * FLOATS);
  private count = 0;
  private currentTex: GLTexture | null = null;
  private view: [number, number, number, number] = [1, 1, 0, 0];
  private uView: WebGLUniformLocation;
  private originX = 0;
  private originY = 0;
  private blend: BlendMode = 'normal';

  private lightFbo: WebGLFramebuffer | null = null;
  private lightTex: GLTexture | null = null;
  private lightW = 0;
  private lightH = 0;

  // Formes intégrées
  px!: TextureRegion;
  disc!: TextureRegion;
  ring!: TextureRegion;
  spark!: TextureRegion;
  arrow!: TextureRegion;
  glowRegion!: TextureRegion;
  softDisc!: TextureRegion;

  /** Nombre d'appels de rendu de la dernière image (diagnostic). */
  drawCalls = 0;
  private callsThisFrame = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 n’est pas disponible sur cet ordinateur.');
    this.gl = gl;

    this.spriteProgram = compile(gl, SPRITE_VS, SPRITE_FS);
    this.compositeProgram = compile(gl, FULLSCREEN_VS, COMPOSITE_FS);
    this.postProgram = compile(gl, FULLSCREEN_VS, POST_FS);
    this.uView = gl.getUniformLocation(this.spriteProgram, 'u_view')!;

    const corners = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const cornerBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.instanceBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const stride = FLOATS * 4;
    const attrib = (loc: number, size: number, offset: number) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
      gl.vertexAttribDivisor(loc, 1);
    };
    attrib(1, 4, 0);
    attrib(2, 4, 16);
    attrib(3, 4, 32);
    attrib(4, 4, 48);
    attrib(5, 1, 64);

    this.fsVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.fsVao);
    const fsBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, fsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
    canvas.addEventListener('webglcontextrestored', () => location.reload());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const fullW = Math.max(1, Math.floor(window.innerWidth * dpr));
    const fullH = Math.max(1, Math.floor(window.innerHeight * dpr));
    // Zoom entier à pleine résolution : environ 360 unités de monde visibles en hauteur, pixel art net.
    const fullZoom = Math.max(1, Math.round(fullH / 360));
    this.width = Math.max(1, Math.floor(fullW * this.renderScale));
    this.height = Math.max(1, Math.floor(fullH * this.renderScale));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.zoom = fullZoom * this.renderScale;
    this.viewW = this.width / this.zoom;
    this.viewH = this.height / this.zoom;
  }

  setRenderScale(scale: number): void {
    const s = Math.max(0.5, Math.min(1, scale));
    if (s === this.renderScale) return;
    this.renderScale = s;
    this.resize();
  }

  // ---------------------------------------------------------------------------
  // Textures

  createTexture(source: TexImageSource, linear = false): GLTexture {
    const gl = this.gl;
    const handle = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const filter = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const size = source as { width: number; height: number };
    return { handle, width: size.width, height: size.height };
  }

  deleteTexture(tex: GLTexture): void {
    if (this.currentTex === tex) this.flush();
    this.gl.deleteTexture(tex.handle);
  }

  fullRegion(tex: GLTexture): TextureRegion {
    return { tex, u0: 0, v0: 0, u1: 1, v1: 1, w: tex.width, h: tex.height };
  }

  /** Construit les atlas : sprites du jeu + formes (pixel) et lueurs + police (lisse). */
  init(assets: Assets): void {
    const pixel = new AtlasBuilder(2);
    for (const sprite of assets.all()) {
      for (let i = 0; i < sprite.frames; i++) pixel.add(`${sprite.name}#${i}`, sprite.image, i * sprite.w, 0, sprite.w, sprite.h);
    }
    pixel.add('px', makeCanvas(4, 4, (c) => ((c.fillStyle = '#fff'), c.fillRect(0, 0, 4, 4))), 1, 1, 2, 2);
    pixel.add(
      'disc',
      makeCanvas(32, 32, (c) => {
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(16, 16, 16, 0, Math.PI * 2);
        c.fill();
      }),
      0,
      0,
      32,
      32,
    );
    pixel.add(
      'ring',
      makeCanvas(128, 128, (c) => {
        c.strokeStyle = '#fff';
        c.lineWidth = 4;
        c.beginPath();
        c.arc(64, 64, 61, 0, Math.PI * 2);
        c.stroke();
      }),
      0,
      0,
      128,
      128,
    );
    pixel.add(
      'spark',
      makeCanvas(16, 16, (c) => {
        c.fillStyle = '#fff';
        c.fillRect(7, 0, 2, 16);
        c.fillRect(0, 7, 16, 2);
        c.fillRect(6, 4, 4, 8);
        c.fillRect(4, 6, 8, 4);
      }),
      0,
      0,
      16,
      16,
    );
    pixel.add(
      'arrow',
      makeCanvas(16, 16, (c) => {
        c.fillStyle = '#1b1424';
        c.beginPath();
        c.moveTo(15, 8);
        c.lineTo(2, 1);
        c.lineTo(5, 8);
        c.lineTo(2, 15);
        c.closePath();
        c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.moveTo(13, 8);
        c.lineTo(4, 3);
        c.lineTo(6, 8);
        c.lineTo(4, 13);
        c.closePath();
        c.fill();
      }),
      0,
      0,
      16,
      16,
    );
    const pixelRegions = pixel.build((canvas) => this.createTexture(canvas, false));
    for (const sprite of assets.all()) {
      sprite.regions = Array.from({ length: sprite.frames }, (_, i) => pixelRegions.get(`${sprite.name}#${i}`)!);
    }
    this.px = pixelRegions.get('px')!;
    this.disc = pixelRegions.get('disc')!;
    this.ring = pixelRegions.get('ring')!;
    this.spark = pixelRegions.get('spark')!;
    this.arrow = pixelRegions.get('arrow')!;

    const smooth = new AtlasBuilder(3);
    smooth.add(
      'glow',
      makeCanvas(128, 128, (c) => {
        const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.4, 'rgba(255,255,255,0.7)');
        g.addColorStop(0.75, 'rgba(255,255,255,0.25)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 128, 128);
      }),
      0,
      0,
      128,
      128,
    );
    smooth.add(
      'softDisc',
      makeCanvas(64, 64, (c) => {
        const g = c.createRadialGradient(32, 32, 20, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
      }),
      0,
      0,
      64,
      64,
    );
    this.font.addTo(smooth);
    const smoothRegions = smooth.build((canvas) => this.createTexture(canvas, true));
    this.glowRegion = smoothRegions.get('glow')!;
    this.softDisc = smoothRegions.get('softDisc')!;
    this.font.resolve(smoothRegions);
  }

  // ---------------------------------------------------------------------------
  // Image

  beginFrame(clear: string): void {
    const gl = this.gl;
    this.callsThisFrame = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    const c = rgb(clear);
    gl.clearColor(c[0], c[1], c[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.setBlend('normal');
  }

  endFrame(): void {
    this.flush();
    this.drawCalls = this.callsThisFrame;
  }

  /** Vue monde centrée sur la caméra (origine arrondie au pixel pour un pixel art net). */
  setWorldView(camera: Camera): void {
    const cx = camera.x + camera.offsetX;
    const cy = camera.y + camera.offsetY;
    this.originX = Math.round(this.width / 2 - cx * this.zoom);
    this.originY = Math.round(this.height / 2 - cy * this.zoom);
    this.setView((2 * this.zoom) / this.width, (-2 * this.zoom) / this.height, (2 * this.originX) / this.width - 1, 1 - (2 * this.originY) / this.height);
  }

  /** Vue écran en pixels physiques. */
  setScreenView(): void {
    this.setView(2 / this.width, -2 / this.height, -1, 1);
  }

  private setView(sx: number, sy: number, ox: number, oy: number): void {
    const v = this.view;
    if (v[0] === sx && v[1] === sy && v[2] === ox && v[3] === oy) return;
    this.flush();
    this.view = [sx, sy, ox, oy];
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: x * this.zoom + this.originX, y: y * this.zoom + this.originY };
  }

  viewBounds(camera: Camera, margin = 0): { left: number; top: number; right: number; bottom: number } {
    return {
      left: camera.x - this.viewW / 2 - margin,
      top: camera.y - this.viewH / 2 - margin,
      right: camera.x + this.viewW / 2 + margin,
      bottom: camera.y + this.viewH / 2 + margin,
    };
  }

  setBlend(mode: BlendMode): void {
    if (mode === this.blend) return;
    this.flush();
    this.blend = mode;
    const gl = this.gl;
    if (mode === 'add') gl.blendFunc(gl.ONE, gl.ONE);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  flush(): void {
    if (this.count === 0 || !this.currentTex) return;
    const gl = this.gl;
    gl.useProgram(this.spriteProgram);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.count * FLOATS);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.currentTex.handle);
    gl.uniform4f(this.uView, this.view[0], this.view[1], this.view[2], this.view[3]);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.count);
    this.callsThisFrame++;
    this.count = 0;
  }

  /** Ajoute une instance au lot en cours. */
  draw(
    region: TextureRegion,
    x: number,
    y: number,
    w: number,
    h: number,
    ax = 0.5,
    ay = 0.5,
    rotation = 0,
    flash = 0,
    flip = false,
    color: RGB | null = null,
    amount = 0,
    alpha = 1,
  ): void {
    if (alpha <= 0) return;
    if (region.tex !== this.currentTex) {
      this.flush();
      this.currentTex = region.tex;
    }
    if (this.count >= MAX_INSTANCES) this.flush();
    const d = this.data;
    let i = this.count * FLOATS;
    d[i++] = x;
    d[i++] = y;
    d[i++] = w;
    d[i++] = h;
    d[i++] = ax;
    d[i++] = ay;
    d[i++] = rotation;
    d[i++] = flash;
    d[i++] = flip ? region.u1 : region.u0;
    d[i++] = region.v0;
    d[i++] = flip ? region.u0 : region.u1;
    d[i++] = region.v1;
    d[i++] = color ? color[0] : 1;
    d[i++] = color ? color[1] : 1;
    d[i++] = color ? color[2] : 1;
    d[i++] = color ? amount : 0;
    d[i] = alpha;
    this.count++;
  }

  sprite(sprite: Sprite, x: number, y: number, o: DrawOptions = {}): void {
    const frame = (((o.frame ?? 0) % sprite.frames) + sprite.frames) % sprite.frames;
    const region = sprite.regions[Math.floor(frame)];
    const s = o.scale ?? 1;
    this.draw(
      region,
      x,
      y,
      sprite.w * s * (o.scaleX ?? 1),
      sprite.h * s * (o.scaleY ?? 1),
      o.anchorX ?? 0.5,
      o.anchorY ?? 0.5,
      o.rotation ?? 0,
      o.flash ?? 0,
      o.flip ?? false,
      o.tint ? rgb(o.tint) : null,
      o.tintAmount ?? 0.45,
      o.alpha ?? 1,
    );
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    this.draw(this.px, x, y, w, h, 0, 0, 0, 0, false, rgb(color), 1, alpha);
  }

  ellipse(x: number, y: number, rx: number, ry: number, color: string, alpha = 1): void {
    this.draw(this.disc, x, y, rx * 2, ry * 2, 0.5, 0.5, 0, 0, false, rgb(color), 1, alpha);
  }

  ringShape(x: number, y: number, rx: number, ry: number, color: string, alpha = 1): void {
    this.draw(this.ring, x, y, rx * 2, ry * 2, 0.5, 0.5, 0, 0, false, rgb(color), 1, alpha);
  }

  glow(x: number, y: number, rx: number, ry: number, color: string, alpha = 1): void {
    this.draw(this.glowRegion, x, y, rx * 2, ry * 2, 0.5, 0.5, 0, 0, false, rgb(color), 1, alpha);
  }

  line(x1: number, y1: number, x2: number, y2: number, width: number, color: string, alpha = 1): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    this.draw(this.px, (x1 + x2) / 2, (y1 + y2) / 2, len, width, 0.5, 0.5, Math.atan2(dy, dx), 0, false, rgb(color), 1, alpha);
  }

  texture(tex: TextureRegion, x: number, y: number, w: number, h: number): void {
    this.draw(tex, x, y, w, h, 0, 0);
  }

  /** Texte bitmap (taille = hauteur approximative en unités de la vue courante). */
  text(str: string, x: number, y: number, o: TextOptions = {}): void {
    const font = this.font;
    const scale = (o.size ?? 8) / font.px;
    const width = font.measure(str) * scale;
    let penX = o.align === 'left' ? x : o.align === 'right' ? x - width : x - width / 2;
    const color = rgb(o.color ?? '#ffffff');
    const h = font.cellH * scale;
    for (const ch of str) {
      const g = font.glyph(ch);
      if (!g) continue;
      const gx = penX - (font.outline + 1) * scale;
      this.draw(g.region, gx, y - h * 0.55, g.region.w * scale, h, 0, 0, 0, 0, false, color, -1, o.alpha ?? 1);
      penX += g.advance * scale;
    }
  }

  // ---------------------------------------------------------------------------
  // Éclairage : carte de lumière basse résolution, multipliée sur la scène.

  /** `divisor` : résolution de la carte de lumière (2 = moitié de la vue, 3 = un tiers...). */
  beginLights(ambient: RGB, camera: Camera, divisor = 2): void {
    this.flush();
    const gl = this.gl;
    const w = Math.max(8, Math.ceil(this.viewW / divisor));
    const h = Math.max(8, Math.ceil(this.viewH / divisor));
    if (!this.lightFbo || w !== this.lightW || h !== this.lightH) this.createLightTarget(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFbo);
    gl.viewport(0, 0, w, h);
    gl.clearColor(ambient[0], ambient[1], ambient[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const cx = camera.x + camera.offsetX;
    const cy = camera.y + camera.offsetY;
    this.view = [2 / this.viewW, -2 / this.viewH, (-2 * cx) / this.viewW, (2 * cy) / this.viewH];
    this.setBlend('add');
  }

  /** Ajoute une source de lumière (à appeler entre beginLights et endLights). */
  light(x: number, y: number, radius: number, color: RGB, intensity = 1): void {
    this.draw(this.glowRegion, x, y, radius * 2, radius * 2, 0.5, 0.5, 0, 0, false, color, 1, intensity);
  }

  endLights(camera: Camera): void {
    this.flush();
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.compositeProgram);
    gl.bindVertexArray(this.fsVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.lightTex!.handle);
    gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.callsThisFrame++;
    this.blend = 'normal';
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.view = [0, 0, 0, 0];
    this.setWorldView(camera);
  }

  private createLightTarget(w: number, h: number): void {
    const gl = this.gl;
    if (this.lightTex) gl.deleteTexture(this.lightTex.handle);
    if (this.lightFbo) gl.deleteFramebuffer(this.lightFbo);
    const handle = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.lightTex = { handle, width: w, height: h };
    this.lightFbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, handle, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.lightW = w;
    this.lightH = h;
  }

  // ---------------------------------------------------------------------------
  // Passe finale : vignette, pulsation rouge (PV bas), flash plein écran.

  post(p: PostEffects): void {
    this.flush();
    this.setBlend('normal');
    const gl = this.gl;
    gl.useProgram(this.postProgram);
    gl.bindVertexArray(this.fsVao);
    gl.uniform2f(gl.getUniformLocation(this.postProgram, 'u_res'), this.width, this.height);
    gl.uniform1f(gl.getUniformLocation(this.postProgram, 'u_vignette'), p.vignette);
    gl.uniform4f(gl.getUniformLocation(this.postProgram, 'u_flash'), p.flash[0], p.flash[1], p.flash[2], p.flash[3]);
    gl.uniform1f(gl.getUniformLocation(this.postProgram, 'u_lowHp'), p.lowHp);
    gl.uniform1f(gl.getUniformLocation(this.postProgram, 'u_time'), p.time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.callsThisFrame++;
  }
}
