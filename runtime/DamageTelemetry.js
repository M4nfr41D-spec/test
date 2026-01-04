/* Copyright (c) Manfred Foissner. All rights reserved. */
/* License: See LICENSE.txt in the project root. */

// ============================================================
// DamageTelemetry.js - Player damage indicators & debugging
// ============================================================
//
// Purpose:
// - Make it immediately obvious WHAT hit the player and FROM WHERE.
// - Lightweight and safe for production (can be toggled via config later).
//
// Drawn in SCREEN SPACE (after camera transform is restored).
//
// Event schema:
// { amount, type, x, y, angle, ttl, maxTtl }
//
// type suggestions: 'enemyBullet', 'explosion', 'obstacle', 'contact', 'unknown'

import { State } from './State.js';

export const DamageTelemetry = (() => {
  const events = [];

  // Tunables (keep conservative)
  const DEFAULT_TTL = 0.75;
  const EDGE_MARGIN = 18;
  const EDGE_RADIUS_PAD = 28;

  function colorFor(type) {
    switch (type) {
      case 'enemyBullet': return '#ff3b30'; // red
      case 'explosion':   return '#ff9500'; // orange
      case 'obstacle':    return '#af52de'; // purple
      case 'contact':     return '#ffd60a'; // yellow
      default:            return '#ffffff';
    }
  }

  function labelFor(type) {
    switch (type) {
      case 'enemyBullet': return 'BULLET';
      case 'explosion':   return 'BLAST';
      case 'obstacle':    return 'HAZARD';
      case 'contact':     return 'CONTACT';
      default:            return 'HIT';
    }
  }

  function add(amount, source = {}) {
    const p = State.player;

    // Source position in WORLD coords (preferred). If only screen coords are known, caller should convert.
    const sx = Number.isFinite(source.x) ? source.x : p.x;
    const sy = Number.isFinite(source.y) ? source.y : p.y;

    const dx = sx - p.x;
    const dy = sy - p.y;
    const angle = Math.atan2(dy, dx);

    const type = source.type || 'unknown';
    const ttl = Number.isFinite(source.ttl) ? source.ttl : DEFAULT_TTL;

    events.push({
      amount: Math.max(0, Math.round(amount)),
      type,
      x: sx,
      y: sy,
      angle,
      ttl,
      maxTtl: ttl
    });

    // Keep list bounded
    if (events.length > 24) events.splice(0, events.length - 24);
  }

  function update(dt) {
    for (let i = events.length - 1; i >= 0; i--) {
      events[i].ttl -= dt;
      if (events[i].ttl <= 0) events.splice(i, 1);
    }
  }

  // Draw directional wedges + short labels + damage numbers
  function draw(ctx, screenW, screenH) {
    if (events.length === 0) return;

    const cx = screenW * 0.5;
    const cy = screenH * 0.5;
    const radius = Math.max(40, Math.min(screenW, screenH) * 0.5 - EDGE_RADIUS_PAD);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const e of events) {
      const t = Math.max(0, Math.min(1, e.ttl / e.maxTtl));
      const alpha = 0.15 + 0.85 * t;
      const col = colorFor(e.type);

      // Directional indicator at edge
      const ex = cx + Math.cos(e.angle) * radius;
      const ey = cy + Math.sin(e.angle) * radius;

      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(e.angle);
      ctx.globalAlpha = alpha;

      // Triangle wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -6);
      ctx.lineTo(-10, 6);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();

      // Small outline for readability
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.stroke();

      ctx.restore();

      // Label near the wedge
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.fillText(labelFor(e.type), ex, ey - 16);

      // Damage number closer to center (so it doesn't clutter edges)
      const dx = Math.cos(e.angle) * (radius * 0.55);
      const dy = Math.sin(e.angle) * (radius * 0.55);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 3;
      const txt = '-' + e.amount;
      ctx.strokeText(txt, cx + dx, cy + dy);
      ctx.fillText(txt, cx + dx, cy + dy);
    }

    ctx.restore();
  }

  return { add, update, draw };
})();
