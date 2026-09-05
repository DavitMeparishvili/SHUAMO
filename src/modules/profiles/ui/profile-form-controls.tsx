/* eslint-disable @next/next/no-img-element */
"use client";
import { useId, useState } from "react";
import { Icon } from "@/src/modules/design-system";
import type { Locale } from "@/src/modules/localization";
import { profileDesignCopy } from "./profile-design-copy";

export function ProfileFormats({
  initialValue,
  locale,
  onDirty,
}: {
  initialValue: string[];
  locale: Locale;
  onDirty: () => void;
}) {
  const [values, setValues] = useState(initialValue);
  const [custom, setCustom] = useState("");
  const options = [
    ...new Set(["Editorial", "Short video", ...initialValue, ...values]),
  ];
  const ui = profileDesignCopy(locale);
  const addLabel = locale === "ka" ? "ფორმატის დამატება" : "Add format";
  function addFormat() {
    const value = custom.trim();
    if (!value || values.includes(value) || values.length >= 8) return;
    setValues([...values, value]);
    setCustom("");
    onDirty();
  }
  return (
    <fieldset className="profile-format-options">
      <legend>{ui.formats}</legend>
      <div>
        {options.map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={values.includes(value)}
              disabled={!values.includes(value) && values.length >= 8}
              onChange={(event) => {
                setValues(
                  event.target.checked
                    ? [...values, value]
                    : values.filter((item) => item !== value),
                );
                onDirty();
              }}
            />
            {locale === "ka" && value === "Editorial"
              ? "სარედაქციო"
              : locale === "ka" && value === "Short video"
                ? "მოკლე ვიდეო"
                : value}
          </label>
        ))}
      </div>
      <details className="profile-custom-format">
        <summary>{addLabel}</summary>
        <div>
          <input
            aria-label={addLabel}
            value={custom}
            maxLength={60}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addFormat();
              }
            }}
          />
          <button
            className="profile-button"
            type="button"
            onClick={addFormat}
            disabled={!custom.trim() || values.length >= 8}
          >
            {ui.add}
          </button>
        </div>
      </details>
      <input type="hidden" name="contentFormats" value={values.join(",")} />
    </fieldset>
  );
}

export function ProfileTags({
  name,
  label,
  initialValue,
  maximum,
  locale,
  onDirty,
  separator = ",",
}: {
  name: string;
  label: string;
  initialValue: string[];
  maximum: number;
  locale: Locale;
  onDirty: () => void;
  separator?: string;
}) {
  const [values, setValues] = useState(initialValue);
  const [text, setText] = useState("");
  const id = useId();
  const ui = profileDesignCopy(locale);
  function add() {
    const value = text.trim();
    if (!value || values.includes(value) || values.length >= maximum) return;
    setValues([...values, value]);
    setText("");
    onDirty();
  }
  return (
    <div className="profile-tag-field">
      <label htmlFor={id}>{label}</label>
      <div className="profile-tag-input">
        {values.map((value, index) => (
          <span className="profile-edit-chip" key={index}>
            {value}
            <button
              type="button"
              aria-label={(locale === "ka" ? "წაშლა" : "Remove") + " " + value}
              onClick={() => {
                setValues(values.filter((_, i) => i !== index));
                onDirty();
              }}
            >
              <Icon name="close" />
            </button>
          </span>
        ))}
        {values.length < maximum ? (
          <input
            id={id}
            value={text}
            maxLength={60}
            onChange={(event) => setText(event.target.value)}
            onBlur={add}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add();
              }
            }}
            aria-label={label}
          />
        ) : (
          <input
            id={id}
            className="sr-only"
            readOnly
            value=""
            aria-label={label}
          />
        )}
        {text.trim() ? (
          <button type="button" className="profile-tag-add" onClick={add}>
            {ui.add}
          </button>
        ) : null}
      </div>
      <input type="hidden" name={name} value={values.join(separator)} />
    </div>
  );
}
export function FeaturedProductsEditor({
  products,
  initialValue,
  locale,
  onDirty,
}: {
  products: { id: string; title: string; imageUrls?: string[] }[];
  initialValue: unknown;
  locale: Locale;
  onDirty: () => void;
}) {
  const [ids, setIds] = useState<string[]>(
    Array.isArray(initialValue) ? initialValue : [],
  );
  const ui = profileDesignCopy(locale);
  function move(index: number, offset: number) {
    const next = [...ids];
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setIds(next);
    onDirty();
  }
  return (
    <fieldset className="profile-products-editor">
      <legend>{ui.featured}</legend>
      <p className="profile-caption">
        {ids.length}/3 {ui.selected}
      </p>
      {ids.map((id, index) => {
        const product = products.find((item) => item.id === id);
        return (
          <div className="profile-selected-product" key={id}>
            <input type="hidden" name="featuredProductIds" value={id} />
            {product?.imageUrls?.[0] ? (
              <img src={product.imageUrls[0]} alt="" />
            ) : null}
            <span>
              {product?.title ??
                (locale === "ka"
                  ? "\u10d0\u10e0\u10e5\u10d8\u10d5\u10e8\u10d8"
                  : "Archived product")}
            </span>
            <button
              type="button"
              className="profile-button"
              aria-label={
                (locale === "ka"
                  ? "\u10ec\u10d0\u10e8\u10da\u10d0"
                  : "Remove") +
                " " +
                (product?.title ?? id)
              }
              onClick={() => {
                setIds(ids.filter((item) => item !== id));
                onDirty();
              }}
            >
              <Icon name="close" />
            </button>
            <button
              type="button"
              className="profile-button"
              disabled={index === 0}
              aria-label={
                (locale === "ka"
                  ? "\u10d6\u10d4\u10db\u10dd\u10d7"
                  : "Move up") +
                " " +
                product?.title
              }
              onClick={() => move(index, -1)}
            >
              <Icon name="arrow" style={{ transform: "rotate(-90deg)" }} />
            </button>
            <button
              type="button"
              className="profile-button"
              disabled={index === ids.length - 1}
              aria-label={
                (locale === "ka" ? "ქვემოთ" : "Move down") +
                " " +
                product?.title
              }
              onClick={() => move(index, 1)}
            >
              <Icon name="arrow" style={{ transform: "rotate(90deg)" }} />
            </button>
          </div>
        );
      })}
      {products.map((product) => (
        <label className="profile-product-choice" key={product.id}>
          <input
            type="checkbox"
            checked={ids.includes(product.id)}
            disabled={!ids.includes(product.id) && ids.length >= 3}
            onChange={(event) => {
              setIds(
                event.target.checked
                  ? [...ids, product.id]
                  : ids.filter((id) => id !== product.id),
              );
              onDirty();
            }}
          />
          {product.title}
        </label>
      ))}
      {!products.length ? <p>{ui.emptyProducts}</p> : null}
    </fieldset>
  );
}
