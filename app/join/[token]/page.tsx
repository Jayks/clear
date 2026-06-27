import { getGroupByToken } from "@/lib/db/queries/groups";
import { getMembership } from "@/lib/db/queries/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Users, MapPin, Building2, Coins } from "lucide-react";
import { JoinButton } from "./join-button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getGroupConfig } from "@/lib/group-config";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getGroupByToken(token);
  if (!result) notFound();

  const { group, memberCount, unclaimedGuests, expenseCount, totalAmount, creatorName } = result;
  const config = getGroupConfig(group.groupType);
  const isNest = group.groupType === "nest";
  const isCircle = group.groupType === "circle";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const membership = await getMembership(group.id, user.id);
    if (membership) redirect(`/groups/${group.id}`);
  }

  const userDisplayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="glass rounded-2xl overflow-hidden">
          {/* Cover */}
          <div className="h-44 relative">
            {group.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.coverPhotoUrl} alt={group.name} className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${isNest ? "from-teal-500 to-emerald-500" : "from-cyan-500 to-teal-500"}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />

            {/* Type badge */}
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 bg-black/30 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {isCircle ? <Coins className="w-3 h-3" /> : isNest ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                {config.labels.singular}
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-white text-2xl" style={{ fontFamily: "var(--font-fraunces)" }}>
                {group.name}
              </h1>
              {!isNest && (group.startDate || group.endDate) && (
                <p className="text-white/75 text-sm mt-0.5">
                  {group.startDate ? formatDate(group.startDate) : ""}
                  {group.startDate && group.endDate ? " → " : ""}
                  {group.endDate ? formatDate(group.endDate) : ""}
                </p>
              )}
              {isNest && (
                <p className="text-white/75 text-sm mt-0.5">Nest</p>
              )}
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium px-3 py-1.5 rounded-full">
                <Users className="w-3.5 h-3.5" />
                {memberCount} {Number(memberCount) === 1 ? config.labels.members.toLowerCase().replace(/s$/, "") : config.labels.members.toLowerCase()} already in
              </span>
            </div>

            {/* What's inside — expense context strip (trip/nest only) */}
            {!isCircle && (
              <div className="glass-sm rounded-xl p-3 mb-4">
                {expenseCount === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    💡 No expenses yet — you&apos;ll be there from the start
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-700 dark:text-slate-200">
                      💸 <span className="font-medium">{creatorName}</span> has logged{" "}
                      {expenseCount} {expenseCount === 1 ? "expense" : "expenses"}
                    </p>
                    {totalAmount !== null && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Roughly{" "}
                        {formatCurrency(
                          Number(totalAmount ?? 0) / (Number(memberCount) + 1),
                          group.defaultCurrency,
                        )}{" "}
                        per person to settle up
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {group.description && (
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-5">{group.description}</p>
            )}

            <JoinButton
              token={token}
              groupId={group.id}
              groupType={group.groupType}
              groupLabel={config.labels.singular}
              isLoggedIn={!!user}
              unclaimedGuests={unclaimedGuests}
              userDisplayName={userDisplayName}
            />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
          {user ? `Signed in as ${user.email}` : "You'll be asked to sign in before joining."}
        </p>
      </div>
    </div>
  );
}
