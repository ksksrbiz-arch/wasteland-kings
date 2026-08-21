export interface PlayerStats {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  fireRate: number;
  pickupRadius: number;
  critChance: number;
  critDamage: number;
  regen: number;
  armor: number;
  xpBonus: number;
  scrapBonus: number;
}

export interface WeaponData {
  id: string;
  name: string;
  description: string;
  damage: number;
  fireRate: number;
  range: number;
  pierce: number;
  projectileSpeed: number;
  projectileCount: number;
  level: number;
  maxLevel: number;
  evolutionId?: string;
  requiresPassive?: string;
  element?: 'none' | 'poison' | 'freeze' | 'fire';
}

export interface PassiveData {
  id: string;
  name: string;
  description: string;
  stat: keyof PlayerStats;
  value: number;
  level: number;
  maxLevel: number;
  element?: 'none' | 'poison' | 'freeze' | 'fire';
}

export interface UpgradeOption {
  type: 'weapon' | 'passive' | 'evolution';
  data: WeaponData | PassiveData;
}

export interface EnemyType {
  id: string;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  scrap: number;
  radius: number;
  color: number;
  behavior: 'chase' | 'circle' | 'ranged' | 'charge' | 'summoner';
  mass: number;
}

export interface TempWeapon {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  range: number;
  pierce: number;
  projectileSpeed: number;
  projectileCount: number;
  batteryLife: number; // seconds
  element: 'none' | 'poison' | 'freeze' | 'fire';
}

export const TEMP_WEAPONS: TempWeapon[] = [
  {
    id: 'laser_cannon', name: 'Laser Cannon', damage: 80, fireRate: 600,
    range: 500, pierce: 999, projectileSpeed: 900, projectileCount: 1,
    batteryLife: 10, element: 'fire'
  }
];

export interface BossPhase {
  hpThreshold: number;
  speed: number;
  attackPattern: string;
  summonRate: number;
}

export interface SaveData {
  version: number;
  totalScrap: number;
  highestWave: number;
  totalKills: number;
  totalRuns: number;
  upgrades: Record<string, number>;
  unlockedCharacters: string[];
  achievements: string[];
  settings: GameSettings;
  dailyChallenge?: { date: string; score: number };
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  damageNumbers: boolean;
  showMinimap: boolean;
  difficulty: 'normal' | 'hard' | 'nightmare';
}

export interface CharacterData {
  id: string;
  name: string;
  description: string;
  stats: Partial<PlayerStats>;
  startingWeapon: string;
  unlockCost: number;
  color: number;
}

export const UPGRADES: Record<string, { name: string; cost: number; max: number; perLevel: number; stat: keyof PlayerStats }> = {
  damage: { name: 'Weapon Calibration', cost: 50, max: 10, perLevel: 0.15, stat: 'damage' },
  hull: { name: 'Reinforced Hull', cost: 50, max: 10, perLevel: 0.20, stat: 'maxHp' },
  engine: { name: 'Overclock Engine', cost: 75, max: 8, perLevel: 0.10, stat: 'speed' },
  magnet: { name: 'Scrap Magnet', cost: 40, max: 10, perLevel: 0.15, stat: 'pickupRadius' },
  regen: { name: 'Auto-Repair', cost: 100, max: 5, perLevel: 0.5, stat: 'regen' },
  salvage: { name: 'Salvage Expert', cost: 60, max: 10, perLevel: 0.10, stat: 'scrapBonus' },
  crit: { name: 'Target Matrix', cost: 80, max: 8, perLevel: 0.05, stat: 'critChance' },
  armor: { name: 'Plating', cost: 70, max: 8, perLevel: 0.08, stat: 'armor' }
};

