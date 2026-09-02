"use client";
import { useActionState } from "react";
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
}: {
  role: "brand" | "creator";
  profile: ProfileEditorRecord | null | undefined;
  products?: { id: string; title: string }[];
  saveAction: ProfileFormAction;
  publishAction: ProfileFormAction;
  unpublishAction: ProfileFormAction;
  copy: ProfileEditorCopy;
}) {
  const [saveState, saveFormAction] = useActionState(
    saveAction,
    INITIAL_PROFILE_ACTION_STATE,
  );
  const [publishState, publishFormAction] = useActionState(
    publishAction,
    INITIAL_PROFILE_ACTION_STATE,
  );
  const [unpublishState, unpublishFormAction] = useActionState(
    unpublishAction,
    INITIAL_PROFILE_ACTION_STATE,
  );
  const featuredIds = new Set(
    Array.isArray(profile?.featuredProductIds)
      ? (profile.featuredProductIds as string[])
      : [],
  );
  const mediaCopy: MediaUploadCopy = {
    tooLarge: copy.uploadTooLarge,
    uploading: copy.uploading,
    complete: copy.uploadComplete,
    failed: copy.uploadFailed,
  };
  return (
    <div className="grid gap-8">
      <form action={saveFormAction} className="grid gap-7" noValidate>
        <ActionMessage state={saveState} fieldLabels={fieldLabels(copy)} />
        <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1">
          <Field
            name="slug"
            label={copy.slug}
            value={profile?.slug ?? undefined}
            error={saveState.fieldErrors?.slug}
          />
          <Field
            name="categories"
            label={copy.categories}
            value={profile?.categories?.join(", ")}
            error={saveState.fieldErrors?.categories}
          />
          <Field
            name="taglineKa"
            label={copy.taglineKa}
            value={profile?.taglineKa}
          />
          <Field
            name="taglineEn"
            label={copy.taglineEn}
            value={profile?.taglineEn}
          />
          <Area
            name="descriptionKa"
            label={copy.descriptionKa}
            value={profile?.descriptionKa}
          />
          <Area
            name="descriptionEn"
            label={copy.descriptionEn}
            value={profile?.descriptionEn}
          />
          <Field
            name="locationKa"
            label={copy.locationKa}
            value={profile?.locationKa}
          />
          <Field
            name="locationEn"
            label={copy.locationEn}
            value={profile?.locationEn}
          />
        </div>
        <ProfileMediaField
          label={copy.hero}
          name="heroImageUrl"
          initialValue={profile?.heroImageUrl ?? ""}
          endpoint={`/api/${role}/profile/media/presign`}
          kind={`${role}-hero`}
          copy={mediaCopy}
        />
        {role === "brand" ? (
          <ProfileMediaField
            label={copy.logo}
            name="logoUrl"
            initialValue={profile?.logoUrl ?? ""}
            endpoint="/api/brand/profile/media/presign"
            kind="brand-logo"
            copy={mediaCopy}
          />
        ) : null}
        <SocialLinksEditor
          initialValue={profile?.socialLinks}
          copy={{
            label: copy.socials,
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
        {role === "brand" ? (
          <>
            <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1">
              <Area
                name="whatWeMakeKa"
                label={copy.whatWeMakeKa}
                value={localizedLines(profile?.whatWeMake, "ka", "label")}
              />
              <Area
                name="whatWeMakeEn"
                label={copy.whatWeMakeEn}
                value={localizedLines(profile?.whatWeMake, "en", "label")}
              />
              <Area
                name="interestsKa"
                label={copy.interestsKa}
                value={localizedLines(profile?.collaborationInterests, "ka")}
              />
              <Area
                name="interestsEn"
                label={copy.interestsEn}
                value={localizedLines(profile?.collaborationInterests, "en")}
              />
            </div>
            <fieldset className="grid gap-3">
              <legend className="font-semibold text-ink">
                {copy.evidence}
              </legend>
              {products.map((product) => (
                <label
                  className="flex min-h-11 items-center gap-3"
                  key={product.id}
                >
                  <input
                    type="checkbox"
                    name="featuredProductIds"
                    value={product.id}
                    defaultChecked={featuredIds.has(product.id)}
                  />
                  {product.title}
                </label>
              ))}
            </fieldset>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1">
              <Field
                name="languages"
                label={copy.languages}
                value={profile?.languages?.join(", ")}
              />
              <Field
                name="contentFormats"
                label={copy.contentFormats}
                value={profile?.contentFormats?.join(", ")}
              />
            </div>
            <CreatorWorkEditor
              initialValue={profile?.featuredWork}
              mediaCopy={mediaCopy}
              copy={{
                label: copy.evidence,
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
          </>
        )}
        <div className="flex flex-wrap gap-3">
          <SubmitButton label={copy.save} pendingLabel={copy.pending} />
          <a
            className="inline-flex min-h-11 items-center rounded-pill border border-slate-300 px-5 font-semibold text-ink no-underline"
            href="#profile-preview"
          >
            {copy.preview}
          </a>
        </div>
      </form>
      <div className="grid gap-3 border-t border-slate-200 pt-6">
        <ActionMessage
          state={
            unpublishState.status !== "idle" ? unpublishState : publishState
          }
          fieldLabels={fieldLabels(copy)}
        />
        {profile?.status === "PUBLISHED" ? (
          <form action={unpublishFormAction}>
            <SubmitButton
              label={copy.unpublish}
              pendingLabel={copy.pending}
              variant="outline"
            />
          </form>
        ) : (
          <form action={publishFormAction}>
            <SubmitButton label={copy.publish} pendingLabel={copy.pending} />
          </form>
        )}
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
}: {
  label: string;
  pendingLabel: string;
  variant?: "signal" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
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
  return (
    <label className="grid gap-2 font-semibold text-ink">
      {label}
      <input
        className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
        name={name}
        defaultValue={value}
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
}: {
  name: string;
  label: string;
  value: string | undefined;
}) {
  return (
    <label className="grid gap-2 font-semibold text-ink">
      {label}
      <textarea
        className="min-h-28 rounded-sm border border-slate-300 bg-paper p-3 font-normal"
        name={name}
        defaultValue={value}
      />
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
