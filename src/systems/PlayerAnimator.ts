import { Scene } from 'phaser';

export class PlayerAnimator {
  private scene: Scene;
  private player: Phaser.Physics.Arcade.Sprite;

  // Animation state
  private bobTimer = 0;
  private isMoving = false;
  private facingRight = true;
  private recoilTween?: Phaser.Tweens.Tween;
  private idleTween?: Phaser.Tweens.Tween;
  private dashTiltTween?: Phaser.Tweens.Tween;

  // Config
  private readonly bobSpeed = 12; // cycles per second-ish
  private readonly bobAmount = 3; // pixels
  private readonly recoilDistance = 6;
  private readonly recoilDuration = 80;

  constructor(scene: Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;
    this.startIdleBreathing();
  }

  update(delta: number, vx: number, vy: number, isDashing: boolean): void {
    const wasMoving = this.isMoving;
    this.isMoving = vx !== 0 || vy !== 0;

    // ── FACING DIRECTION ──
    // Priority: movement direction > current facing
    if (vx > 0.1) {
      this.facingRight = true;
    } else if (vx < -0.1) {
      this.facingRight = false;
    }

    // Apply flip (only if not mid-recoil to avoid visual pop)
    if (!this.recoilTween || !this.recoilTween.isPlaying()) {
      this.player.setFlipX(!this.facingRight);
    }

    // ── MOVEMENT BOBBING ──
    if (this.isMoving && !isDashing) {
      this.bobTimer += delta / 1000;
      const bobY = Math.sin(this.bobTimer * this.bobSpeed) * this.bobAmount;
      // Apply bob as a visual offset (don't affect physics body)
      this.player.setY(this.player.y + bobY - (this.player.getData('lastBobY') || 0));
      this.player.setData('lastBobY', bobY);
    } else {
      // Reset bob offset
      const lastBob = this.player.getData('lastBobY') || 0;
      if (lastBob !== 0) {
        this.player.setY(this.player.y - lastBob);
        this.player.setData('lastBobY', 0);
      }
      this.bobTimer = 0;
    }

    // ── IDLE BREATHING ──
    if (!this.isMoving && !isDashing) {
      if (!this.idleTween || !this.idleTween.isPlaying()) {
        this.startIdleBreathing();
      }
    } else {
      if (this.idleTween && this.idleTween.isPlaying()) {
        this.idleTween.stop();
        this.player.setScale(0.12, 0.12); // Reset to base
      }
    }
  }

  /** Call when a weapon fires — triggers recoil kickback */
  playRecoil(aimAngle: number): void {
    // Cancel existing recoil
    if (this.recoilTween && this.recoilTween.isPlaying()) {
      this.recoilTween.stop();
    }

    // Determine recoil direction (opposite to aim)
    const recoilX = Math.cos(aimAngle + Math.PI) * this.recoilDistance;
    const recoilY = Math.sin(aimAngle + Math.PI) * this.recoilDistance;

    const startX = this.player.x;
    const startY = this.player.y;

    // Quick kick back
    this.player.x += recoilX;
    this.player.y += recoilY;

    // Tween back to original position
    this.recoilTween = this.scene.tweens.add({
      targets: this.player,
      x: startX,
      y: startY,
      duration: this.recoilDuration,
      ease: 'Sine.easeOut'
    });
  }

  /** Call when player takes damage */
  playHitReaction(): void {
    // Flash red
    this.player.setTint(0xFF0000);
    this.scene.time.delayedCall(120, () => {
      if (this.player.active) this.player.clearTint();
    });

    // Brief shake
    this.scene.tweens.add({
      targets: this.player,
      x: this.player.x + Phaser.Math.Between(-5, 5),
      y: this.player.y + Phaser.Math.Between(-5, 5),
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // Ensure position is clean
      }
    });
  }

  /** Call when dash starts */
  playDashStart(directionX: number, directionY: number): void {
    // Cancel idle
    if (this.idleTween && this.idleTween.isPlaying()) {
      this.idleTween.stop();
    }

    // Lean into dash direction
    const angle = Math.atan2(directionY, directionX);
    const tilt = angle * (180 / Math.PI);

    this.dashTiltTween = this.scene.tweens.add({
      targets: this.player,
      angle: tilt * 0.3, // Subtle lean, not full rotation
      scaleX: 0.10, // Stretch slightly
      scaleY: 0.14,
      duration: 100,
      ease: 'Power2'
    });
  }

  /** Call when dash ends */
  playDashEnd(): void {
    if (this.dashTiltTween && this.dashTiltTween.isPlaying()) {
      this.dashTiltTween.stop();
    }

    this.scene.tweens.add({
      targets: this.player,
      angle: 0,
      scaleX: 0.12,
      scaleY: 0.12,
      duration: 150,
      ease: 'Back.easeOut'
    });
  }

  /** Face a specific angle (for aiming at enemies) */
  faceAngle(angle: number): void {
    // Only update facing if angle is significantly left or right
    const cos = Math.cos(angle);
    if (cos > 0.2) {
      this.facingRight = true;
    } else if (cos < -0.2) {
      this.facingRight = false;
    }
    this.player.setFlipX(!this.facingRight);
  }

  private startIdleBreathing(): void {
    this.idleTween = this.scene.tweens.add({
      targets: this.player,
      scaleY: { from: 0.12, to: 0.125 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
}
