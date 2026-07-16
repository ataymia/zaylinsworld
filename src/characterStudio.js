// ─────────────────────────────────────────────────────────────────────────────
// characterStudio.js — wardrobe gameplay UI + sharp modular avatar preview.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three';
import {
  PLAYER_AVATAR_CATALOG as CATALOG,
  PLAYER_CUSTOM_DEFAULTS,
  ensurePlayerCustom,
  clonePlayerAppearance,
  applyPlayerAppearance,
  variantFor,
} from './config/playerAvatarCatalog.js';
import {
  createModularPlayerVisual,
  updateModularPlayerVisual,
  tickModularPlayerVisual,
  disposeModularPlayerVisual,
} from './modularPlayer.js';
import { isLegacyAssetHair } from './modularAttachments.js';
import { injectCharacterStudioStyles } from './characterStudioTheme.js';
import {
  STUDIO_TABS as TABS,
  pickStudioItem as pick,
  ensureClosetState as ensureCloset,
  studioSection as section,
  studioItemCard as itemCard,
  studioSlider as slider,
} from './characterStudioWidgets.js';

const $ = (id) => document.getElementById(id);
const clone = (value) => JSON.parse(JSON.stringify(value));
let activeStudio = null;

class CharacterStudio {
  constructor(state, handlers) {
    injectCharacterStudioStyles();
    ensureCloset(state);
    this.state = state;
    this.handlers = handlers;
    this.custom = ensurePlayerCustom(state.custom || (state.custom = {}));
    this.activeTab = 'body';
    this.history = [];
    this.preview = null;
    this.previewToken = 0;
    this.visible = true;
    this.rotation = 0.22;
    this.autoRotate = true;
    this.dragging = false;
    this.lastX = 0;
    this.previewDirty = false;
    this.previewUpdating = false;
    this.previewScheduled = false;
    this.lastRenderMs = 0;
    this.buildShell();
    this.buildPreview();
    this.renderPanel();
    this.framePreviewForTab(true);
    this.schedulePreviewUpdate();
    window.__ZW_ACTIVE_CUSTOM__ = this.custom;
    window.__ZW_CHARACTER_STUDIO_ACTIVE__ = true;
  }

  buildShell() {
    $('creator')?.querySelector('.panel')?.classList.add('studio-panel');
    const title = $('creator-left')?.querySelector('h1');
    if (title) title.textContent = 'Zaylins Character Studio';
    const subtitle = $('creator-left')?.querySelector('.sub');
    if (subtitle) subtitle.textContent = 'Build a look, save outfits, and make the city yours.';
    const right = $('creator-right');
    const old = right?.querySelector(':scope > .sub');
    if (old) old.style.display = 'none';
    this.root = $('creator-options');
    this.root.innerHTML = `<div class="zw-studio-head"><div><h2>Wardrobe & Appearance</h2><p>Your closet is part of the game. Mix pieces now and unlock more around town later.</p></div><div id="zw-studio-status" class="zw-studio-status">Modular base</div></div><div id="zw-studio-tabs" class="zw-studio-tabs"></div><div id="zw-studio-body" class="zw-studio-body"></div><div class="zw-studio-actions"><button id="zw-studio-undo" class="zw-mini-btn">Undo</button><button id="zw-studio-random" class="zw-mini-btn">Randomize</button><button id="zw-studio-reset" class="zw-mini-btn">Reset Category</button><button id="zw-studio-save" class="zw-mini-btn primary">Save Look</button></div>`;
    this.body = $('zw-studio-body');
    this.renderTabs();
    $('zw-studio-undo').onclick = () => this.undo();
    $('zw-studio-random').onclick = () => this.randomize();
    $('zw-studio-reset').onclick = () => this.resetCategory();
    $('zw-studio-save').onclick = () => this.saveLook();
    const enter = $('creator-enter');
    if (enter) enter.textContent = this.state.createdCharacter ? 'Wear This Look' : 'Enter Starter Town';
  }

