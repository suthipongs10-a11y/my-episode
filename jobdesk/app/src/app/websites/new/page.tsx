import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { customerOptions } from "@/lib/queries";
import { Shell } from "@/components/shell";
import { WebsiteForm } from "@/components/website-form";

export const dynamic = "force-dynamic";

export default async function NewWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; job?: string }>;
}) {
  await requireSession();
  const { customer, job } = await searchParams;
  const customers = await customerOptions();
  const fixed = customer ? Number(customer) : undefined;

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <Link href="/renewals" className="text-xs text-muted hover:underline">
          ← กลับไปหน้าต่ออายุ
        </Link>
        <h1 className="mt-1 mb-4 text-xl font-semibold">เพิ่มเว็บที่ดูแล</h1>
        <WebsiteForm
          customers={customers}
          fixedCustomerId={Number.isInteger(fixed) ? fixed : undefined}
          originJobId={job ? Number(job) : undefined}
          back={job ? `/jobs/${job}` : undefined}
        />
      </div>
    </Shell>
  );
}
