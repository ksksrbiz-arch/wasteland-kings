import { Scene } from 'phaser';

export class DashSystem {
  private scene: Scene;
  private player: Phaser.Physics.Arcade.Sprite;

  private charges = 2;
  private maxCharges = 2;
  private cooldownMs = 3500;
  private chargeTimers: number[] = [0, 0];
  private isDashing = false;
  private invulnerable = false;
  private afterimages: Phaser.GameObjects.Image[] = [];
  private dashSpeedMult = 3.5;
  private dashDuration = 250; // ms
  private iFrameDuration = 300; // ms

  // Visuals
  private dashTrail?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;
    this.createTrail();
  }

  private createTrail(): void {
    // Use the player texture for afterimages
    this.dashTrail = this.scene.add.particles(0, 0, 'player_scrapper', {
      scale: { start: 0.06, end: 0 },
      alpha: { start: 0.6, end: 0 },
      lifespan: 200,
      quantity: 1,
      emitting: false,
      tint: 0xFFFFFF
    });
  }

  update(delta: number): void {
    // Recharge dashes
    for (let i = 0; i < this.maxCharges; i++) {
      if (this.chargeTimers[i] > 0) {
        this.chargeTimers[i] -= delta;
        if (this.chargeTimers[i] <= 0) {
          this.chargeTimers[i] = 0;
        }
      }
    }

    // Clean up afterimages
    this.afterimages = this.afterimages.filter(img => img.active);
  }

  canDash(): boolean {
    return !this.isDashing && this.getAvailableCharges() > 0;
  }

  getAvailableCharges(): number {
    let count = 0;
    for (let i = 0; i < this.maxCharges; i++) {
      if (this.chargeTimers[i] <= 0) count++;
    }
    return count;
  }

  getChargeCooldowns(): number[] {
    return [...this.chargeTimers];
  }

  isInvulnerable(): boolean {
    return this.invulnerable;
  }

  isCurrentlyDashing(): boolean {
    return this.isDashing;
  }

  dash(directionX: number, directionY: number): boolean {
    if (!this.canDash()) return false;

    // Consume a charge
    const chargeIdx = this.chargeTimers.findIndex(t => t <= 0);
    if (chargeIdx === -1) return false;
    this.chargeTimers[chargeIdx] = this.cooldownMs;

    this.isDashing = true;

    // Normalize direction
    const len = Math.sqrt(directionX * directionX + directionY * directionY) || 1;
    const dx = directionX / len;
    const dy = directionY / len;

    // Dash velocity
    const speed = (this.player.body?.velocity?.length?.() || 160) * this.dashSpeedMult;
    this.player.setVelocity(dx * speed, dy * speed);

    // Visual: high-contrast afterimages
    this.spawnAfterimages();

    // Visual: i-frame safety shield flash
    this.spawnIFrameShield();

    // I-frames start immediately, peak at dash apex
    this.invulnerable = true;

    // Visual: flash white
    this.player.setTint(0xFFFFFF);

    // End dash movement after short duration
    this.scene.time.delayedCall(this.dashDuration, () => {
      this.isDashing = false;
      // Keep i-frames for full window
    });

    // End i-frames
    this.scene.time.delayedCall(this.iFrameDuration, () => {
      this.invulnerable = false;
      this.player.clearTint();
    });

    // Screen shake micro-burst
    this.scene.cameras.main.shake(100, 0.005);

    return true;
  }

  private spawnAfterimages(): void {
    const tex = this.player.texture.key;
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 30, () => {
        if (!this.player.active) return;
        const ghost = this.scene.add.image(this.player.x, this.player.y, tex)
          .setScale(this.player.scaleX * 1.05, this.player.scaleY * 1.05)
          .setAlpha(0.7 - i * 0.12)
          .setTint(0xFFFFFF)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(8);
        this.afterimages.push(ghost);

        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          scaleX: this.player.scaleX * 0.6,
          scaleY: this.player.scaleY * 0.6,
          duration: 180,
          onComplete: () => ghost.destroy()
        });
      });
    }
  }

  private spawnIFrameShield(): void {
    // Bright white flash at dash start
    const flash = this.scene.add.ellipse(this.player.x, this.player.y, 70, 70, 0xFFFFFF, 0.9)
      .setDepth(12)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      onComplete: () => flash.destroy()
    });

    // Cyan safety ring that persists for the i-frame window
    const shield = this.scene.add.ellipse(this.player.x, this.player.y, 60, 60)
      .setStrokeStyle(3, 0x00FFFF, 0.9)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Track shield to player
    const tracker = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (shield.active && this.player.active) {
          shield.setPosition(this.player.x, this.player.y);
        } else {
          tracker.destroy();
        }
      }
    });

    // Fade out shield when i-frames end
    this.scene.time.delayedCall(this.iFrameDuration, () => {
      this.scene.tweens.add({
        targets: shield,
        alpha: 0,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        onComplete: () => {
          shield.destroy();
          tracker.destroy();
        }
      });
    });
  }
  getCharges(): number { return this.maxCharges; }
  getMaxCharges(): number { return this.maxCharges; }
}
