import Link from "next/link";
import { Compass, MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-cyan-500/25">
          <Compass className="w-8 h-8 text-white" />
        </div>
        <p className="text-5xl font-bold text-slate-200 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          404
        </p>
        <h1 className="text-xl font-semibold text-slate-800 mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
          Lost on the road
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          This page doesn't exist — the destination may have moved or the link is wrong.
        </p>
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-md shadow-cyan-500/20 transition-all"
        >
          <MapPin className="w-4 h-4" />
          Back to your trips
        </Link>
      </div>
    </div>
  );
}
