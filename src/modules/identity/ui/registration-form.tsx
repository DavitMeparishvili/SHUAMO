"use client";
import {
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import Link from "next/link";
import { Icon } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import { registrationSchema } from "../application/registration-input";

export function RegistrationForm({
  locale,
  role,
  existingEmail,
  pendingApplication = false,
}: {
  locale: Locale;
  role: "brand" | "creator";
  existingEmail?: string | undefined;
  pendingApplication?: boolean;
}) {
  const text = (en: string, ka: string) => (locale === "ka" ? ka : en);
  const [accountCreated, setAccountCreated] = useState(Boolean(existingEmail));
  const [complete, setComplete] = useState(pendingApplication);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<Record<string, string>>({});
  const [descriptionLength, setDescriptionLength] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const brand = role === "brand";
  const stages = [
    text("Account", "ანგარიში"),
    text("Channels", "არხები"),
    text("Profile", "პროფილი"),
    text("Review", "გადახედვა"),
  ];
  const fields = [
    "name",
    "contactName",
    "phone",
    "country",
    "city",
    "category",
    "language",
    "alias",
    "website",
    "description",
    "audienceSize",
    "audienceCountry",
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
  ];
  function changeStep(next: number) {
    setStep(next);
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  function validateStage(form: HTMLFormElement, current: number) {
    form.querySelectorAll('[aria-invalid="true"]').forEach((control) => {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("aria-describedby");
    });
    const controls = Array.from(
      form.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >(
        '[data-stage="' +
          current +
          '"] input,[data-stage="' +
          current +
          '"] select,[data-stage="' +
          current +
          '"] textarea',
      ),
    );
    const invalid = controls.find((el) => !el.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    const result = registrationSchema.safeParse(
      registrationData(new FormData(form)),
    );
    if (!result.success) {
      const issue = result.error.issues.find((issue) =>
        controls.some((control) => control.name === issue.path[0]),
      );
      if (issue) {
        showFieldError(form, String(issue.path[0]));
        return false;
      }
    }
    return true;
  }
  function registrationData(form: FormData) {
    return {
      ...Object.fromEntries(fields.map((k) => [k, String(form.get(k) ?? "")])),
      role,
      locale,
    };
  }
  function showFieldError(form: HTMLFormElement, field: string) {
    const control = form.querySelector<HTMLInputElement>(
      '[name="' + field + '"]',
    );
    setStep(
      Number(control?.closest("[data-stage]")?.getAttribute("data-stage") ?? 0),
    );
    const messages: Record<string, [string, string]> = {
      name: [
        "Enter a name with 2–120 characters, excluding surrounding spaces.",
        "შეიყვანე სახელი 2–120 სიმბოლოთი, კიდეებში გამოტოვებების გარეშე.",
      ],
      contactName: [
        "Enter your contact person's name.",
        "შეიყვანე საკონტაქტო პირის სახელი.",
      ],
      phone: [
        "Use digits, spaces, +, parentheses or hyphens for your phone number.",
        "ტელეფონის ნომერში გამოიყენე ციფრები, გამოტოვება, +, ფრჩხილები ან დეფისი.",
      ],
      website: [
        "Enter a complete website address beginning with https://.",
        "შეიყვანე ვებსაიტის სრული მისამართი, რომელიც იწყება https://-ით.",
      ],
    };
    const socialField = ["instagram", "tiktok", "youtube", "facebook"].includes(
      field,
    );
    const message =
      messages[field] ??
      (socialField
        ? [
            "Enter an https:// link to the social platform named above.",
            "შეიყვანე ზემოთ მითითებული სოციალური პლატფორმის https:// ბმული.",
          ]
        : [
            "Check this field and enter a valid value without blank spaces alone.",
            "შეამოწმე ეს ველი და შეიყვანე სწორი მნიშვნელობა, მხოლოდ გამოტოვებების გარეშე.",
          ]);
    setError(message[locale === "ka" ? 1 : 0]!);
    requestAnimationFrame(() => {
      control?.setAttribute("aria-invalid", "true");
      control?.setAttribute("aria-describedby", "registration-error");
      control?.focus();
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    if (!validateStage(element, step)) return;
    const form = new FormData(element);
    if (step < 3) {
      setReview(
        Object.fromEntries(
          [...form.entries()]
            .filter(([key]) => key !== "password")
            .map(([key, value]) => [key, String(value)]),
        ),
      );
      changeStep(step + 1);
      return;
    }
    const parsed = registrationSchema.safeParse(registrationData(form));
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]?.path[0] ?? "name");
      showFieldError(element, field);
      return;
    }
    setPending(true);
    setError("");
    try {
      if (!accountCreated) {
        const response = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
            locale,
          }),
        });
        if (!response.ok) {
          setStep(0);
          setError(
            response.status === 429
              ? text(
                  "Too many attempts. Please wait a minute, then try again. Your entries are saved here.",
                  "ძალიან ბევრი მცდელობაა. მოიცადე ერთი წუთი და სცადე ხელახლა. მონაცემები შენარჩუნებულია.",
                )
              : text(
                  "We could not create your account. Check your email and password. Already registered? Sign in to continue.",
                  "ანგარიშის შექმნა ვერ მოხერხდა. შეამოწმე ელფოსტა და პაროლი. უკვე გაქვს ანგარიში? გაიარე ავტორიზაცია.",
                ),
          );
          requestAnimationFrame(() =>
            document.getElementById("reg-email")?.focus(),
          );
          return;
        }
        setAccountCreated(true);
      }
      const response = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok && response.status !== 409) {
        setError(
          text(
            "Your account is created, but your profile could not be saved. Your entries are still here; please try again.",
            "ანგარიში შექმნილია, მაგრამ პროფილის შენახვა ვერ მოხერხდა. მონაცემები შენარჩუნებულია; სცადე ხელახლა.",
          ),
        );
        return;
      }
      setComplete(true);
    } catch {
      setError(
        text(
          "Connection interrupted. Your entries are still here. Please try again.",
          "კავშირი შეწყდა. მონაცემები შენარჩუნებულია. სცადე ხელახლა.",
        ),
      );
    } finally {
      setPending(false);
    }
  }
  if (complete)
    return (
      <div className="registration-status" role="status">
        <Icon name="check" width="36" height="36" />
        <h2>{text("Your application is in!", "შენი განაცხადი მიღებულია!")}</h2>
        <p>
          {text(
            "Your account and profile have been saved. An administrator will review your application before your workspace becomes available.",
            "შენი ანგარიში და პროფილი შენახულია. სამუშაო სივრცის გახსნამდე ადმინისტრატორი განიხილავს შენს განაცხადს.",
          )}
        </p>
        <Link className="x-button primary" href={"/" + locale + "/products"}>
          {text("Explore products", "პროდუქტების ნახვა")}
          <Icon name="arrow" />
        </Link>
      </div>
    );
  const input = (
    name: string,
    label: string,
    options: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="form-field" htmlFor={"reg-" + name}>
      <span>
        {label}
        {options.required && <em> *</em>}
      </span>
      <input id={"reg-" + name} name={name} {...options} />
    </label>
  );
  const categories = [
    ["fashion", "Fashion & accessories", "მოდა და აქსესუარები"],
    ["beauty", "Beauty & care", "სილამაზე და თავის მოვლა"],
    ["technology", "Technology", "ტექნოლოგია"],
    ["home", "Home & living", "სახლი და ინტერიერი"],
    ["food", "Food & drink", "საკვები და სასმელი"],
    ["travel", "Travel & outdoors", "მოგზაურობა და დასვენება"],
    ["other", "Other", "სხვა"],
  ];
  return (
    <>
      <h2>
        {text(
          brand ? "Create your brand account" : "Create your Xurjin account",
          brand
            ? "შექმენი შენი ბრენდის ანგარიში"
            : "შექმენი შენი Xurjin ანგარიში",
        )}
      </h2>
      <p className="intro">
        {text(
          "Four small steps to your next opportunity.",
          "ოთხი მარტივი ნაბიჯი ახალ შესაძლებლობამდე.",
        )}
      </p>
      <nav
        className="role-tabs"
        aria-label={text("Account type", "ანგარიშის ტიპი")}
      >
        <Link
          href={"/" + locale + "/sign-up?role=brand"}
          aria-current={brand ? "page" : undefined}
        >
          {text("Seller / Brand", "გამყიდველი / ბრენდი")}
        </Link>
        <Link
          href={"/" + locale + "/sign-up?role=creator"}
          aria-current={!brand ? "page" : undefined}
        >
          {text("Creator", "კრეატორი")}
        </Link>
      </nav>
      <ol
        className="registration-stepper"
        aria-label={text("Registration progress", "რეგისტრაციის პროგრესი")}
      >
        {stages.map((stage, index) => (
          <li
            key={stage}
            aria-current={step === index ? "step" : undefined}
            className={step > index ? "complete" : ""}
          >
            <span>
              {step > index ? <Icon name="check" width="16" /> : index + 1}
            </span>
            <strong>{stage}</strong>
          </li>
        ))}
      </ol>
      <h3 ref={heading} tabIndex={-1} className="registration-stage-title">
        {stages[step]}
      </h3>
      <form onSubmit={submit} ref={formRef} noValidate>
        {error && (
          <div className="form-error" id="registration-error" role="alert">
            {error}
          </div>
        )}
        {accountCreated && (
          <p className="registration-note">
            {text(
              "Account created. Finish your profile below.",
              "ანგარიში შექმნილია. შეავსე შენი პროფილი ქვემოთ.",
            )}{" "}
            {existingEmail}
          </p>
        )}
        <fieldset
          className="registration-stage"
          data-stage="0"
          hidden={step !== 0}
        >
          <legend className="sr-only">{stages[0]}</legend>
          <div className="registration-fields">
            {input(
              "name",
              text(
                brand ? "Company name" : "Full name",
                brand ? "კომპანიის დასახელება" : "სახელი და გვარი",
              ),
              {
                required: true,
                minLength: 2,
                maxLength: 120,
                autoComplete: brand ? "organization" : "name",
              },
            )}
            {brand
              ? input(
                  "contactName",
                  text("Contact person", "საკონტაქტო პირი"),
                  { required: true, maxLength: 160, autoComplete: "name" },
                )
              : input(
                  "alias",
                  text("Public name / alias", "ფსევდონიმი / საჯარო სახელი"),
                  {
                    maxLength: 160,
                    placeholder: text(
                      "How your audience knows you",
                      "სახელი, რომლითაც გიცნობს აუდიტორია",
                    ),
                  },
                )}
            {!accountCreated && (
              <>
                {input("email", text("Email", "ელფოსტა"), {
                  type: "email",
                  required: true,
                  autoComplete: "email",
                  placeholder: "you@example.com",
                })}
                <label className="form-field" htmlFor="reg-password">
                  <span>
                    {text("Password", "პაროლი")}
                    <em> *</em>
                  </span>
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                  <small>
                    {text("At least 8 characters", "მინიმუმ 8 სიმბოლო")}
                  </small>
                </label>
              </>
            )}
            {input(
              "phone",
              text("Phone (optional)", "ტელეფონი (არასავალდებულო)"),
              {
                type: "tel",
                autoComplete: "tel",
                maxLength: 30,
                placeholder: "+995 555 12 34 56",
              },
            )}
          </div>
        </fieldset>
        <fieldset
          className="registration-stage"
          data-stage="1"
          hidden={step !== 1}
        >
          <legend className="sr-only">{stages[1]}</legend>
          <p className="stage-description">
            {text(
              "Add the channels where your audience can find you. These fields are optional.",
              "დაამატე არხები, სადაც აუდიტორია გიპოვის. ამ ველების შევსება არასავალდებულოა.",
            )}
          </p>
          <div className="registration-fields">
            {["Instagram", "TikTok", "YouTube", "Facebook"].map((platform) => (
              <div key={platform}>
                {input(platform.toLowerCase(), platform, {
                  type: "url",
                  maxLength: 500,
                  placeholder: "https://" + platform.toLowerCase() + ".com/…",
                })}
              </div>
            ))}
            {input("website", text("Website", "ვებსაიტი"), {
              type: "url",
              maxLength: 500,
              placeholder: "https://",
            })}
          </div>
        </fieldset>
        <fieldset
          className="registration-stage"
          data-stage="2"
          hidden={step !== 2}
        >
          <legend className="sr-only">{stages[2]}</legend>
          <div className="registration-fields">
            {input("country", text("Country", "ქვეყანა"), {
              required: true,
              minLength: 2,
              maxLength: 80,
              autoComplete: "country-name",
              defaultValue: text("Georgia", "საქართველო"),
            })}
            {input("city", text("City", "ქალაქი"), {
              required: true,
              maxLength: 100,
              autoComplete: "address-level2",
              placeholder: text("Tbilisi", "თბილისი"),
            })}
            <label className="form-field" htmlFor="reg-category">
              <span>
                {text("Primary category", "ძირითადი კატეგორია")}
                <em> *</em>
              </span>
              <select
                name="category"
                id="reg-category"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {text("Choose a category", "აირჩიე კატეგორია")}
                </option>
                {categories.map(([value, en, ka]) => (
                  <option key={value} value={value}>
                    {locale === "ka" ? ka : en}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field" htmlFor="reg-language">
              <span>
                {text("Content language", "კონტენტის ენა")}
                <em> *</em>
              </span>
              <select
                name="language"
                id="reg-language"
                defaultValue={locale}
                required
              >
                <option value="ka">ქართული</option>
                <option value="en">English</option>
                <option value="both">
                  {text("Georgian & English", "ქართული და ინგლისური")}
                </option>
              </select>
            </label>
            {!brand && (
              <>
                <label className="form-field" htmlFor="reg-audienceSize">
                  <span>
                    {text(
                      "Follower range (optional)",
                      "მიმდევრების რაოდენობა (არასავალდებულო)",
                    )}
                  </span>
                  <select
                    name="audienceSize"
                    id="reg-audienceSize"
                    defaultValue=""
                  >
                    <option value="">
                      {text("Choose a range", "აირჩიე დიაპაზონი")}
                    </option>
                    {[
                      "under-1000",
                      "1000-10000",
                      "10000-50000",
                      "50000-100000",
                      "100000-plus",
                    ].map((v, i) => (
                      <option key={v} value={v}>
                        {
                          [
                            "< 1,000",
                            "1,000–10,000",
                            "10,000–50,000",
                            "50,000–100,000",
                            "100,000+",
                          ][i]
                        }
                      </option>
                    ))}
                  </select>
                  <small>
                    {text(
                      "Self-reported; not verified by Xurjin.",
                      "შენი მითითებული მონაცემი; Xurjin-ის მიერ არ მოწმდება.",
                    )}
                  </small>
                </label>
                {input(
                  "audienceCountry",
                  text(
                    "Primary audience country",
                    "აუდიტორიის ძირითადი ქვეყანა",
                  ),
                  { maxLength: 160 },
                )}
              </>
            )}
            <label className="form-field wide" htmlFor="reg-description">
              <span>
                {text(
                  brand ? "About your brand" : "About you",
                  brand ? "ბრენდის შესახებ" : "შენს შესახებ",
                )}
              </span>
              <textarea
                name="description"
                id="reg-description"
                maxLength={500}
                rows={3}
                onChange={(e) => setDescriptionLength(e.target.value.length)}
                placeholder={text(
                  "Tell us what you create and who you create it for.",
                  "მოგვიყევი რას ქმნი და ვისთვის.",
                )}
              />
              <small>{descriptionLength}/500</small>
            </label>
          </div>
        </fieldset>
        <section
          className="registration-stage registration-review"
          hidden={step !== 3}
          aria-label={text(
            "Review your application",
            "გადახედე შენს განაცხადს",
          )}
        >
          <p className="stage-description">
            {text(
              "Check your details before sending your application.",
              "გაგზავნამდე შეამოწმე შენი მონაცემები.",
            )}
          </p>
          <dl>
            {[
              [
                text("Account type", "ანგარიშის ტიპი"),
                text(
                  brand ? "Seller / Brand" : "Creator",
                  brand ? "გამყიდველი / ბრენდი" : "კრეატორი",
                ),
              ],
              [text("Name", "სახელი"), review.name],
              [
                text("Public name", "საჯარო სახელი"),
                brand ? review.name : review.alias || review.name,
              ],
              [text("Email", "ელფოსტა"), existingEmail || review.email],
              [
                text("Location", "მდებარეობა"),
                [review.city, review.country].filter(Boolean).join(", "),
              ],
              [
                text("Category", "კატეგორია"),
                categories.find((c) => c[0] === review.category)?.[
                  locale === "ka" ? 2 : 1
                ],
              ],
              [
                text("Channels", "არხები"),
                ["instagram", "tiktok", "youtube", "facebook", "website"]
                  .filter((k) => review[k])
                  .map((k) => review[k])
                  .join("\n") || text("Not added", "არ არის დამატებული"),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="registration-note">
            {text(
              "An administrator reviews every application. Your profile stays private until you choose to publish it. Profile photos can be added after approval.",
              "ყველა განაცხადს განიხილავს ადმინისტრატორი. პროფილი საჯარო გახდება მხოლოდ შენი არჩევანით. ფოტოების დამატებას შეძლებ დადასტურების შემდეგ.",
            )}
          </p>
        </section>
        <div className="registration-navigation">
          {step > 0 && (
            <button
              type="button"
              className="x-button outline"
              disabled={pending}
              onClick={() => changeStep(step - 1)}
            >
              {text("Back", "უკან")}
            </button>
          )}
          <button
            className="x-button primary"
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending
              ? text("Saving…", "ინახება…")
              : step === 3
                ? text("Submit application", "განაცხადის გაგზავნა")
                : text("Continue", "გაგრძელება")}
            <Icon name="arrow" />
          </button>
        </div>
        <p className="registration-login">
          {text("Already have an account?", "უკვე გაქვს ანგარიში?")}{" "}
          <Link href={"/" + locale + "/sign-in"}>
            {text("Sign in", "შესვლა")}
          </Link>
        </p>
      </form>
    </>
  );
}
