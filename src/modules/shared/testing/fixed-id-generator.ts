import type { IdGenerator } from "../domain/id-generator";

/** Deterministic ids so a fixture assertion may name an exact value. */
export class FixedIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly seed: string) {}

  uuid(): string {
    this.counter += 1;
    return `00000000-0000-4000-8000-${String(this.counter).padStart(12, "0")}`;
  }

  clickId(): string {
    this.counter += 1;
    return `ck_${this.seed}${String(this.counter).padStart(4, "0")}`;
  }
}
