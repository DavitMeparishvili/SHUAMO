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
  validateConversion,
  recordIntegrationRequest,
  isClickAttributed,
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
  record: recordIntegrationRequest,
});

export const validateConversionForBrand = validateConversion({
  clock: systemClock,
  clicks: prismaClickResolver,
  conversions: prismaConversionRepository,
  isClickAttributed,
});

export const conversionsValidateHandler = createConversionsHandler({
  authenticate: authenticateBrandKey({ brands: prismaBrandRepository }),
  intake: intakeConversionForBrand,
  validate: validateConversionForBrand,
  record: recordIntegrationRequest,
  log: (event) => console.warn(JSON.stringify(event)),
});
