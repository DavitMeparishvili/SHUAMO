export function examplePayload(now = new Date()) {
  return JSON.stringify(
    {
      orderId: `EXAMPLE-${now.getTime()}`,
      occurredAt: now.toISOString(),
      clickId: "REPLACE_WITH_XU_VALUE",
      items: [
        {
          sku: "REPLACE_WITH_STORE_SKU",
          qty: 1,
          unitPrice: "100.00",
          lineDiscount: "0.00",
          lineVat: "0.00",
        },
      ],
    },
    null,
    2,
  );
}

export function requestExamples(base: string, payload: string) {
  return [
    {
      label: "cURL",
      code: `curl --request POST '${base}/v1/conversions' \\\n  --header "Authorization: Bearer $XURJIN_API_KEY" \\\n  --header 'Content-Type: application/json' \\\n  --data '${payload}'`,
    },
    {
      label: "Node.js",
      code: `// Run on your backend. Persist this payload for retries.\nconst sale = ${payload};\n\nconst response = await fetch(${JSON.stringify(`${base}/v1/conversions`)}, {\n  method: "POST",\n  headers: {\n    Authorization: \`Bearer \${process.env.XURJIN_API_KEY}\`,\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify(sale),\n});\nconst result = await response.json();\nif (!response.ok) {\n  // Queue 5xx/network failures with the original payload.\n  // Investigate 4xx responses before retrying.\n  throw new Error(result.error);\n}\nconst hasAttribution = result.items.some(item => item.attribution);\n// Preserve the sale on the order for retries. If attributed,\n// clear this click from future carts, not from this order.`,
    },
  ];
}

export const captureExample = `onStoreLanding(request, session):
  xu = request.query["xu"]
  if xu is a non-empty string of at most 255 characters:
    session.xurjin = { clickId: xu, expiresAt: now + 30 days }
  // No xu? Keep the existing unexpired referral.

beforePayment(order, session):
  if session.xurjin exists and has not expired:
    order.metadata.xurjinClickId = session.xurjin.clickId
  save(order)

onSuccessfulSale(order):
  // Use persisted order metadata, not the current browser session.
  enqueueSaleWithOriginalTimestampAndClick(order)`;

export const responseExample = JSON.stringify(
  {
    id: "EXAMPLE_CONVERSION_ID",
    orderId: "EXAMPLE-ORDER",
    occurredAt: "2026-09-11T10:00:00.000Z",
    status: "CONFIRMED",
    confirmedAt: "2026-09-11T10:00:01.000Z",
    commissionAmount: "10.00",
    items: [
      {
        id: "EXAMPLE_ITEM_ID",
        sku: "STORE-SKU",
        qty: 1,
        unitPrice: "100.00",
        lineDiscount: "0.00",
        lineVat: "0.00",
        commissionableNet: "100.00",
        attribution: {
          clickId: "EXAMPLE_CLICK_ID",
          creatorId: "EXAMPLE_CREATOR_ID",
          creatorName: "Example creator",
          productId: "EXAMPLE_PRODUCT_ID",
          commissionAmount: "10.00",
        },
      },
    ],
  },
  null,
  2,
);
