/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";
import type { MediaUploadCopy } from "./profile-media-field";

type Work = {
  id: string;
  title: { ka: string; en: string };
  url: string;
  imageUrl: string;
};
const MAX_BYTES = 5 * 1024 * 1024;

export function CreatorWorkEditor({
  initialValue,
  copy,
  mediaCopy,
  onDirty,
  onBusy,
}: {
  initialValue: unknown;
  copy: {
    label: string;
    titleKa: string;
    titleEn: string;
    destination: string;
    image: string;
    add: string;
    remove: string;
    up: string;
    down: string;
    maximum: string;
  };
  mediaCopy: MediaUploadCopy;
  onDirty?: (() => void) | undefined;
  onBusy?: ((id: string, busy: boolean) => void) | undefined;
}) {
  const initial = Array.isArray(initialValue)
    ? initialValue.map((item, index) => {
        const work = item as Omit<Work, "id">;
        return { id: `saved-${index}`, ...work };
      })
    : [];
  const [rows, setRows] = useState<Work[]>(initial);
  const [nextId, setNextId] = useState(initial.length);
  const move = (index: number, offset: number) =>
    setRows((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  return (
    <fieldset className="grid gap-4">
      <legend className="font-semibold text-ink">{copy.label}</legend>
      {rows.map((row, index) => (
        <WorkRow
          key={row.id}
          row={row}
          index={index}
          last={rows.length - 1}
          copy={copy}
          mediaCopy={mediaCopy}
          onBusy={(busy) => onBusy?.(row.id, busy)}
          onDirty={onDirty}
          onImage={(imageUrl) =>
            setRows((current) =>
              current.map((item) =>
                item.id === row.id ? { ...item, imageUrl } : item,
              ),
            )
          }
          onRemove={() =>
            setRows((current) => current.filter((item) => item.id !== row.id))
          }
          onMove={move}
        />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="min-h-11 rounded-pill border border-slate-300 px-4 type-small font-semibold disabled:opacity-50"
          type="button"
          disabled={rows.length >= 6}
          onClick={() => {
            setRows((current) => [
              ...current,
              {
                id: `new-${nextId}`,
                title: { ka: "", en: "" },
                url: "",
                imageUrl: "",
              },
            ]);
            setNextId((value) => value + 1);
          }}
        >
          {copy.add}
        </button>
        <span className="type-caption text-slate-600">
          {copy.maximum.replace("{count}", String(rows.length))}
        </span>
      </div>
    </fieldset>
  );
}

function WorkRow({
  row,
  index,
  last,
  copy,
  mediaCopy,
  onImage,
  onRemove,
  onMove,
  onBusy,
  onDirty,
}: {
  row: Work;
  index: number;
  last: number;
  copy: Parameters<typeof CreatorWorkEditor>[0]["copy"];
  mediaCopy: MediaUploadCopy;
  onImage: (url: string) => void;
  onRemove: () => void;
  onMove: (index: number, offset: number) => void;
  onDirty?: (() => void) | undefined;
  onBusy?: ((busy: boolean) => void) | undefined;
}) {
  const [status, setStatus] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setStatus(mediaCopy.tooLarge);
      return;
    }
    setStatus(mediaCopy.uploading);
    onBusy?.(true);
    try {
      const response = await fetch("/api/creator/profile/media/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "creator-work", contentType: file.type }),
      });
      if (!response.ok) throw new Error("presign");
      const target = (await response.json()) as {
        uploadUrl: string;
        publicUrl: string;
      };
      const put = await fetch(target.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("upload");
      onImage(target.publicUrl);
      onDirty?.();
      setStatus(mediaCopy.complete);
    } catch {
      setStatus(mediaCopy.failed);
    } finally {
      onBusy?.(false);
    }
  }
  return (
    <div className="grid gap-4 rounded-sm border border-slate-200 p-4">
      <div className="grid grid-cols-2 gap-4 max-[700px]:grid-cols-1">
        <Input name="workTitleKa" label={copy.titleKa} value={row.title.ka} />
        <Input name="workTitleEn" label={copy.titleEn} value={row.title.en} />
        <Input
          name="workUrl"
          label={copy.destination}
          value={row.url}
          type="url"
        />
        <label className="grid gap-2 type-small font-semibold text-ink">
          {copy.image}
          {row.imageUrl ? (
            <img
              src={row.imageUrl}
              alt={row.title.en || row.title.ka}
              className="profile-work-editor-image"
            />
          ) : null}
          <input
            disabled={status === mediaCopy.uploading}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <input
            name="workImageUrl"
            value={row.imageUrl}
            readOnly
            type="hidden"
          />
          <span className="type-caption text-slate-600" aria-live="polite">
            {status}
          </span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <RowButton disabled={index === 0} onClick={() => onMove(index, -1)}>
          {copy.up}
        </RowButton>
        <RowButton disabled={index === last} onClick={() => onMove(index, 1)}>
          {copy.down}
        </RowButton>
        <RowButton onClick={onRemove}>{copy.remove}</RowButton>
      </div>
    </div>
  );
}

function Input({
  name,
  label,
  value,
  type = "text",
}: {
  name: string;
  label: string;
  value: string;
  type?: string;
}) {
  const [text, setText] = useState(value);
  return (
    <label className="grid gap-2 type-small font-semibold text-ink">
      {label}
      <input
        className="min-h-11 rounded-sm border border-slate-300 bg-paper px-3 font-normal"
        name={name}
        value={text}
        onChange={(event) => setText(event.target.value)}
        type={type}
        required
      />
    </label>
  );
}

function RowButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="min-h-11 rounded-pill border border-slate-300 px-4 type-small font-semibold disabled:opacity-50"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
