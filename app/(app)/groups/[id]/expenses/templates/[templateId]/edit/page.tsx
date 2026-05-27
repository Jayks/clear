import { notFound, redirect } from "next/navigation";
import { getGroupWithMembers } from "@/lib/db/queries/groups";
import { getTemplateWithSplits } from "@/lib/db/queries/expenses";
import { canUseTemplates } from "@/lib/subscription/gates";
import { ArrowLeft, Receipt } from "lucide-react";
import Link from "next/link";
import { EditTemplateForm } from "./edit-template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>;
}) {
  const { id, templateId } = await params;
  const [data, templateData, templatesAllowed] = await Promise.all([
    getGroupWithMembers(id),
    getTemplateWithSplits(templateId),
    canUseTemplates(id),
  ]);

  if (!data || !templateData) notFound();
  const { group, members } = data;
  if (group.groupType !== "nest") notFound();
  if (!templatesAllowed) redirect(`/groups/${id}/expenses`);

  return (
    <div>
      {/* Desktop header — mobile nav carries the icon + title */}
      <div className="hidden md:flex items-center gap-2 mb-6">
        <Link
          href={`/groups/${id}/expenses`}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to expenses
        </Link>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-cyan-500/30 shrink-0">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl text-slate-800 dark:text-slate-100" style={{ fontFamily: "var(--font-fraunces)" }}>
            Edit recurring expense
          </h1>
        </div>
      </div>

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
