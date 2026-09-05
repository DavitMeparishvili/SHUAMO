"use client";
import { useState } from "react";
import {
  SOCIAL_PLATFORMS,
  type SocialLink,
  type SocialPlatform,
} from "../domain/profile-content";

export function SocialLinksEditor({
  initialValue,
  copy,
}: {
  initialValue: unknown;
  copy: {
    label: string;
    platform: string;
    url: string;
    add: string;
    remove: string;
    platformLabels: Record<SocialPlatform, string>;
  };
}) {
  const initial = Array.isArray(initialValue)
    ? initialValue.map((item, index) => ({
        id: `saved-${index}`,
        ...(item as SocialLink),
      }))
    : [];
  const [rows, setRows] = useState(initial);
  const [nextId, setNextId] = useState(initial.length);
  return (
    <fieldset className="grid gap-3">
      <legend className="font-semibold text-ink">{copy.label}</legend>
      {rows.map((row) => (
        <div
          className="grid grid-cols-[minmax(9rem,0.7fr)_minmax(12rem,2fr)_auto] items-end gap-3 max-[700px]:grid-cols-1"
          key={row.id}
        >
          <label className="grid gap-2 type-small font-semibold text-ink">
            {copy.platform}
            <select
              className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
              name="socialPlatform"
              value={row.platform}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? {
                          ...item,
                          platform: event.target.value as SocialPlatform,
                        }
                      : item,
                  ),
                )
              }
            >
              {SOCIAL_PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {copy.platformLabels[platform]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 type-small font-semibold text-ink">
            {copy.url}
            <input
              className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
              name="socialUrl"
              type="url"
              inputMode="url"
              value={row.url}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id
                      ? { ...item, url: event.target.value }
                      : item,
                  ),
                )
              }
              required
            />
          </label>
          <button
            className="min-h-11 rounded-pill border border-slate-300 px-4 type-small font-semibold"
            type="button"
            onClick={() =>
              setRows((current) => current.filter((x) => x.id !== row.id))
            }
          >
            {copy.remove}
          </button>
        </div>
      ))}
      <button
        className="min-h-11 w-fit rounded-pill border border-slate-300 px-4 type-small font-semibold disabled:opacity-50"
        type="button"
        disabled={rows.length >= 5}
        onClick={() => {
          setRows((current) => [
            ...current,
            { id: `new-${nextId}`, platform: "website", url: "" },
          ]);
          setNextId((value) => value + 1);
        }}
      >
        {copy.add}
      </button>
    </fieldset>
  );
}
