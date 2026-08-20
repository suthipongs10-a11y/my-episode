"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function Submit({
  children,
  variant = "primary",
}: {
  children: ReactNode;
  variant?: "primary" | "quiet";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={variant === "primary" ? "btn btn-primary" : "btn btn-quiet"}
    >
      {pending ? "กำลังบันทึก…" : children}
    </button>
  );
}
