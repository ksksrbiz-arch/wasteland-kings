import { Scene } from 'phaser';
import { ENEMIES } from '../types';
import type { EnemyType } from '../types';

export class EnemySpawner {
  private scene: Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private player: Phaser.Physics.Arcade.Sprite;
  private enemyProjectiles: Phaser.Physics.Arcade.Group;
  private spawnTimer = 0;
  private eliteTimer = 0;

  constructor(
    scene: Scene,
    enemies: Phaser.Physics.Arcade.Group,
    player: Phaser.Physics.Arcade.Sprite,
    enemyProjectiles: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.enemies = enemies;
    this.player = player;
    this.enemyProjectiles = enemyProjectiles;
  }

  update(time: number, delta: number, wave: number, bossSpawned: boolean): void {
    this.spawnTimer += delta;
    this.eliteTimer += delta;

    const baseInterval = Math.max(200, 1000 - wave * 40);
    const spawnCount = Math.min(5, 1 + Math.floor(wave / 3));

    if (this.spawnTimer >= baseInterval) {
      this.spawnTimer = 0;
      for (let i = 0; i < spawnCount; i++) {
        this.spawnEnemy(wave);
      }
    }

    if (this.eliteTimer >= 15000 && !bossSpawned) {
      this.eliteTimer = 0;
      this.spawnEnemyAt(this.player.x + 400, this.player.y, ENEMIES[5]);
    }

    this.enemies.children.each((e: any) => {
      this.updateEnemy(e as Phaser.Physics.Arcade.Sprite, delta);
      return true;
    });
  }

  private spawnEnemy(wave: number): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(500, 700);
    const x = this.player.x + Math.cos(angle) * dist;
    const y = this.player.y + Math.sin(angle) * dist;

    let pool: EnemyType[];
    if (wave < 3) pool = [ENEMIES[0]];
    else if (wave < 5) pool = [ENEMIES[0], ENEMIES[1]];
    else if (wave < 7) pool = [ENEMIES[0], ENEMIES[1], ENEMIES[2]];
    else if (wave < 9) pool = [ENEMIES[0], ENEMIES[1], ENEMIES[2], ENEMIES[3], ENEMIES[4]];
    else pool = ENEMIES.slice(0, 6);

