import { Scene } from 'phaser';
import { ENEMIES } from '../types';
import type { EnemyType } from '../types';

export class EnemySpawner {
  private scene: Scene;
  private enemies: Phaser.Physics.Arcade.Group;
  private player: Phaser.Physics.Arcade.Sprite;
  private spawnTimer = 0;
  private eliteTimer = 0;

  constructor(scene: Scene, enemies: Phaser.Physics.Arcade.Group, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.enemies = enemies;
    this.player = player;
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
      this.updateEnemy(e as Phaser.Physics.Arcade.Sprite);
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

    // 1024px sprites: base scale 0.05, larger for tanks
    const baseScale = 0.05;
    const scale = baseScale * (type.radius / 12);
    enemy.setScale(scale);
  }

  private updateEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    if (!enemy.active) return;

    const data = enemy.getData('enemyData') as EnemyType;
    if (!data) return;

    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);

    switch (data.behavior) {
      case 'chase':
        if (dist < 800) {
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          enemy.setVelocity(Math.cos(angle) * data.speed, Math.sin(angle) * data.speed);
        }
        break;

      case 'ranged':
        if (dist < 400 && dist > 200) {
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          enemy.setVelocity(Math.cos(angle) * data.speed * 0.5, Math.sin(angle) * data.speed * 0.5);
        } else if (dist <= 200) {
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          enemy.setVelocity(-Math.cos(angle) * data.speed, -Math.sin(angle) * data.speed);
        } else {
          enemy.setVelocity(0);
        }
        break;

      case 'charge':
        if (dist < 300) {
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          enemy.setVelocity(Math.cos(angle) * data.speed * 2, Math.sin(angle) * data.speed * 2);
        } else {
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

    if (dist > 1200) {
      enemy.destroy();
    }
  }
}
