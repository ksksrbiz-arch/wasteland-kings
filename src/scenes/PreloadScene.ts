import { Scene } from 'phaser';

export class PreloadScene extends Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  create(): void {
    this.generateTextures();

    this.cameras.main.setBackgroundColor('#0a0a0a');
    this.add.text(640, 360, 'GENERATING ASSETS...', {
      fontSize: '24px', fontFamily: 'Courier New', color: '#ff6600'
    }).setOrigin(0.5);

    this.time.delayedCall(800, () => {
      this.scene.start('TitleScene');
    });
  }

  private generateTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    // Player
    g.clear();
    g.fillStyle(0xCD853F);
    g.fillTriangle(16, 0, 0, 32, 32, 32);
    g.fillStyle(0xFF6600);
    g.fillRect(10, 20, 12, 8);
    g.generateTexture('player', 32, 32);

    // Speedster
    g.clear();
    g.fillStyle(0x00CED1);
    g.fillTriangle(16, 0, 0, 32, 32, 32);
    g.fillStyle(0x00FFFF);
    g.fillRect(10, 20, 12, 8);
    g.generateTexture('player_speedster', 32, 32);

    // Juggernaut
    g.clear();
    g.fillStyle(0xB22222);
    g.fillTriangle(16, 0, 0, 32, 32, 32);
    g.fillStyle(0x8B0000);
    g.fillRect(10, 20, 12, 8);
    g.generateTexture('player_juggernaut', 32, 32);

    // Engineer
    g.clear();
    g.fillStyle(0x7B68EE);
    g.fillTriangle(16, 0, 0, 32, 32, 32);
    g.fillStyle(0x9370DB);
    g.fillRect(10, 20, 12, 8);
    g.generateTexture('player_engineer', 32, 32);

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

    // Enemies
    const enemyColors = [
      { id: 'grunt', c: 0x8B4513 },
      { id: 'runner', c: 0xFF6347 },
      { id: 'tank', c: 0x556B2F },
      { id: 'ranged', c: 0x9370DB },
      { id: 'charger', c: 0xDC143C },
      { id: 'elite', c: 0xFFD700 },
      { id: 'summoner', c: 0x4B0082 }
    ];

    for (const e of enemyColors) {
      g.clear();
      g.fillStyle(e.c);
      if (e.id === 'tank') {
        g.fillRect(2, 2, 28, 28);
      } else if (e.id === 'ranged') {
        g.fillCircle(14, 14, 12);
        g.fillStyle(0xFFFFFF);
        g.fillCircle(14, 14, 4);
      } else if (e.id === 'charger') {
        g.fillTriangle(14, 0, 0, 28, 28, 28);
      } else {
        g.fillCircle(14, 14, 12);
      }
      g.generateTexture(`enemy_${e.id}`, 28, 28);
    }

    // Boss
    g.clear();
    g.fillStyle(0x8B0000);
    g.fillCircle(32, 32, 30);
    g.fillStyle(0xFF0000);
    g.fillCircle(32, 32, 20);
    g.fillStyle(0xFFFFFF);
    g.fillCircle(24, 24, 6);
    g.fillCircle(40, 24, 6);
    g.fillStyle(0x000000);
    g.fillCircle(24, 24, 3);
    g.fillCircle(40, 24, 3);
    g.lineStyle(3, 0xFF6600);
    g.strokeCircle(32, 32, 30);
    g.generateTexture('boss', 64, 64);

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

    // UI
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
