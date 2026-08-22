"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "วันนี้" },
  { href: "/leads", label: "คนทัก" },
  { href: "/board", label: "บอร์ดงาน" },
  { href: "/customers", label: "ลูกค้า" },
  { href: "/money", label: "การเงิน" },
  { href: "/renewals", label: "ต่ออายุ" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md px-2 py-1 font-semibold text-ink shadow-[inset_0_-2px_0_var(--accent)]"
                : "rounded-md px-2 py-1 text-muted hover:bg-surface-2 hover:text-ink"
            }
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
