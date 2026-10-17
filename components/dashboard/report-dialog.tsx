"use client";
import { useEffect, useRef } from "react";
import { Flag, X } from "lucide-react";
import type { Bathroom, ReportReason } from "@/types/inventory";

export function ReportDialog({
  bathroom,
  close,
  submit,
}: {
  bathroom: Bathroom;
  close: () => void;
  submit: (reason: ReportReason) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  function dismiss() {
    ref.current?.close();
    close();
  }
  return (
    <dialog
      ref={ref}
      className="report-dialog"
      onCancel={(e) => {
        e.preventDefault();
        dismiss();
      }}
      aria-labelledby="report-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ref.current?.close();
          submit("restock");
        }}
      >
        <button
          type="button"
          className="dialog-close icon-button"
          onClick={dismiss}
          aria-label="Close report"
        >
          <X size={19} />
        </button>
        <span className="dialog-icon">
          <Flag size={24} />
        </span>
        <p className="eyebrow">A LITTLE HEADS-UP HELPS</p>
        <h2 id="report-title">Request a restock?</h2>
        <p>
          {bathroom.building} · Room {bathroom.room}
        </p>
        <p>Let our volunteers know that products are running low or empty.</p>
        <button className="button" type="submit">
          Send a little heads-up <Flag size={15} />
        </button>
        <p className="dialog-note">
          This flags the location for our community volunteers.
        </p>
      </form>
    </dialog>
  );
}
