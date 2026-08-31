import type { InputHTMLAttributes } from "react";

export function Field({
  id,
  label,
  error,
  hint,
  required,
  className,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="grid gap-2">
      <label className="type-small font-semibold text-ink" htmlFor={id}>
        {label}
        {required ? (
          <span className="ml-1 text-reversed" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <input
        {...inputProps}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={[
          "min-h-[44px] rounded-sm border bg-paper px-3 text-ink",
          "placeholder:text-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          error ? "border-reversed" : "border-slate-300 hover:border-slate-600",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {error ? (
        <p className="m-0 type-caption text-reversed" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="m-0 type-caption text-slate-600" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
