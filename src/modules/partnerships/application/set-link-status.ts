import type { Result } from "@/src/modules/shared";

export function setLinkStatus(deps: {
  links: {
    findOwned(
      actor: { kind: "brand" | "creator"; id: string },
      linkId: string,
    ): Promise<{ id: string } | undefined>;
    setStatus(linkId: string, status: "ACTIVE" | "DISABLED"): Promise<void>;
  };
}) {
  return async (
    actor: { kind: "brand" | "creator"; id: string },
    linkId: string,
    status: "ACTIVE" | "DISABLED",
  ): Promise<Result<void, "not_found">> => {
    if (!(await deps.links.findOwned(actor, linkId))) {
      return { ok: false, error: "not_found" };
    }
    await deps.links.setStatus(linkId, status);
    return { ok: true, value: undefined };
  };
}
