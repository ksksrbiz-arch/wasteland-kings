import { PlayerAnimator } from '../systems/PlayerAnimator';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { HUD } from '../ui/HUD';
import { WeaponSystem } from '../systems/WeaponSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { UpgradeSystem } from '../systems/UpgradeSystem';
import { DashSystem } from '../systems/DashSystem';
import { CrateSystem } from '../systems/CrateSystem';
import { WEAPONS, PASSIVES, ENEMIES, EVOLUTIONS, UPGRADES, TEMP_WEAPONS } from '../types';
import type { CharacterData, WeaponData, PassiveData, EnemyType } from '../types';

interface GameSceneData {
  character: CharacterData;
}

export class GameScene extends Scene {
  private saveManager!: SaveManager;
  private audioManager!: AudioManager;
  private character!: CharacterData;
  private hud!: HUD;
  private weaponSystem!: WeaponSystem;
  private enemySpawner!: EnemySpawner;
  private upgradeSystem!: UpgradeSystem;
  private dashSystem!: DashSystem;
  private crateSystem!: CrateSystem;
  private playerAnimator!: PlayerAnimator;


  private player!: Phaser.Physics.Arcade.Sprite;
  private playerGlow!: Phaser.GameObjects.Graphics;
  private playerStats = {
    hp: 100, maxHp: 100, speed: 160, damage: 1, fireRate: 1,
    pickupRadius: 80, critChance: 0.05, critDamage: 1.5, regen: 0, armor: 0,
    xpBonus: 1, scrapBonus: 1
  };
  private xp = 0;
  private xpToLevel = 50;
  private level = 1;
  private scrap = 0;
  private wave = 1;
  private kills = 0;
  private runTime = 0;
  private damageTaken = 0;
  private isPaused = false;
  private isGameOver = false;
  private isWon = false;
  private bossSpawned = false;
  private bossDefeated = false;

  // Dash & temp weapons
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private tempWeapons: Array<{ weapon: WeaponData; timeLeft: number }> = [];

  // Biome shift
  private biomeShifted = false;
  private groundTile!: Phaser.GameObjects.TileSprite;
  private hazards: Phaser.GameObjects.Sprite[] = [];
  private hazardTimer = 0;

  // Crate timer
  private crateSpawnTimer = 0;

  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private boss?: Phaser.Physics.Arcade.Sprite;

  private weapons: WeaponData[] = [];
  private passives: PassiveData[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private joyStick?: { base: Phaser.GameObjects.Image; stick: Phaser.GameObjects.Image; active: boolean; pointer?: any };

  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private hitStopTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.character = data.character;
  }

