"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, Pencil, Lock, Check } from "lucide-react";
import { getCategory } from "@/lib/categories";
import { formatCurrency, getMemberName } from "@/lib/utils";
import { deleteTemplate } from "@/app/actions/expenses";
import { LogTemplateButton } from "./log-template-button";
import { toast } from "sonner";
import type { Expense } from "@/lib/db/schema/expenses";
import type { GroupMember } from "@/lib/db/schema/group-members";
import Link from "next/link";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";

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
  canUseTemplates?: boolean;
}

export function TemplateSection({ templates, members, groupId, currency, isAdmin, canUseTemplates = true }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const getMember = (id: string) => members.find((m) => m.id === id);

  async function handleDelete(templateId: string, description: string) {
    const result = await deleteTemplate(templateId);
    if (!result.ok) toast.error(result.error);
    else toast.success(`"${description}" template removed`);
  }

  return (
    <div className="mb-2" data-tour="templates-section">
      {/* ── Section header ───────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 mb-3 group"
      >
        <div className="w-7 h-7 rounded-lg bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center shrink-0">
          <RefreshCw className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
        </div>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1 text-left">
          Recurring
        </span>
        {templates.length > 0 && (
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded-full tabular">
            {templates.length}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        )}
      </button>

      {/* ── Template list ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="glass rounded-2xl divide-y divide-white/40 dark:divide-slate-700/40 mb-4">
          {templates.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No recurring expenses yet.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add one below to auto-log monthly bills.</p>
            </div>
          ) : (
            templates.map(({ template, splits, loggedThisMonth, lastLoggedDate }) => {
              const cat = getCategory(template.category);
              const CatIcon = cat.icon;
              const payer = getMember(template.paidByMemberId);
              const splitCount = splits.length;

              return (
                <div key={template.id} className="px-4 py-3.5">
                  {/* Row 1: icon + info + amount */}
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                      <CatIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {template.description}
                        </p>
                        {loggedThisMonth && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800/60 leading-none shrink-0">
                            <Check className="w-2.5 h-2.5" />
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {template.recurrence === "weekly" ? "Weekly" : "Monthly"} · paid by {payer ? getMemberName(payer) : "?"} · {splitCount} {splitCount === 1 ? "person" : "people"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular shrink-0">
                      {formatCurrency(Number(template.amount), currency)}
                    </span>
                  </div>

                  {/* Row 2: actions */}
                  <div className="flex items-center gap-2 mt-2.5 ml-12">
                    <LogTemplateButton
                      templateId={template.id}
                      description={template.description}
                      loggedThisMonth={loggedThisMonth}
                      lastLoggedDate={lastLoggedDate}
                    />
                    {isAdmin && (
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <Link
                          href={`/groups/${groupId}/expenses/templates/${template.id}/edit`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                          title="Edit template"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(template.id, template.description)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Add template action ───────────────────────────────────────── */}
      {canUseTemplates ? (
        <Link
          href={`/groups/${groupId}/expenses/templates/new`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add recurring expense
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 dark:text-slate-500 transition-colors"
        >
          <Lock className="w-4 h-4" />
          Add recurring expense
          <span className="ml-0.5 inline-flex items-center bg-gradient-to-br from-cyan-500 to-teal-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            Plus
          </span>
        </button>
      )}
      <UpgradePrompt open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
