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

  // Dash charges
  private dashContainer!: Phaser.GameObjects.Container;
  private dashIcons: Phaser.GameObjects.Arc[] = [];
  private dashCooldownArcs: Phaser.GameObjects.Arc[] = [];

  // Combo
  private comboText?: Phaser.GameObjects.Text;
  private comboTimer = 0;
  private comboCount = 0;

  // Minimap
  private minimapContainer?: Phaser.GameObjects.Container;
  private minimapGraphics?: Phaser.GameObjects.Graphics;
  private minimapPlayerDot?: Phaser.GameObjects.Rectangle;
  private minimapEnemyDots: Phaser.GameObjects.Rectangle[] = [];
  private showMinimap = true;
  private player?: Phaser.Physics.Arcade.Sprite;
  private enemies?: Phaser.Physics.Arcade.Group;
  private worldW = 2400;
  private worldH = 2400;
  private mapW = 160;
  private mapH = 100;

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

    // Dash charges — small cyan circles under XP bar
    this.dashContainer = this.scene.add.container(40, 72).setScrollFactor(0).setDepth(51);
    for (let i = 0; i < 2; i++) {
      const bg = this.scene.add.arc(i * 14, 0, 5, 0, 360, false, 0x004444);
      const fill = this.scene.add.arc(i * 14, 0, 5, 0, 360, false, 0x00FFFF);
      const cd = this.scene.add.arc(i * 14, 0, 5, 0, 0, false, 0x222222);
      this.dashIcons.push(fill);
      this.dashCooldownArcs.push(cd);
      this.dashContainer.add([bg, fill, cd]);
    }

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

    // Minimap
    this.createMinimap();
  }

  private createMinimap(): void {
    const mx = 40 + this.mapW / 2;
    const my = 110 + this.mapH / 2;

    this.minimapContainer = this.scene.add.container(mx, my).setScrollFactor(0).setDepth(50);

    const bg = this.scene.add.rectangle(0, 0, this.mapW, this.mapH, 0x111111, 0.7).setStrokeStyle(1, 0x444444);
    this.minimapGraphics = this.scene.add.graphics();
    this.minimapContainer.add([bg, this.minimapGraphics]);

    this.minimapPlayerDot = this.scene.add.rectangle(0, 0, 4, 4, 0x00FF00).setOrigin(0.5);
    this.minimapContainer.add(this.minimapPlayerDot);

    this.minimapContainer.setVisible(this.showMinimap);
  }

  setMinimapEnabled(enabled: boolean): void {
    this.showMinimap = enabled;
    this.minimapContainer?.setVisible(enabled);
  }

  setMinimapRefs(player: Phaser.Physics.Arcade.Sprite, enemies: Phaser.Physics.Arcade.Group): void {
    this.player = player;
    this.enemies = enemies;
  }

  update(hp: number, maxHp: number, xp: number, xpToLevel: number, level: number, scrap: number, wave: number, time: number): void {
    const hpPct = Math.max(0, hp / maxHp);
    this.hpBar.setDisplaySize(200 * hpPct, 16);
    this.hpBar.setFillStyle(hpPct < 0.3 ? 0xFF0000 : hpPct < 0.6 ? 0xFFAA00 : 0x00FF00);
    this.hpText.setText(`${Math.round(hp)}/${Math.round(maxHp)}`);

    const xpPct = Math.min(1, xp / xpToLevel);
    this.xpBar.setDisplaySize(200 * xpPct, 8);
    this.levelText.setText(`Lv.${level}`);

    this.scrapText.setText(`◈ ${scrap}`);
    this.waveText.setText(`WAVE ${wave}`);

    const mins = Math.floor(time / 60);
    const secs = time % 60;
    this.timeText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

    this.updateMinimap();
  }

  /** Call every frame from GameScene.update to animate dash cooldowns */
  updateDashCharges(available: number, cooldowns: number[], maxCharges: number): void {
    for (let i = 0; i < maxCharges; i++) {
      const ready = i < available;
      this.dashIcons[i].setVisible(ready);
      this.dashCooldownArcs[i].setVisible(!ready);
      if (!ready) {
        const pct = Math.min(1, 1 - (cooldowns[i] / 3500));
        this.dashCooldownArcs[i].setScale(pct, pct);
      }
    }
  }

  /** Call when a combo milestone is reached */
  addCombo(): void {
    this.comboCount++;
    this.comboTimer = 3000; // 3 seconds to keep combo alive

    if (this.comboText) this.comboText.destroy();

    const mult = this.getComboMultiplier();
    const color = mult >= 4 ? '#FF0000' : mult >= 3 ? '#FFAA00' : mult >= 2 ? '#00FF00' : '#AAAAAA';

    this.comboText = this.scene.add.text(640, 140, `${this.comboCount}x COMBO! +${mult}x XP`, {
      fontSize: `${20 + mult * 4}px`, fontFamily: 'Courier New', color, fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: 1.2, scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  updateCombo(delta: number): void {
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        if (this.comboText) {
          this.scene.tweens.add({
            targets: this.comboText,
            alpha: 0, y: this.comboText.y - 20,
            duration: 400,
            onComplete: () => this.comboText?.destroy()
          });
          this.comboText = undefined;
        }
      }
    }
  }

  getComboMultiplier(): number {
    if (this.comboCount >= 20) return 4;
    if (this.comboCount >= 10) return 3;
    if (this.comboCount >= 5) return 2;
    return 1;
  }

  getComboCount(): number {
    return this.comboCount;
  }

  private updateMinimap(): void {
    if (!this.showMinimap || !this.minimapGraphics || !this.player) return;

    this.minimapGraphics.clear();

    const px = (this.player.x / this.worldW) * this.mapW - this.mapW / 2;
    const py = (this.player.y / this.worldH) * this.mapH - this.mapH / 2;
    this.minimapPlayerDot!.setPosition(px, py);

    this.minimapGraphics.lineStyle(1, 0x666666);
    this.minimapGraphics.strokeRect(-this.mapW / 2, -this.mapH / 2, this.mapW, this.mapH);

    if (this.enemies) {
      this.enemies.children.each((e: any) => {
        const enemy = e as Phaser.Physics.Arcade.Sprite;
        if (!enemy.active) return true;

        const ex = (enemy.x / this.worldW) * this.mapW - this.mapW / 2;
        const ey = (enemy.y / this.worldH) * this.mapH - this.mapH / 2;

        if (ex >= -this.mapW / 2 && ex <= this.mapW / 2 && ey >= -this.mapH / 2 && ey <= this.mapH / 2) {
          const isBoss = enemy.getData('isBoss');
          const color = isBoss ? 0xFF0000 : 0xFF6600;
          const size = isBoss ? 4 : 2;
          this.minimapGraphics!.fillStyle(color, 0.8);
          this.minimapGraphics!.fillRect(ex - size / 2, ey - size / 2, size, size);
        }
        return true;
      });
    }
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
