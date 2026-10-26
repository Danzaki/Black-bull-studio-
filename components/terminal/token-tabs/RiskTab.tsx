"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { RugCheckReport } from "@/hooks/useRugCheck";
import { Skeleton, SectionTitle, EmptyState } from "./shared";

export default function RiskTab({
  report,
  reportLoading,
}: {
  report: RugCheckReport | null;
  reportLoading: boolean;
}) {
  return (
            <section className="max-w-5xl">
              <SectionTitle title="Security analysis" />

              {reportLoading && !report ? (
                <div className="space-y-3">
                  <Skeleton className="h-36 w-full" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ) : !report ? (
                <EmptyState
                  title="Security data unavailable"
                  description="The security provider did not return a report for this token."
                />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-bb-border bg-bb-surface p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                          RugCheck score
                        </p>
                        <p
                          className={`mt-1 text-4xl font-bold tabular-nums ${
                            report.scoreNormalised < 30
                              ? "text-bb-up"
                              : report.scoreNormalised < 60
                                ? "text-amber-400"
                                : "text-bb-down"
                          }`}
                        >
                          {report.scoreNormalised}
                          <span className="ml-1 text-base text-zinc-500">
                            /100
                          </span>
                        </p>
                      </div>

                      <div className="w-full max-w-sm">
                        <div className="mb-2 flex justify-between text-[11px] uppercase tracking-widest text-zinc-500">
                          <span>Risk</span>
                          <span>
                            {report.scoreNormalised < 30
                              ? "Lower"
                              : report.scoreNormalised < 60
                                ? "Moderate"
                                : "Higher"}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-bb-raised">
                          <div
                            className={`h-full rounded-full ${
                              report.scoreNormalised < 30
                                ? "bg-bb-up"
                                : report.scoreNormalised < 60
                                  ? "bg-amber-400"
                                  : "bg-bb-down"
                            }`}
                            style={{
                              width: `${Math.min(
                                Math.max(report.scoreNormalised, 0),
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <SecurityCheck
                      label="Mint authority"
                      safe={report.mintAuthorityRevoked}
                    />
                    <SecurityCheck
                      label="Freeze authority"
                      safe={report.freezeAuthorityRevoked}
                    />
                  </div>

                  {report.risks.length > 0 && (
                    <div>
                      <SectionTitle title="Flagged risks" />
                      <div className="space-y-2">
                        {report.risks.map((risk, index) => (
                          <div
                            key={`${risk.name}-${index}`}
                            className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4"
                          >
                            <p className="text-sm font-semibold text-amber-400">
                              {risk.name}
                            </p>
                            <p className="mt-1.5 text-sm leading-5 text-zinc-400">
                              {risk.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
  );
}

function SecurityCheck({
  label,
  safe,
}: {
  label: string;
  safe: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-bb-border bg-bb-surface p-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <p
          className={`mt-1 text-sm font-semibold ${
            safe ? "text-bb-up" : "text-bb-down"
          }`}
        >
          {safe ? "Revoked" : "Active"}
        </p>
      </div>
{safe ? (
        <ShieldCheck className="h-5 w-5 text-bb-up" />
      ) : (
        <ShieldAlert className="h-5 w-5 text-bb-down" />
      )}
    </div>
  );
}
