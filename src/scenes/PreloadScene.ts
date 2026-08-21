import { Scene } from 'phaser';

export class PreloadScene extends Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // ── Real pixel art assets ──
    this.load.image('title_bg', 'assets/title_bg.png');
    this.load.image('ground_tile', 'assets/ground_tile.png');

    this.load.image('player_scrapper', 'assets/player_scrapper.png');
    this.load.image('player_speedster', 'assets/player_speedster.png');
    this.load.image('player_juggernaut', 'assets/player_juggernaut.png');
    this.load.image('player_engineer', 'assets/player_engineer.png');

    this.load.image('boss', 'assets/boss_warlord.png');

    this.load.image('enemy_grunt', 'assets/enemy_grunt.png');
    this.load.image('enemy_runner', 'assets/enemy_runner.png');
    this.load.image('enemy_tank', 'assets/enemy_tank.png');
    this.load.image('enemy_ranged', 'assets/enemy_ranged.png');

    // ── Procedural fallback textures (no art yet) ──
    this.generateTextures();
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.add.text(640, 360, 'LOADING...', {
      fontSize: '24px', fontFamily: 'Courier New', color: '#ff6600'
    }).setOrigin(0.5);

    this.time.delayedCall(400, () => {
      this.scene.start('TitleScene');
    });
  }

  private generateTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Bullet
    g.clear();
    g.fillStyle(0xFFFF00);
    g.fillCircle(4, 4, 4);
    g.generateTexture('bullet', 8, 8);

    // Rocket
    g.clear();
    g.fillStyle(0xFF4444);
    g.fillRect(0, 2, 12, 6);
    g.fillStyle(0xFFAA00);
    g.fillRect(0, 3, 4, 4);
    g.generateTexture('rocket', 12, 10);

    // Saw
    g.clear();
    g.lineStyle(3, 0xCCCCCC);
    g.strokeCircle(12, 12, 10);
    g.lineStyle(2, 0x888888);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.lineBetween(12 + Math.cos(a) * 5, 12 + Math.sin(a) * 5, 12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10);
    }
    g.generateTexture('saw', 24, 24);

    // Lightning
    g.clear();
    g.lineStyle(2, 0x00FFFF);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(8, 16);
    g.lineTo(4, 16);
    g.lineTo(12, 32);
    g.strokePath();
    g.generateTexture('lightning', 16, 32);

    // Flame
    g.clear();
    g.fillStyle(0xFF4400);
    g.fillTriangle(4, 0, 0, 16, 8, 16);
    g.fillStyle(0xFFAA00);
    g.fillTriangle(4, 4, 1, 14, 7, 14);
    g.generateTexture('flame', 8, 16);

    // Pickups
    g.clear();
    g.fillStyle(0x00FF00);
    g.fillCircle(6, 6, 6);
    g.generateTexture('xp_gem', 12, 12);

    g.clear();
    g.fillStyle(0xFFAA00);
    g.fillRect(2, 2, 10, 10);
    g.generateTexture('scrap', 14, 14);

    g.clear();
    g.fillStyle(0xFF0000);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xFFFFFF);
    g.fillRect(4, 7, 8, 2);
    g.fillRect(7, 4, 2, 8);
    g.generateTexture('health', 16, 16);

    // Particles
    g.clear();
    g.fillStyle(0xFFAA00);
    g.fillCircle(2, 2, 2);
    g.generateTexture('spark', 4, 4);

    g.clear();
    g.fillStyle(0x888888);
    g.fillCircle(3, 3, 3);
    g.generateTexture('smoke', 6, 6);

    // Background elements
    g.clear();
    g.fillStyle(0x4A3728);
    g.fillTriangle(20, 0, 0, 60, 40, 60);
    g.generateTexture('rock', 40, 60);

    g.clear();
    g.fillStyle(0x8B4513);
    g.fillRect(0, 0, 8, 40);
    g.generateTexture('cactus', 8, 40);

    g.clear();
    g.fillStyle(0x5C4033);
    g.fillRect(0, 0, 60, 4);
    g.generateTexture('wreck', 60, 4);

    // UI bars
    g.clear();
    g.fillStyle(0xFF6600);
    g.fillRect(0, 0, 200, 24);
    g.generateTexture('bar_orange', 200, 24);

    g.clear();
    g.fillStyle(0x333333);
    g.fillRect(0, 0, 200, 24);
    g.generateTexture('bar_bg', 200, 24);

    g.clear();
    g.fillStyle(0x00FF00);
    g.fillRect(0, 0, 200, 24);
    g.generateTexture('bar_green', 200, 24);

    g.clear();
    g.fillStyle(0xFF0000);
    g.fillRect(0, 0, 200, 24);
    g.generateTexture('bar_red', 200, 24);

    g.clear();
    g.fillStyle(0xFFD700);
    g.fillRect(0, 0, 200, 24);
    g.generateTexture('bar_gold', 200, 24);

    // Missing enemy art — procedural fallback with outlines and detail
    const missingEnemies = [
      { id: 'charger', c: 0xDC143C, glow: 0xFF0000, shape: 'triangle' },
      { id: 'elite', c: 0xFFD700, glow: 0xFFAA00, shape: 'star' },
      { id: 'summoner', c: 0x4B0082, glow: 0x8A2BE2, shape: 'diamond' }
    ];

    for (const e of missingEnemies) {
      g.clear();
      // Outer glow ring
      g.fillStyle(e.glow, 0.4);
      if (e.shape === 'triangle') {
        g.fillTriangle(16, 2, 2, 30, 30, 30);
      } else if (e.shape === 'diamond') {
        g.fillTriangle(16, 2, 30, 16, 16, 30);
        g.fillTriangle(16, 2, 2, 16, 16, 30);
      } else if (e.shape === 'star') {
        const cx = 16, cy = 16, outerR = 14, innerR = 6;
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        g.closePath();
        g.fillPath();
      }
      // Inner body
      g.fillStyle(e.c);
      if (e.shape === 'triangle') {
        g.fillTriangle(16, 6, 6, 26, 26, 26);
        g.fillStyle(0xFFFFFF, 0.3);
        g.fillTriangle(16, 6, 11, 16, 21, 16);
      } else if (e.shape === 'diamond') {
        g.fillTriangle(16, 6, 26, 16, 16, 26);
        g.fillTriangle(16, 6, 6, 16, 16, 26);
        g.fillStyle(0xFFFFFF, 0.3);
        g.fillCircle(16, 16, 3);
      } else if (e.shape === 'star') {
        const cx = 16, cy = 16, outerR = 10, innerR = 4;
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? outerR : innerR;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          if (i === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        g.closePath();
        g.fillPath();
        g.fillStyle(0xFFFFFF, 0.4);
        g.fillCircle(16, 16, 2);
      }
      g.generateTexture(`enemy_${e.id}`, 32, 32);
    }

    // Virtual joystick
    g.clear();
    g.lineStyle(2, 0xFFFFFF, 0.3);
    g.strokeCircle(64, 64, 60);
    g.fillStyle(0xFFFFFF, 0.2);
    g.fillCircle(64, 64, 60);
    g.generateTexture('joystick_base', 128, 128);

    g.clear();
    g.fillStyle(0xFFFFFF, 0.6);
    g.fillCircle(20, 20, 20);
    g.generateTexture('joystick_stick', 40, 40);
  }
}
