/* Copyright (c) Manfred Foissner. All rights reserved. */
/* License: See LICENSE.txt in the project root. */

// ============================================================
// HitFlash.js - Screen flash/vignette feedback by damage type
// ============================================================

export const HitFlash = (() => {
  // One active flash at a time (can be extended to stack)
  let t = 0;           // remaining time (s)
  let dur = 0;         // duration (s)
  let strength = 0;    // 0..1
  let type = "unknown";

  // Damage-type presets (no hard-coded colors in game logic elsewhere)
  // Using RGBA base colors. Kept conservative to avoid eye strain.
  const PRESETS = {
    enemyBullet: { rgba: [255, 60, 60, 1], dur: 0.22, strength: 0.55 },
    bullet:      { rgba: [255, 60, 60, 1], dur: 0.22, strength: 0.55 },
    explosion:   { rgba: [255, 170, 40, 1], dur: 0.30, strength: 0.70 },
    mine:        { rgba: [255, 170, 40, 1], dur: 0.30, strength: 0.70 },
    obstacle:    { rgba: [160, 80, 255, 1], dur: 0.26, strength: 0.60 },
    contact:     { rgba: [255, 120, 255, 1], dur: 0.24, strength: 0.55 },
    unknown:     { rgba: [255, 255, 255, 1], dur: 0.20, strength: 0.35 }
  };

  function trigger(damageType = "unknown", override = null) {
    const p = override || PRESETS[damageType] || PRESETS.unknown;
    type = damageType;
    dur = p.dur;
    t = p.dur;
    strength = p.strength;
  }

  function update(dt) {
    if (t <= 0) return;
    t -= dt;
    if (t < 0) t = 0;
  }

  // Draw a subtle vignette + a quick full-screen flash
  function draw(ctx, w, h) {
    if (t <= 0) return;

    const p = PRESETS[type] || PRESETS.unknown;
    const [r, g, b] = p.rgba;

    const k = t / Math.max(0.0001, dur);     // 1..0
    // Nonlinear easing: fast hit, smooth decay
    const aFlash = strength * Math.pow(k, 0.65) * 0.55;
    const aVign  = strength * Math.pow(k, 1.35) * 0.45;

    ctx.save();

    // Full-screen flash (very subtle)
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(${r},${g},${b},${aFlash.toFixed(4)})`;
    ctx.fillRect(0, 0, w, h);

    // Vignette (darker edges tinted)
    const cx = w * 0.5, cy = h * 0.5;
    const inner = Math.min(w, h) * 0.28;
    const outer = Math.min(w, h) * 0.80;

    const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},${aVign.toFixed(4)})`);

    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  }

  return { trigger, update, draw };
})();
