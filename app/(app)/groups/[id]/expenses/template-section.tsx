"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { deleteTemplate } from "@/app/actions/expenses";
import { LogTemplateButton } from "./log-template-button";
import { toast } from "sonner";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import Link from "next/link";

interface Template {
  template: Expense;
  splits: { memberId: string }[];
  loggedThisMonth: boolean;
  lastLoggedDate: string | null;
}

interface Props {
  templates: Template[];
  members: GroupMember[];
  groupId: string;
  currency: string;
  isAdmin: boolean;
}

export function TemplateSection({ templates, members, groupId, currency, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(true);

  const getMember = (id: string) => members.find((m) => m.id === id);

  async function handleDelete(templateId: string, description: string) {
    const result = await deleteTemplate(templateId);
    if (!result.ok) toast.error(result.error);
    else toast.success(`"${description}" template removed`);
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 mb-3 group"
      >
        <RefreshCw className="w-3.5 h-3.5 text-teal-500" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex-1 text-left">
          Recurring ({templates.length})
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="glass rounded-2xl divide-y divide-white/40 dark:divide-slate-700/40 mb-3">
          {templates.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No recurring expenses yet.</p>
            </div>
          ) : (
            templates.map(({ template, splits, loggedThisMonth, lastLoggedDate }) => {
              const cat = getCategory(template.category);
              const CatIcon = cat.icon;
              const payer = getMember(template.paidByMemberId);
              const splitCount = splits.length;

              return (
                <div key={template.id} className="flex items-center gap-3 px-4 py-3">
                  {/* Category icon */}
                  <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center shrink-0`}>
                    <CatIcon className={`w-4 h-4 ${cat.textColor}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {template.description}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {template.recurrence === "weekly" ? "Weekly" : "Monthly"} · paid by {payer ? getMemberName(payer) : "?"} · {splitCount} {splitCount === 1 ? "person" : "people"}
                    </p>
                  </div>

                  {/* Amount */}
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0">
                    {formatCurrency(Number(template.amount), currency)}
                  </span>

                  {/* Log button */}
                  <LogTemplateButton
                    templateId={template.id}
                    description={template.description}
                    loggedThisMonth={loggedThisMonth}
                    lastLoggedDate={lastLoggedDate}
                  />

                  {/* Edit + Delete */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/groups/${groupId}/expenses/templates/${template.id}/edit`}
                        className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        title="Edit template"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(template.id, template.description)}
                        className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        title="Remove template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add template link */}
      <Link
        href={`/groups/${groupId}/expenses/templates/new`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add recurring expense
      </Link>
    </div>
  );
}
