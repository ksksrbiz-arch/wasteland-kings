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

interface LeaderboardEntry {
  name: string;
  score: number;
  wave: number;
  kills: number;
  time: number;
  character: string;
  date: string;
}

export class GameOverScene extends Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private submitted = false;
  private leaderboardShown = false;

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

    // Submit Score button
    this.createButton(640, 430, 'SUBMIT SCORE', () => this.submitScore(data));

    // Play Again
    this.createButton(640, 490, 'PLAY AGAIN', () => {
      this.audioManager.stopMusic();
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('GameScene', { character: data.character });
    });

    // Garage
    this.createButton(640, 550, 'THE GARAGE', () => {
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('ShopScene');
    });

    // Main Menu
    this.createButton(640, 610, 'MAIN MENU', () => {
      this.audioManager.startMusic();
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('TitleScene');
    });
  }

  private async submitScore(data: GameOverData): Promise<void> {
    if (this.submitted) return;
    this.submitted = true;

    const name = prompt('Enter your name for the leaderboard (max 20 chars):', 'Wastelander') || 'Wastelander';

    const result = await this.saveManager.submitLeaderboard({
      name: name.slice(0, 20),
      score: data.scrap,
      wave: data.wave,
      kills: data.kills,
      time: data.time,
      character: data.character.id
    });

    if (result.success) {
      const msg = result.rank ? `Rank #${result.rank}!` : 'Score submitted!';
      this.add.text(640, 400, msg, {
        fontSize: '18px', fontFamily: 'Courier New', color: '#00FF00', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.showLeaderboard();
    } else {
      this.add.text(640, 400, 'OFFLINE — Score saved locally', {
        fontSize: '16px', fontFamily: 'Courier New', color: '#FFAA00'
      }).setOrigin(0.5);
    }
  }

  private async showLeaderboard(): Promise<void> {
    if (this.leaderboardShown) return;
    this.leaderboardShown = true;

    const scores = await this.saveManager.getLeaderboard(10);
    if (scores.length === 0) return;

    // Leaderboard panel
    const panel = this.add.container(1000, 360);
    const bg = this.add.rectangle(0, 0, 240, 320, 0x111111, 0.9)
      .setStrokeStyle(2, 0xFF6600);
    panel.add(bg);

    panel.add(this.add.text(0, -140, 'LEADERBOARD', {
      fontSize: '16px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5));

    scores.forEach((s, i) => {
      const y = -110 + i * 28;
      const color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#AAAAAA';
      const line = `${(i + 1).toString().padStart(2, ' ')} ${s.name.padEnd(12, ' ').slice(0, 12)} ${s.score}`;
      panel.add(this.add.text(0, y, line, {
        fontSize: '12px', fontFamily: 'Courier New', color
      }).setOrigin(0.5));
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
