/* Copyright (c) Manfred Foissner. All rights reserved. */
/* License: See LICENSE.txt in the project root. */


function pickRange(v, rng, fallbackMin, fallbackMax) {
  // Accept scalar number or [min,max] range.
  if (Array.isArray(v) && v.length >= 2) {
    const min = Number(v[0]);
    const max = Number(v[1]);
    if (Number.isFinite(min) && Number.isFinite(max)) return rng.int(min, max);
  }
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return rng.int(fallbackMin, fallbackMax);
}

/*
Copyright (c) Manfred Foissner
See LICENSE.txt for license information.
*/
// ============================================================
// MapGenerator.js - Procedural Map Generation
// ============================================================
// Generates zones from seed + act config
// Same seed = same map layout

import { SeededRandom } from './SeededRandom.js';
import { State } from '../State.js';

export const MapGenerator = {
  
  // Generate a zone from act config and seed
  generate(actConfig, zoneSeed) {
    const rng = new SeededRandom(zoneSeed);
    const cfg = actConfig.generation || {};
    
    // Zone dimensions
    const width = pickRange(cfg.width, rng, 1500, 3000);
    const height = pickRange(cfg.height, rng, 1500, 3000);
// Generate zone structure
    const zone = {
      seed: zoneSeed,
      width: width,
      height: height,
      biome: actConfig.biome || 'space',
      
      // Spawn point (usually near edge)
      spawn: this.generateSpawnPoint(rng, width, height, cfg),
      
      // Exit point (opposite side from spawn)
      exit: null,
      
      // Enemy spawn positions
      enemySpawns: [],
      
      // Elite spawn positions  
      eliteSpawns: [],
      
      // Boss spawn (only in boss zones)
      bossSpawn: null,
      
      // Obstacles/Collision
      obstacles: [],
      
      // Decoration (asteroids, debris, etc)
      decorations: [],
      
      // Parallax layers
      parallax: this.generateParallax(rng, actConfig, width, height),
      
      // Pickups placed on map
      pickups: [],
      
      // Portals
      portals: []
    };
    
    // Generate exit opposite to spawn
    zone.exit = this.generateExitPoint(rng, zone.spawn, width, height);
    
    // Generate enemy spawns based on act config
    zone.enemySpawns = this.generateEnemySpawns(
      rng, 
      actConfig.enemies?.pool || ['grunt'],
      cfg.enemyDensity || 0.0005,
      width, 
      height,
      zone.spawn,
      zone.exit
    );
    
    // Generate elite spawns
    zone.eliteSpawns = this.generateEliteSpawns(
      rng,
      actConfig.enemies?.elitePool || ['commander'],
      cfg.eliteDensity || 0.0001,
      width,
      height
    );
    
    // Generate obstacles
    zone.obstacles = this.generateObstacles(
      rng,
      cfg.obstacleDensity || 0.0002,
      width,
      height
    );
    
    // Generate decorations
    zone.decorations = this.generateDecorations(
      rng,
      actConfig.biome,
      width,
      height
    );
    
    return zone;
  },
  
  // Generate boss zone
  generateBossZone(actConfig, zoneSeed) {
    const rng = new SeededRandom(zoneSeed);
    const cfg = actConfig.boss || {};
    
    // Boss arenas are more structured
    const width = cfg.arenaWidth || 1200;
    const height = cfg.arenaHeight || 1000;
    
    const zone = {
      seed: zoneSeed,
      width: width,
      height: height,
      biome: actConfig.biome,
      isBossZone: true,
      
      spawn: { x: width / 2, y: height - 100 },
      exit: null, // Portal appears after boss kill
      
      bossSpawn: { 
        x: width / 2, 
        y: 200,
        type: cfg.type || 'sentinel'
      },
      
      enemySpawns: [], // Boss spawns adds
      eliteSpawns: [],
      obstacles: this.generateBossArenaObstacles(rng, width, height),
      decorations: [],
      parallax: this.generateParallax(rng, actConfig, width, height),
      pickups: [],
      portals: []
    };
    
    return zone;
  },
  
  // Spawn point generation
  generateSpawnPoint(rng, w, h, cfg) {
    const edge = rng.pick(['bottom', 'left', 'right']);
    const margin = 100;
    
    switch (edge) {
      case 'bottom':
        return { x: rng.range(margin, w - margin), y: h - margin };
      case 'left':
        return { x: margin, y: rng.range(margin, h - margin) };
      case 'right':
        return { x: w - margin, y: rng.range(margin, h - margin) };
      default:
        return { x: w / 2, y: h - margin };
    }
  },
  
  // Exit point (opposite to spawn)
  generateExitPoint(rng, spawn, w, h) {
    const margin = 100;
    
    // If spawn is bottom, exit is top
    if (spawn.y > h / 2) {
      return { x: rng.range(margin, w - margin), y: margin };
    }
    // If spawn is left, exit is right
    if (spawn.x < w / 2) {
      return { x: w - margin, y: rng.range(margin, h - margin) };
    }
    // Otherwise exit is left
    return { x: margin, y: rng.range(margin, h - margin) };
  },
  
  // Enemy spawn positions
  generateEnemySpawns(rng, pool, density, w, h, spawn, exit) {
    const spawns = [];
    const count = Math.floor(w * h * density);
    const minDistFromSpawn = 300;
    const minDistFromExit = 200;
    const minDistBetween = 150;
    
    for (let i = 0; i < count * 3 && spawns.length < count; i++) {
      const x = rng.range(100, w - 100);
      const y = rng.range(100, h - 100);
      
      // Check distances
      const distSpawn = Math.hypot(x - spawn.x, y - spawn.y);
      const distExit = Math.hypot(x - exit.x, y - exit.y);
      
      if (distSpawn < minDistFromSpawn) continue;
      if (distExit < minDistFromExit) continue;
      
      // Check distance from other spawns
      let tooClose = false;
      for (const s of spawns) {
        if (Math.hypot(x - s.x, y - s.y) < minDistBetween) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      
      spawns.push({
        x: x,
        y: y,
        type: rng.pick(pool),
        patrol: rng.pick(['static', 'circle', 'line', 'wander']),
        patrolRadius: rng.int(50, 150),
        active: false,
        killed: false
      });
    }
    
    return spawns;
  },
  
  // Elite spawn positions
  generateEliteSpawns(rng, pool, density, w, h) {
    const spawns = [];
    const count = Math.max(1, Math.floor(w * h * density));
    
    for (let i = 0; i < count; i++) {
      spawns.push({
        x: rng.range(200, w - 200),
        y: rng.range(200, h - 200),
        type: rng.pick(pool),
        active: false,
        killed: false
      });
    }
    
    return spawns;
  },
  
  // Obstacles (collision)
  generateObstacles(rng, density, w, h) {
    const obstacles = [];
    const count = Math.floor(w * h * density);
    
    for (let i = 0; i < count; i++) {
      const type = rng.pick(['asteroid', 'debris', 'mine']);
      obstacles.push({
        x: rng.range(100, w - 100),
        y: rng.range(100, h - 100),
        type: type,
        radius: type === 'asteroid' ? rng.int(30, 80) : rng.int(15, 30),
        rotation: rng.range(0, Math.PI * 2),
        destructible: type !== 'mine',
        hp: type === 'asteroid' ? rng.int(20, 50) : 10
      });
    }
    
    return obstacles;
  },
  
  // Boss arena obstacles
  generateBossArenaObstacles(rng, w, h) {
    const obstacles = [];
    // Pillars for cover
    const pillarCount = rng.int(2, 4);
    
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const dist = rng.range(200, 350);
      obstacles.push({
        x: w / 2 + Math.cos(angle) * dist,
        y: h / 2 + Math.sin(angle) * dist,
        type: 'pillar',
        radius: 40,
        destructible: false
      });
    }
    
    return obstacles;
  },
  
  // Decorations (no collision, just visual)
  generateDecorations(rng, biome, w, h) {
    const decorations = [];
    const count = Math.floor(w * h * 0.001); // Sparse
    
    const types = {
      'space': ['star_cluster', 'nebula_wisp', 'dust_cloud'],
      'asteroid': ['rock_small', 'crystal', 'ice_chunk'],
      'station': ['debris', 'panel', 'wire']
    };
    
    const pool = types[biome] || types['space'];
    
    for (let i = 0; i < count; i++) {
      decorations.push({
        x: rng.range(0, w),
        y: rng.range(0, h),
        type: rng.pick(pool),
        scale: rng.range(0.5, 1.5),
        rotation: rng.range(0, Math.PI * 2),
        alpha: rng.range(0.3, 0.7)
      });
    }
    
    return decorations;
  },
  
  // Parallax layer generation
  generateParallax(rng, actConfig, w, h) {
    const cfg = actConfig.parallax || {};
    
    return {
      // Layer 0: Deep background (slowest)
      background: {
        color: cfg.bgColor || '#0a0a15',
        textureKey: cfg.bgTexture ? ('bg_' + cfg.bgTexture) : null,
        stars: this.generateStarfield(rng, w * 1.5, h * 1.5, 0.0003),
        scrollSpeed: 0.1
      },
      // Layer 1: Mid stars
      midground: {
        stars: this.generateStarfield(rng, w * 1.3, h * 1.3, 0.0002),
        scrollSpeed: 0.3
      },
      // Layer 2: Near stars/nebula
      foreground: {
        objects: this.generateNebulaWisps(rng, w, h, cfg.nebula),
        scrollSpeed: 0.6
      },
      // Layer 3: Very close particles (fastest, optional)
      particles: {
        scrollSpeed: 0.9
      }
    };
  },
  
  // Generate starfield
  generateStarfield(rng, w, h, density) {
    const stars = [];
    const count = Math.floor(w * h * density);
    
    for (let i = 0; i < count; i++) {
      stars.push({
        x: rng.range(0, w),
        y: rng.range(0, h),
        size: rng.range(0.5, 2),
        brightness: rng.range(0.3, 1),
        twinkle: rng.chance(0.3)
      });
    }
    
    return stars;
  },
  
  // Generate nebula wisps
  generateNebulaWisps(rng, w, h, nebulaConfig) {
    if (!nebulaConfig?.enabled) return [];
    
    const wisps = [];
    const count = nebulaConfig.count || rng.int(3, 8);
    const color = nebulaConfig.color || '#4400aa';
    
    for (let i = 0; i < count; i++) {
      wisps.push({
        x: rng.range(0, w),
        y: rng.range(0, h),
        width: rng.range(200, 500),
        height: rng.range(100, 300),
        color: color,
        alpha: rng.range(0.05, 0.15),
        rotation: rng.range(0, Math.PI * 2)
      });
    }
    
    return wisps;
  },
  
  // Create zone seed from act + zone index
  createZoneSeed(actSeed, zoneIndex) {
    return actSeed * 1000 + zoneIndex;
  }
};

export default MapGenerator;