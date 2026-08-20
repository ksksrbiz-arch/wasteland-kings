import { Scene } from 'phaser';
import { SaveManager } from '../systems/SaveManager';

export class BootScene extends Scene {
  private saveManager!: SaveManager;

  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.saveManager = new SaveManager();
    this.registry.set('saveManager', this.saveManager);

    this.cameras.main.setBackgroundColor('#0a0a0a');

    const title = this.add.text(640, 280, 'WASTELAND KINGS', {
      fontSize: '64px',
      fontFamily: 'Courier New',
      color: '#ff6600',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subtitle = this.add.text(640, 360, 'INITIALIZING SYSTEMS...', {
      fontSize: '20px',
      fontFamily: 'Courier New',
      color: '#888888'
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(640, 420, 400, 12, 0x333333).setOrigin(0.5);
    const bar = this.add.rectangle(440, 420, 0, 12, 0xff6600).setOrigin(0, 0.5);

    this.tweens.add({
      targets: bar,
      width: 400,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => {
        subtitle.setText('SYSTEM READY');
        this.time.delayedCall(500, () => {
          this.scene.start('PreloadScene');
        });
      }
    });

    this.tweens.add({
      targets: title,
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: 'Power2'
    });
  }
}
