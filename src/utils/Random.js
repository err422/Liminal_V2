// Mulberry32 seeded PRNG
export class Random {
  constructor(seed = Date.now()) {
    this._seed = seed >>> 0;
  }

  next() {
    let t = (this._seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max)       { return min + this.next() * (max - min); }
  int(min, max)         { return Math.floor(this.range(min, max + 1)); }
  bool(probability = 0.5) { return this.next() < probability; }
  pick(arr)             { return arr[this.int(0, arr.length - 1)]; }
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
