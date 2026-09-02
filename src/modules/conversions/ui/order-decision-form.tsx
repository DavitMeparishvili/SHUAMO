"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/src/modules/design-system";
import type { OrderAction } from "../domain/order-transitions";

function SubmitButton({
  action,
  label,
  pendingLabel,
}: {
  action: OrderAction;
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={action === "CANCEL" ? "danger" : "signal"}
      pending={pending}
      pendingLabel={pendingLabel}
    >
      {label}
    </Button>
  );
}

export function OrderDecisionForm({
  conversionId,
  action,
  decisionAction,
  label,
  pendingLabel,
  confirmation,
}: {
  conversionId: string;
  action: OrderAction;
  decisionAction: (
    conversionId: string,
    action: OrderAction,
  ) => void | Promise<void>;
  label: string;
  pendingLabel: string;
  confirmation?: string;
}) {
  return (
    <form
      action={decisionAction.bind(null, conversionId, action)}
      onSubmit={(event) => {
        if (confirmation !== undefined && !window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton action={action} label={label} pendingLabel={pendingLabel} />
    </form>
  );
}
