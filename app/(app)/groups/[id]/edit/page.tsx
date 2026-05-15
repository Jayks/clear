import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditTripForm } from "./edit-trip-form";
import type { Metadata } from "next";
import { getGroupName } from "@/lib/db/queries/meta";
import { getGroupConfig } from "@/lib/group-config";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const name = await getGroupName(id);
  return { title: name ? `Edit — ${name} | Clear` : "Clear" };
}

export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getGroupWithMembers(id);
  if (!data) notFound();

  const { group, currentMember } = data;

  if (currentMember?.role !== "admin") notFound();

  const config = getGroupConfig(group.groupType);

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/groups/${id}`}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {config.labels.singular.toLowerCase()}
      </Link>

      <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        Edit {config.labels.singular.toLowerCase()}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{group.name}</p>

      <div className="glass rounded-2xl p-6">
        <EditTripForm group={group} />
      </div>
    </div>
  );
}
