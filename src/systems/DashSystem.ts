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

    // Visual: afterimages
    this.spawnAfterimages();

    // Visual: flash white
    this.player.setTint(0xFFFFFF);

    // I-frames start immediately, peak at dash apex
    this.invulnerable = true;

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
    for (let i = 0; i < 4; i++) {
      this.scene.time.delayedCall(i * 40, () => {
        if (!this.player.active) return;
        const ghost = this.scene.add.image(this.player.x, this.player.y, tex)
          .setScale(this.player.scaleX, this.player.scaleY)
          .setAlpha(0.5 - i * 0.1)
          .setTint(0x00FFFF)
          .setDepth(8);
        this.afterimages.push(ghost);

        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          scaleX: this.player.scaleX * 0.8,
          scaleY: this.player.scaleY * 0.8,
          duration: 200,
          onComplete: () => ghost.destroy()
        });
      });
    }
  }

  getCharges(): number { return this.maxCharges; }
  getMaxCharges(): number { return this.maxCharges; }
}
