"use client";
import { BrandLogo } from "@/components/branding/brand-logo";
import { brand } from "@/lib/branding";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="content-width loading-page">
      <BrandLogo alt={brand.name} />
      <h1>Let’s try that again.</h1>
      <p>Something interrupted the page. Your next refresh may help.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
