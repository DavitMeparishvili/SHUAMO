// The module's test-double surface, deliberately separate from index.ts so that
// production code importing `@/src/modules/shared` cannot reach a fake clock.
// The boundary check enforces that separation: `@/src/modules/shared/testing`
// is legal only from a *.test.ts / *.spec.ts file.
export { FakeClock } from "./fake-clock";
export { FixedIdGenerator } from "./fixed-id-generator";
