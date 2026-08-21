"use client";

import { useRef, useTransition } from "react";
import { setRenewalStatusAction } from "@/lib/actions";
import { RENEWAL_STATUS } from "@/lib/status";

export function RenewalStatusSelect({ websiteId, status }: { websiteId: number; status: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <form ref={form} action={setRenewalStatusAction} className="contents">
      <input type="hidden" name="website_id" value={websiteId} />
      <select
        name="renewal_status"
        defaultValue={status}
        disabled={pending}
        aria-label="สถานะการต่ออายุ"
        onChange={() => start(() => form.current?.requestSubmit())}
        className="field w-auto py-1 text-xs"
      >
        {Object.entries(RENEWAL_STATUS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}
