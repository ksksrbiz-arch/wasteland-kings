import { Scene } from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import type { CharacterData } from '../types';

interface GameOverData {
  won: boolean;
  wave: number;
  kills: number;
  scrap: number;
  time: number;
  character: CharacterData;
}

export class GameOverScene extends Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    this.saveManager = this.registry.get('saveManager');
    this.audioManager = this.registry.get('audioManager');

    this.cameras.main.setBackgroundColor('rgba(0,0,0,0.85)');
    this.cameras.main.fadeIn(500);

    const title = data.won ? 'VICTORY' : 'WASTED';
    const color = data.won ? '#00FF00' : '#FF0000';

    this.add.text(640, 150, title, {
      fontSize: '64px', fontFamily: 'Courier New', color, fontStyle: 'bold'
    }).setOrigin(0.5);

    const mins = Math.floor(data.time / 60);
    const secs = data.time % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const stats = [
      `RIG: ${data.character.name}`,
      `WAVE: ${data.wave}`,
      `KILLS: ${data.kills}`,
      `TIME: ${timeStr}`,
      `SCRAP: ${data.scrap}`
    ];

    stats.forEach((s, i) => {
      this.add.text(640, 240 + i * 30, s, {
        fontSize: '20px', fontFamily: 'Courier New', color: '#CCCCCC'
      }).setOrigin(0.5);
    });

    // New achievements
    const newAchieves: string[] = [];
    // Would check here but achievements already unlocked during game

    this.createButton(640, 460, 'PLAY AGAIN', () => {
      this.audioManager.stopMusic();
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('GameScene', { character: data.character });
    });

    this.createButton(640, 520, 'THE GARAGE', () => {
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('ShopScene');
    });

    this.createButton(640, 580, 'MAIN MENU', () => {
      this.audioManager.startMusic();
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('TitleScene');
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 260, 44, 0xFF6600, 0.1)
      .setStrokeStyle(2, 0xFF6600);
    const txt = this.add.text(0, 0, text, {
      fontSize: '18px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
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
    bg.on('pointerdown', callback);
  }
}
