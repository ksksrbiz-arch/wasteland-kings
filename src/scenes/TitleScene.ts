import { Scene } from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { CHARACTERS } from '../types';

export class TitleScene extends Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private selectedChar: number = 0;
  private charSprites: Phaser.GameObjects.Container[] = [];
  private statTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.saveManager = this.registry.get('saveManager');
    this.audioManager = this.registry.get('audioManager');
    if (!this.audioManager) {
      this.audioManager = new AudioManager();
      this.registry.set('audioManager', this.audioManager);
    }

    // Title background
    const bg = this.add.image(640, 360, 'title_bg');
    bg.setDisplaySize(1280, 720);
    bg.setAlpha(0.7);

    this.cameras.main.fadeIn(500);

    // Animated background particles
    for (let i = 0; i < 30; i++) {
      const p = this.add.circle(
        Phaser.Math.Between(0, 1280),
        Phaser.Math.Between(0, 720),
        Phaser.Math.Between(1, 3),
        0xFF6600,
        Phaser.Math.FloatBetween(0.1, 0.4)
      );
      this.tweens.add({
        targets: p,
        y: p.y - Phaser.Math.Between(50, 200),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000)
      });
    }

    // Title
    const title = this.add.text(640, 120, 'WASTELAND', {
      fontSize: '80px', fontFamily: 'Courier New', color: '#ff6600', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    const subtitle = this.add.text(640, 200, 'KINGS', {
      fontSize: '48px', fontFamily: 'Courier New', color: '#cc4400', fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, duration: 1000, ease: 'Power2' });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 1000, delay: 300, ease: 'Power2' });

    // Character select
    this.add.text(640, 290, 'SELECT RIG', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#888888'
    }).setOrigin(0.5);

    this.createCharacterSelect();

    // Buttons
    this.createButton(640, 520, 'START RUN', () => this.startGame());
    this.createButton(640, 580, 'THE GARAGE', () => this.scene.start('ShopScene'));
    this.createButton(640, 640, 'LEADERBOARD', () => this.showLeaderboard());
    this.createButton(640, 690, 'SETTINGS', () => this.scene.start('SettingsScene'));

    // Stats
    const stats = this.saveManager.getData();
    this.add.text(20, 20, `SCRAP: ${stats.totalScrap}`, {
      fontSize: '16px', fontFamily: 'Courier New', color: '#FFAA00'
    });
    this.add.text(20, 42, `BEST WAVE: ${stats.highestWave}`, {
      fontSize: '16px', fontFamily: 'Courier New', color: '#888888'
    });
    this.add.text(20, 64, `TOTAL KILLS: ${stats.totalKills}`, {
      fontSize: '16px', fontFamily: 'Courier New', color: '#888888'
    });

    // Version
    this.add.text(1260, 700, 'v1.1', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#444444'
    }).setOrigin(1, 0.5);

    // Audio
    this.input.keyboard?.on('keydown', () => this.audioManager.resume());
    this.input.on('pointerdown', () => this.audioManager.resume());

    this.audioManager.startMusic();
  }

  private createCharacterSelect(): void {
    const startX = 340;
    const gap = 200;

    CHARACTERS.forEach((char, i) => {
      const container = this.add.container(startX + i * gap, 380);

      const bg = this.add.rectangle(0, 0, 160, 180, 0x222222, 0.5)
        .setStrokeStyle(2, i === 0 ? 0xFF6600 : 0x444444);
      container.add(bg);

      const tex = char.id === 'scrapper' ? 'player_scrapper' : `player_${char.id}`;
      const sprite = this.add.image(0, -30, tex).setScale(0.08);
      container.add(sprite);

      const name = this.add.text(0, 20, char.name, {
        fontSize: '14px', fontFamily: 'Courier New', color: '#FFFFFF'
      }).setOrigin(0.5);
      container.add(name);

      const locked = !this.saveManager.isCharacterUnlocked(char.id);
      if (locked) {
        const lock = this.add.text(0, 45, `LOCKED\n${char.unlockCost} SCRAP`, {
          fontSize: '12px', fontFamily: 'Courier New', color: '#FF4444', align: 'center'
        }).setOrigin(0.5);
        container.add(lock);
        sprite.setAlpha(0.4);
      }

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        if (!locked) bg.setStrokeStyle(2, 0xFFAA00);
      });
      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, i === this.selectedChar ? 0xFF6600 : 0x444444);
      });
      bg.on('pointerdown', () => {
        if (locked) {
          if (this.saveManager.spendScrap(char.unlockCost)) {
            this.saveManager.unlockCharacter(char.id);
            this.scene.restart();
            this.audioManager.levelUp();
          } else {
            this.tweens.add({ targets: container, x: container.x + 5, duration: 50, yoyo: true, repeat: 3 });
          }
        } else {
          this.selectedChar = i;
          this.updateSelection();
          this.audioManager.pickup();
        }
      });

      this.charSprites.push(container);
    });

    this.updateSelection();
  }

  private updateSelection(): void {
    this.charSprites.forEach((container, i) => {
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, i === this.selectedChar ? 0xFF6600 : 0x444444);
      this.tweens.add({
        targets: container,
        scaleX: i === this.selectedChar ? 1.05 : 1,
        scaleY: i === this.selectedChar ? 1.05 : 1,
        duration: 200
      });
    });

    this.statTexts.forEach(t => t.destroy());
    this.statTexts = [];

    const char = CHARACTERS[this.selectedChar];
    const stats = [
      `DMG: ${Math.round((char.stats.damage || 1) * 100)}%`,
      `SPD: ${Math.round((char.stats.speed || 1) * 100)}%`,
      `HP: ${Math.round((char.stats.maxHp || 1) * 100)}%`,
      char.startingWeapon.toUpperCase()
    ];

    stats.forEach((s, i) => {
      const t = this.add.text(640, 460 + i * 18, s, {
        fontSize: '14px', fontFamily: 'Courier New', color: '#AAAAAA'
      }).setOrigin(0.5);
      this.statTexts.push(t);
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 280, 44, 0xFF6600, 0.1)
      .setStrokeStyle(2, 0xFF6600);
    const txt = this.add.text(0, 0, text, {
      fontSize: '20px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.add([bg, txt]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(0xFF6600, 0.3);
      txt.setColor('#FFFFFF');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0xFF6600, 0.1);
      txt.setColor('#FF6600');
    });
    bg.on('pointerdown', () => {
      this.audioManager.pickup();
      callback();
    });
  }

  private async showLeaderboard(): Promise<void> {
    const scores = await this.saveManager.getLeaderboard(10);

    const panel = this.add.container(640, 360);
    const bg = this.add.rectangle(0, 0, 400, 420, 0x111111, 0.95)
      .setStrokeStyle(2, 0xFF6600);
    panel.add(bg);

    panel.add(this.add.text(0, -180, 'GLOBAL LEADERBOARD', {
      fontSize: '20px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5));

    if (scores.length === 0) {
      panel.add(this.add.text(0, 0, 'NO SCORES YET\nBE THE FIRST!', {
        fontSize: '16px', fontFamily: 'Courier New', color: '#888888', align: 'center'
      }).setOrigin(0.5));
    } else {
      scores.forEach((s, i) => {
        const y = -140 + i * 32;
        const color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#AAAAAA';
        const line = `${(i + 1).toString().padStart(2, ' ')}  ${s.name.padEnd(14, ' ').slice(0, 14)}  ${s.score.toString().padStart(5, ' ')}  W${s.wave}`;
        panel.add(this.add.text(0, y, line, {
          fontSize: '14px', fontFamily: 'Courier New', color
        }).setOrigin(0.5));
      });
    }

    const closeBtn = this.add.text(0, 180, '[ CLOSE ]', {
      fontSize: '16px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#FFFFFF'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#FF6600'));
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);

    this.audioManager.pickup();
  }

  private startGame(): void {
    this.audioManager.stopMusic();
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { character: CHARACTERS[this.selectedChar] });
    });
  }
}
