import { Scene } from 'phaser';
import type { WeaponData, PlayerStats } from '../types';

export class WeaponSystem {
  private scene: Scene;
  private projectiles: Phaser.Physics.Arcade.Group;
  private player: Phaser.Physics.Arcade.Sprite;
  private lastFire: Map<string, number> = new Map();
  private sawBlades: Phaser.GameObjects.Image[] = [];
  private teslaArcs: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Scene, projectiles: Phaser.Physics.Arcade.Group, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.projectiles = projectiles;
    this.player = player;
  }

  update(time: number, _delta: number, weapons: WeaponData[], stats: PlayerStats, passives: any[]): void {
    for (const weapon of weapons) {
      const last = this.lastFire.get(weapon.id) || 0;
      const interval = weapon.fireRate / stats.fireRate;

      if (time - last >= interval) {
        this.lastFire.set(weapon.id, time);
        this.fire(weapon, stats, passives);
      }
    }

    this.updateSaws(time, weapons);
    this.updateTesla(time, weapons, stats);
  }

  private fire(weapon: WeaponData, stats: PlayerStats, _passives: any[]): void {
    const enemies = this.scene.physics.world.bodies.entries
      .filter((b: any) => b.gameObject?.getData?.('enemyData'))
      .map((b: any) => b.gameObject as Phaser.Physics.Arcade.Sprite)
      .filter((e: Phaser.Physics.Arcade.Sprite) => e.active);

    if (enemies.length === 0) return;

    const damage = weapon.damage * stats.damage;

    switch (weapon.id) {
      case 'scrapgun':
      case 'ripper':
        this.fireScrapgun(weapon, enemies, damage);
        break;
      case 'rocket':
      case 'hellfire':
        this.fireRocket(weapon, enemies, damage);
        break;
      case 'tesla':
      case 'stormcaller':
        break;
      case 'flame':
      case 'inferno':
        this.fireFlame(weapon, enemies, damage);
        break;
      case 'laser_cannon':
        this.fireLaserCannon(weapon, enemies, damage);
        break;
    }

    const audio = this.scene.registry.get('audioManager');
    if (weapon.id === 'rocket' || weapon.id === 'hellfire' || weapon.id === 'laser_cannon') audio.explosion();
    else if (weapon.id === 'tesla' || weapon.id === 'stormcaller') audio.tesla();
    else audio.shoot();
  }

  private fireScrapgun(weapon: WeaponData, enemies: Phaser.Physics.Arcade.Sprite[], damage: number): void {
    const count = weapon.projectileCount;
    for (let i = 0; i < count; i++) {
      const target = this.getNearestEnemy(enemies);
      if (!target) return;

      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.15 : 0;
      const finalAngle = angle + spread;

      const p = this.projectiles.get(this.player.x, this.player.y, 'bullet') as Phaser.Physics.Arcade.Sprite;
      if (!p) return;
      p.setActive(true).setVisible(true);
      p.setPosition(this.player.x, this.player.y);
      p.setData('damage', damage);
      p.setData('pierce', weapon.pierce);
      p.setVelocity(Math.cos(finalAngle) * weapon.projectileSpeed, Math.sin(finalAngle) * weapon.projectileSpeed);
    }
  }

  private fireRocket(weapon: WeaponData, enemies: Phaser.Physics.Arcade.Sprite[], damage: number): void {
    const count = weapon.projectileCount;
    for (let i = 0; i < count; i++) {
      const target = this.getNearestEnemy(enemies);
      if (!target) return;

      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
      const spread = count > 1 ? (i - (count - 1) / 2) * 0.2 : 0;

      const p = this.projectiles.get(this.player.x, this.player.y, 'rocket') as Phaser.Physics.Arcade.Sprite;
      if (!p) return;
      p.setActive(true).setVisible(true);
      p.setPosition(this.player.x, this.player.y);
      p.setData('damage', damage);
      p.setData('pierce', 0);
      p.setData('isExplosive', true);
      p.setData('explosionRadius', 80);
      p.setVelocity(Math.cos(angle + spread) * weapon.projectileSpeed, Math.sin(angle + spread) * weapon.projectileSpeed);

      this.scene.tweens.add({
        targets: p,
        x: target.x,
        y: target.y,
        duration: 1000,
        ease: 'Linear',
        onUpdate: () => {
          if (!p.active) return;
          const newTarget = this.getNearestEnemy(enemies);
          if (newTarget) {
            const a = Phaser.Math.Angle.Between(p.x, p.y, newTarget.x, newTarget.y);
            p.setVelocity(Math.cos(a) * weapon.projectileSpeed, Math.sin(a) * weapon.projectileSpeed);
          }
        }
      });
    }
  }

  private fireFlame(weapon: WeaponData, enemies: Phaser.Physics.Arcade.Sprite[], damage: number): void {
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemies[0].x, enemies[0].y);
    const arc = 0.5;
    const count = 5;

    for (let i = 0; i < count; i++) {
      const a = angle + (i - (count - 1) / 2) * (arc / count);
      const p = this.projectiles.get(this.player.x, this.player.y, 'flame') as Phaser.Physics.Arcade.Sprite;
      if (!p) return;
      p.setActive(true).setVisible(true);
      p.setPosition(this.player.x, this.player.y);
      p.setData('damage', damage);
      p.setData('pierce', 999);
      p.setData('lifespan', 500);
      p.setData('created', this.scene.time.now);
      p.setVelocity(Math.cos(a) * weapon.projectileSpeed, Math.sin(a) * weapon.projectileSpeed);
    }
  }

  private fireLaserCannon(weapon: WeaponData, enemies: Phaser.Physics.Arcade.Sprite[], damage: number): void {
    const target = this.getNearestEnemy(enemies);
    if (!target) return;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);

    const p = this.projectiles.get(this.player.x, this.player.y, 'bullet') as Phaser.Physics.Arcade.Sprite;
    if (!p) return;
    p.setActive(true).setVisible(true);
    p.setPosition(this.player.x, this.player.y);
    p.setData('damage', damage);
    p.setData('pierce', weapon.pierce);
    p.setData('isLaser', true);
    p.setTint(0xFF0000);
    p.setScale(1.5);
    p.setVelocity(Math.cos(angle) * weapon.projectileSpeed, Math.sin(angle) * weapon.projectileSpeed);

    const g = this.scene.add.graphics();
    g.lineStyle(3, 0xFF0000, 0.8);
    g.lineBetween(this.player.x, this.player.y, this.player.x + Math.cos(angle) * 30, this.player.y + Math.sin(angle) * 30);
    g.setDepth(15);
    this.scene.time.delayedCall(80, () => g.destroy());
  }

  private updateSaws(time: number, weapons: WeaponData[]): void {
    const sawWeapon = weapons.find(w => w.id === 'saw' || w.id === 'maelstrom');
    if (!sawWeapon) {
      this.sawBlades.forEach(s => s.destroy());
      this.sawBlades = [];
      return;
    }

    const count = sawWeapon.projectileCount;
    const radius = sawWeapon.range;
    const speed = sawWeapon.projectileSpeed / 100;

    while (this.sawBlades.length < count) {
      const blade = this.scene.add.image(0, 0, 'saw');
      blade.setDepth(5);
      this.sawBlades.push(blade);
    }

    this.sawBlades.forEach((blade, i) => {
      const angle = (time / 1000 * speed) + (i / count) * Math.PI * 2;
      blade.x = this.player.x + Math.cos(angle) * radius;
      blade.y = this.player.y + Math.sin(angle) * radius;
      blade.rotation = time / 200;
      blade.setVisible(true);

      const enemies = this.scene.physics.world.bodies.entries
        .filter((b: any) => b.gameObject?.getData?.('enemyData'))
        .map((b: any) => b.gameObject as Phaser.Physics.Arcade.Sprite);

      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = Phaser.Math.Distance.Between(blade.x, blade.y, enemy.x, enemy.y);
        if (dist < 30) {
          const currentHp = enemy.getData('hp') as number;
          enemy.setData('hp', currentHp - sawWeapon.damage);
          if (enemy.getData('hp') <= 0) {
            (this.scene as any).killEnemy?.(enemy);
          }
        }
      }
    });
  }

  private updateTesla(time: number, weapons: WeaponData[], stats: PlayerStats): void {
    const teslaWeapon = weapons.find(w => w.id === 'tesla' || w.id === 'stormcaller');
    if (!teslaWeapon) {
      this.teslaArcs.forEach(a => a.destroy());
      this.teslaArcs = [];
      return;
    }

    const enemies = this.scene.physics.world.bodies.entries
      .filter((b: any) => b.gameObject?.getData?.('enemyData'))
      .map((b: any) => b.gameObject as Phaser.Physics.Arcade.Sprite)
      .filter((e: Phaser.Physics.Arcade.Sprite) => e.active)
      .sort((a: Phaser.Physics.Arcade.Sprite, b: Phaser.Physics.Arcade.Sprite) =>
        Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
        Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y)
      );

    const range = teslaWeapon.range;
    const chains = teslaWeapon.pierce;
    const damage = teslaWeapon.damage * stats.damage;

    this.teslaArcs.forEach(a => a.destroy());
    this.teslaArcs = [];

    if (enemies.length === 0) return;

    const target = enemies[0];
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y);
    if (dist > range) return;

    const g = this.scene.add.graphics();
    g.lineStyle(2, 0x00FFFF, 0.8);
    g.lineBetween(this.player.x, this.player.y, target.x, target.y);
    this.teslaArcs.push(g);

    const hp = target.getData('hp') as number;
    target.setData('hp', hp - damage);
    if (target.getData('hp') <= 0) {
      (this.scene as any).killEnemy?.(target);
    }

    let lastTarget = target;
    for (let i = 1; i < chains && i < enemies.length; i++) {
      const next = enemies[i];
      const d = Phaser.Math.Distance.Between(lastTarget.x, lastTarget.y, next.x, next.y);
      if (d > range * 0.7) break;

      const chainG = this.scene.add.graphics();
      chainG.lineStyle(1, 0x00FFFF, 0.5);
      chainG.lineBetween(lastTarget.x, lastTarget.y, next.x, next.y);
      this.teslaArcs.push(chainG);

      const nhp = next.getData('hp') as number;
      next.setData('hp', nhp - damage * 0.7);
      if (next.getData('hp') <= 0) {
        (this.scene as any).killEnemy?.(next);
      }
      lastTarget = next;
    }

    this.scene.time.delayedCall(100, () => {
      this.teslaArcs.forEach(a => a.destroy());
      this.teslaArcs = [];
    });
  }

  private getNearestEnemy(enemies: Phaser.Physics.Arcade.Sprite[]): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let minDist = Infinity;
    for (const e of enemies) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }
}
