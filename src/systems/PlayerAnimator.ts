import { Scene } from 'phaser';

export class PlayerAnimator {
  private scene: Scene;
  private player: Phaser.Physics.Arcade.Sprite;

  // State
  private facingRight = true;
  private recoilTween?: Phaser.Tweens.Tween;
  private idleTween?: Phaser.Tweens.Tween;
  private dashTween?: Phaser.Tweens.Tween;
  private hitTween?: Phaser.Tweens.Tween;

  // Config – tuned for visibility at 0.12 base scale
  private readonly BASE_SCALE = 0.15;
  private readonly RECOIL_ROTATION = 12; // degrees
  private readonly RECOIL_DURATION = 90;
  private readonly HIT_SCALE_BUMP = 0.16; // temporary scale-up on hit

  constructor(scene: Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;
    this.startIdleBreathing();
  }

  update(_delta: number, vx: number, vy: number, isDashing: boolean): void {
    const isMoving = vx !== 0 || vy !== 0;

    // ── FACING ──
    // Only flip when not mid-recoil so the kick direction reads clearly
    if (vx > 0.1) this.facingRight = true;
    else if (vx < -0.1) this.facingRight = false;

    if (!this.recoilTween || !this.recoilTween.isPlaying()) {
      this.player.setFlipX(!this.facingRight);
    }

    // ── IDLE vs MOVING ──
    if (!isMoving && !isDashing) {
      if (!this.idleTween || !this.idleTween.isPlaying()) {
        this.startIdleBreathing();
      }
    } else {
      if (this.idleTween && this.idleTween.isPlaying()) {
        this.idleTween.stop();
        this.resetScale();
      }
    }
  }

  /** Triggered by WeaponSystem every time a weapon fires */
  playRecoil(aimAngle: number): void {
    if (this.recoilTween && this.recoilTween.isPlaying()) {
      this.recoilTween.stop();
    }

    // Rotate away from aim direction (opposite to where we're shooting)
    const recoilAngle = Phaser.Math.RadToDeg(aimAngle) + 180;
    const lean = Phaser.Math.Angle.ShortestBetween(
      Phaser.Math.RadToDeg(aimAngle),
      recoilAngle
    );
    const sign = this.facingRight ? -1 : 1;

    this.recoilTween = this.scene.tweens.add({
      targets: this.player,
      angle: lean * 0.3 * sign,
      scaleX: this.BASE_SCALE * 0.85,
      scaleY: this.BASE_SCALE * 1.1,
      duration: this.RECOIL_DURATION,
      yoyo: true,
      hold: 30,
      ease: 'Power2',
      onComplete: () => {
        this.player.angle = 0;
        this.resetScale();
      }
    });
  }

  /** Triggered when player takes damage */
  playHitReaction(): void {
    // Red flash
    this.player.setTint(0xFF0000);
    this.scene.time.delayedCall(150, () => {
      if (this.player.active) this.player.clearTint();
    });

    // Stop any conflicting tween
    if (this.hitTween && this.hitTween.isPlaying()) {
      this.hitTween.stop();
    }

    // Brief aggressive scale pulse + rotation wobble
    this.hitTween = this.scene.tweens.add({
      targets: this.player,
      scaleX: this.HIT_SCALE_BUMP,
      scaleY: this.HIT_SCALE_BUMP,
      angle: Phaser.Math.Between(-10, 10),
      duration: 80,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.player.angle = 0;
        this.resetScale();
      }
    });
  }

  /** Call when dash starts */
  playDashStart(directionX: number, directionY: number): void {
    if (this.idleTween && this.idleTween.isPlaying()) {
      this.idleTween.stop();
    }

    const angle = Math.atan2(directionY, directionX);
    const tiltDeg = Phaser.Math.RadToDeg(angle) * 0.25;

    if (this.dashTween && this.dashTween.isPlaying()) {
      this.dashTween.stop();
    }

    this.dashTween = this.scene.tweens.add({
      targets: this.player,
      angle: tiltDeg,
      scaleX: this.BASE_SCALE * 0.9,
      scaleY: this.BASE_SCALE * 1.15,
      alpha: 0.7,
      duration: 100,
      ease: 'Power2'
    });
  }

  /** Call when dash ends */
  playDashEnd(): void {
    if (this.dashTween && this.dashTween.isPlaying()) {
      this.dashTween.stop();
    }

    this.scene.tweens.add({
      targets: this.player,
      angle: 0,
      scaleX: this.BASE_SCALE,
      scaleY: this.BASE_SCALE,
      alpha: 1,
      duration: 120,
      ease: 'Back.easeOut'
    });
  }

  /** Face a specific angle (for aiming) */
  faceAngle(angle: number): void {
    const cos = Math.cos(angle);
    if (cos > 0.2) this.facingRight = true;
    else if (cos < -0.2) this.facingRight = false;
    this.player.setFlipX(!this.facingRight);
  }

  private startIdleBreathing(): void {
    this.idleTween = this.scene.tweens.add({
      targets: this.player,
      scaleY: { from: this.BASE_SCALE, to: this.BASE_SCALE * 1.08 },
      scaleX: { from: this.BASE_SCALE, to: this.BASE_SCALE * 0.96 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private resetScale(): void {
    this.player.setScale(this.BASE_SCALE, this.BASE_SCALE);
  }
}
