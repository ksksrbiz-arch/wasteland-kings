import type { SaveData, GameSettings } from '../types';

const SAVE_KEY = 'wasteland_kings_save_v2';

export class SaveManager {
  private data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version === 2) return parsed;
      }
    } catch { /* ignore corrupt save */ }
    return this.createDefault();
  }

  private createDefault(): SaveData {
    return {
      version: 2,
      totalScrap: 0,
      highestWave: 0,
      totalKills: 0,
      totalRuns: 0,
      upgrades: {},
      unlockedCharacters: ['scrapper'],
      achievements: [],
      settings: {
        musicVolume: 0.6,
        sfxVolume: 0.8,
        screenShake: true,
        damageNumbers: true,
        showMinimap: true,
        difficulty: 'normal'
      }
    };
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch { /* storage full */ }
  }

  getData(): SaveData { return this.data; }
  getSettings(): GameSettings { return this.data.settings; }
  setSettings(s: Partial<GameSettings>): void { Object.assign(this.data.settings, s); this.save(); }

  addScrap(amount: number): void {
    this.data.totalScrap += amount;
    this.save();
  }

  spendScrap(amount: number): boolean {
    if (this.data.totalScrap < amount) return false;
    this.data.totalScrap -= amount;
    this.save();
    return true;
  }

  getUpgradeLevel(id: string): number {
    return this.data.upgrades[id] || 0;
  }

  setUpgradeLevel(id: string, level: number): void {
    this.data.upgrades[id] = level;
    this.save();
  }

  unlockCharacter(id: string): void {
    if (!this.data.unlockedCharacters.includes(id)) {
      this.data.unlockedCharacters.push(id);
      this.save();
    }
  }

  isCharacterUnlocked(id: string): boolean {
    return this.data.unlockedCharacters.includes(id);
  }

  checkAchievement(id: string): boolean {
    return this.data.achievements.includes(id);
  }

  unlockAchievement(id: string): boolean {
    if (!this.data.achievements.includes(id)) {
      this.data.achievements.push(id);
      this.save();
      return true;
    }
    return false;
  }

  recordRun(wave: number, kills: number): void {
    this.data.totalRuns++;
    this.data.totalKills += kills;
    if (wave > this.data.highestWave) this.data.highestWave = wave;
    this.save();
  }

  reset(): void {
    this.data = this.createDefault();
    this.save();
  }
}
