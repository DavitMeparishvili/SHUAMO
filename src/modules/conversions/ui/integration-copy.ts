import type { Locale } from "@/src/modules/localization";

const en = {
  title: "Integration",
  intro:
    "Connect your store to Xurjin. Capture creator referrals, report successful sales, and verify attribution.",
  onPage: "On this page",
  overview: "How it works",
  overviewBody:
    "Your store keeps the click ID from a creator’s link and sends it with the successful sale. Xurjin matches the linked product and calculates the creator’s commission.",
  flow: [
    "Customer follows a creator link",
    "Your store captures ?xu=clickId",
    "Your backend reports the sale",
    "Xurjin records eligible commission",
  ],
  prerequisite:
    "Before you start: use an approved brand account, add your products with the exact SKUs used in your store, and have an active creator tracking link. Amounts are in GEL.",
  credentials: "API key",
  credentialBody:
    "Authenticate server-to-server requests with Authorization: Bearer YOUR_API_KEY. Keep the full key in your backend’s environment variables. Never put it in storefront JavaScript or a public repository. Requests carrying an Origin header are rejected by the public API.",
  prefixLabel: "Current key identifier",
  prefixHint:
    "This prefix identifies your key. It is not a usable API key; the full secret is shown only when generated.",
  rotateWarning:
    "Generating a new key immediately invalidates the previous key. Be ready to update your backend to avoid interrupted reporting.",
  confirm: "Replace key now",
  cancel: "Keep current key",
  capture: "Capture the referral",
  captureBody:
    "Read xu from the landing URL, then preserve it in your store’s own session or first-party cookie and copy it into the order metadata before payment. The cookie on Xurjin’s domain cannot do this for your store.",
  capturePolicy:
    "Recommended store policy: keep the latest Xurjin click for up to 30 days; a new xu replaces the previous one. Keep the saved value when a page has no xu. One order accepts one click, so only that link’s product can earn commission in a mixed cart. Choose this policy explicitly when implementing checkout.",
  captureConsume:
    "After a live response contains item attribution, clear that click from future carts. Keep the original click and payload on the order for retries. One click can earn commission on only one order, even if that order is later cancelled.",
  captureExample: "Store backend · framework-neutral pseudocode",
  report: "Report a successful sale",
  reportBody:
    "Call this endpoint from your backend when a sale is successful and eligible for commission. Do not call it on cart creation or a page view. Accepted sales are immediately confirmed; they do not wait for brand approval.",
  examples: "Example request language",
  illustrative:
    "Example values: replace the order ID, timestamp, SKU and click ID with your store’s data. Keep the same payload for retries. The API base below belongs to this deployment.",
  fields: "Request fields",
  field: "Field",
  requirement: "Contract",
  fieldRows: [
    [
      "orderId",
      "Required string, 1–255 characters. Unique per brand. Use your store’s stable order ID.",
    ],
    [
      "occurredAt",
      "Required ISO 8601 sale time with timezone. For a new order, must be within ±48 hours of server time. Do not update it on retries.",
    ],
    [
      "clickId",
      "Optional string, 1–255 characters. The xu value captured at arrival. Omit when unavailable; do not send null.",
    ],
    [
      "items",
      "Required array of 1–500 lines. The request body is limited to 256 KiB.",
    ],
    [
      "items[].sku",
      "Required string, 1–255 characters. Must match the linked product’s SKU exactly to earn commission.",
    ],
    ["items[].qty", "Required positive integer, at most 2,147,483,647."],
    [
      "items[].unitPrice",
      "Required non-negative price per unit in GEL. Prefer a decimal string with at most 2 decimal places.",
    ],
    [
      "items[].lineDiscount",
      'Required total discount for this line, not per unit. Send "0.00" if none.',
    ],
    [
      "items[].lineVat",
      'Optional total VAT for this line in GEL. If omitted, a VAT-registered brand uses gross − gross / 1.18; other brands use zero. Explicit "0.00" means no VAT.',
    ],
  ],
  money:
    "Commissionable net = max(0, unitPrice × qty − lineDiscount − lineVat). The linked creator’s accepted commission terms apply only to matching product lines. A non-negative line subtotal before VAT must not exceed 9,999,999,999.99 GEL. Monetary responses are decimal strings in GEL.",
  responses: "Responses & retries",
  responseBody:
    "A 200 response means the sale was recorded or replayed. It does not prove attribution: inspect items[].attribution. An unattributed sale is still CONFIRMED, with no creator commission. Confirmed commission does not mean paid funds.",
  responseExample: "Illustrative attributed response · a 10% link, no VAT",
  retry:
    "Retry network failures and 503/other 5xx responses with exponential backoff and jitter using the original order ID, timestamp, click and line items. Identical accepted orders can be replayed after the 48-hour window. Do not change the payload to bypass a 409; investigate it. A previously unattributed order cannot be corrected by reposting it with a click.",
  errors: [
    ["400 · malformed_json", "Send valid JSON."],
    [
      "401 · unauthorized",
      "Check the full Bearer key, brand approval and key rotation. Remove Origin; call from your backend.",
    ],
    [
      "409 · order_conflict",
      "This order ID already exists with different data. Retry the original payload.",
    ],
    [
      "409 · click_already_attributed",
      "This click already earned commission on another order. Do not reuse it for another sale.",
    ],
    ["413 · payload_too_large", "Keep the JSON body within 256 KiB."],
    [
      "422 · invalid_payload",
      "Correct the fields listed in issues (for example items.0.unitPrice).",
    ],
    [
      "422 · timestamp_out_of_range",
      "Check the original sale time and timezone. New sales outside ±48 hours are not accepted.",
    ],
    [
      "503 · temporarily_unavailable",
      "Retry the same payload with backoff. Keep X-Request-Id for troubleshooting.",
    ],
  ],
  verify: "Validate your integration",
  verifyBody:
    "Validate the same payload at POST /v1/conversions/validate using your backend’s Bearer key. This checks the current order, click and attribution rules without creating a sale, earning commission or consuming the click. Only request metadata is recorded.",
  validatorNote:
    "The tool below uses your signed-in brand session, so it does not test your backend’s API key, referral capture or network connection. For an end-to-end check, call the validation endpoint from your backend with a fresh click and a matching SKU. Validation is a preview, not a reservation; live results can change.",
  payload: "Conversion payload (JSON)",
  validate: "Validate payload",
  validating: "Validating…",
  freshExample: "Load fresh example",
  validationError:
    "Could not validate the payload. Check your connection, sign in again if needed, and retry.",
  result: "Validation result",
  requestId: "Request ID",
  previewAmount: "Estimated commission (GEL)",
  history: "Recent API requests",
  historyBody:
    "The latest 20 authenticated requests for this brand. Live and validation requests are separate. We retain up to 100 request records per brand, with no keys, payloads or customer details. Unauthenticated requests cannot be assigned to a brand and do not appear here.",
  historyEmpty:
    "No authenticated API requests recorded yet. Run a validation to see your first request here.",
  historyUnavailable:
    "Request history is temporarily unavailable. Refresh to try again.",
  refresh: "Refresh requests",
  time: "Time",
  mode: "Mode",
  status: "HTTP",
  outcome: "Outcome",
  live: "Live sale",
  validation: "Validation",
  orders: "Open orders",
  verificationSteps:
    "For a real sale, find the order in Orders and check the creator attribution and commission. A successful validation alone does not mark a store as connected. Whole-order cancellations are available in Orders; automated refund webhooks, partial refunds, Shopify and WooCommerce adapters are not available yet.",
  copy: "Copy code",
  copied: "Copied",
  copyError: "Copy failed. Select and copy the code manually.",
  outcomes: {
    eligible:
      "Eligible: the click and product match. A live request would create attribution using the current data.",
    no_click:
      "No click ID: the sale is valid but would have no creator attribution.",
    invalid_click:
      "Unusable click: it is unknown, belongs to another brand, happened after the sale, or is more than 30 days old at sale time.",
    sku_mismatch:
      "SKU mismatch: none of the order lines matches the product on this click’s link.",
    zero_net:
      "No commissionable net: the matching lines have no positive value after discounts and VAT.",
    replay:
      "Existing order: this payload is an identical replay. No new sale or commission will be created; a cancelled sale stays cancelled.",
    order_conflict:
      "Order conflict: the order ID already exists with a different payload.",
    click_already_attributed:
      "Click already used: this click has already earned commission on an order.",
    timestamp_out_of_range:
      "Sale time outside ±48 hours: check occurredAt and its timezone.",
    accepted: "Sale recorded with attribution.",
    unattributed: "Sale recorded without creator attribution.",
    invalid_payload: "Invalid payload: correct the fields listed in issues.",
    malformed_json: "Malformed JSON: check quotes, commas and brackets.",
    payload_too_large: "Payload exceeds the 256 KiB limit.",
    temporarily_unavailable:
      "Service temporarily unavailable. Retry with backoff.",
  } as Record<string, string>,
};

