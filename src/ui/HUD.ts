import { Scene } from 'phaser';
import type { PlayerStats } from '../types';

export class HUD {
  private scene: Scene;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBg!: Phaser.GameObjects.Rectangle;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private xpBg!: Phaser.GameObjects.Rectangle;
  private bossBar!: Phaser.GameObjects.Rectangle;
  private bossBg!: Phaser.GameObjects.Rectangle;
  private bossWarning?: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private scrapText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private weaponIcons: Phaser.GameObjects.Container[] = [];
  private damageOverlay?: Phaser.GameObjects.Rectangle;

  constructor(scene: Scene, stats: PlayerStats) {
    this.scene = scene;
    this.createHUD(stats);
  }

  private createHUD(stats: PlayerStats): void {
    // HP Bar
    this.hpBg = this.scene.add.rectangle(140, 20, 200, 16, 0x333333).setScrollFactor(0).setDepth(50);
    this.hpBar = this.scene.add.rectangle(40, 20, 200, 16, 0xFF0000).setOrigin(0, 0.5).setScrollFactor(0).setDepth(50);
    this.hpText = this.scene.add.text(140, 20, `${Math.round(stats.hp)}/${Math.round(stats.maxHp)}`, {
      fontSize: '12px', fontFamily: 'Courier New', color: '#FFFFFF'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(51);

    // XP Bar
    this.xpBg = this.scene.add.rectangle(140, 44, 200, 8, 0x333333).setScrollFactor(0).setDepth(50);
    this.xpBar = this.scene.add.rectangle(40, 44, 0, 8, 0x00FF00).setOrigin(0, 0.5).setScrollFactor(0).setDepth(50);
    this.levelText = this.scene.add.text(40, 56, 'Lv.1', {
      fontSize: '12px', fontFamily: 'Courier New', color: '#00FF00'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51);

    // Scrap
    this.scrapText = this.scene.add.text(1240, 20, '◈ 0', {
      fontSize: '18px', fontFamily: 'Courier New', color: '#FFAA00', fontStyle: 'bold'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(50);

    // Wave
    this.waveText = this.scene.add.text(1240, 44, 'WAVE 1', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#888888'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(50);

    // Time
    this.timeText = this.scene.add.text(1240, 64, '0:00', {
      fontSize: '14px', fontFamily: 'Courier New', color: '#888888'
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(50);

    // Boss bar (hidden initially)
    this.bossBg = this.scene.add.rectangle(640, 60, 400, 16, 0x333333).setScrollFactor(0).setDepth(50).setVisible(false);
    this.bossBar = this.scene.add.rectangle(440, 60, 400, 16, 0xFF0000).setOrigin(0, 0.5).setScrollFactor(0).setDepth(50).setVisible(false);

    // Damage flash overlay
    this.damageOverlay = this.scene.add.rectangle(640, 360, 1280, 720, 0xFF0000, 0)
      .setScrollFactor(0).setDepth(40);
  }

  update(hp: number, maxHp: number, xp: number, xpToLevel: number, level: number, scrap: number, wave: number, time: number): void {
    // HP
    const hpPct = Math.max(0, hp / maxHp);
    this.hpBar.setDisplaySize(200 * hpPct, 16);
    this.hpBar.setFillStyle(hpPct < 0.3 ? 0xFF0000 : hpPct < 0.6 ? 0xFFAA00 : 0x00FF00);
    this.hpText.setText(`${Math.round(hp)}/${Math.round(maxHp)}`);

    // XP
    const xpPct = Math.min(1, xp / xpToLevel);
    this.xpBar.setDisplaySize(200 * xpPct, 8);
    this.levelText.setText(`Lv.${level}`);

    // Scrap
    this.scrapText.setText(`◈ ${scrap}`);

    // Wave
    this.waveText.setText(`WAVE ${wave}`);

    // Time
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    this.timeText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
  }

  updateBossHp(hp: number, maxHp: number): void {
    if (!this.bossBar.visible) {
      this.bossBar.setVisible(true);
      this.bossBg.setVisible(true);
    }
    const pct = Math.max(0, hp / maxHp);
    this.bossBar.setDisplaySize(400 * pct, 16);
  }

  showBossWarning(): void {
    if (this.bossWarning) this.bossWarning.destroy();

    this.bossWarning = this.scene.add.text(640, 300, '⚠ BOSS APPROACHING ⚠', {
      fontSize: '36px', fontFamily: 'Courier New', color: '#FF0000', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.scene.tweens.add({
      targets: this.bossWarning,
      alpha: { from: 1, to: 0 },
      duration: 3000,
      ease: 'Power2',
      onComplete: () => this.bossWarning?.destroy()
    });

    this.scene.cameras.main.shake(1000, 0.02);
  }

  showWaveNotification(wave: number): void {
    const txt = this.scene.add.text(640, 200, `WAVE ${wave}`, {
      fontSize: '32px', fontFamily: 'Courier New', color: '#FF6600', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.scene.tweens.add({
      targets: txt,
      y: 150,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  flashDamage(): void {
    if (!this.damageOverlay) return;
    this.scene.tweens.add({
      targets: this.damageOverlay,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
      onComplete: () => this.damageOverlay?.setAlpha(0)
    });
  }

  addWeaponIcon(weaponId: string, level: number): void {
    // Implementation for showing weapon loadout in HUD
    // Simplified for now
  }
}
