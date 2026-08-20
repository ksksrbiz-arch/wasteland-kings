import { Scene } from 'phaser';
import { WEAPONS, PASSIVES, EVOLUTIONS } from '../types';
import type { WeaponData, PassiveData } from '../types';

export class UpgradeSystem {
  private scene: Scene;
  private container?: Phaser.GameObjects.Container;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  getOptions(weapons: WeaponData[], passives: PassiveData[]): { type: string; data: any }[] {
    const options: { type: string; data: any }[] = [];

    // Check for evolutions first (guaranteed if available)
    for (const weapon of weapons) {
      if (weapon.evolutionId && weapon.level >= weapon.maxLevel) {
        const hasPassive = passives.some(p => p.id === weapon.requiresPassive);
        if (hasPassive) {
          const evo = EVOLUTIONS.find(e => e.id === weapon.evolutionId);
          if (evo) {
            options.push({
              type: 'evolution',
              data: { baseId: weapon.id, evolutionId: weapon.evolutionId, name: evo.name }
            });
            return options.slice(0, 3); // Show evolution as first option
          }
        }
      }
    }

    // Weapon options
    const ownedWeaponIds = new Set(weapons.map(w => w.id));
    const availableWeapons = WEAPONS.filter(w => {
      const owned = weapons.find(ow => ow.id === w.id);
      return !owned || owned.level < owned.maxLevel;
    });

    for (let i = 0; i < 2 && availableWeapons.length > 0; i++) {
      const idx = Phaser.Math.Between(0, availableWeapons.length - 1);
      const w = availableWeapons[idx];
      const owned = weapons.find(ow => ow.id === w.id);
      options.push({
        type: 'weapon',
        data: owned || w
      });
      availableWeapons.splice(idx, 1);
    }

    // Passive options
    const availablePassives = PASSIVES.filter(p => {
      const owned = passives.find(op => op.id === p.id);
      return !owned || owned.level < owned.maxLevel;
    });

    for (let i = 0; i < 2 && availablePassives.length > 0; i++) {
      const idx = Phaser.Math.Between(0, availablePassives.length - 1);
      const p = availablePassives[idx];
      const owned = passives.find(op => op.id === p.id);
      options.push({
        type: 'passive',
        data: owned || p
      });
      availablePassives.splice(idx, 1);
    }

    // Shuffle and take 3
    Phaser.Math.RND.shuffle(options);
    return options.slice(0, 3);
  }

  show(options: { type: string; data: any }[], onSelect: (choice: { type: string; data: any }) => void): void {
    if (this.container) this.container.destroy();

    this.container = this.scene.add.container(640, 360);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    // Darken background
    const bg = this.scene.add.rectangle(0, 0, 1280, 720, 0x000000, 0.85)
      .setScrollFactor(0);
    this.container.add(bg);

    const title = this.scene.add.text(0, -200, 'LEVEL UP!', {
      fontSize: '48px', fontFamily: 'Courier New', color: '#00FF00', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.container.add(title);

    const cardWidth = 280;
    const startX = -((options.length - 1) * cardWidth) / 2;

    options.forEach((option, i) => {
      const card = this.createCard(startX + i * cardWidth, 0, option, onSelect);
      this.container!.add(card);
    });
  }

  private createCard(x: number, y: number, option: { type: string; data: any }, onSelect: (choice: { type: string; data: any }) => void): Phaser.GameObjects.Container {
    const card = this.scene.add.container(x, y);
    const isEvo = option.type === 'evolution';
    const color = isEvo ? 0x8B00FF : option.type === 'weapon' ? 0xFF6600 : 0x00AAAA;

    const bg = this.scene.add.rectangle(0, 0, 240, 320, 0x222222, 0.9)
      .setStrokeStyle(3, color);
    card.add(bg);

    const typeText = this.scene.add.text(0, -130, option.type.toUpperCase(), {
      fontSize: '14px', fontFamily: 'Courier New', color: '#888888'
    }).setOrigin(0.5);
    card.add(typeText);

    let name: string, desc: string;
    if (isEvo) {
      const evo = EVOLUTIONS.find(e => e.id === option.data.evolutionId);
      name = `★ ${evo?.name || 'EVOLUTION'}`;
      desc = evo?.description || 'Evolved weapon';
    } else if (option.type === 'weapon') {
      name = option.data.name;
      desc = option.data.description;
      if (option.data.level > 1) {
        name += ` Lv.${option.data.level}`;
      }
    } else {
      name = option.data.name;
      desc = option.data.description;
      if (option.data.level > 1) {
        name += ` Lv.${option.data.level}`;
      }
    }

    const nameText = this.scene.add.text(0, -80, name, {
      fontSize: '18px', fontFamily: 'Courier New', color: '#FFFFFF', fontStyle: 'bold', align: 'center', wordWrap: { width: 200 }
    }).setOrigin(0.5);
    card.add(nameText);

    const descText = this.scene.add.text(0, -20, desc, {
      fontSize: '14px', fontFamily: 'Courier New', color: '#AAAAAA', align: 'center', wordWrap: { width: 200 }
    }).setOrigin(0.5);
    card.add(descText);

    // Stats
    if (!isEvo && option.type === 'weapon') {
      const stats = [
        `DMG: ${Math.round(option.data.damage)}`,
        `RATE: ${(1000 / option.data.fireRate).toFixed(1)}/s`,
        `RNG: ${option.data.range}`
      ];
      stats.forEach((s, i) => {
        const t = this.scene.add.text(0, 40 + i * 20, s, {
          fontSize: '12px', fontFamily: 'Courier New', color: '#888888'
        }).setOrigin(0.5);
        card.add(t);
      });
    }

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setStrokeStyle(4, 0xFFFFFF);
      this.scene.tweens.add({ targets: card, scaleX: 1.05, scaleY: 1.05, duration: 150 });
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(3, color);
      this.scene.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 150 });
    });
    bg.on('pointerdown', () => {
      this.container?.destroy();
      this.container = undefined;
      onSelect(option);
    });

    return card;
  }
}
