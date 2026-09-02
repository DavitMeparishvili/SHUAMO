import type { Clock } from "@/src/modules/shared";
import type { OrderAction } from "../domain/order-transitions";
import type { ConversionRepository } from "../ports/conversion-repository";

export function decideOrder(dependencies: {
  readonly clock: Clock;
  readonly conversions: Pick<ConversionRepository, "decide">;
}) {
  return (
    brandId: string,
    actorId: string,
    conversionId: string,
    action: OrderAction,
  ) =>
    dependencies.conversions.decide({
      brandId,
      actorId,
      conversionId,
      action,
      now: dependencies.clock.now(),
    });
}
