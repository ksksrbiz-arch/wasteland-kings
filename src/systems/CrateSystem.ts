import { Scene } from 'phaser';
import { WEAPONS, PASSIVES } from '../types';
import type { WeaponData, PassiveData, PlayerStats } from '../types';

export interface CrateDrop {
  type: 'weapon' | 'passive' | 'temp_weapon' | 'health' | 'scrap';
  data?: WeaponData | PassiveData;
  value?: number;
  tempWeaponId?: string;
  tempWeaponDuration?: number; // seconds
}

interface ActiveCrate {
  sprite: Phaser.Physics.Arcade.Sprite;
  x: number;
  y: number;
  glow: Phaser.GameObjects.Graphics;
  channeling: boolean;
  channelProgress: number; // 0-1
  opened: boolean;
  drop: CrateDrop;
}

export class CrateSystem {
  private scene: Scene;
  private player: Phaser.Physics.Arcade.Sprite;
  private crates: ActiveCrate[] = [];
  private channelBar?: Phaser.GameObjects.Rectangle;
  private channelBg?: Phaser.GameObjects.Rectangle;
  private channelText?: Phaser.GameObjects.Text;

  // Channel time in ms
  private channelTime = 2000;

  constructor(scene: Scene, player: Phaser.Physics.Arcade.Sprite) {
    this.scene = scene;
    this.player = player;
  }

  spawnCrate(x: number, y: number): void {
    const crate = this.scene.physics.add.sprite(x, y, 'wreck') as Phaser.Physics.Arcade.Sprite;
    crate.setScale(1.5);
    crate.setDepth(4);
    crate.setTint(0xFFD700);

    // Glow effect
    const glow = this.scene.add.graphics();
    glow.setDepth(3);
    this.drawGlow(glow, x, y, 0xFFD700, 0.3);

    // Pulse tween
    this.scene.tweens.add({
      targets: crate,
      scaleX: 1.7,
      scaleY: 1.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const drop = this.generateDrop();

    this.crates.push({
      sprite: crate,
      x, y,
      glow,
      channeling: false,
      channelProgress: 0,
      opened: false,
      drop
    });
  }

  private drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number, alpha: number): void {
    g.clear();
    g.fillStyle(color, alpha);
    g.fillCircle(x, y, 40);
    g.fillStyle(color, alpha * 0.5);
    g.fillCircle(x, y, 60);
  }

  private generateDrop(): CrateDrop {
    const roll = Math.random();

    if (roll < 0.15) {
      // Temporary heavy weapon (15%)
      return {
        type: 'temp_weapon',
        tempWeaponId: 'laser_cannon',
        tempWeaponDuration: 10
      };
    } else if (roll < 0.40) {
      // Permanent weapon (25%)
      const available = WEAPONS.filter(w => w.id !== 'scrapgun');
      const weapon = available[Math.floor(Math.random() * available.length)];
      return { type: 'weapon', data: { ...weapon, level: 1 } };
    } else if (roll < 0.65) {
      // Passive stat boost (25%)
      const passive = PASSIVES[Math.floor(Math.random() * PASSIVES.length)];
      return { type: 'passive', data: { ...passive, level: 1 } };
    } else if (roll < 0.85) {
      // Health pack (20%)
      return { type: 'health', value: 30 };
    } else {
      // Scrap (15%)
      return { type: 'scrap', value: 50 };
    }
  }

  update(delta: number): CrateDrop | null {
    let openedDrop: CrateDrop | null = null;

    for (const crate of this.crates) {
      if (crate.opened) continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, crate.x, crate.y);
      const inRange = dist < 60;

      if (inRange && !crate.channeling) {
        // Start channeling
        crate.channeling = true;
        crate.channelProgress = 0;
        this.showChannelUI(crate.x, crate.y);
      } else if (!inRange && crate.channeling) {
        // Interrupt channel
        crate.channeling = false;
        crate.channelProgress = 0;
        this.hideChannelUI();
      }

      if (crate.channeling) {
        crate.channelProgress += delta / this.channelTime;

        // Update UI
        this.updateChannelUI(crate.channelProgress);

        if (crate.channelProgress >= 1) {
          // Crate opened!
          crate.opened = true;
          openedDrop = crate.drop;
          this.openCrate(crate);
          this.hideChannelUI();
        }
      }
    }

    // Clean up opened crates
    this.crates = this.crates.filter(c => {
      if (c.opened && !c.sprite.active) {
        c.glow.destroy();
        return false;
      }
      return true;
    });

    return openedDrop;
  }

  private showChannelUI(x: number, y: number): void {
    this.hideChannelUI();

    this.channelBg = this.scene.add.rectangle(x, y - 40, 60, 6, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(100);
    this.channelBar = this.scene.add.rectangle(x - 30, y - 40, 0, 6, 0x00FF00)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
    this.channelText = this.scene.add.text(x, y - 50, 'OPENING...', {
      fontSize: '10px', fontFamily: 'Courier New', color: '#FFD700'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
  }

  private updateChannelUI(progress: number): void {
    if (this.channelBar) {
      this.channelBar.setDisplaySize(60 * Math.min(progress, 1), 6);
      this.channelBar.setFillStyle(progress >= 1 ? 0x00FF00 : 0xFFD700);
    }
  }

  private hideChannelUI(): void {
    this.channelBg?.destroy();
    this.channelBar?.destroy();
    this.channelText?.destroy();
    this.channelBg = undefined;
    this.channelBar = undefined;
    this.channelText = undefined;
  }

  private openCrate(crate: ActiveCrate): void {
    // Visual explosion
    const p = this.scene.add.particles(crate.x, crate.y, 'spark', {
      speed: { min: 50, max: 200 },
      scale: { start: 1.5, end: 0 },
      lifespan: 400,
      quantity: 15,
      emitting: false
    });
    p.explode();

    // Destroy crate visuals
    crate.sprite.destroy();
    crate.glow.destroy();

    // Floating text for drop
    const label = crate.drop.type === 'weapon' ? (crate.drop.data as WeaponData)?.name :
                  crate.drop.type === 'passive' ? (crate.drop.data as PassiveData)?.name :
                  crate.drop.type === 'temp_weapon' ? 'LASER CANNON (10s)' :
                  crate.drop.type === 'health' ? '+HP' : '+SCRAP';

    const txt = this.scene.add.text(crate.x, crate.y - 20, label, {
      fontSize: '14px', fontFamily: 'Courier New', color: '#FFD700', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });
  }

  getCrates(): ActiveCrate[] {
    return this.crates;
  }

  destroy(): void {
    this.hideChannelUI();
    for (const crate of this.crates) {
      crate.sprite.destroy();
      crate.glow.destroy();
    }
    this.crates = [];
  }
}