  create(): void {
    this.saveManager = this.registry.get('saveManager');
    this.audioManager = this.registry.get('audioManager');

    const cs = this.character.stats;
    if (cs.damage) this.playerStats.damage *= cs.damage;
    if (cs.speed) this.playerStats.speed *= cs.speed;
    if (cs.maxHp) { this.playerStats.maxHp *= cs.maxHp; this.playerStats.hp = this.playerStats.maxHp; }
    if (cs.fireRate) this.playerStats.fireRate *= cs.fireRate;
    if (cs.armor) this.playerStats.armor += cs.armor;

    for (const [id, upgrade] of Object.entries(UPGRADES)) {
      const lvl = this.saveManager.getUpgradeLevel(id);
      if (lvl > 0) {
        const v = upgrade.perLevel * lvl;
        if (upgrade.stat === 'maxHp') { this.playerStats.maxHp *= (1 + v); this.playerStats.hp = this.playerStats.maxHp; }
        else if (upgrade.stat === 'damage') this.playerStats.damage *= (1 + v);
        else if (upgrade.stat === 'speed') this.playerStats.speed *= (1 + v);
        else if (upgrade.stat === 'pickupRadius') this.playerStats.pickupRadius *= (1 + v);
        else if (upgrade.stat === 'regen') this.playerStats.regen += v;
        else if (upgrade.stat === 'scrapBonus') this.playerStats.scrapBonus *= (1 + v);
        else if (upgrade.stat === 'critChance') this.playerStats.critChance += v;
        else if (upgrade.stat === 'armor') this.playerStats.armor += v;
      }
    }

    this.cameras.main.setBackgroundColor('#2d1b0e');
    this.cameras.main.setBounds(0, 0, 2400, 2400);
    this.physics.world.setBounds(0, 0, 2400, 2400);

    // Ground tile background
    this.groundTile = this.add.tileSprite(1200, 1200, 2400, 2400, 'ground_tile');
    this.groundTile.setDepth(0);
    this.groundTile.setTileScale(2, 2);

    // Scenery
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, 2400);
      const y = Phaser.Math.Between(0, 2400);
      const type = Phaser.Math.Between(0, 2);
      if (type === 0) this.add.image(x, y, 'rock').setAlpha(0.3).setScale(Phaser.Math.FloatBetween(0.5, 1.5));
      else if (type === 1) this.add.image(x, y, 'cactus').setAlpha(0.3).setScale(Phaser.Math.FloatBetween(0.8, 1.2));
      else this.add.image(x, y, 'wreck').setAlpha(0.2).setRotation(Phaser.Math.FloatBetween(0, Math.PI));
    }

    this.projectiles = this.physics.add.group({ defaultKey: 'bullet', maxSize: 300 });
    this.enemyProjectiles = this.physics.add.group({ defaultKey: 'bullet', maxSize: 100 });
    this.enemies = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    // ── PLAYER ──
    const tex = this.character.id === 'scrapper' ? 'player_scrapper' : `player_${this.character.id}`;
    this.player = this.physics.add.sprite(1200, 1200, tex);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setScale(0.12);

    // Bright outline ring
    const outlineColor = this.character.id === 'scrapper' ? 0xFFAA00 :
                         this.character.id === 'speedster' ? 0x00FFFF :
                         this.character.id === 'juggernaut' ? 0xFF4444 : 0xAA66FF;
    const playerOutline = this.add.ellipse(1200, 1200, 55, 55);
    playerOutline.setStrokeStyle(3, outlineColor, 0.9);
    playerOutline.setDepth(9);
    this.time.addEvent({
      delay: 16, loop: true,
      callback: () => { playerOutline.setPosition(this.player.x, this.player.y); }
    });

    // Pulsing inner ring
    const pulseRing = this.add.ellipse(1200, 1200, 40, 40);
    pulseRing.setStrokeStyle(2, 0xFFFFFF, 0.6);
    pulseRing.setDepth(9);
    this.tweens.add({
      targets: pulseRing,
      scaleX: 1.4, scaleY: 1.4,
      alpha: 0,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.time.addEvent({
      delay: 16, loop: true,
      callback: () => { pulseRing.setPosition(this.player.x, this.player.y); }
    });

    // Drop shadow
    const shadow = this.add.ellipse(1200, 1208, 60, 24, 0x000000, 0.5);
    shadow.setDepth(8);
    this.time.addEvent({
      delay: 16, loop: true,
      callback: () => { shadow.setPosition(this.player.x, this.player.y + 10); }
    });

    // Glow
    this.playerGlow = this.add.graphics();
    this.playerGlow.setDepth(8);
    this.drawPlayerGlow();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.particles = this.add.particles(0, 0, 'spark', {
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      lifespan: 300,
      quantity: 1,
      emitting: false
    });

    this.playerAnimator = new PlayerAnimator(this, this.player);

    this.weaponSystem = new WeaponSystem(this, this.projectiles, this.player, (aimAngle) => {
      this.playerAnimator.playRecoil(aimAngle);
    });
    this.enemySpawner = new EnemySpawner(this, this.enemies, this.player, this.enemyProjectiles);
    this.upgradeSystem = new UpgradeSystem(this);
    this.dashSystem = new DashSystem(this, this.player);
    this.crateSystem = new CrateSystem(this, this.player);
    this.hud = new HUD(this, this.playerStats);
    this.hud.setMinimapRefs(this.player, this.enemies);
    this.hud.setMinimapEnabled(this.saveManager.getSettings().showMinimap);

    const startWep = WEAPONS.find(w => w.id === this.character.startingWeapon);
    if (startWep) this.weapons.push({ ...startWep });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,S,A,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
      this.createJoystick();
    }

    this.physics.add.overlap(this.projectiles, this.enemies, this.hitEnemy as any, undefined, this);
    this.physics.add.overlap(this.player, this.enemies, this.playerHit as any, undefined, this);
    this.physics.add.overlap(this.player, this.enemyProjectiles, this.playerHitByProjectile as any, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectPickup as any, undefined, this);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, this.playerHit as any, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.collectPickup as any, undefined, this);
    this.physics.add.collider(this.enemies, this.enemies);

    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());

    this.time.addEvent({ delay: 1000, callback: this.regenTick, callbackScope: this, loop: true });
    this.time.addEvent({ delay: 1000, callback: this.secondTick, callbackScope: this, loop: true });

    this.saveManager.unlockAchievement('first_blood');
  }

  private drawPlayerGlow(): void {
    this.playerGlow.clear();
    const color = this.character.id === 'scrapper' ? 0xFF6600 :
                  this.character.id === 'speedster' ? 0x00FFFF :
                  this.character.id === 'juggernaut' ? 0xFF4444 : 0x9370DB;
    this.playerGlow.fillStyle(color, 0.25);
    this.playerGlow.fillCircle(0, 0, 45);
    this.playerGlow.fillStyle(color, 0.12);
    this.playerGlow.fillCircle(0, 0, 70);
    this.playerGlow.fillStyle(color, 0.05);
    this.playerGlow.fillCircle(0, 0, 100);
  }

  update(time: number, delta: number): void {
    if (this.isPaused || this.isGameOver) return;

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

    if (this.joyStick && this.joyStick.active) {
      const dx = this.joyStick.stick.x - this.joyStick.base.x;
      const dy = this.joyStick.stick.y - this.joyStick.base.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 10) {
        vx = dx / len;
        vy = dy / len;
      }
    }

    // Dash input
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const dashed = this.dashSystem.dash(vx, vy);
      if (dashed) {
        this.audioManager.dash();
        this.playerAnimator.playDashStart(vx || (this.player.flipX ? -1 : 1), vy);
        this.time.delayedCall(250, () => this.playerAnimator.playDashEnd());
      }
    }

    // Apply movement
    if (!this.dashSystem.isCurrentlyDashing()) {
      if (vx !== 0 || vy !== 0) {
        const len = Math.sqrt(vx * vx + vy * vy) || 1;
        this.player.setVelocity((vx / len) * this.playerStats.speed, (vy / len) * this.playerStats.speed);
      } else {
        this.player.setVelocity(0);
      }
    }
    this.dashSystem.update(delta);
    this.hud.updateDashCharges(this.dashSystem.getAvailableCharges(), this.dashSystem.getChargeCooldowns(), this.dashSystem.getMaxCharges());
    this.hud.updateCombo(delta);
    this.playerAnimator.update(delta, vx, vy, this.dashSystem.isCurrentlyDashing());
    this.playerAnimator.update(delta, vx, vy, this.dashSystem.isCurrentlyDashing());
    this.playerGlow.setPosition(this.player.x, this.player.y);
    this.updateTempWeapons(delta);

    if (this.boss && this.boss.active) this.updateBoss();

    this.projectiles.children.each((p: any) => {
      const proj = p as Phaser.Physics.Arcade.Sprite;
      if (!proj.active) return true;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, proj.x, proj.y);
      if (dist > 800) proj.destroy();
      return true;
    });

    this.enemyProjectiles.children.each((p: any) => {
      const proj = p as Phaser.Physics.Arcade.Sprite;
      if (!proj.active) return true;
});
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, proj.x, proj.y);
      if (dist > 900) proj.destroy();
      return true;

    this.pickups.children.each((p: any) => {
      const pick = p as Phaser.Physics.Arcade.Sprite;
      if (!pick.active) return true;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, pick.x, pick.y);
      if (dist < this.playerStats.pickupRadius) {
        const angle = Phaser.Math.Angle.Between(pick.x, pick.y, this.player.x, this.player.y);
        pick.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
      }
      return true;
    });

    this.enemies.children.each((e: any) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return true;
      this.updateEnemyHealthBar(enemy);
      return true;
    });

    const crateDrop = this.crateSystem.update(delta);
    if (crateDrop) {
      this.applyCrateDrop(crateDrop);
    }

    if (this.biomeShifted) {
      this.updateHazards(delta);
    }

    this.hud.update(this.playerStats.hp, this.playerStats.maxHp, this.xp, this.xpToLevel, this.level, this.scrap, this.wave, this.runTime);
  }

  private updateTempWeapons(delta: number): void {
    for (const tw of this.tempWeapons) {
      tw.timeLeft -= delta / 1000;
    }
    const expired = this.tempWeapons.filter(tw => tw.timeLeft <= 0);
    for (const tw of expired) {
      const txt = this.add.text(this.player.x, this.player.y - 30, `${tw.weapon.name} DEPLETED`, {
        fontSize: '14px', fontFamily: 'Courier New', color: '#FF4444'
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
    }
    this.tempWeapons = this.tempWeapons.filter(tw => tw.timeLeft > 0);
  }

  private applyCrateDrop(drop: import('../systems/CrateSystem').CrateDrop): void {
    switch (drop.type) {
      case 'weapon':
        if (drop.data) {
          const existing = this.weapons.find(w => w.id === drop.data!.id);
          if (existing) {
            existing.level++;
            existing.damage *= 1.2;
          } else {
            this.weapons.push({ ...drop.data as WeaponData });
          }
        }
        break;
      case 'passive':
        if (drop.data) {
          const existing = this.passives.find(p => p.id === drop.data!.id);
          if (existing) {
            existing.level++;
            this.applyPassive(existing);
          } else {
            const np = { ...drop.data as PassiveData };
            this.passives.push(np);
            this.applyPassive(np);
          }
        }
        break;
      case 'temp_weapon':
        if (drop.tempWeaponId) {
          const tempWep = TEMP_WEAPONS.find(t => t.id === drop.tempWeaponId);
          if (tempWep) {
            this.tempWeapons.push({
              weapon: {
                id: tempWep.id,
                name: tempWep.name,
                description: 'Temporary heavy weapon',
                damage: tempWep.damage,
                fireRate: tempWep.fireRate,
                range: tempWep.range,
                pierce: tempWep.pierce,
                projectileSpeed: tempWep.projectileSpeed,
                projectileCount: tempWep.projectileCount,
                level: 1,
                maxLevel: 1
              },
              timeLeft: drop.tempWeaponDuration || 10
            });
          }
        }
        break;
      case 'health':
        this.playerStats.hp = Math.min(this.playerStats.hp + (drop.value || 30), this.playerStats.maxHp);
        break;
      case 'scrap':
        this.scrap += (drop.value || 50);
        break;
    }
  }

  private createJoystick(): void {
    const base = this.add.image(120, 600, 'joystick_base').setAlpha(0.4).setScrollFactor(0).setDepth(100);
    const stick = this.add.image(120, 600, 'joystick_stick').setAlpha(0.6).setScrollFactor(0).setDepth(101);

    this.joyStick = { base, stick, active: false };

    base.setInteractive();
    this.input.on('pointerdown', (pointer: any) => {
      if (pointer.x < 400 && pointer.y > 400) {
        this.joyStick!.active = true;
        this.joyStick!.pointer = pointer;
      }
    });
    this.input.on('pointermove', (pointer: any) => {
      if (!this.joyStick || !this.joyStick.active || this.joyStick.pointer !== pointer) return;
      const maxDist = 40;
      const dx = pointer.x - base.x;
      const dy = pointer.y - base.y;
      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDist);
      const angle = Math.atan2(dy, dx);
      stick.setPosition(base.x + Math.cos(angle) * dist, base.y + Math.sin(angle) * dist);
    });
    this.input.on('pointerup', (pointer: any) => {
      if (this.joyStick && this.joyStick.pointer === pointer) {
        this.joyStick.active = false;
        stick.setPosition(base.x, base.y);
      }
    });
  }

  private createEnemyHealthBar(enemy: Phaser.Physics.Arcade.Sprite): void {
    const container = this.add.container(enemy.x, enemy.y - 30);
    const bg = this.add.rectangle(0, 0, 24, 4, 0x000000, 0.7).setOrigin(0.5);
    const bar = this.add.rectangle(-12, 0, 24, 4, 0xFF0000).setOrigin(0, 0.5);
    container.add([bg, bar]);
    container.setDepth(20);
    enemy.setData('hpBarContainer', container);
    enemy.setData('hpBar', bar);
  }

  private updateEnemyHealthBar(enemy: Phaser.Physics.Arcade.Sprite): void {
    let container = enemy.getData('hpBarContainer') as Phaser.GameObjects.Container;
    let bar = enemy.getData('hpBar') as Phaser.GameObjects.Rectangle;

    if (!container) {
      this.createEnemyHealthBar(enemy);
      container = enemy.getData('hpBarContainer');
      bar = enemy.getData('hpBar');
    }

    const data = enemy.getData('enemyData') as EnemyType;
    const hp = enemy.getData('hp') as number;
    if (!data || hp <= 0) return;

    const maxHp = data.hp;
    const pct = Math.max(0, hp / maxHp);

    const isElite = enemy.getData('isBoss') || data.id === 'elite';
    const showBar = isElite || pct < 1;
    container.setVisible(showBar);

    if (showBar) {
      container.setPosition(enemy.x, enemy.y - 30 * enemy.scaleY);
      bar.setDisplaySize(24 * pct, 4);
      bar.setFillStyle(pct < 0.3 ? 0xFF0000 : pct < 0.6 ? 0xFFAA00 : 0x00FF00);
    }
  }

  private hitEnemy(_proj: any, _enemy: any): void {
    const p = _proj as Phaser.Physics.Arcade.Sprite;
    const e = _enemy as Phaser.Physics.Arcade.Sprite;
    if (!p.active || !e.active) return;

    const data = e.getData('enemyData') as EnemyType;
    if (!data) return;

    let dmg = p.getData('damage') as number || 10;
    let isCrit = false;
    if (Math.random() < this.playerStats.critChance) {
      dmg *= this.playerStats.critDamage;
      isCrit = true;
    }

    const currentHp = e.getData('hp') as number;
    const newHp = currentHp - dmg;
    e.setData('hp', newHp);

    e.setTint(0xFFFFFF);
    this.time.delayedCall(80, () => e.clearTint());

    if (this.saveManager.getSettings().damageNumbers) {
      const color = isCrit ? '#FF0000' : '#FFFFFF';
      const size = isCrit ? '18px' : '14px';
      const txt = this.add.text(e.x, e.y - 20, Math.round(dmg).toString(), {
        fontSize: size, fontFamily: 'Courier New', color, fontStyle: isCrit ? 'bold' : 'normal'
      }).setOrigin(0.5);
      this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
    }

    this.audioManager.hit();
    this.particles.emitParticleAt(e.x, e.y, isCrit ? 5 : 2);

    const angle = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
    e.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);

    const pierce = p.getData('pierce') as number || 0;
    if (pierce <= 0) {
      p.destroy();
    } else {
      p.setData('pierce', pierce - 1);
    }

    if (newHp <= 0) {
      this.killEnemy(e);
    }
  }

  killEnemy(enemy: Phaser.Physics.Arcade.Sprite): void {
    const data = enemy.getData('enemyData') as EnemyType;
    if (!data) return;

    const hpBar = enemy.getData('hpBarContainer') as Phaser.GameObjects.Container;
    if (hpBar) hpBar.destroy();

    // Clean up enemy outline and shadow
    const outline = enemy.getData('outline') as Phaser.GameObjects.Ellipse;
    const shadow = enemy.getData('shadow') as Phaser.GameObjects.Ellipse;
    if (outline) outline.destroy();
    if (shadow) shadow.destroy();

    enemy.destroy();
    this.kills++;
    this.audioManager.kill();

    this.hud.addCombo();
    const comboMult = this.hud.getComboMultiplier();

    this.particles.emitParticleAt(enemy.x, enemy.y, 8);
    this.cameras.main.shake(50, 0.005);

    this.spawnPickup(enemy.x, enemy.y, 'scrap', scrapAmount);

    if (data.id === 'elite' && Math.random() < 0.35) {
      this.crateSystem.spawnCrate(enemy.x, enemy.y);
    }

    if (enemy.getData('isBoss')) {
      this.bossDefeated = true;
      this.audioManager.win();
      this.hitStop(500);
      this.saveManager.unlockAchievement('warlord');
      this.endGame(true);
      return;
    }
  }

  private playerHit(_player: any, _enemy: any): void {
    if (this.dashSystem.isInvulnerable()) return;

    const e = _enemy as Phaser.Physics.Arcade.Sprite;
    const data = e.getData('enemyData') as EnemyType;
    if (!data) return;

    let dmg = data.damage;
    dmg *= (1 - Math.min(this.playerStats.armor, 0.8));

    this.playerStats.hp -= dmg;
    this.damageTaken += dmg;
    this.audioManager.playerHit();

    this.playerAnimator.playHitReaction();

    const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);

    this.cameras.main.shake(100, 0.01);
    this.hud.flashDamage();

    if (this.playerStats.hp <= 0) {
      this.playerStats.hp = 0;
      this.endGame(false);
    }
  }

  private playerHitByProjectile(_player: any, _proj: any): void {
    if (this.dashSystem.isInvulnerable()) return;

    const p = _proj as Phaser.Physics.Arcade.Sprite;
    if (!p.active) return;

    let dmg = p.getData('damage') as number || 15;
    dmg *= (1 - Math.min(this.playerStats.armor, 0.8));

    this.playerStats.hp -= dmg;
    this.damageTaken += dmg;
    this.audioManager.playerHit();

    this.playerAnimator.playHitReaction();

    p.destroy();

    this.cameras.main.shake(100, 0.01);
    this.hud.flashDamage();

    if (this.playerStats.hp <= 0) {
      this.playerStats.hp = 0;
      this.endGame(false);
    }
  }

  private collectPickup(_player: any, _pickup: any): void {

    const type = p.getData('type') as string;
    const value = p.getData('value') as number;

    if (type === 'xp') {
      this.xp += value;
      this.audioManager.pickup();
      if (this.xp >= this.xpToLevel) {
        this.levelUp();
      }
    } else if (type === 'scrap') {
      this.scrap += value;
      this.audioManager.pickup();
    } else if (type === 'health') {
      this.playerStats.hp = Math.min(this.playerStats.hp + value, this.playerStats.maxHp);
      this.audioManager.pickup();
    }

    p.destroy();
  }

  private spawnPickup(x: number, y: number, type: string, value: number): void {
    const tex = type === 'xp' ? 'xp_gem' : type === 'scrap' ? 'scrap' : 'health';
    const p = this.pickups.get(x, y, tex) as Phaser.Physics.Arcade.Sprite;
    if (!p) return;
    p.setData('type', type);
    p.setData('value', value);
    p.setActive(true);
    p.setVisible(true);
    p.setPosition(x, y);
    p.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(-30, 30));
  }

  private levelUp(): void {
    this.level++;
    this.xp -= this.xpToLevel;
    this.xpToLevel = Math.floor(this.xpToLevel * 1.2);
    this.audioManager.levelUp();
    this.hitStop(200);

    if (this.level >= 5) this.saveManager.unlockAchievement('survivor');
    if (this.level >= 10) this.saveManager.unlockAchievement('veteran');

    const options = this.upgradeSystem.getOptions(this.weapons, this.passives);
    this.isPaused = true;
    this.physics.pause();
    this.upgradeSystem.show(options, (choice) => {
      this.applyUpgrade(choice);
      this.isPaused = false;
      this.physics.resume();
    });
  }

  private applyUpgrade(option: { type: string; data: any }): void {
    if (option.type === 'weapon') {
      const existing = this.weapons.find(w => w.id === option.data.id);
      if (existing) {
        existing.level++;
        existing.damage *= 1.2;
        if (existing.fireRate > 100) existing.fireRate *= 0.9;
      } else {
        this.weapons.push({ ...option.data });
      }
      if (option.data.level >= 5) this.saveManager.unlockAchievement('maxed');
    } else if (option.type === 'passive') {
      const existing = this.passives.find(p => p.id === option.data.id);
      if (existing) {
        existing.level++;
        this.applyPassive(existing);
      } else {
        const np = { ...option.data };
        this.passives.push(np);
        this.applyPassive(np);
      }
    } else if (option.type === 'evolution') {
      const idx = this.weapons.findIndex(w => w.id === option.data.baseId);
      if (idx >= 0) {
        this.weapons[idx] = { ...EVOLUTIONS.find(e => e.id === option.data.evolutionId)! };
        this.audioManager.evolution();
        this.saveManager.unlockAchievement('evolved');
      }
    }
  }

  private applyPassive(p: PassiveData): void {
    const mult = 1 + (p.value * p.level);
    if (p.stat === 'damage') this.playerStats.damage *= (1 + p.value);
    else if (p.stat === 'speed') this.playerStats.speed *= (1 + p.value);
    else if (p.stat === 'maxHp') { this.playerStats.maxHp *= (1 + p.value); this.playerStats.hp += this.playerStats.maxHp * p.value; }
    else if (p.stat === 'pickupRadius') this.playerStats.pickupRadius *= mult;
    else if (p.stat === 'fireRate') this.playerStats.fireRate *= (1 + p.value);
    else if (p.stat === 'critChance') this.playerStats.critChance += p.value;
  }

  private regenTick(): void {
    if (this.isGameOver) return;
    if (this.playerStats.regen > 0) {
      this.playerStats.hp = Math.min(this.playerStats.hp + this.playerStats.regen, this.playerStats.maxHp);
    }
  }

  private secondTick(): void {
    if (this.isGameOver || this.isPaused) return;
    this.runTime++;

    if (this.runTime % 60 === 0) {
      this.wave++;
      this.hud.showWaveNotification(this.wave);
    }

    if (this.runTime >= 540 && !this.bossSpawned) {
      this.spawnBoss();
    }

    if (this.runTime >= 300 && !this.biomeShifted) {
      this.triggerBiomeShift();
    }

    this.crateSpawnTimer++;
    if (this.crateSpawnTimer >= 45) {
      this.crateSpawnTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(400, 600);
      this.crateSystem.spawnCrate(
        this.player.x + Math.cos(angle) * dist,
        this.player.y + Math.sin(angle) * dist
      );
    }

    if (this.runTime % 30 === 0) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(100, 300);
      this.spawnPickup(
        this.player.x + Math.cos(angle) * dist,
        this.player.y + Math.sin(angle) * dist,
        'health', 20
      );
    }
  }

  private triggerBiomeShift(): void {
    this.biomeShifted = true;

    const shockwave = this.add.circle(this.player.x, this.player.y, 10, 0xFF0000, 0.8);
    shockwave.setDepth(100);
    this.tweens.add({
      targets: shockwave,
      scaleX: 200,
      scaleY: 200,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => shockwave.destroy()
    });

    this.cameras.main.shake(1000, 0.03);
    this.groundTile.setTint(0x8B0000);
    this.cameras.main.setBackgroundColor('#1a0505');

    const flash = this.add.rectangle(640, 360, 1280, 720, 0xFF0000, 0.5)
      .setScrollFactor(0).setDepth(100);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 2000,
      onComplete: () => flash.destroy()
    });

    const txt = this.add.text(640, 300, '☠ BIOME SHIFT ☠', {
      fontSize: '40px', fontFamily: 'Courier New', color: '#FF0000', fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: 250,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => txt.destroy()
    });

    this.enemies.children.each((e: any) => {
      const enemy = e as Phaser.Physics.Arcade.Sprite;
      if (enemy.active) {
        enemy.setTint(0xFF4444);
        enemy.setData('biomeBoosted', true);
      }
      return true;
    });

    for (let i = 0; i < 5; i++) {
      this.spawnHazard();
    }
  }

  private spawnHazard(): void {
    const hx = Phaser.Math.Between(200, 2200);
    const hy = Phaser.Math.Between(200, 2200);

    const type = Math.random() < 0.5 ? 'geyser' : 'toxic';

    if (type === 'geyser') {
      const geyser = this.physics.add.sprite(hx, hy, 'rock') as Phaser.Physics.Arcade.Sprite;
      geyser.setTint(0xFF4500);
      geyser.setScale(1.2);
      geyser.setDepth(4);
      geyser.setData('hazardType', 'geyser');
      geyser.setData('eruptTimer', 0);
      this.hazards.push(geyser);

      this.tweens.add({
        targets: geyser,
        alpha: { from: 0.5, to: 1 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    } else {
      const cloud = this.physics.add.sprite(hx, hy, 'cactus') as Phaser.Physics.Arcade.Sprite;
      cloud.setTint(0x00FF00);
      cloud.setAlpha(0.4);
      cloud.setScale(2);
      cloud.setDepth(4);
      cloud.setData('hazardType', 'toxic');
      this.hazards.push(cloud);

      this.tweens.add({
        targets: cloud,
        scaleX: 2.5,
        scaleY: 2.5,
        alpha: { from: 0.3, to: 0.5 },
        duration: 2000,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private updateHazards(delta: number): void {
    this.hazardTimer += delta;

    if (this.hazardTimer > 10000) {
      this.hazardTimer = 0;
      this.spawnHazard();
    }

    for (const hazard of this.hazards) {
      if (!hazard.active) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y);

      if (hazard.getData('hazardType') === 'geyser') {
        let timer = hazard.getData('eruptTimer') as number;
        timer += delta;
        hazard.setData('eruptTimer', timer);

        if (timer > 3000) {
          hazard.setData('eruptTimer', 0);
          if (dist < 50 && !this.dashSystem.isInvulnerable()) {
            this.playerStats.hp -= 15;
            this.hud.flashDamage();
            this.player.setVelocity(
              (this.player.x - hazard.x) * 5,
              (this.player.y - hazard.y) * 5
            );
          }
          this.particles.emitParticleAt(hazard.x, hazard.y, 10);
        }
      } else if (hazard.getData('hazardType') === 'toxic') {
        if (dist < 60 && !this.dashSystem.isInvulnerable()) {
          if (this.hazardTimer % 1000 < delta) {
            this.playerStats.hp -= 5;
            this.hud.flashDamage();
          }
        }
      }
    }

    this.hazards = this.hazards.filter(h => h.active);
  }

  private spawnBoss(): void {
    this.bossSpawned = true;
    this.audioManager.bossRoar();

    const angle = Math.random() * Math.PI * 2;
    const bx = this.player.x + Math.cos(angle) * 600;
    const by = this.player.y + Math.sin(angle) * 600;

    this.boss = this.physics.add.sprite(bx, by, 'boss');
    this.boss.setData('enemyData', { id: 'boss', hp: 3000, speed: 60, damage: 40, xp: 500, scrap: 200, radius: 32, color: 0x8B0000, behavior: 'charge', mass: 10 });
    this.boss.setData('hp', 3000);
    this.boss.setData('isBoss', true);
    this.boss.setData('phase', 1);
    this.boss.setData('chargeTimer', 0);
    this.boss.setData('summonTimer', 0);
    this.boss.setScale(0.12);
    this.enemies.add(this.boss);

    this.hud.showBossWarning();
    this.cameras.main.shake(500, 0.02);
  }

  private updateBoss(): void {
    if (!this.boss || !this.boss.active) return;

    const hp = this.boss.getData('hp') as number;
    const maxHp = 3000;
    const phase = hp < maxHp * 0.5 ? 2 : 1;
    this.boss.setData('phase', phase);

    const dist = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);

    let chargeTimer = this.boss.getData('chargeTimer') as number;
    chargeTimer += this.game.loop.delta;
    this.boss.setData('chargeTimer', chargeTimer);

    const chargeInterval = phase === 2 ? 3000 : 5000;
    if (chargeTimer > chargeInterval && dist < 500) {
      this.boss.setData('chargeTimer', 0);
      this.boss.setData('isCharging', true);
      const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
      this.boss.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280);
      this.time.delayedCall(800, () => {
        if (this.boss && this.boss.active) this.boss.setData('isCharging', false);
      });
    } else if (!this.boss.getData('isCharging')) {
      const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
      const speed = phase === 2 ? 80 : 60;
      this.boss.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }

    let summonTimer = this.boss.getData('summonTimer') as number;
    summonTimer += this.game.loop.delta;
    this.boss.setData('summonTimer', summonTimer);

    if (summonTimer > 8000) {
      this.boss.setData('summonTimer', 0);
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.enemySpawner.spawnEnemyAt(
          this.boss.x + Math.cos(a) * 50,
          this.boss.y + Math.sin(a) * 50,
          ENEMIES[0]
        );
      }
    }

    this.hud.updateBossHp(hp, maxHp);
  }

  private hitStop(duration: number): void {
    if (this.hitStopTimer) this.hitStopTimer.remove();
    this.physics.pause();
    this.hitStopTimer = this.time.delayedCall(duration, () => {
      if (!this.isGameOver && !this.isPaused) this.physics.resume();
    });
  }

  private togglePause(): void {
    if (this.isGameOver) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.scene.launch('PauseScene');
      this.scene.pause();
    } else {
      this.physics.resume();
      this.scene.stop('PauseScene');
      this.scene.resume();
    }
  }

  private endGame(won: boolean): void {
    this.isGameOver = true;
    this.isWon = won;
    this.physics.pause();

    const scrapTotal = this.scrap + (won ? 500 : 0);
    this.saveManager.addScrap(scrapTotal);
    this.saveManager.recordRun(this.wave, this.kills);

    if (this.scrap >= 1000) this.saveManager.unlockAchievement('hoarder');
    if (this.saveManager.getData().totalScrap >= 5000) this.saveManager.unlockAchievement('rich');
    if (this.saveManager.getData().totalKills >= 1000) this.saveManager.unlockAchievement('kills1000');
    if (this.wave >= 5 && this.damageTaken === 0) this.saveManager.unlockAchievement('untouchable');

    this.audioManager.stopMusic();
    if (won) this.audioManager.win(); else this.audioManager.gameOver();

    this.time.delayedCall(1500, () => {
      this.scene.launch('GameOverScene', {
        won, wave: this.wave, kills: this.kills, scrap: scrapTotal,
        time: this.runTime, character: this.character
      });
    });
  }
}
