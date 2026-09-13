"use client";
import { useParams } from "next/navigation";
export default function ProductError({ reset }: { reset: () => void }) {
  const { locale } = useParams();
  return (
    <div className="pl-empty" role="alert">
      <h2>
        {locale === "ka"
          ? "მონაცემები ვერ ჩაიტვირთა"
          : "Could not load product data"}
      </h2>
      <button className="pl-button" onClick={reset}>
        {locale === "ka" ? "ხელახლა ცდა" : "Try again"}
      </button>
    </div>
  );
}
