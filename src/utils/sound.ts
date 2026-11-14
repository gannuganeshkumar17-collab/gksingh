class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.08, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  }

  chip() {
    this.playTone(1240, 0.06, 'triangle', 0.06);
    this.playTone(1680, 0.05, 'sine', 0.04, 0.03);
  }

  deal() {
    this.playTone(420, 0.05, 'triangle', 0.05);
  }

  dice() {
    this.playTone(300, 0.04, 'square', 0.03);
    this.playTone(460, 0.04, 'square', 0.03, 0.05);
    this.playTone(360, 0.04, 'square', 0.03, 0.1);
  }

  hit() {
    this.playTone(150, 0.11, 'sawtooth', 0.07);
    this.playTone(95, 0.14, 'triangle', 0.08, 0.02);
  }

  cashout() {
    this.playTone(660, 0.1, 'sine', 0.08);
    this.playTone(880, 0.12, 'sine', 0.08, 0.07);
    this.playTone(1174, 0.18, 'triangle', 0.08, 0.14);
  }

  win() {
    this.playTone(523.25, 0.1, 'triangle', 0.08);
    this.playTone(659.25, 0.1, 'triangle', 0.08, 0.08);
    this.playTone(783.99, 0.12, 'triangle', 0.08, 0.16);
    this.playTone(1046.5, 0.24, 'sine', 0.09, 0.24);
  }

  loss() {
    this.playTone(280, 0.12, 'sawtooth', 0.05);
    this.playTone(200, 0.2, 'sawtooth', 0.05, 0.1);
  }
}

export const soundFx = new SoundEngine();