export const WEAPONS: WeaponData[] = [
  {
    id: 'scrapgun', name: 'Scrapgun', description: 'Rapid-fire scrap metal shards',
    damage: 12, fireRate: 400, range: 350, pierce: 0, projectileSpeed: 500, projectileCount: 1,
    level: 1, maxLevel: 5, evolutionId: 'ripper', requiresPassive: 'apRounds'
  },
  {
    id: 'saw', name: 'Orbital Saw', description: 'Spinning blades orbit the player',
    damage: 8, fireRate: 100, range: 100, pierce: 999, projectileSpeed: 200, projectileCount: 1,
    level: 1, maxLevel: 5, evolutionId: 'maelstrom', requiresPassive: 'magCoil'
  },
  {
    id: 'rocket', name: 'Rocket Pod', description: 'Explosive area damage',
    damage: 45, fireRate: 1500, range: 400, pierce: 0, projectileSpeed: 350, projectileCount: 1,
    level: 1, maxLevel: 5, evolutionId: 'hellfire', requiresPassive: 'overdrive'
  },
  {
    id: 'tesla', name: 'Tesla Coil', description: 'Chain lightning to nearby enemies',
    damage: 15, fireRate: 800, range: 200, pierce: 3, projectileSpeed: 0, projectileCount: 1,
    level: 1, maxLevel: 5, evolutionId: 'stormcaller', requiresPassive: 'sparePlating'
  },
  {
    id: 'flame', name: 'Flamethrower', description: 'Cone of burning fuel',
    damage: 6, fireRate: 100, range: 180, pierce: 999, projectileSpeed: 300, projectileCount: 1,
    level: 1, maxLevel: 5, evolutionId: 'inferno', requiresPassive: 'fuelTank'
  }
];

export const EVOLUTIONS: WeaponData[] = [
  {
    id: 'ripper', name: 'Ripper Minigun', description: 'Piercing shards at extreme rate',
    damage: 18, fireRate: 120, range: 400, pierce: 3, projectileSpeed: 600, projectileCount: 2,
    level: 1, maxLevel: 1
  },
  {
    id: 'maelstrom', name: 'Maelstrom', description: 'Blade storm surrounds you',
    damage: 14, fireRate: 100, range: 140, pierce: 999, projectileSpeed: 280, projectileCount: 3,
    level: 1, maxLevel: 1
  },
  {
    id: 'hellfire', name: 'Hellfire Barrage', description: 'Triple rocket volley',
    damage: 55, fireRate: 1200, range: 450, pierce: 0, projectileSpeed: 400, projectileCount: 3,
    level: 1, maxLevel: 1
  },
  {
    id: 'stormcaller', name: 'Stormcaller', description: 'Lightning arcs everywhere',
    damage: 25, fireRate: 500, range: 280, pierce: 6, projectileSpeed: 0, projectileCount: 1,
    level: 1, maxLevel: 1
  },
  {
    id: 'inferno', name: 'Inferno Cannon', description: 'Massive fire stream',
    damage: 12, fireRate: 80, range: 220, pierce: 999, projectileSpeed: 350, projectileCount: 1,
    level: 1, maxLevel: 1
  }
];

export const PASSIVES: PassiveData[] = [
  { id: 'apRounds', name: 'AP Rounds', description: '+15% Damage', stat: 'damage', value: 0.15, level: 1, maxLevel: 5 },
  { id: 'magCoil', name: 'Mag Coil', description: '+20% Pickup Radius', stat: 'pickupRadius', value: 0.20, level: 1, maxLevel: 5 },
  { id: 'overdrive', name: 'Overdrive', description: '+10% Speed', stat: 'speed', value: 0.10, level: 1, maxLevel: 5 },
  { id: 'sparePlating', name: 'Spare Plating', description: '+20% Max HP', stat: 'maxHp', value: 0.20, level: 1, maxLevel: 5 },
  { id: 'fuelTank', name: 'Fuel Tank', description: '+10% Fire Rate', stat: 'fireRate', value: 0.10, level: 1, maxLevel: 5 },
  { id: 'targetingChip', name: 'Targeting Chip', description: '+5% Crit Chance', stat: 'critChance', value: 0.05, level: 1, maxLevel: 5 },
  { id: 'poisonGland', name: 'Poison Gland', description: 'Weapons apply poison (3% maxHP/s)', stat: 'damage', value: 0.05, level: 1, maxLevel: 3, element: 'poison' },
  { id: 'cryoCell', name: 'Cryo Cell', description: 'Weapons apply freeze (slow 30%)', stat: 'damage', value: 0.05, level: 1, maxLevel: 3, element: 'freeze' },
  { id: 'ignitionCore', name: 'Ignition Core', description: 'Weapons apply burn (5% maxHP/s)', stat: 'damage', value: 0.05, level: 1, maxLevel: 3, element: 'fire' }
];

