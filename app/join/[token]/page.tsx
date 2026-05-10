import { getGroupByToken } from "@/lib/db/queries/groups";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Users, MapPin, Home } from "lucide-react";
import { JoinButton } from "./join-button";
import { formatDate } from "@/lib/utils";
import { getGroupConfig } from "@/lib/group-config";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getGroupByToken(token);
  if (!result) notFound();

  const { group, memberCount } = result;
  const config = getGroupConfig(group.groupType);
  const isNest = group.groupType === "nest";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/join/${token}`);
  }

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
                {isNest ? <Home className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
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
                <p className="text-white/75 text-sm mt-0.5">Shared tab</p>
              )}
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-5">
              <Users className="w-4 h-4" />
              {memberCount} {Number(memberCount) === 1 ? config.labels.members.toLowerCase().replace(/s$/, "") : config.labels.members.toLowerCase()} already in
            </div>

            {group.description && (
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-5">{group.description}</p>
            )}

            <JoinButton token={token} groupType={group.groupType} groupLabel={config.labels.singular} />
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          You&apos;re signed in as {user.email}
        </p>
      </div>
    </div>
  );
}
