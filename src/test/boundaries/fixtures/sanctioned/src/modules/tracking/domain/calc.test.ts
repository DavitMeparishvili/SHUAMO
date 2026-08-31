import { randomUUID } from "node:crypto";
import { describe } from "vitest";
// The explicit /index spelling must pass too: rule 3 used to count path
// segments, which rejected the sanctioned import while the bare form passed.
import { Money } from "@/src/modules/shared/index";
import { FakeClock } from "@/src/modules/shared/testing";

export const parts = [randomUUID, describe, Money, FakeClock];