export const ENEMIES: EnemyType[] = [
  { id: 'grunt', hp: 30, speed: 80, damage: 10, xp: 3, scrap: 1, radius: 10, color: 0x8B4513, behavior: 'chase', mass: 1 },
  { id: 'runner', hp: 15, speed: 140, damage: 8, xp: 4, scrap: 1, radius: 8, color: 0xFF6347, behavior: 'chase', mass: 0.5 },
  { id: 'tank', hp: 120, speed: 50, damage: 20, xp: 12, scrap: 4, radius: 18, color: 0x556B2F, behavior: 'chase', mass: 3 },
  { id: 'ranged', hp: 25, speed: 60, damage: 15, xp: 6, scrap: 2, radius: 10, color: 0x9370DB, behavior: 'ranged', mass: 1 },
  { id: 'charger', hp: 50, speed: 100, damage: 25, xp: 8, scrap: 3, radius: 12, color: 0xDC143C, behavior: 'charge', mass: 2 },
  { id: 'elite', hp: 200, speed: 70, damage: 30, xp: 25, scrap: 10, radius: 20, color: 0xFFD700, behavior: 'chase', mass: 4 },
  { id: 'summoner', hp: 60, speed: 40, damage: 12, xp: 15, scrap: 5, radius: 14, color: 0x4B0082, behavior: 'summoner', mass: 2 }
];

export const CHARACTERS: CharacterData[] = [
  {
    id: 'scrapper', name: 'The Scrapper', description: 'Balanced survivor with reliable firepower',
    stats: { damage: 1.0, speed: 1.0, maxHp: 1.0 },
    startingWeapon: 'scrapgun', unlockCost: 0, color: 0xCD853F
  },
  {
    id: 'speedster', name: 'The Speedster', description: 'Fast and fragile, hits hard',
    stats: { damage: 1.25, speed: 1.3, maxHp: 0.7 },
    startingWeapon: 'saw', unlockCost: 500, color: 0x00CED1
  },
  {
    id: 'juggernaut', name: 'The Juggernaut', description: 'Slow but incredibly tough',
    stats: { damage: 0.85, speed: 0.75, maxHp: 1.5, armor: 0.1 },
    startingWeapon: 'rocket', unlockCost: 800, color: 0xB22222
  },
  {
    id: 'engineer', name: 'The Engineer', description: 'Tesla specialist with high tech',
    stats: { damage: 0.9, speed: 1.0, maxHp: 0.9, fireRate: 1.15 },
    startingWeapon: 'tesla', unlockCost: 1000, color: 0x7B68EE
  }
];

export const ACHIEVEMENTS = [
  { id: 'first_blood', name: 'First Blood', desc: 'Kill your first enemy' },
  { id: 'survivor', name: 'Survivor', desc: 'Reach wave 5' },
  { id: 'veteran', name: 'Veteran', desc: 'Reach wave 10' },
  { id: 'warlord', name: 'Warlord', desc: 'Defeat the boss' },
  { id: 'hoarder', name: 'Hoarder', desc: 'Collect 1000 scrap in one run' },
  { id: 'evolved', name: 'Evolved', desc: 'Evolve a weapon' },
  { id: 'maxed', name: 'Maxed Out', desc: 'Max out a weapon' },
  { id: 'rich', name: 'Scrap Baron', desc: 'Have 5000 total scrap' },
  { id: 'kills1000', name: 'Exterminator', desc: 'Kill 1000 enemies total' },
  { id: 'untouchable', name: 'Untouchable', desc: 'Beat wave 5 without taking damage' }
];
