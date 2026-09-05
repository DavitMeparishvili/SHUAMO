"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Icon } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import { BrandProfile, type BrandProfileView } from "./brand-profile";
import { CreatorProfile, type CreatorProfileView } from "./creator-profile";
import { profileDesignCopy } from "./profile-design-copy";
import {
  ProfileTags,
  ProfileFormats,
  FeaturedProductsEditor,
} from "./profile-form-controls";
import {
  commaSeparated,
  pairedLocalizedLines,
  explicitSocialLinks,
  creatorWorkRows,
} from "../application/profile-editor-form";
import { useFormStatus } from "react-dom";
import { Button } from "@/src/modules/design-system";
import {
  INITIAL_PROFILE_ACTION_STATE,
  type ProfileActionState,
} from "../application/profile-editor-form";
import { CreatorWorkEditor } from "./creator-work-editor";
import { ProfileMediaField, type MediaUploadCopy } from "./profile-media-field";
import { SocialLinksEditor } from "./social-links-editor";

type ProfileEditorRecord = {
  hasUnpublishedChanges?: boolean;
  slug?: string | null;
  status?: string;
  taglineKa?: string;
  taglineEn?: string;
  descriptionKa?: string;
  descriptionEn?: string;
  locationKa?: string;
  locationEn?: string;
  categories?: string[];
  heroImageUrl?: string;
  logoUrl?: string;
  socialLinks?: unknown;
  featuredProductIds?: unknown;
  featuredWork?: unknown;
  whatWeMake?: unknown;
  collaborationInterests?: unknown;
  languages?: string[];
  contentFormats?: string[];
};
export const PROFILE_EDITOR_COPY_KEYS = [
  "slug",
  "taglineKa",
  "taglineEn",
  "descriptionKa",
  "descriptionEn",
  "locationKa",
  "locationEn",
  "categories",
  "hero",
  "logo",
  "socials",
  "socialPlatform",
  "socialUrl",
  "addSocial",
  "socialWebsite",
  "socialInstagram",
  "socialTiktok",
  "socialYoutube",
  "socialFacebook",
  "socialLinkedin",
  "remove",
  "evidence",
  "whatWeMakeKa",
  "whatWeMakeEn",
  "interestsKa",
  "interestsEn",
  "languages",
  "contentFormats",
  "workTitleKa",
  "workTitleEn",
  "workDestination",
  "workImage",
  "addWork",
  "moveUp",
  "moveDown",
  "workMaximum",
  "save",
  "publish",
  "unpublish",
  "preview",
  "pending",
  "uploadTooLarge",
  "uploading",
  "uploadComplete",
  "uploadFailed",
] as const;
export type ProfileEditorCopy = Record<
  (typeof PROFILE_EDITOR_COPY_KEYS)[number],
  string
>;
type ProfileFormAction = (
  state: ProfileActionState,
  data: FormData,
) => Promise<ProfileActionState>;

