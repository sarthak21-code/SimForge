"use client";

import { Target } from "lucide-react";
import type { SimSpec } from "@/lib/ai/schema";
import { ChallengeMode } from "./ChallengeMode";
import { getFallbackChallenge } from "../lib/runtime/fallback-challenge";

type Props = {
  challenge?: SimSpec["challenge"];
  params: Record<string, number | boolean | string>;
  spec: SimSpec;
};

export function ChallengeSection({ challenge, params, spec }: Props) {
  const activeChallenge = getFallbackChallenge(spec, challenge);

  return (
    <details
      aria-label="Challenge Mode"
      className="group overflow-hidden rounded-2xl border border-amber-300/20 bg-amber-300/[.04]"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-4 outline-none transition hover:bg-amber-300/[.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-200 sm:p-5">
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 rounded-lg border border-amber-200/20 bg-amber-300/10 p-2 text-amber-200">
            <Target size={17} />
          </span>
          <span>
            <span className="block text-base font-semibold text-slate-100">Challenge Mode</span>
            <span className="mt-1 block text-sm leading-5 text-slate-400">
              Test your understanding by completing a challenge based on this simulation.
            </span>
          </span>
        </span>
        <span className="rounded-lg border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 group-open:hidden">
          Open Challenge
        </span>
        <span className="hidden rounded-lg border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100 group-open:inline-flex">
          Close Challenge
        </span>
      </summary>

      <div className="border-t border-amber-200/10 p-4 sm:p-5">
        {activeChallenge ? (
          <ChallengeMode challenge={activeChallenge} params={params} spec={spec} />
        ) : (
          <p className="rounded-xl border border-white/[.07] bg-slate-950/40 p-4 text-sm text-slate-400">
            A challenge is not available for this simulation yet.
          </p>
        )}
      </div>
    </details>
  );
}