const ka: typeof en = {
  title: "ინტეგრაცია",
  intro:
    "დააკავშირეთ თქვენი მაღაზია Xurjin-თან. შეინახეთ შემქმნელის რეფერალი, გაგზავნეთ წარმატებული გაყიდვა და გადაამოწმეთ ატრიბუცია.",
  onPage: "ამ გვერდზე",
  overview: "როგორ მუშაობს",
  overviewBody:
    "მაღაზია ინახავს შემქმნელის ბმულიდან მიღებულ კლიკის ID-ს და აგზავნის მას წარმატებულ გაყიდვასთან ერთად. Xurjin პოულობს ბმულის პროდუქტს და ითვლის შემქმნელის საკომისიოს.",
  flow: [
    "მომხმარებელი ხსნის შემქმნელის ბმულს",
    "მაღაზია იღებს ?xu=clickId-ს",
    "სერვერი აგზავნის გაყიდვას",
    "Xurjin აღრიცხავს შესაბამის საკომისიოს",
  ],
  prerequisite:
    "დაწყებამდე: ბრენდის ანგარიში უნდა იყოს დამტკიცებული. დაამატეთ პროდუქტები მაღაზიის ზუსტი SKU-ებით და იქონიეთ შემქმნელის აქტიური ბმული. თანხები მითითებულია ლარში.",
  credentials: "API გასაღები",
  credentialBody:
    "სერვერებს შორის მოთხოვნისთვის გამოიყენეთ Authorization: Bearer YOUR_API_KEY. სრული გასაღები შეინახეთ სერვერის გარემოს ცვლადებში. არ ჩასვათ ის საიტის JavaScript-ში ან საჯარო რეპოზიტორიაში. საჯარო API უარყოფს მოთხოვნას Origin ჰედერით.",
  prefixLabel: "მიმდინარე გასაღების იდენტიფიკატორი",
  prefixHint:
    "ეს პრეფიქსი მხოლოდ გასაღების ამოსაცნობად გამოიყენება. ის API გასაღები არ არის; სრული საიდუმლო ჩანს მხოლოდ გენერაციისას.",
  rotateWarning:
    "ახალი გასაღების გენერაცია დაუყოვნებლივ აუქმებს წინას. მოემზადეთ სერვერზე გასაღების შესაცვლელად, რათა გაყიდვების გაგზავნა არ შეწყდეს.",
  confirm: "გასაღების ახლავე შეცვლა",
  cancel: "მიმდინარე გასაღების დატოვება",
  capture: "რეფერალის შენახვა",
  captureBody:
    "წაიკითხეთ xu საწყისი URL-დან, შეინახეთ მაღაზიის სესიაში ან საკუთარ cookie-ში და გადახდამდე გადაიტანეთ შეკვეთის მეტამონაცემებში. Xurjin-ის დომენის cookie ამას თქვენი მაღაზიის ნაცვლად ვერ აკეთებს.",
  capturePolicy:
    "რეკომენდებული წესი: შეინახეთ ბოლო Xurjin კლიკი მაქსიმუმ 30 დღით; ახალი xu ცვლის წინას. თუ გვერდს xu არ აქვს, შეინარჩუნეთ არსებული მნიშვნელობა. შეკვეთა იღებს ერთ კლიკს, ამიტომ შერეულ კალათაში საკომისიო მხოლოდ ამ ბმულის პროდუქტს ერიცხება. ეს წესი განსაზღვრეთ გადახდის პროცესის აწყობისას.",
  captureConsume:
    "თუ რეალური გაყიდვის პასუხში არის პროდუქტის ატრიბუცია, წაშალეთ ეს კლიკი მომავალი კალათებისთვის. განმეორებითი მოთხოვნებისთვის შეკვეთაზე შეინარჩუნეთ საწყისი კლიკი და მონაცემები. ერთი კლიკი საკომისიოს მხოლოდ ერთ შეკვეთაზე იღებს, გაუქმების შემთხვევაშიც.",
  captureExample: "მაღაზიის სერვერი · ფსევდოკოდი",
  report: "წარმატებული გაყიდვის გაგზავნა",
  reportBody:
    "მიმართეთ ამ მისამართს სერვერიდან, როცა გაყიდვა წარმატებულია და საკომისიოს ეკუთვნის. არ გაგზავნოთ მოთხოვნა კალათის შექმნის ან გვერდის ნახვისას. მიღებული გაყიდვა მაშინვე დასტურდება და ბრენდის დამატებით თანხმობას არ ელოდება.",
  examples: "მოთხოვნის მაგალითის ენა",
  illustrative:
    "საილუსტრაციო მონაცემები: ჩაანაცვლეთ შეკვეთის ID, დრო, SKU და კლიკის ID თქვენი მონაცემებით. განმეორებითი მოთხოვნისას მონაცემები არ შეცვალოთ. ქვემოთ API-ის მისამართი ამ გარემოს ეკუთვნის.",
  fields: "მოთხოვნის ველები",
  field: "ველი",
  requirement: "მოთხოვნა",
  fieldRows: [
    [
      "orderId",
      "სავალდებულო ტექსტი, 1–255 სიმბოლო. უნიკალური ბრენდის ფარგლებში. გამოიყენეთ მაღაზიის უცვლელი შეკვეთის ID.",
    ],
    [
      "occurredAt",
      "სავალდებულო ISO 8601 გაყიდვის დრო დროის სარტყლით. ახალი შეკვეთისთვის სერვერის დროიდან ±48 საათის ფარგლებში. განმეორებისას არ შეცვალოთ.",
    ],
    [
      "clickId",
      "არასავალდებულო ტექსტი, 1–255 სიმბოლო. შემოსვლისას მიღებული xu. თუ არ გაქვთ, გამოტოვეთ; არ გაგზავნოთ null.",
    ],
    [
      "items",
      "სავალდებულო მასივი, 1–500 ჩანაწერი. მოთხოვნის მაქსიმალური ზომაა 256 KiB.",
    ],
    [
      "items[].sku",
      "სავალდებულო ტექსტი, 1–255 სიმბოლო. საკომისიოსთვის ზუსტად უნდა ემთხვეოდეს ბმულის პროდუქტის SKU-ს.",
    ],
    ["items[].qty", "სავალდებულო დადებითი მთელი რიცხვი."],
    [
      "items[].unitPrice",
      "ერთეულის სავალდებულო არაუარყოფითი ფასი ლარში. სასურველია ტექსტური რიცხვი მაქსიმუმ 2 ათწილადით.",
    ],
    [
      "items[].lineDiscount",
      'ჩანაწერის მთლიანი სავალდებულო ფასდაკლება და არა ერთეულის. ფასდაკლების გარეშე გაგზავნეთ "0.00".',
    ],
    [
      "items[].lineVat",
      'ჩანაწერის მთლიანი დღგ ლარში, არასავალდებულო. გამოტოვებისას დღგ-ის გადამხდელი ბრენდისთვის ითვლება gross − gross / 1.18; სხვებისთვის ნულია. აშკარა "0.00" ნიშნავს დღგ-ის არქონას.',
    ],
  ],
  money:
    "საკომისიოს ბაზა = max(0, unitPrice × qty − lineDiscount − lineVat). შემქმნელის შეთანხმებული პირობები მოქმედებს მხოლოდ შესაბამის პროდუქტზე. პასუხში თანხები ტექსტური რიცხვებია ლარში.",
  responses: "პასუხები და განმეორებითი მოთხოვნები",
  responseBody:
    "200 პასუხი ნიშნავს, რომ გაყიდვა ჩაიწერა ან განმეორდა. ეს ატრიბუციას არ ადასტურებს: შეამოწმეთ items[].attribution. ატრიბუციის გარეშე გაყიდვაც CONFIRMED სტატუსით ინახება, შემქმნელის საკომისიოს გარეშე. დადასტურებული საკომისიო გადახდილ თანხას არ ნიშნავს.",
  responseExample:
    "ატრიბუციის საილუსტრაციო პასუხი · 10%-იანი ბმული, დღგ-ის გარეშე",
  retry:
    "ქსელის შეცდომა და 503/სხვა 5xx პასუხი გაიმეორეთ მზარდი დაყოვნებით და შემთხვევითი ინტერვალით. შეინარჩუნეთ საწყისი შეკვეთის ID, დრო, კლიკი და პროდუქტები. უკვე მიღებული იდენტური შეკვეთა შეიძლება განმეორდეს 48 საათის შემდეგაც. 409-ის ასარიდებლად მონაცემები არ შეცვალოთ. ატრიბუციის გარეშე მიღებულ შეკვეთას კლიკის დამატებით ვეღარ შეასწორებთ.",
  errors: [
    ["400 · malformed_json", "გაგზავნეთ გამართული JSON."],
    [
      "401 · unauthorized",
      "შეამოწმეთ სრული Bearer გასაღები, ბრენდის დამტკიცება და გასაღების შეცვლა. მოაშორეთ Origin; გაგზავნეთ სერვერიდან.",
    ],
    [
      "409 · order_conflict",
      "ამ ID-ით შეკვეთა სხვა მონაცემებით არსებობს. გაიმეორეთ საწყისი მონაცემები.",
    ],
    [
      "409 · click_already_attributed",
      "ამ კლიკმა უკვე მიიღო საკომისიო სხვა შეკვეთაზე. სხვა გაყიდვისთვის აღარ გამოიყენოთ.",
    ],
    ["413 · payload_too_large", "JSON-ის ზომა უნდა იყოს მაქსიმუმ 256 KiB."],
    [
      "422 · invalid_payload",
      "შეასწორეთ issues-ში ჩამოთვლილი ველები, მაგალითად items.0.unitPrice.",
    ],
    [
      "422 · timestamp_out_of_range",
      "შეამოწმეთ გაყიდვის საწყისი დრო და სარტყელი. ±48 საათის გარეთ ახალი გაყიდვა არ მიიღება.",
    ],
    [
      "503 · temporarily_unavailable",
      "დაყოვნებით გაიმეორეთ იგივე მონაცემები. შეინახეთ X-Request-Id დიაგნოსტიკისთვის.",
    ],
  ],
  verify: "ინტეგრაციის შემოწმება",
  verifyBody:
    "იგივე მონაცემები გადაამოწმეთ POST /v1/conversions/validate-ზე სერვერის Bearer გასაღებით. მოწმდება შეკვეთის, კლიკისა და ატრიბუციის წესები გაყიდვის შექმნის, საკომისიოს დარიცხვისა და კლიკის გამოყენების გარეშე. ინახება მხოლოდ მოთხოვნის მეტამონაცემები.",
  validatorNote:
    "ქვემოთ ინსტრუმენტი იყენებს ბრენდის მიმდინარე სესიას და არ ამოწმებს სერვერის გასაღებს, რეფერალის შენახვას ან ქსელურ კავშირს. სრული შემოწმებისთვის მიმართეთ ვალიდაციის მისამართს თქვენი სერვერიდან ახალი კლიკითა და შესაბამისი SKU-ით. ვალიდაცია წინასწარი შეფასებაა და შედეგს არ ჯავშნის.",
  payload: "გაყიდვის მონაცემები (JSON)",
  validate: "მონაცემების შემოწმება",
  validating: "მოწმდება…",
  freshExample: "ახალი მაგალითის ჩატვირთვა",
  validationError:
    "მონაცემები ვერ შემოწმდა. შეამოწმეთ კავშირი, საჭიროებისას ხელახლა შედით და გაიმეორეთ.",
  result: "შემოწმების შედეგი",
  requestId: "მოთხოვნის ID",
  previewAmount: "სავარაუდო საკომისიო (ლარი)",
  history: "ბოლო API მოთხოვნები",
  historyBody:
    "ამ ბრენდის ბოლო 20 ავთენტიფიცირებული მოთხოვნა. რეალური და საცდელი მოთხოვნები გამიჯნულია. ვინახავთ მაქსიმუმ 100 ჩანაწერს გასაღებების, მოთხოვნის მონაცემებისა და მომხმარებლის დეტალების გარეშე. არაავთენტიფიცირებული მოთხოვნები ბრენდს ვერ მიეკუთვნება და აქ არ ჩანს.",
  historyEmpty:
    "ავთენტიფიცირებული API მოთხოვნები ჯერ არ არის. პირველი ჩანაწერის სანახავად გაუშვით შემოწმება.",
  historyUnavailable:
    "მოთხოვნების ისტორია დროებით მიუწვდომელია. სცადეთ განახლება.",
  refresh: "მოთხოვნების განახლება",
  time: "დრო",
  mode: "რეჟიმი",
  status: "HTTP",
  outcome: "შედეგი",
  live: "რეალური გაყიდვა",
  validation: "შემოწმება",
  orders: "შეკვეთების გახსნა",
  verificationSteps:
    "რეალური გაყიდვისთვის იპოვეთ შეკვეთა და შეამოწმეთ შემქმნელის ატრიბუცია და საკომისიო. მხოლოდ წარმატებული შემოწმება მაღაზიას დაკავშირებულად არ მონიშნავს. სრული გაუქმება შესაძლებელია შეკვეთებში; ავტომატური დაბრუნების ვებჰუკები, ნაწილობრივი დაბრუნება და Shopify/WooCommerce ადაპტერები ჯერ ხელმისაწვდომი არ არის.",
  copy: "კოდის კოპირება",
  copied: "დაკოპირებულია",
  copyError: "კოპირება ვერ მოხერხდა. მონიშნეთ და ხელით დააკოპირეთ კოდი.",
  outcomes: {
    eligible:
      "შესაბამისია: კლიკი და პროდუქტი ემთხვევა. მიმდინარე მონაცემებით რეალური მოთხოვნა შექმნიდა ატრიბუციას.",
    no_click:
      "კლიკის ID არ არის: გაყიდვა გამართულია, მაგრამ შემქმნელის ატრიბუცია არ ექნება.",
    invalid_click:
      "კლიკი მიუღებელია: უცნობია, სხვა ბრენდს ეკუთვნის, გაყიდვის შემდეგ მოხდა ან გაყიდვის მომენტში 30 დღეზე ძველია.",
    sku_mismatch:
      "SKU არ ემთხვევა: შეკვეთის არცერთი ჩანაწერი არ ემთხვევა ბმულის პროდუქტს.",
    zero_net:
      "საკომისიოს ბაზა ნულია: შესაბამის ჩანაწერებს ფასდაკლებისა და დღგ-ის შემდეგ დადებითი ღირებულება არ აქვთ.",
    replay:
      "არსებული შეკვეთა: მონაცემები იდენტურია. ახალი გაყიდვა ან საკომისიო არ შეიქმნება; გაუქმებული გაყიდვა გაუქმებული დარჩება.",
    order_conflict: "შეკვეთის კონფლიქტი: ეს ID უკვე არსებობს სხვა მონაცემებით.",
    click_already_attributed:
      "კლიკი გამოყენებულია: მას უკვე აქვს შეკვეთაზე დარიცხული საკომისიო.",
    timestamp_out_of_range:
      "გაყიდვის დრო ±48 საათის გარეთაა: შეამოწმეთ occurredAt და სარტყელი.",
    accepted: "გაყიდვა ჩაიწერა ატრიბუციით.",
    unattributed: "გაყიდვა ჩაიწერა შემქმნელის ატრიბუციის გარეშე.",
    invalid_payload:
      "არასწორი მონაცემები: შეასწორეთ issues-ში ჩამოთვლილი ველები.",
    malformed_json:
      "არასწორი JSON: შეამოწმეთ ბრჭყალები, მძიმეები და ფრჩხილები.",
    payload_too_large: "მონაცემების ზომა აჭარბებს 256 KiB-ს.",
    temporarily_unavailable:
      "სერვისი დროებით მიუწვდომელია. გაიმეორეთ დაყოვნებით.",
  },
};

export function integrationCopy(locale: Locale) {
  return locale === "ka" ? ka : en;
}
export type IntegrationCopy = typeof en;
