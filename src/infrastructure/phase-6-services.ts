import { systemClock } from "@/src/modules/shared";
import {
  authenticateBrandKey,
  prismaBrandRepository,
} from "@/src/modules/identity";
import {
  createConversionsHandler,
  decideOrder,
  intakeConversion,
  prismaClickResolver,
  prismaConversionRepository,
} from "@/src/modules/conversions";

export const intakeConversionForBrand = intakeConversion({
  clock: systemClock,
  clicks: prismaClickResolver,
  conversions: prismaConversionRepository,
});

export const decideOrderForBrand = decideOrder({
  clock: systemClock,
  conversions: prismaConversionRepository,
});

export const conversionsPostHandler = createConversionsHandler({
  authenticate: authenticateBrandKey({ brands: prismaBrandRepository }),
  intake: intakeConversionForBrand,
  log: (event) => console.warn(JSON.stringify(event)),
});
