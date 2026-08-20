import { Scene } from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { UPGRADES } from '../types';

export class ShopScene extends Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private scrapText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'ShopScene' });
  }

  create(): void {
    this.saveManager = this.registry.get('saveManager');
    this.audioManager = this.registry.get('audioManager');

    this.cameras.main.setBackgroundColor('#1a0a00');
    this.cameras.main.fadeIn(300);

    this.add.text(640, 60, 'THE GARAGE', {
      fontSize: '48px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scrapText = this.add.text(640, 120, `SCRAP: ${this.saveManager.getData().totalScrap}`, {
      fontSize: '24px', fontFamily: 'Courier New', color: '#FFAA00'
    }).setOrigin(0.5);

    this.add.text(640, 160, 'PERMANENT UPGRADES', {
      fontSize: '16px', fontFamily: 'Courier New', color: '#888888'
    }).setOrigin(0.5);

    const entries = Object.entries(UPGRADES);
    const cols = 2;
    const startX = 440;
    const startY = 220;
    const colW = 400;
    const rowH = 90;

    entries.forEach(([id, upgrade], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * colW;
      const y = startY + row * rowH;
      this.createUpgradeCard(x, y, id, upgrade);
    });

    this.createButton(640, 620, 'BACK TO MENU', () => {
      this.scene.start('TitleScene');
    });
  }

  private createUpgradeCard(x: number, y: number, id: string, upgrade: typeof UPGRADES[string]): void {
    const container = this.add.container(x, y);
    const currentLvl = this.saveManager.getUpgradeLevel(id);
    const maxed = currentLvl >= upgrade.max;
    const cost = maxed ? 0 : Math.floor(upgrade.cost * Math.pow(1.5, currentLvl));

    const bg = this.add.rectangle(0, 0, 360, 70, 0x222222, 0.8)
      .setStrokeStyle(2, maxed ? 0xFFD700 : 0x444444);
    container.add(bg);

    const name = this.add.text(-160, -20, upgrade.name, {
      fontSize: '16px', fontFamily: 'Courier New', color: maxed ? '#FFD700' : '#FFFFFF', fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    container.add(name);

    const desc = this.add.text(-160, 5, `${Math.round(upgrade.perLevel * 100)}% per level`, {
      fontSize: '12px', fontFamily: 'Courier New', color: '#888888'
    }).setOrigin(0, 0.5);
    container.add(desc);

    const lvlText = this.add.text(160, -10, `Lv.${currentLvl}/${upgrade.max}`, {
      fontSize: '14px', fontFamily: 'Courier New', color: '#AAAAAA'
    }).setOrigin(1, 0.5);
    container.add(lvlText);

    if (!maxed) {
      const costText = this.add.text(160, 15, `${cost} SCRAP`, {
        fontSize: '14px', fontFamily: 'Courier New', color: this.saveManager.getData().totalScrap >= cost ? '#00FF00' : '#FF4444'
      }).setOrigin(1, 0.5);
      container.add(costText);
    } else {
      const maxText = this.add.text(160, 15, 'MAXED', {
        fontSize: '14px', fontFamily: 'Courier New', color: '#FFD700', fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      container.add(maxText);
    }

    bg.setInteractive({ useHandCursor: !maxed });
    if (!maxed) {
      bg.on('pointerover', () => bg.setStrokeStyle(2, 0xFF6600));
      bg.on('pointerout', () => bg.setStrokeStyle(2, 0x444444));
      bg.on('pointerdown', () => {
        if (this.saveManager.spendScrap(cost)) {
          this.saveManager.setUpgradeLevel(id, currentLvl + 1);
          this.audioManager.levelUp();
          this.scene.restart();
        } else {
          this.tweens.add({ targets: container, x: container.x + 5, duration: 50, yoyo: true, repeat: 3 });
        }
      });
    }
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
}
