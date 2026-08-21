"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

const CLASS = {
  primary: "btn btn-primary",
  outline: "btn",
  quiet: "btn btn-quiet",
} as const;

export function Submit({
  children,
  variant = "primary",
  pendingLabel = "กำลังบันทึก…",
}: {
  children: ReactNode;
  variant?: keyof typeof CLASS;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={CLASS[variant]}>
      {pending ? pendingLabel : children}
    </button>
  );
}
