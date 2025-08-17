import { createHash } from 'crypto';

export class RNG {
  private counter: number = 0;
  private seed: string;

  constructor(seed: string) {
    this.seed = seed;
  }

  private next(): number {
    // Create a deterministic hash from seed and counter
    const hash = createHash('sha256')
      .update(`${this.seed}-${this.counter++}`)
      .digest();
    
    // Use first 4 bytes as a 32-bit unsigned integer
    return hash.readUInt32BE(0);
  }

  random(): number {
    // Return a number between 0 and 1
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