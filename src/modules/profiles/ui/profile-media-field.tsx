"use client";
import { useId, useState } from "react";
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
}: {
  label: string;
  name: string;
  initialValue: string;
  endpoint: string;
  kind: string;
  copy: MediaUploadCopy;
}) {
  const id = useId();
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setStatus(copy.tooLarge);
      return;
    }
    setStatus(copy.uploading);
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
      setStatus(copy.complete);
    } catch {
      setStatus(copy.failed);
    }
  }
  return (
    <div className="grid gap-2">
      <label className="font-semibold text-ink" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <input name={name} value={value} readOnly type="hidden" />
      <span className="type-caption text-slate-600" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
