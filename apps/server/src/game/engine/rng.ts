export class RNG {
  private s0: number;
  private s1: number;

  constructor(seed: string) {
    const hash = this.hashString(seed);
    this.s0 = hash & 0xffffffff;
    this.s1 = (hash / 0x100000000) & 0xffffffff;
    
    if (this.s0 === 0 && this.s1 === 0) {
      this.s0 = 0xdeadbeef;
      this.s1 = 0xcafebabe;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private rotl(x: number, k: number): number {
    return (x << k) | (x >>> (32 - k));
  }

  private next(): number {
    const s0 = this.s0;
    let s1 = this.s1;
    const result = (s0 + s1) >>> 0;

    s1 ^= s0;
    this.s0 = this.rotl(s0, 24) ^ s1 ^ ((s1 << 16) & 0xffffffff);
    this.s1 = this.rotl(s1, 37);

    return result;
  }

  random(): number {
    return this.next() / 0x100000000;
  }

  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  rollD6(): number {
    return this.randomInt(1, 6);
  }

  rollD4(): number {
    return this.randomInt(1, 4);
  }

  rollDice(): { d6: number; d4: number; sum: number; difference: number } {
    const d6 = this.rollD6();
    const d4 = this.rollD4();
    return {
      d6,
      d4,
      sum: d6 + d4,
      difference: Math.abs(d6 - d4)
    };
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    return array[this.randomInt(0, array.length - 1)];
  }

  choices<T>(array: T[], count: number): T[] {
    if (count >= array.length) return [...array];
    
    const result: T[] = [];
    const available = [...array];
    
    for (let i = 0; i < count; i++) {
      const index = this.randomInt(0, available.length - 1);
      result.push(available[index]);
      available.splice(index, 1);
    }
    
    return result;
  }
}