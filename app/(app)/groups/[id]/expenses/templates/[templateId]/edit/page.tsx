import { notFound } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getTemplateWithSplits } from "@/lib/db/queries/expenses";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditTemplateForm } from "./edit-template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>;
}) {
  const { id, templateId } = await params;
  const [data, templateData] = await Promise.all([
    getGroupWithMembers(id),
    getTemplateWithSplits(templateId),
  ]);

  if (!data || !templateData) notFound();
  const { group, members } = data;
  if (group.groupType !== "nest") notFound();

  return (
    <div className="max-w-xl mx-auto">
      <Link
        href={`/groups/${id}/expenses`}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to expenses
      </Link>

      <h1 className="text-2xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        Edit recurring expense
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{group.name}</p>

      <div className="glass rounded-2xl p-6">
        <EditTemplateForm
          group={group}
          members={members}
          template={templateData.template}
          splits={templateData.splits}
        />
      </div>
    </div>
  );
}