    const type = Phaser.Math.RND.pick(pool);
    this.spawnEnemyAt(x, y, type, wave);
  }

  spawnEnemyAt(x: number, y: number, type: EnemyType, wave: number = 1): void {
    const tex = `enemy_${type.id}`;
    const enemy = this.scene.physics.add.sprite(x, y, tex) as Phaser.Physics.Arcade.Sprite;
    if (!enemy) return;

    const hpScale = 1 + (wave - 1) * 0.15;

    enemy.setData('enemyData', type);
    enemy.setData('hp', type.hp * hpScale);
    enemy.setData('isBoss', false);
    enemy.setDepth(5);
    this.enemies.add(enemy);

    // Attack state for telegraphs
    enemy.setData('attackTimer', 0);
    enemy.setData('attackState', 'idle'); // idle | winding | attacking
    enemy.setData('windupDuration', type.behavior === 'charge' ? 600 : type.behavior === 'ranged' ? 1200 : 0);

    // 1024px sprites: base scale 0.14 for visibility
    const baseScale = 0.14;
    const scale = baseScale * (type.radius / 12);
    enemy.setScale(scale);

    // Colored outline ring for visibility
    const outlineColor = type.color;
    const outline = this.scene.add.ellipse(x, y, 40 * scale, 40 * scale);
    outline.setStrokeStyle(2, outlineColor, 0.8);
    outline.setDepth(4);
    enemy.setData('outline', outline);

    // Dark shadow under enemy
    const shadow = this.scene.add.ellipse(x, y + 4, 30 * scale, 12 * scale, 0x000000, 0.4);
    shadow.setDepth(3);
    enemy.setData('shadow', shadow);
  }

  private updateEnemy(enemy: Phaser.Physics.Arcade.Sprite, delta: number): void {
    if (!enemy.active) return;

    const data = enemy.getData('enemyData') as EnemyType;
    if (!data) return;

    // Update outline and shadow positions
    const outline = enemy.getData('outline') as Phaser.GameObjects.Ellipse;
    const shadow = enemy.getData('shadow') as Phaser.GameObjects.Ellipse;
    if (outline) outline.setPosition(enemy.x, enemy.y);
    if (shadow) shadow.setPosition(enemy.x, enemy.y + 4 * enemy.scaleY);

    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);

    // ── ELEMENTAL STATUS EFFECTS ──
    const element = enemy.getData('element') as 'poison' | 'freeze' | 'fire' | undefined;
    let elementTimer = enemy.getData('elementTimer') as number || 0;
    if (element && elementTimer > 0) {
      elementTimer -= delta;
      enemy.setData('elementTimer', elementTimer);

      if (element === 'freeze') {
        // Visual: cyan pulse
        enemy.setAlpha(0.7 + Math.sin(this.scene.time.now * 0.01) * 0.3);
      }

      if (elementTimer <= 0) {
        // Status expired
        enemy.setData('element', undefined);
        enemy.clearTint();
        enemy.setAlpha(1);
      } else {
        // Tick damage for poison/fire
        let tickTimer = enemy.getData('elementTickTimer') as number || 0;
        tickTimer += delta;
        if (tickTimer >= 500) {
          enemy.setData('elementTickTimer', 0);
          const maxHp = data.hp;
          const dotDmg = element === 'poison' ? maxHp * 0.03 : element === 'fire' ? maxHp * 0.05 : 0;
          if (dotDmg > 0) {
            const hp = enemy.getData('hp') as number;
            enemy.setData('hp', hp - dotDmg);
            // Small floating text for DoT
            const dotTxt = this.scene.add.text(enemy.x, enemy.y - 25, Math.round(dotDmg).toString(), {
              fontSize: '10px', fontFamily: 'Courier New', color: element === 'poison' ? '#00FF00' : '#FF4500'
            }).setOrigin(0.5);
            this.scene.tweens.add({ targets: dotTxt, y: dotTxt.y - 20, alpha: 0, duration: 400, onComplete: () => dotTxt.destroy() });

            if (enemy.getData('hp') <= 0) {
              (this.scene as any).killEnemy?.(enemy);
              return;
            }
          }
        } else {
          enemy.setData('elementTickTimer', tickTimer);
        }
      }
    }

    // ── ATTACK TELEGRAPHS ──
    // Charger enemies: flash red and pause briefly before dashing
    // Ranged enemies: show aiming line before firing
    const attackState = enemy.getData('attackState') as string;
    let attackTimer = enemy.getData('attackTimer') as number;

    if (data.behavior === 'charge' && dist < 300 && attackState === 'idle') {
      // Start wind-up
      enemy.setData('attackState', 'winding');
      enemy.setData('attackTimer', 0);
      enemy.setTint(0xFF0000);
      // Brief pause before charge
      enemy.setVelocity(0);
      return; // Skip movement this frame
    }

    if (attackState === 'winding') {
      attackTimer += delta;
      enemy.setData('attackTimer', attackTimer);
      const windup = enemy.getData('windupDuration') as number;

      if (attackTimer < windup * 0.3) {
        // Still winding: flash faster
        enemy.setAlpha(0.5 + Math.sin(attackTimer * 0.02) * 0.5);
        return;
      } else if (attackTimer < windup) {
        // Telegraph: slight shake
        enemy.x += Phaser.Math.Between(-1, 1);
        return;
      } else {
        // ATTACK!
        enemy.setData('attackState', 'attacking');
        enemy.setAlpha(1);
        enemy.clearTint();
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        enemy.setVelocity(Math.cos(angle) * data.speed * 2.5, Math.sin(angle) * data.speed * 2.5);
        enemy.setData('attackTimer', 0);
      }
    }

    if (attackState === 'attacking') {
      attackTimer += delta;
      enemy.setData('attackTimer', attackTimer);
      if (attackTimer > 600) {
        // Reset to normal chase
        enemy.setData('attackState', 'idle');
      }
      // Don't override velocity during attack
    }

    // ── RANGED ENEMY PROJECTILES ──
    if (data.behavior === 'ranged' && dist < 450 && dist > 150 && attackState === 'idle') {
      attackTimer += delta;
      enemy.setData('attackTimer', attackTimer);

      if (attackTimer > 2000) {
        enemy.setData('attackTimer', 0);
        this.fireRangedProjectile(enemy);
      }

      // Kite: keep distance
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (dist < 200) {
        enemy.setVelocity(-Math.cos(angle) * data.speed, -Math.sin(angle) * data.speed);
      } else if (dist > 350) {
        enemy.setVelocity(Math.cos(angle) * data.speed * 0.5, Math.sin(angle) * data.speed * 0.5);
      } else {
        enemy.setVelocity(0);
      }
      return;
    }

    // ── NORMAL BEHAVIORS ──
    if (attackState !== 'attacking') {
      switch (data.behavior) {
        case 'chase':
          if (dist < 800) {
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            enemy.setVelocity(Math.cos(angle) * data.speed, Math.sin(angle) * data.speed);
          }
          break;

        case 'ranged':
          if (dist > 450) {
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            enemy.setVelocity(Math.cos(angle) * data.speed * 0.5, Math.sin(angle) * data.speed * 0.5);
          } else {
            enemy.setVelocity(0);
          }
          break;

        case 'charge':
          if (dist >= 300) {
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            enemy.setVelocity(Math.cos(angle) * data.speed, Math.sin(angle) * data.speed);
          }
          break;

        case 'summoner':
          enemy.setVelocity(0);
          if (Math.random() < 0.005) {
            const angle = Math.random() * Math.PI * 2;
            this.spawnEnemyAt(
              enemy.x + Math.cos(angle) * 40,
              enemy.y + Math.sin(angle) * 40,
              ENEMIES[0]
            );
          }
          break;

        case 'circle':
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          enemy.setVelocity(
            Math.cos(angle + 0.5) * data.speed,
            Math.sin(angle + 0.5) * data.speed
          );
          break;
      }
    }

    if (dist > 1200) {
      const outline = enemy.getData('outline') as Phaser.GameObjects.Ellipse;
      const shadow = enemy.getData('shadow') as Phaser.GameObjects.Ellipse;
      if (outline) outline.destroy();
      if (shadow) shadow.destroy();
      enemy.destroy();
    }
  }

  private fireRangedProjectile(enemy: Phaser.Physics.Arcade.Sprite): void {
    const p = this.enemyProjectiles.get(enemy.x, enemy.y, 'bullet') as Phaser.Physics.Arcade.Sprite;
    if (!p) return;

    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

    p.setActive(true).setVisible(true);
    p.setPosition(enemy.x, enemy.y);
    p.setTint(0xFF00FF); // Purple enemy bullets
    p.setScale(0.8);
    p.setData('damage', 12);
    p.setData('isEnemyProjectile', true);
    p.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);

    // Muzzle flash
    const flash = this.scene.add.ellipse(enemy.x, enemy.y, 12, 12, 0xFF00FF, 0.8);
    flash.setDepth(6);
    this.scene.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 150, onComplete: () => flash.destroy() });
  }
}
