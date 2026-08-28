// Lightweight WebAudio SFX manager (no asset files). Fully mutable.
class SoundManager {
  constructor() {
    this.muted = false;
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
  }

  _blip({ freq = 440, type = "sine", dur = 0.15, gain = 0.25, slideTo = null }) {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  play(kind, intensity = 1) {
    if (this.muted) return;
    this.ensure();
    if (!this.ctx) return;
    const i = Math.max(0.15, Math.min(1, intensity));
    switch (kind) {
      case "flick":
        this._blip({ freq: 220 + i * 260, type: "triangle", dur: 0.18, gain: 0.22 * i, slideTo: 120 });
        break;
      case "click":
        this._blip({ freq: 320 + i * 500, type: "square", dur: 0.05, gain: 0.16 * i });
        break;
      case "thud":
        this._blip({ freq: 140, type: "sine", dur: 0.22, gain: 0.3, slideTo: 60 });
        break;
      case "win":
        [523, 659, 784, 1047].forEach((f, k) =>
          setTimeout(() => this._blip({ freq: f, type: "triangle", dur: 0.28, gain: 0.24 }), k * 120)
        );
        break;
      case "lose":
        [392, 330, 262, 196].forEach((f, k) =>
          setTimeout(() => this._blip({ freq: f, type: "sawtooth", dur: 0.3, gain: 0.2 }), k * 140)
        );
        break;
      default:
        break;
    }
  }
}

export const sound = new SoundManager();