export function ProfileEditor({
  role,
  profile,
  products = [],
  saveAction,
  publishAction,
  unpublishAction,
  copy,
  locale = "en",
  name = "",
  brandCopy,
  creatorCopy,
}: {
  role: "brand" | "creator";
  profile: ProfileEditorRecord | null | undefined;
  products?: {
    id: string;
    title: string;
    imageUrls?: string[];
    backlinkUrl?: string;
  }[];
  saveAction: ProfileFormAction;
  publishAction: ProfileFormAction;
  unpublishAction: ProfileFormAction;
  copy: ProfileEditorCopy;
  locale?: Locale;
  name?: string;
  brandCopy?: Parameters<typeof BrandProfile>[0]["copy"];
  creatorCopy?: Parameters<typeof CreatorProfile>[0]["copy"];
}) {
  const ui = profileDesignCopy(locale);
  const [mode, setMode] = useState<"view" | "edit">(profile ? "view" : "edit");
  const [tab, setTab] = useState("details");
  const [dirty, setDirty] = useState(false);
  const [uploads, setUploads] = useState<Set<string>>(() => new Set());
  const uploadBusy = (id: string, busy: boolean) =>
    setUploads((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isPublic = profile?.status === "PUBLISHED";
  const [saveState, saveFormAction, isSaving] = useActionState(
    async (state: ProfileActionState, data: FormData) => {
      const result = await saveAction(state, data);
      if (result.status === "success") {
        setDirty(false);
        setDraft(null);
      }
      return result;
    },
    INITIAL_PROFILE_ACTION_STATE,
  );
  const [publicationState, publicationFormAction] = useActionState(
    async (state: ProfileActionState, data: FormData) =>
      data.get("publication") === "unpublish"
        ? unpublishAction(state, data)
        : publishAction(state, data),
    INITIAL_PROFILE_ACTION_STATE,
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const mediaCopy: MediaUploadCopy = {
    tooLarge: copy.uploadTooLarge,
    uploading: copy.uploading,
    complete: copy.uploadComplete,
    failed: copy.uploadFailed,
  };
  const lang = locale === "ka" ? "Ka" : "En";
  const other = locale === "ka" ? "En" : "Ka";
  const textValue = (key: string) =>
    (profile as Record<string, unknown> | undefined)?.[key] as
      string | undefined;
  const markDirty = () => setDirty(true);
  const showPreview = () => {
    if (formRef.current) {
      const data = new FormData(formRef.current);
      setDraft({
        ...Object.fromEntries(data),
        categories: commaSeparated(data.get("categories")),
        languages: commaSeparated(data.get("languages")),
        contentFormats: commaSeparated(data.get("contentFormats")),
        socialLinks: explicitSocialLinks(data),
        featuredWork: creatorWorkRows(data),
        featuredProductIds: data.getAll("featuredProductIds"),
        whatWeMake: pairedLocalizedLines(
          data.get("whatWeMakeKa"),
          data.get("whatWeMakeEn"),
        ).map((label) => ({ label })),
        collaborationInterests: pairedLocalizedLines(
          data.get("interestsKa"),
          data.get("interestsEn"),
        ),
      });
    }
    setMode("view");
    window.scrollTo({ top: 0 });
  };
  const cancel = () => {
    if (dirty && !window.confirm(ui.discard)) return;
    setRevision((value) => value + 1);
    setDirty(false);
    setDraft(null);
    setMode("view");
    window.scrollTo({ top: 0 });
  };
  const shown = {
    slug: null,
    taglineKa: "",
    taglineEn: "",
    descriptionKa: "",
    descriptionEn: "",
    locationKa: "",
    locationEn: "",
    heroImageUrl: "",
    logoUrl: "",
    categories: [],
    languages: [],
    contentFormats: [],
    ...profile,
    ...draft,
  };
  const featuredIds = Array.isArray(shown.featuredProductIds)
    ? (shown.featuredProductIds as string[])
    : [];
  const previewName =
    typeof draft?.profileName === "string" ? draft.profileName : name;
  const preview =
    role === "brand" && brandCopy ? (
      <BrandProfile
        locale={locale}
        profile={
          {
            ...shown,
            brand: { name: previewName },
            featuredProducts: featuredIds.flatMap((id) => {
              const product = products.find((item) => item.id === id);
              return product
                ? [
                    {
                      ...product,
                      description: "",
                      imageUrls: product.imageUrls ?? [],
                      backlinkUrl:
                        product.backlinkUrl ??
                        `/${locale}/brand/products/${product.id}`,
                    },
                  ]
                : [];
            }),
          } as BrandProfileView
        }
        copy={brandCopy}
      />
    ) : creatorCopy ? (
      <CreatorProfile
        locale={locale}
        profile={
          {
            ...shown,
            creator: { displayName: previewName },
          } as CreatorProfileView
        }
        copy={creatorCopy}
      />
    ) : null;
  const hero = (
    <ProfileMediaField
      label={role === "brand" ? ui.cover : ui.photo}
      name="heroImageUrl"
      initialValue={profile?.heroImageUrl ?? ""}
      endpoint={`/api/${role}/profile/media/presign`}
      kind={`${role}-hero`}
      copy={mediaCopy}
      locale={locale}
      onDirty={markDirty}
      onBusy={(busy) => uploadBusy("hero", busy)}
    />
  );
  const socials = (
    <SocialLinksEditor
      initialValue={profile?.socialLinks}
      copy={{
        label: ui.social,
        platform: copy.socialPlatform,
        url: copy.socialUrl,
        add: copy.addSocial,
        remove: copy.remove,
        platformLabels: {
          website: copy.socialWebsite,
          instagram: copy.socialInstagram,
          tiktok: copy.socialTiktok,
          youtube: copy.socialYoutube,
          facebook: copy.socialFacebook,
          linkedin: copy.socialLinkedin,
        },
      }}
    />
  );
  const work =
    role === "brand" ? (
      <FeaturedProductsEditor
        products={products}
        initialValue={profile?.featuredProductIds}
        locale={locale}
        onDirty={markDirty}
      />
    ) : (
      <CreatorWorkEditor
        initialValue={profile?.featuredWork}
        mediaCopy={mediaCopy}
        onDirty={markDirty}
        onBusy={(id, busy) => uploadBusy("work-" + id, busy)}
        copy={{
          label: ui.work,
          titleKa: copy.workTitleKa,
          titleEn: copy.workTitleEn,
          destination: copy.workDestination,
          image: copy.workImage,
          add: copy.addWork,
          remove: copy.remove,
          up: copy.moveUp,
          down: copy.moveDown,
          maximum: copy.workMaximum,
        }}
      />
    );
  return (
    <div
      className="profile-workspace"
      data-profile-mode={mode}
      data-profile-role={role}
    >
      <div hidden={mode !== "view"}>
        <div className={`profile-owner-banner ${isPublic ? "" : "private"}`}>
          <Icon name={isPublic ? "eye" : "lock"} />
          <div>
            <strong>
              {dirty
                ? ui.unsaved
                : isPublic
                  ? ui.previewTitle
                  : ui.privatePreview}
            </strong>
            {isPublic ? (
              <small>
                {profile?.hasUnpublishedChanges
                  ? locale === "ka"
                    ? "შენახული ცვლილებები ჯერ არ გამოქვეყნებულა."
                    : "Your saved changes have not been published yet."
                  : dirty
                    ? ui.preview
                    : ui.previewInfo}
              </small>
            ) : null}
          </div>
          <button
            type="button"
            className="profile-button"
            onClick={() => {
              setMode("edit");
              window.scrollTo({ top: 0 });
            }}
          >
            <Icon name="edit" />
            {ui.edit}
          </button>
        </div>
        {preview}
      </div>
      <div hidden={mode !== "edit"}>
        <header className="profile-editor-heading">
          <button
            className="profile-back"
            type="button"
            aria-label={ui.preview}
            onClick={showPreview}
          >
            <Icon name="arrow" />
          </button>
          <div>
            <h1>
              <span className="profile-desktop-label">
                {role === "brand" ? ui.brandTitle : ui.creatorTitle}
              </span>
              <span className="profile-mobile-label">
                {role === "brand" ? ui.brandTitle : ui.edit}
              </span>
            </h1>
            {role === "brand" ? <p>{ui.intro}</p> : null}
          </div>
          <span
            className={`profile-visibility ${isPublic ? "public" : "private"}`}
          >
            <Icon name={isPublic ? "check" : "lock"} />
            {isPublic ? ui.public : ui.draft}
          </span>
          <button
            className="profile-button"
            type="button"
            onClick={showPreview}
            disabled={isSaving || uploads.size > 0}
          >
            <Icon name="eye" />
            {ui.preview}
          </button>
        </header>
        <nav className="profile-tabs" aria-label={ui.edit}>
          {[
            ["details", role === "brand" ? ui.details : ui.about],
            ["media", ui.media],
            ["work", role === "brand" ? ui.products : ui.work],
            ["links", ui.links],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id!)}
            >
              {label}
            </button>
          ))}
        </nav>
        <form
          key={revision}
          ref={formRef}
          action={saveFormAction}
          className="profile-edit-form"
          noValidate
          onReset={(event) => event.preventDefault()}
          onSubmit={(event) => {
            if (uploads.size) event.preventDefault();
          }}
          onChange={markDirty}
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("fieldset button"))
              markDirty();
          }}
        >
          <ActionMessage
            state={saveState}
            fieldLabels={{
              ...fieldLabels(copy),
              profileName: role === "brand" ? ui.name : ui.displayName,
            }}
          />
          <fieldset disabled={isSaving} className="profile-form-fields">
            <div
              className={`profile-details-grid ${role}`}
              hidden={tab !== "details" && tab !== "media"}
            >
              <div className="profile-main-media">{hero}</div>
              {role === "brand" ? (
                <div className="profile-logo-media">
                  <ProfileMediaField
                    label={ui.logo}
                    name="logoUrl"
                    initialValue={profile?.logoUrl ?? ""}
                    endpoint="/api/brand/profile/media/presign"
                    kind="brand-logo"
                    copy={mediaCopy}
                    locale={locale}
                    onDirty={markDirty}
                    onBusy={(busy) => uploadBusy("logo", busy)}
                  />
                </div>
              ) : null}
              <div className="profile-primary-fields" hidden={tab === "media"}>
                <div className="profile-field-pair">
                  <Field
                    name="profileName"
                    label={role === "brand" ? ui.name : ui.displayName}
                    value={name}
                  />
                  {role === "brand" ? (
                    <Field
                      name={`tagline${lang}`}
                      label={ui.tagline}
                      value={textValue(`tagline${lang}`)}
                    />
                  ) : (
                    <Field
                      name={`location${lang}`}
                      label={ui.location}
                      value={textValue(`location${lang}`)}
                    />
                  )}
                </div>
                {role === "brand" ? (
                  <Field
                    name={`location${lang}`}
                    label={ui.location}
                    value={textValue(`location${lang}`)}
                  />
                ) : (
                  <Area
                    name={`tagline${lang}`}
                    label={ui.bio}
                    value={textValue(`tagline${lang}`)}
                    limit={160}
                  />
                )}
                <Area
                  name={`description${lang}`}
                  label={role === "brand" ? ui.description : ui.optionalAbout}
                  value={textValue(`description${lang}`)}
                  limit={role === "brand" ? 500 : 280}
                />
                <div className={role === "brand" ? "profile-field-pair" : ""}>
                  <ProfileTags
                    name="categories"
                    label={
                      role === "brand" ? ui.productCategories : ui.categories
                    }
                    initialValue={profile?.categories ?? []}
                    maximum={5}
                    locale={locale}
                    onDirty={markDirty}
                  />
                  {role === "brand" ? (
                    <ProfileTags
                      name={`interests${lang}`}
                      label={ui.interests}
                      initialValue={localizedLines(
                        profile?.collaborationInterests,
                        locale,
                      )
                        .split("\n")
                        .filter(Boolean)}
                      separator={"\n"}
                      maximum={4}
                      locale={locale}
                      onDirty={markDirty}
                    />
                  ) : null}
                </div>
                {role === "creator" ? (
                  <div className="profile-field-pair">
                    <ProfileTags
                      name="languages"
                      label={ui.languages}
                      initialValue={profile?.languages ?? []}
                      maximum={8}
                      locale={locale}
                      onDirty={markDirty}
                    />
                    <ProfileFormats
                      initialValue={profile?.contentFormats ?? []}
                      locale={locale}
                      onDirty={markDirty}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="profile-editor-sections">
              <details
                className="profile-editor-section profile-work-section"
                open={tab === "work"}
                hidden={tab === "media" || tab === "links"}
              >
                <summary>
                  <Icon name={role === "brand" ? "box" : "image"} />
                  <span>
                    <strong>{role === "brand" ? ui.featured : ui.work}</strong>
                    {role === "creator" ? <small>{ui.workHint}</small> : null}
                  </span>
                  <Icon name="chevron" />
                </summary>
                <div className="profile-section-content">{work}</div>
              </details>
              <details
                className="profile-editor-section profile-links-section"
                open={tab === "links"}
                hidden={tab === "media" || tab === "work"}
              >
                <summary>
                  <Icon name="link" />
                  <span>
                    <strong>{ui.social}</strong>
                    {role === "creator" ? <small>{ui.socialHint}</small> : null}
                  </span>
                  <Icon name="chevron" />
                </summary>
                <div className="profile-section-content">{socials}</div>
              </details>
              <details
                className="profile-editor-section"
                hidden={tab !== "details"}
              >
                <summary>
                  <Icon name="settings" />
                  <span>
                    <strong>{ui.translations}</strong>
                  </span>
                  <Icon name="chevron" />
                </summary>
                <div className="profile-section-content profile-field-pair">
                  <Field
                    name="slug"
                    label={copy.slug}
                    value={profile?.slug ?? ""}
                    error={saveState.fieldErrors?.slug}
                  />
                  <Field
                    name={`tagline${other}`}
                    label={copy[`tagline${other}`]}
                    value={textValue(`tagline${other}`)}
                  />
                  <Field
                    name={`location${other}`}
                    label={copy[`location${other}`]}
                    value={textValue(`location${other}`)}
                  />
                  <Area
                    name={`description${other}`}
                    label={copy[`description${other}`]}
                    value={textValue(`description${other}`)}
                  />
                  {role === "brand" ? (
                    <>
                      <Area
                        name="whatWeMakeKa"
                        label={copy.whatWeMakeKa}
                        value={localizedLines(
                          profile?.whatWeMake,
                          "ka",
                          "label",
                        )}
                      />
                      <Area
                        name="whatWeMakeEn"
                        label={copy.whatWeMakeEn}
                        value={localizedLines(
                          profile?.whatWeMake,
                          "en",
                          "label",
                        )}
                      />
                      <Area
                        name={`interests${other}`}
                        label={copy[`interests${other}`]}
                        value={localizedLines(
                          profile?.collaborationInterests,
                          locale === "ka" ? "en" : "ka",
                        )}
                      />
                    </>
                  ) : null}
                </div>
              </details>
            </div>
          </fieldset>
          <footer className="profile-savebar">
            <div className={dirty ? "is-dirty" : ""}>
              <span className="save-status-dot" />
              <span>
                {dirty ? ui.unsaved : ui.saved}
                <small>
                  {isPublic
                    ? locale === "ka"
                      ? "მონახაზი პირადია. საჯარო ვერსია იცვლება მხოლოდ გამოქვეყნებით."
                      : "Draft edits stay private until you publish changes."
                    : ui.privateHint}
                </small>
              </span>
            </div>
            <button
              className="profile-button"
              type="button"
              onClick={cancel}
              disabled={isSaving || uploads.size > 0}
            >
              {ui.cancel}
            </button>
            <SubmitButton
              disabled={uploads.size > 0}
              label={ui.saveDraft}
              pendingLabel={copy.pending}
            />
          </footer>
        </form>
        <details className="profile-editor-section profile-account-section">
          <summary>
            <Icon name="shield" />
            <span>
              <strong>{ui.account}</strong>
              <small>{ui.accountHint}</small>
            </span>
            <Icon name="chevron" />
          </summary>
          <div className="profile-section-content">
            <p>{isPublic ? ui.public : ui.draft}</p>
            {isPublic ? (
              <form action={publicationFormAction}>
                <p>
                  {locale === "ka"
                    ? "გამოაქვეყნეთ შენახული მონახაზი საჯარო პროფილის გასაახლებლად."
                    : "Publish your saved draft to update the public profile."}
                </p>
                <input type="hidden" name="publication" value="publish" />
                <SubmitButton
                  label={
                    locale === "ka"
                      ? "ცვლილებების გამოქვეყნება"
                      : "Publish changes"
                  }
                  pendingLabel={copy.pending}
                  disabled={dirty || uploads.size > 0}
                />
              </form>
            ) : null}
            <ActionMessage
              state={publicationState}
              fieldLabels={fieldLabels(copy)}
            />
            {isPublic ? (
              <form action={publicationFormAction}>
                <input type="hidden" name="publication" value="unpublish" />
                <SubmitButton
                  label={copy.unpublish}
                  pendingLabel={copy.pending}
                  variant="outline"
                />
              </form>
            ) : (
              <form action={publicationFormAction}>
                <input type="hidden" name="publication" value="publish" />
                <SubmitButton
                  label={copy.publish}
                  pendingLabel={copy.pending}
                />
              </form>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}

function ActionMessage({
  state,
  fieldLabels,
}: {
  state: ProfileActionState;
  fieldLabels: Record<string, string>;
}) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <div
      className={
        state.status === "error"
          ? "rounded-sm border border-red-300 bg-red-50 p-3 text-red-900"
          : "rounded-sm border border-emerald-300 bg-emerald-50 p-3 text-emerald-900"
      }
      role={state.status === "error" ? "alert" : "status"}
    >
      <p>{state.message}</p>
      {state.fieldErrors && Object.keys(state.fieldErrors).length ? (
        <ul className="mt-2 list-disc pl-5 type-small">
          {Object.entries(state.fieldErrors).map(([field, message]) => (
            <li
              key={field}
            >{`${fieldLabels[field] ?? fieldLabels.profile}: ${message}`}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function fieldLabels(copy: ProfileEditorCopy): Record<string, string> {
  return {
    profile: copy.evidence,
    slug: copy.slug,
    categories: copy.categories,
    taglineKa: copy.taglineKa,
    taglineEn: copy.taglineEn,
    descriptionKa: copy.descriptionKa,
    descriptionEn: copy.descriptionEn,
    locationKa: copy.locationKa,
    locationEn: copy.locationEn,
    heroImageUrl: copy.hero,
    logoUrl: copy.logo,
    socialLinks: copy.socials,
    whatWeMake: copy.whatWeMakeEn,
    featuredProductIds: copy.evidence,
    featuredWork: copy.evidence,
    languages: copy.languages,
    contentFormats: copy.contentFormats,
  };
}

function SubmitButton({
  label,
  pendingLabel,
  variant,
  disabled,
}: {
  label: string;
  pendingLabel: string;
  variant?: "signal" | "outline";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled}
      {...(variant ? { variant } : {})}
      pending={pending}
      pendingLabel={pendingLabel}
    >
      {label}
    </Button>
  );
}

function Field({
  name,
  label,
  value,
  error,
}: {
  name: string;
  label: string;
  value: string | undefined;
  error?: string | undefined;
}) {
  const [text, setText] = useState(value ?? "");
  return (
    <label className="grid gap-2 font-semibold text-ink">
      {label}
      <input
        className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
        name={name}
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <span className="type-caption text-red-700">{error}</span>
      ) : null}
    </label>
  );
}

function Area({
  name,
  label,
  value,
  limit,
}: {
  name: string;
  label: string;
  value: string | undefined;
  limit?: number;
}) {
  const [text, setText] = useState(value ?? "");
  const length = text.length;
  return (
    <label className="grid gap-2 font-semibold text-ink">
      {label}
      <textarea
        aria-label={label}
        maxLength={Math.max(limit ?? 4000, value?.length ?? 0)}
        className="min-h-28 rounded-sm border border-slate-300 bg-paper p-3 font-normal"
        name={name}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      {limit ? (
        <small className="profile-counter">
          {length}/{Math.max(limit, value?.length ?? 0)}
        </small>
      ) : null}
    </label>
  );
}

function localizedLines(value: unknown, locale: "ka" | "en", nested?: string) {
  return Array.isArray(value)
    ? value
        .map((row) => {
          const source = nested
            ? (row as Record<string, unknown>)[nested]
            : row;
          return (source as { en?: string; ka?: string })[locale] ?? "";
        })
        .join("\n")
    : "";
}
