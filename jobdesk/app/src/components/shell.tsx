import Link from "next/link";
import type { ReactNode } from "react";
import { Nav } from "./nav";
import { logoutAction } from "@/lib/actions";

export function Shell({ children }: { children: ReactNode }) {
  const today = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          JobDesk
        </Link>
        <Nav />
        <div className="ml-auto flex items-center gap-3">
          <span className="num hidden text-xs text-muted sm:inline">{today}</span>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-quiet text-xs">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