  renderTabs() {
    const tabs = $('zw-studio-tabs');
    if (!tabs) return;
    tabs.innerHTML = '';
    for (const [id, label] of TABS) {
      const button = document.createElement('button');
      button.className = `zw-studio-tab${id === this.activeTab ? ' active' : ''}`;
      button.textContent = label;
      button.onclick = () => {
        this.activeTab = id;
        this.renderTabs();
        this.renderPanel();
        this.framePreviewForTab();
      };
      tabs.appendChild(button);
    }
  }

  buildPreview() {
    const wrap = $('creator-canvas-wrap');
    if (!wrap) return;
    wrap.querySelectorAll('.zw-studio-canvas,.zw-studio-loading').forEach((node) => node.remove());
    wrap.dataset.characterStudio = 'active';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    // Force modest supersampling on ordinary 1x desktop displays. The preview is
    // capped at 30fps below, so facial features become clearer without doubling
    // the full game's render cost.
    const ratio = Math.min(2.25, Math.max(1.5, devicePixelRatio || 1));
    this.renderer.setPixelRatio(ratio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.domElement.className = 'zw-studio-canvas';
    this.renderer.domElement.style.visibility = 'hidden';
    wrap.appendChild(this.renderer.domElement);
    this.loading = document.createElement('div');
    this.loading.className = 'zw-studio-loading';
    this.loading.textContent = 'Preparing modular avatar…';
    wrap.appendChild(this.loading);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#11131d');
    this.scene.add(new THREE.HemisphereLight('#dce8ff', '#2a1b18', 1.9));
    const key = new THREE.DirectionalLight('#fff3df', 3.2);
    key.position.set(3.5, 5, 4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#78b8ff', 1.5);
    rim.position.set(-4, 2.8, -2);
    this.scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 48),
      new THREE.MeshStandardMaterial({ color: '#252838', roughness: 0.82 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    this.scene.add(floor);
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.05, 30);
    this.camera.position.set(0, 1.25, 4.65);
    this.camera.lookAt(0, 0.98, 0);

    const canvas = this.renderer.domElement;
    canvas.onpointerdown = (event) => {
      this.dragging = true;
      this.autoRotate = false;
      this.lastX = event.clientX;
      canvas.classList.add('dragging');
      canvas.setPointerCapture?.(event.pointerId);
    };
    canvas.onpointermove = (event) => {
      if (!this.dragging) return;
      this.rotation += (event.clientX - this.lastX) * 0.012;
      this.lastX = event.clientX;
    };
    canvas.onpointerup = canvas.onpointercancel = () => {
      this.dragging = false;
      canvas.classList.remove('dragging');
    };
    canvas.onwheel = (event) => {
      event.preventDefault();
      this.autoRotate = false;
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z + event.deltaY * 0.003, 1.85, 6.2);
    };
    this.clock = new THREE.Clock();
    this.animate(0);
  }

  framePreviewForTab(immediate = false) {
    if (!this.camera) return;
    const close = ['face', 'skin', 'hair'].includes(this.activeTab);
    const target = close
      ? { x: 0, y: 1.48, z: 2.15, lookY: 1.48 }
      : { x: 0, y: 1.24, z: 4.65, lookY: 0.98 };
    if (immediate) {
      this.camera.position.set(target.x, target.y, target.z);
      this.camera.lookAt(0, target.lookY, 0);
    } else {
      this.camera.position.set(target.x, target.y, target.z);
      this.camera.lookAt(0, target.lookY, 0);
    }
  }

  animate(timestamp) {
    if (this.destroyed) return;
    requestAnimationFrame((next) => this.animate(next));
    if (!this.visible || !this.renderer) return;
    // 30fps preview cap. The city renderer does not share this budget.
    if (timestamp - this.lastRenderMs < 32) return;
    this.lastRenderMs = timestamp;
    const wrap = $('creator-canvas-wrap');
    const width = Math.max(1, wrap?.clientWidth || 1);
    const height = Math.max(1, wrap?.clientHeight || 1);
    if (this.renderer.domElement.clientWidth !== width || this.renderer.domElement.clientHeight !== height) {
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    const elapsed = this.clock.getElapsedTime();
    if (this.autoRotate) this.rotation += 0.0048;
    if (this.preview?.group) {
      this.preview.group.rotation.y = this.rotation;
      tickModularPlayerVisual(this.preview, elapsed);
    }
    this.renderer.render(this.scene, this.camera);
  }

  schedulePreviewUpdate() {
    this.previewDirty = true;
    if (this.previewScheduled) return;
    this.previewScheduled = true;
    requestAnimationFrame(() => {
      this.previewScheduled = false;
      this.flushPreviewUpdates();
    });
  }

  async flushPreviewUpdates() {
    if (this.previewUpdating || this.destroyed) return;
    this.previewUpdating = true;
    try {
      while (this.previewDirty && !this.destroyed) {
        this.previewDirty = false;
        await this.rebuildPreviewNow();
      }
    } finally {
      this.previewUpdating = false;
      if (this.previewDirty && !this.destroyed) this.schedulePreviewUpdate();
    }
  }

  async rebuildPreviewNow() {
    const token = ++this.previewToken;
    this.loading.style.display = '';
    this.loading.textContent = this.preview ? 'Updating look…' : 'Loading modular body and wardrobe…';
    try {
      if (!this.preview) {
        const model = await createModularPlayerVisual(this.custom, this.renderer, { name: 'creator-modular-preview' });
        if (token !== this.previewToken || !model) {
          if (model) disposeModularPlayerVisual(model);
          return;
        }
        this.preview = model;
        this.scene.add(model.group);
      } else {
        await updateModularPlayerVisual(this.preview, this.custom, this.renderer);
      }
      if (token === this.previewToken) {
        this.renderer.domElement.style.visibility = 'visible';
        this.loading.style.display = 'none';
        $('zw-studio-status').textContent = 'Live modular preview';
      }
    } catch (error) {
      console.warn('[character-studio] preview failed', error);
      if (token === this.previewToken) {
        this.renderer.domElement.style.visibility = 'hidden';
        this.loading.style.display = '';
        this.loading.textContent = 'Modular preview unavailable. Procedural fallback remains active.';
        $('zw-studio-status').textContent = 'Fallback active';
      }
    }
  }

  snapshot() { return clonePlayerAppearance(this.custom); }

  markChanged() {
    window.__ZW_ACTIVE_CUSTOM__ = this.custom;
    // Deliberately do not call the legacy onChange callback. In main.js that
    // callback rebuilds a second hidden procedural avatar for every slider tick.
    this.handlers.onStudioChange?.(this.custom);
  }

  commit(change, push = true) {
    if (push) {
      this.history.push(clone(this.snapshot()));
      if (this.history.length > 30) this.history.shift();
    }
    change(this.custom);
    ensurePlayerCustom(this.custom);
    this.markChanged();
    this.renderPanel();
    this.schedulePreviewUpdate();
  }

  live(change) {
    change(this.custom);
    ensurePlayerCustom(this.custom);
    this.markChanged();
    this.schedulePreviewUpdate();
  }

  renderPanel() {
    if (!this.body) return;
    this.body.innerHTML = '';
    this[`render_${this.activeTab}`]?.();
  }

  sliderSection(title, definitions, read, write) {
    const root = section(title, 'Drag to sculpt');
    for (const definition of definitions) {
      const initial = read(definition);
      const before = this.snapshot();
      root.appendChild(slider(
        definition,
        initial,
        (next) => this.live((custom) => write(custom, definition, next)),
        (next) => {
          if (Math.abs(next - initial) > 0.0001) this.history.push(clone(before));
          this.markChanged();
        },
      ));
    }
    this.body.appendChild(root);
  }

  render_body = () => {
    const root = section('Character Base', 'Pack-independent slot');
    const grid = document.createElement('div');
    grid.className = 'zw-card-grid';
    for (const entry of CATALOG.bases) {
      grid.appendChild(itemCard(entry, this.custom.avatarBase === entry.id, () => this.commit((custom) => { custom.avatarBase = entry.id; })));
    }
    root.appendChild(grid);
    this.body.appendChild(root);
    this.sliderSection('Body Sculpt', CATALOG.bodySliders, (definition) => this.custom[definition.key], (custom, definition, value) => { custom[definition.key] = value; });
  };

  render_face = () => this.sliderSection('Face Sculpt', CATALOG.faceSliders, (definition) => this.custom.faceMorphs[definition.key], (custom, definition, value) => { custom.faceMorphs[definition.key] = value; });

  render_skin = () => {
    const root = section('Skin Tone', 'Live material tint');
    const grid = document.createElement('div');
    grid.className = 'zw-card-grid';
    for (const entry of CATALOG.skinTones) {
      grid.appendChild(itemCard(entry, this.custom.skin === entry.id, () => this.commit((custom) => { custom.skin = entry.id; }), { swatch: entry.color }));
    }
    root.appendChild(grid);
    this.body.appendChild(root);
    this.variantCards('Eye Color', 'eyes', 'eyeTexture');
    this.variantCards('Eyelashes', 'eyelashes', 'eyelashTexture');
  };

  render_hair = () => {
    this.slotCards('Hairstyle', 'hair', 'modularHair');
    if (isLegacyAssetHair(this.custom.modularHair)) this.colorCards('Hair Color', CATALOG.hairColors, 'hairColor');
    else this.variantCards('Hair Texture', 'hair', 'hairTexture');
    this.slotCards('Facial Hair', 'facialHair', 'facialHair');
  };

  render_clothes = () => {
    this.slotCards('Tops', 'top', 'modularTop');
    this.variantCards('Top Color / Print', this.custom.modularTop, 'topTexture');
    this.slotCards('Bottoms', 'bottom', 'modularBottom');
    this.variantCards('Bottom Color', this.custom.modularBottom, 'bottomTexture');
    this.slotCards('Shoes', 'shoes', 'modularShoes');
    this.variantCards('Shoe Color', this.custom.modularShoes, 'shoesTexture');
  };

  render_accessories = () => {
    this.slotCards('Hats', 'hat', 'hat');
    if (this.custom.hat !== 'none') this.variantCards('Hat Color', this.custom.hat, 'hatTexture');
    this.slotCards('Glasses', 'glasses', 'glasses');
    const root = section('Jewelry', 'Frostbox-compatible chest anchor');
    const grid = document.createElement('div');
    grid.className = 'zw-card-grid';
    for (const entry of CATALOG.jewelry) {
      grid.appendChild(itemCard(entry, this.custom.jewelry === entry.id, () => this.commit((custom) => { custom.jewelry = entry.id; })));
    }
    root.appendChild(grid);
    this.body.appendChild(root);
  };

  render_closet = () => {
    const intro = section('Saved Looks', `${this.state.savedOutfits.length} saved`);
    const save = document.createElement('button');
    save.className = 'zw-mini-btn primary';
    save.textContent = 'Save Current Outfit';
    save.onclick = () => this.saveLook();
    intro.appendChild(save);
    this.body.appendChild(intro);
    if (!this.state.savedOutfits.length) {
      const empty = document.createElement('div');
      empty.className = 'zw-empty';
      empty.textContent = 'No looks saved yet. Build an outfit, name it, and it will live here.';
      this.body.appendChild(empty);
      return;
    }
    this.state.savedOutfits.forEach((look, index) => {
      const card = document.createElement('div');
      card.className = 'zw-look-card';
      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'zw-look-name';
      name.textContent = look.name || `Look ${index + 1}`;
      const sub = document.createElement('div');
      sub.className = 'zw-look-sub';
      const appearance = look.appearance || {};
      sub.textContent = `${appearance.modularTop || 'top'} · ${appearance.modularBottom || 'bottom'} · ${appearance.modularShoes || 'shoes'}`;
      info.append(name, sub);
      const actions = document.createElement('div');
      actions.className = 'zw-look-actions';
      const wear = document.createElement('button');
      wear.className = 'zw-mini-btn primary';
      wear.textContent = 'Wear';
      wear.onclick = () => this.commit((custom) => applyPlayerAppearance(custom, look.appearance));
      const remove = document.createElement('button');
      remove.className = 'zw-mini-btn';
      remove.textContent = 'Delete';
      remove.onclick = () => {
        this.state.savedOutfits.splice(index, 1);
        this.markChanged();
        this.renderPanel();
      };
      actions.append(wear, remove);
      card.append(info, actions);
      this.body.appendChild(card);
    });
  };

  render_city = () => {
    const root = section('City / Server Vibe', 'Saved with your character');
    const grid = document.createElement('div');
    grid.className = 'zw-card-grid';
    for (const entry of [
      { id: 'sunside', name: 'Sunside', info: 'Bright, busy daytime city' },
      { id: 'midnight', name: 'Midnight', info: 'Neon nightlife after dark' },
      { id: 'lowkey', name: 'Lowkey', info: 'Chill, quiet streets' },
    ]) {
      const card = itemCard(entry, this.state.server === entry.id, () => {
        this.state.server = entry.id;
        this.handlers.onServer?.(entry.id);
        this.renderPanel();
      });
      const note = document.createElement('div');
      note.className = 'zw-look-sub';
      note.textContent = entry.info;
      card.appendChild(note);
      grid.appendChild(card);
    }
    root.appendChild(grid);
    this.body.appendChild(root);
  };

  slotCards(title, slot, key) {
    const root = section(title, 'Mix and match');
    const grid = document.createElement('div');
    grid.className = 'zw-card-grid';
    for (const entry of CATALOG.slots[slot]) {
      grid.appendChild(itemCard(entry, this.custom[key] === entry.id, () => this.commit((custom) => {
        custom[key] = entry.id;
        const textureKey = key === 'modularTop' ? 'topTexture'
          : key === 'modularBottom' ? 'bottomTexture'
            : key === 'modularShoes' ? 'shoesTexture'
              : key === 'hat' ? 'hatTexture' : null;
        if (textureKey && entry.id !== 'none') {
          custom[textureKey] = variantFor(entry.id, custom[textureKey])?.id || CATALOG.variants[entry.id]?.[0]?.id;
        }
      })));
    }
    root.appendChild(grid);
    this.body.appendChild(root);
  }

  variantCards(title, group, key) {
    const entries = CATALOG.variants[group] || [];
    if (!entries.length) return;
    const root = section(title, `${entries.length} choices`);
    const grid = document.createElement('div');
    grid.className = 'zw-card-grid';
    for (const entry of entries) {
      grid.appendChild(itemCard(entry, this.custom[key] === entry.id, () => this.commit((custom) => { custom[key] = entry.id; }), { image: entry.path, swatch: entry.swatch }));
    }
    root.appendChild(grid);
    this.body.appendChild(root);
  }

  colorCards(title, entries, key) {
    const root = section(title, `${entries.length} colors`);
    const grid = document.createElement('div');
    grid.className = 'zw-card-grid';
    for (const entry of entries) {
      grid.appendChild(itemCard(entry, this.custom[key] === entry.id, () => this.commit((custom) => { custom[key] = entry.id; }), { swatch: entry.color }));
    }
    root.appendChild(grid);
    this.body.appendChild(root);
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) return;
    applyPlayerAppearance(this.custom, previous);
    this.markChanged();
    this.renderPanel();
    this.schedulePreviewUpdate();
  }

  randomize() {
    this.commit((custom) => {
      custom.skin = pick(CATALOG.skinTones).id;
      custom.heightScale = 0.86 + Math.random() * 0.28;
      custom.bodyMass = -0.65 + Math.random() * 1.3;
      custom.bodyMuscle = Math.random() * 0.9;
      custom.eyeTexture = pick(CATALOG.variants.eyes).id;
      custom.eyelashTexture = pick(CATALOG.variants.eyelashes).id;
      custom.modularHair = pick(CATALOG.slots.hair).id;
      custom.hairTexture = pick(CATALOG.variants.hair).id;
      custom.hairColor = pick(CATALOG.hairColors).id;
      custom.facialHair = pick(CATALOG.slots.facialHair).id;
      custom.modularTop = pick(CATALOG.slots.top).id;
      custom.topTexture = pick(CATALOG.variants[custom.modularTop]).id;
      custom.modularBottom = pick(CATALOG.slots.bottom).id;
      custom.bottomTexture = pick(CATALOG.variants[custom.modularBottom]).id;
      custom.modularShoes = pick(CATALOG.slots.shoes).id;
      custom.shoesTexture = pick(CATALOG.variants[custom.modularShoes]).id;
      custom.hat = pick(CATALOG.slots.hat).id;
      if (custom.hat !== 'none') custom.hatTexture = pick(CATALOG.variants[custom.hat]).id;
      custom.glasses = pick(CATALOG.slots.glasses).id;
      for (const definition of CATALOG.faceSliders) custom.faceMorphs[definition.key] = (Math.random() - 0.5) * 1.15;
    });
  }

  resetCategory() {
    this.commit((custom) => {
      if (this.activeTab === 'body') {
        for (const definition of CATALOG.bodySliders) custom[definition.key] = definition.defaultValue;
      } else if (this.activeTab === 'face') {
        for (const definition of CATALOG.faceSliders) custom.faceMorphs[definition.key] = 0;
      } else if (this.activeTab === 'skin') {
        custom.skin = CATALOG.skinTones.find((entry) => entry.id === 'umber')?.id || CATALOG.skinTones[0]?.id;
        custom.eyeTexture = 'brown02';
        custom.eyelashTexture = '01';
      } else if (this.activeTab === 'hair') {
        Object.assign(custom, { modularHair: 'crew-cut', hairTexture: 'natural', hairColor: 'jet', facialHair: 'none' });
      } else if (this.activeTab === 'clothes') {
        Object.assign(custom, { modularTop: 'tshirt', topTexture: 'white', modularBottom: 'jeans', bottomTexture: 'blue', modularShoes: 'basketball', shoesTexture: 'white' });
      } else if (this.activeTab === 'accessories') {
        Object.assign(custom, { hat: 'none', glasses: 'none', jewelry: 'none' });
      } else {
        applyPlayerAppearance(custom, PLAYER_CUSTOM_DEFAULTS);
      }
    });
  }

  saveLook() {
    const suggested = `Look ${this.state.savedOutfits.length + 1}`;
    const name = window.prompt('Name this look:', suggested)?.trim();
    if (!name) return;
    const existing = this.state.savedOutfits.find((look) => look.name.toLowerCase() === name.toLowerCase());
    const record = { id: existing?.id || `look-${Date.now()}`, name, appearance: this.snapshot(), savedAt: Date.now() };
    if (existing) Object.assign(existing, record);
    else this.state.savedOutfits.push(record);
    this.markChanged();
    this.activeTab = 'closet';
    this.renderTabs();
    this.renderPanel();
    this.framePreviewForTab();
  }

  setVisible(show) {
    this.visible = !!show;
    window.__ZW_CHARACTER_STUDIO_ACTIVE__ = this.visible;
  }

  destroy() {
    this.destroyed = true;
    window.__ZW_CHARACTER_STUDIO_ACTIVE__ = false;
    if (this.preview) {
      this.scene.remove(this.preview.group);
      disposeModularPlayerVisual(this.preview);
    }
    this.renderer?.dispose?.();
    this.renderer?.domElement?.remove?.();
    this.loading?.remove?.();
    const wrap = $('creator-canvas-wrap');
    if (wrap) delete wrap.dataset.characterStudio;
  }
}

export function mountCharacterStudio(state, handlers) {
  activeStudio?.destroy?.();
  activeStudio = new CharacterStudio(state, handlers);
  return activeStudio;
}
export function setCharacterStudioVisible(show) { activeStudio?.setVisible(show); }
export function destroyCharacterStudio() { activeStudio?.destroy?.(); activeStudio = null; }
