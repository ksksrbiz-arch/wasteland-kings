import { Scene } from 'phaser';

export class PauseScene extends Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0.7)');

    this.add.text(640, 200, 'PAUSED', {
      fontSize: '48px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.createButton(640, 320, 'RESUME', () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });

    this.createButton(640, 390, 'SETTINGS', () => {
      this.scene.launch('SettingsScene');
    });

    this.createButton(640, 460, 'QUIT TO MENU', () => {
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
