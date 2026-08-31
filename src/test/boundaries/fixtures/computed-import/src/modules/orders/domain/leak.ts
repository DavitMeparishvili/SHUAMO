// A computed specifier cannot be analysed, so it must be refused rather than
// skipped — otherwise it is a one-line hole through all three rules.
export function load(name: string): Promise<unknown> {
  return import(name);
}
