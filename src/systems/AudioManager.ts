export class AudioManager {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private musicGain: GainNode;
  private muted: boolean = false;
  private musicOsc?: OscillatorNode;
  private musicInterval?: number;

  constructor() {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.setSfxVolume(0.8);
    this.setMusicVolume(0.6);
  }

  resume(): void {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setSfxVolume(v: number): void { this.sfxGain.gain.value = v; }
  setMusicVolume(v: number): void { this.musicGain.gain.value = v; }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.masterGain.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', gain = 0.1): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, gain = 0.1): void {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(g);
    g.connect(this.sfxGain);
    src.start();
  }

  shoot(): void { this.playTone(880, 0.05, 'square', 0.05); }
  hit(): void { this.playTone(220, 0.08, 'sawtooth', 0.08); }
  kill(): void { this.playTone(440, 0.15, 'square', 0.1); this.playNoise(0.1, 0.05); }
  explosion(): void { this.playNoise(0.3, 0.2); }
  pickup(): void { this.playTone(1320, 0.1, 'sine', 0.1); }
  levelUp(): void {
    this.playTone(523, 0.15, 'square', 0.1);
    setTimeout(() => this.playTone(659, 0.15, 'square', 0.1), 100);
    setTimeout(() => this.playTone(784, 0.2, 'square', 0.12), 200);
  }
  evolution(): void {
    this.playTone(440, 0.2, 'square', 0.1);
    setTimeout(() => this.playTone(554, 0.2, 'square', 0.1), 150);
    setTimeout(() => this.playTone(659, 0.2, 'square', 0.1), 300);
    setTimeout(() => this.playTone(880, 0.4, 'square', 0.15), 450);
  }
  playerHit(): void { this.playTone(110, 0.2, 'sawtooth', 0.15); }
  bossRoar(): void {
    this.playTone(55, 0.5, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(82, 0.5, 'sawtooth', 0.2), 200);
  }
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'square', 0.12), i * 150);
    });
  }
  gameOver(): void {
    [440, 349, 330, 262].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.4, 'sawtooth', 0.12), i * 200);
    });
  }
  tesla(): void { this.playTone(2000, 0.08, 'sine', 0.06); }

  startMusic(): void {
    if (this.musicOsc) return;
    const playNote = (freq: number, dur: number, delay: number) => {
      setTimeout(() => {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.03, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.connect(g);
        g.connect(this.musicGain);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
      }, delay);
    };

    const bassLine = [55, 55, 65, 49, 55, 55, 73, 49];
    let beat = 0;
    this.musicInterval = window.setInterval(() => {
      if (this.muted) return;
      const note = bassLine[beat % bassLine.length];
      playNote(note, 0.4, 0);
      if (beat % 4 === 0) playNote(note * 2, 0.2, 50);
      beat++;
    }, 500);
  }

  stopMusic(): void {
    if (this.musicInterval) clearInterval(this.musicInterval);
    this.musicInterval = undefined;
  }
}
