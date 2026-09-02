import "dotenv/config";

function argument(name: string, required = true): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  const value = index < 0 ? undefined : process.argv[index + 1];
  if (required && value === undefined) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}

const key = argument("key")!;
const orderId = argument("order-id")!;
const clickId = argument("click-id", false);
const items = JSON.parse(argument("items")!) as unknown;
const occurredAt = argument("occurred-at", false) ?? new Date().toISOString();
const appUrl = argument("app-url", false) ?? process.env.APP_URL;
if (appUrl === undefined) throw new Error("APP_URL is required");

const response = await fetch(new URL("/v1/conversions", appUrl), {
  method: "POST",
  headers: {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    orderId,
    occurredAt,
    ...(clickId === undefined ? {} : { clickId }),
    items,
  }),
});
const body = await response.text();
console.log(body);
if (!response.ok) process.exitCode = 1;
