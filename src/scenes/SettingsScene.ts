import { Scene } from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';

export class SettingsScene extends Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.saveManager = this.registry.get('saveManager');
    this.audioManager = this.registry.get('audioManager');

    this.cameras.main.setBackgroundColor('#1a0a00');

    this.add.text(640, 80, 'SETTINGS', {
      fontSize: '48px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5);

    const settings = this.saveManager.getSettings();

    // SFX Volume
    this.createSlider(640, 180, 'SFX VOLUME', settings.sfxVolume, (v) => {
      settings.sfxVolume = v;
      this.audioManager.setSfxVolume(v);
      this.saveManager.setSettings(settings);
    });

    // Music Volume
    this.createSlider(640, 260, 'MUSIC VOLUME', settings.musicVolume, (v) => {
      settings.musicVolume = v;
      this.audioManager.setMusicVolume(v);
      this.saveManager.setSettings(settings);
    });

    // Toggles
    this.createToggle(640, 340, 'SCREEN SHAKE', settings.screenShake, (v) => {
      settings.screenShake = v;
      this.saveManager.setSettings(settings);
    });

    this.createToggle(640, 400, 'DAMAGE NUMBERS', settings.damageNumbers, (v) => {
      settings.damageNumbers = v;
      this.saveManager.setSettings(settings);
    });

    this.createToggle(640, 460, 'MINIMAP', settings.showMinimap, (v) => {
      settings.showMinimap = v;
      this.saveManager.setSettings(settings);
    });

    // Difficulty
    this.add.text(640, 520, 'DIFFICULTY', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#888888'
    }).setOrigin(0.5);

    const diffs = ['normal', 'hard', 'nightmare'] as const;
    const diffColors = ['#00FF00', '#FFAA00', '#FF0000'];
    diffs.forEach((d, i) => {
      const btn = this.add.text(500 + i * 140, 560, d.toUpperCase(), {
        fontSize: '16px', fontFamily: 'Courier New',
        color: settings.difficulty === d ? diffColors[i] : '#444444',
        fontStyle: settings.difficulty === d ? 'bold' : 'normal'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setColor(diffColors[i]));
      btn.on('pointerout', () => btn.setColor(settings.difficulty === d ? diffColors[i] : '#444444'));
      btn.on('pointerdown', () => {
        settings.difficulty = d;
        this.saveManager.setSettings(settings);
        this.audioManager.pickup();
        this.scene.restart();
      });
    });

    // Danger zone
    this.add.text(640, 620, 'DANGER ZONE', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#FF4444'
    }).setOrigin(0.5);

    const resetBtn = this.add.text(640, 650, 'RESET ALL PROGRESS', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#FF4444'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resetBtn.on('pointerover', () => resetBtn.setColor('#FF6666'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#FF4444'));
    resetBtn.on('pointerdown', () => {
      if (confirm('DELETE ALL SAVE DATA? THIS CANNOT BE UNDONE.')) {
        this.saveManager.reset();
        this.audioManager.explosion();
        this.scene.start('BootScene');
      }
    });

    this.createButton(640, 700, 'BACK', () => {
      this.scene.stop();
      if (this.scene.isActive('PauseScene')) {
        this.scene.resume('PauseScene');
      } else {
        this.scene.start('TitleScene');
      }
    });
  }

  private createSlider(x: number, y: number, label: string, value: number, onChange: (v: number) => void): void {
    this.add.text(x, y - 20, label, {
      fontSize: '16px', fontFamily: 'Courier New', color: '#AAAAAA'
    }).setOrigin(0.5);

    const track = this.add.rectangle(x, y, 300, 8, 0x333333).setOrigin(0.5);
    const fill = this.add.rectangle(x - 150, y, 300 * value, 8, 0xFF6600).setOrigin(0, 0.5);
    const knob = this.add.circle(x - 150 + 300 * value, y, 10, 0xFF6600).setOrigin(0.5);

    knob.setInteractive({ draggable: true });
    knob.on('drag', (_: any, dragX: number) => {
      const nx = Phaser.Math.Clamp(dragX, x - 150, x + 150);
      const nv = (nx - (x - 150)) / 300;
      fill.setDisplaySize(300 * nv, 8);
      knob.x = nx;
      onChange(Math.round(nv * 100) / 100);
    });

    track.setInteractive();
    track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const nv = (pointer.x - (x - 150)) / 300;
      const clamped = Phaser.Math.Clamp(nv, 0, 1);
      fill.setDisplaySize(300 * clamped, 8);
      knob.x = x - 150 + 300 * clamped;
      onChange(Math.round(clamped * 100) / 100);
    });
  }

  private createToggle(x: number, y: number, label: string, value: boolean, onChange: (v: boolean) => void): void {
    this.add.text(x - 40, y, label, {
      fontSize: '16px', fontFamily: 'Courier New', color: '#AAAAAA'
    }).setOrigin(1, 0.5);

    const bg = this.add.rectangle(x + 20, y, 50, 24, value ? 0xFF6600 : 0x333333)
      .setStrokeStyle(2, 0x666666);
    const dot = this.add.circle(value ? x + 35 : x + 5, y, 8, 0xFFFFFF);

    const container = this.add.container(0, 0, [bg, dot]);
    const hitArea = this.add.rectangle(x + 20, y, 100, 40, 0, 0).setInteractive({ useHandCursor: true });

    hitArea.on('pointerdown', () => {
      const newVal = !value;
      onChange(newVal);
      bg.setFillStyle(newVal ? 0xFF6600 : 0x333333);
      this.tweens.add({
        targets: dot, x: newVal ? x + 35 : x + 5, duration: 150, ease: 'Power2'
      });
      this.audioManager.pickup();
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    const btn = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, 200, 40, 0xFF6600, 0.1)
      .setStrokeStyle(2, 0xFF6600);
    const txt = this.add.text(0, 0, text, {
      fontSize: '16px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
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
