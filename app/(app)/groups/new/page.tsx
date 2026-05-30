import { CreateTripForm } from "./create-trip-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { GroupType } from "@/lib/group-config";

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function NewGroupPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const defaultGroupType: GroupType =
    type === "nest" ? "nest" : "trip";

  return (
    <div>
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </Link>

      <h1 className="text-3xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        {defaultGroupType === "nest" ? "Create a Nest" : "Create a Trip"}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
        Only the name is required — everything else can be added later.
      </p>

      <div className="glass rounded-2xl p-6">
        <CreateTripForm defaultGroupType={defaultGroupType} />
      </div>
    </div>
  );
}
