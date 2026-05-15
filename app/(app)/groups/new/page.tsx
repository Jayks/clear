import { CreateTripForm } from "./create-trip-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewGroupPage() {
  return (
    <div className="max-w-xl mx-auto">
      <Link
        href="/groups"
        className="inline-flex items-center gap-1.5 min-h-[44px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to groups
      </Link>

      <h1 className="text-3xl text-slate-800 dark:text-slate-100 mb-1" style={{ fontFamily: "var(--font-fraunces)" }}>
        Create a group
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Choose a type and fill in the details.</p>

      <div className="glass rounded-2xl p-6">
        <CreateTripForm />
      </div>
    </div>
  );
}
