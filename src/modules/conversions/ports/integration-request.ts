export interface IntegrationRequest {
  id: string;
  brandId: string;
  mode: "live" | "validation";
  status: number;
  outcome: string;
}

export interface IntegrationRequestView extends IntegrationRequest {
  at: string;
}
