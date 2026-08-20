import type { SaveData, GameSettings } from '../types';

const SAVE_KEY = 'wasteland_kings_save_v2';
const UUID_KEY = 'wasteland_kings_uuid';
const API_BASE_KEY = 'wasteland_kings_api_base';

// Default API base — override via localStorage.wasteland_kings_api_base
const DEFAULT_API_BASE = 'https://wasteland-kings-api.skdev-371.workers.dev';

function getApiBase(): string {
  try {
    return localStorage.getItem(API_BASE_KEY) || DEFAULT_API_BASE;
  } catch { return DEFAULT_API_BASE; }
}

function apiUrl(path: string): string {
  const base = getApiBase();
  return `${base.replace(/\/$/, '')}${path}`;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export class SaveManager {
  private data: SaveData;
  private uuid: string;

  constructor() {
    this.uuid = this.getOrCreateUUID();
    this.data = this.load();
    this.cloudLoad(); // fire-and-forget background sync
  }

  private getOrCreateUUID(): string {
    try {
      let id = localStorage.getItem(UUID_KEY);
      if (!id) {
        id = generateUUID();
        localStorage.setItem(UUID_KEY, id);
      }
      return id;
    } catch { return generateUUID(); }
  }

  getUUID(): string {
    return this.uuid;
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
    this.cloudSave();
  }

  // ── Cloud Save ──
  async cloudSave(): Promise<boolean> {
    try {
      const res = await fetch(apiUrl('/save/' + this.uuid), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async cloudLoad(): Promise<boolean> {
    try {
      const res = await fetch(apiUrl('/save/' + this.uuid), { method: 'GET' });
      if (res.ok) {
        const cloud = await res.json() as SaveData;
        if (cloud && cloud.version === 2) {
          // Merge: keep higher totals, cloud wins on everything else
          this.data.totalScrap = Math.max(this.data.totalScrap, cloud.totalScrap);
          this.data.highestWave = Math.max(this.data.highestWave, cloud.highestWave);
          this.data.totalKills = Math.max(this.data.totalKills, cloud.totalKills);
          this.data.totalRuns = Math.max(this.data.totalRuns, cloud.totalRuns);
          // Merge upgrades (take higher levels)
          for (const [k, v] of Object.entries(cloud.upgrades)) {
            this.data.upgrades[k] = Math.max(this.data.upgrades[k] || 0, v as number);
          }
          // Merge unlocks
          for (const c of cloud.unlockedCharacters) {
            if (!this.data.unlockedCharacters.includes(c)) {
              this.data.unlockedCharacters.push(c);
            }
          }
          // Merge achievements
          for (const a of cloud.achievements) {
            if (!this.data.achievements.includes(a)) {
              this.data.achievements.push(a);
            }
          }
          this.saveLocalOnly();
          return true;
        }
      }
    } catch { /* offline */ }
    return false;
  }

  private saveLocalOnly(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch { /* storage full */ }
  }

  // ── Leaderboard ──
  async submitLeaderboard(entry: {
    name: string;
    score: number;
    wave: number;
    kills: number;
    time: number;
    character: string;
  }): Promise<{ success: boolean; rank?: number }> {
    try {
      const res = await fetch(apiUrl('/leaderboard/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, rank: json.rank };
      }
    } catch { /* offline */ }
    return { success: false };
  }

  async getLeaderboard(limit = 20): Promise<Array<{
    name: string;
    score: number;
    wave: number;
    kills: number;
    time: number;
    character: string;
    date: string;
  }>> {
    try {
      const res = await fetch(apiUrl(`/leaderboard/list?limit=${limit}`), { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        return json.scores || [];
      }
    } catch { /* offline */ }
    return [];
  }

  // ── Local getters/setters ──
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
