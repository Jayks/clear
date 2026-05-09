"use client";

import { joinTrip } from "@/app/actions/members";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function JoinButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleJoin() {
    setLoading(true);
    const result = await joinTrip(token);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("You've joined the trip!");
    router.push(`/trips/${result.tripId}`);
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full py-2.5 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-xl shadow-md shadow-cyan-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? "Joining…" : "Join this trip"}
    </button>
  );
}
