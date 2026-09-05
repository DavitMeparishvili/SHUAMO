/* eslint-disable @next/next/no-img-element */
"use client";
import { useId, useRef, useState } from "react";
import { Icon } from "@/src/modules/design-system";
import { profileDesignCopy } from "./profile-design-copy";
import type { Locale } from "@/src/modules/localization";
const MAX_BYTES = 5 * 1024 * 1024;
export type MediaUploadCopy = {
  tooLarge: string;
  uploading: string;
  complete: string;
  failed: string;
};
export function ProfileMediaField({
  label,
  name,
  initialValue,
  endpoint,
  kind,
  copy,
  locale = "en",
  onDirty,
  onBusy,
}: {
  label: string;
  name: string;
  initialValue: string;
  endpoint: string;
  kind: string;
  copy: MediaUploadCopy;
  locale?: Locale;
  onDirty?: () => void;
  onBusy?: (busy: boolean) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropping, setCropping] = useState(false);
  const [position, setPosition] = useState(50);
  const ui = profileDesignCopy(locale);
  const isCover = kind === "brand-hero";
  const isLogo = kind === "brand-logo";
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setStatus(copy.tooLarge);
      return;
    }
    setStatus(copy.uploading);
    onBusy?.(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, contentType: file.type }),
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
      setValue(target.publicUrl);
      onDirty?.();
      setCropping(false);
      setStatus(copy.complete);
    } catch {
      setStatus(copy.failed);
    } finally {
      onBusy?.(false);
    }
  }
  async function crop() {
    onBusy?.(true);
    try {
      setStatus(copy.uploading);
      const source = new Image();
      source.crossOrigin = "anonymous";
      source.src = value;
      await source.decode();
      const ratio = isCover ? 4 : 1;
      const width = Math.min(source.naturalWidth, source.naturalHeight * ratio);
      const height = width / ratio;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(width, isCover ? 1600 : 800);
      canvas.height = canvas.width / ratio;
      canvas
        .getContext("2d")!
        .drawImage(
          source,
          ((source.naturalWidth - width) * position) / 100,
          ((source.naturalHeight - height) * position) / 100,
          width,
          height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("crop");
      await upload(
        new File([blob], "profile-crop.jpg", { type: "image/jpeg" }),
      );
    } catch {
      setStatus(copy.failed);
    } finally {
      onBusy?.(false);
    }
  }
  return (
    <div
      className={`profile-media-field ${isCover ? "cover" : isLogo ? "logo" : "portrait"}`}
    >
      <label className="profile-media-label" htmlFor={id}>
        {label}
      </label>
      <div className="profile-media-layout">
        <div className="profile-media-preview">
          {value ? (
            <img
              src={value}
              alt={label}
              style={{ objectPosition: `${position}% ${position}%` }}
            />
          ) : (
            <Icon name="image" />
          )}
          {isCover ? (
            <div className="profile-cover-controls">
              {value ? (
                <button
                  type="button"
                  className="profile-button"
                  onClick={() => setCropping(!cropping)}
                >
                  <Icon name="crop" />
                  {ui.reposition}
                </button>
              ) : null}
              <button
                type="button"
                className="profile-button"
                disabled={status === copy.uploading}
                onClick={() => inputRef.current?.click()}
              >
                <Icon name="image" />
                {ui.changeCover}
              </button>
            </div>
          ) : null}
        </div>
        {!isCover ? (
          <div className="profile-media-buttons">
            <button
              type="button"
              className="profile-button"
              disabled={status === copy.uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Icon name="image" />
              {isLogo ? ui.changeLogo : ui.changePhoto}
            </button>
            {!isLogo && value ? (
              <>
                <button
                  type="button"
                  className="profile-button muted"
                  onClick={() => setCropping(!cropping)}
                >
                  <Icon name="crop" />
                  {ui.crop}
                </button>
                <button
                  type="button"
                  className="profile-remove"
                  onClick={() => {
                    setValue("");
                    onDirty?.();
                  }}
                >
                  {ui.removePhoto}
                </button>
              </>
            ) : null}
            {isLogo ? <small>{ui.logoHint}</small> : null}
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <input name={name} value={value} readOnly type="hidden" />
      {cropping ? (
        <div className="profile-crop-controls">
          <label>
            {ui.position}
            <input
              type="range"
              min="0"
              max="100"
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="profile-button"
            onClick={() => void crop()}
            disabled={status === copy.uploading}
          >
            {ui.apply}
          </button>
          <button
            type="button"
            className="profile-button"
            onClick={() => {
              setPosition(50);
              setCropping(false);
            }}
          >
            {ui.cancel}
          </button>
        </div>
      ) : null}
      <span className="profile-caption" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
