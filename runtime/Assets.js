/* Copyright (c) Manfred Foissner. All rights reserved. */
/* License: See LICENSE.txt in the project root. */

// ============================================================
// Assets.js - Minimal image asset loader
// ============================================================

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });
}

export const Assets = {
  images: {},
  async load() {
    const manifest = {
      player: 'assets/sprites/player.png',
      enemy: 'assets/sprites/enemy.png',
      elite: 'assets/sprites/elite.png',
      boss: 'assets/sprites/boss.png',
      obstacle: 'assets/sprites/obstacle.png',
      bg_destruction: 'assets/backgrounds/destruction.webp',
      bg_toxicity: 'assets/backgrounds/toxicity.webp',
      bg_void: 'assets/backgrounds/void.webp'
    };

    const entries = Object.entries(manifest);
    const tasks = entries.map(async ([key, src]) => {
      try {
        this.images[key] = await loadImage(src);
      } catch (e) {
        console.warn(e);
        this.images[key] = null;
      }
    });

    await Promise.all(tasks);
  },

  get(name) {
    return this.images[name] || null;
  }
};
