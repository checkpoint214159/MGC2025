"use client";

import { useState } from "react";
import { generatePatientReportAction, type PatientReport } from "@/lib/actions";
import { ensureAction } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// ── Inline SVG charts ─────────────────────────────────────────────────────────

const W = 560;
const H = 160;
const PAD = { top: 12, right: 16, bottom: 28, left: 32 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function PainChart({ series }: { series: { day: number; pain: number }[] }) {
    if (series.length < 2) {
        return (
            <p className="text-sm text-gray-400 italic">
                Not enough pain data to plot (need ≥ 2 days).
            </p>
        );
    }

    const maxDay = Math.max(...series.map((p) => p.day));
    const minDay = Math.min(...series.map((p) => p.day));
    const xScale = (day: number) =>
        ((day - minDay) / Math.max(maxDay - minDay, 1)) * INNER_W;
    const yScale = (pain: number) => INNER_H - (pain / 10) * INNER_H;

    const points = series
        .map((p) => `${xScale(p.day)},${yScale(p.pain)}`)
        .join(" ");

    const yTicks = [0, 2, 4, 6, 8, 10];
    const xTicks = series.filter(
        (_, i) => i % Math.ceil(series.length / 6) === 0,
    );

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            aria-label="Pain score over recovery days"
        >
            <g transform={`translate(${PAD.left},${PAD.top})`}>
                {/* Grid + Y labels */}
                {yTicks.map((v) => (
                    <g key={v}>
                        <line
                            x1={0}
                            x2={INNER_W}
                            y1={yScale(v)}
                            y2={yScale(v)}
                            stroke="#e5e7eb"
                            strokeWidth={1}
                        />
                        <text
                            x={-6}
                            y={yScale(v) + 4}
                            fontSize={9}
                            textAnchor="end"
                            fill="#9ca3af"
                        >
                            {v}
                        </text>
                    </g>
                ))}

                {/* X labels */}
                {xTicks.map((p) => (
                    <text
                        key={p.day}
                        x={xScale(p.day)}
                        y={INNER_H + 16}
                        fontSize={9}
                        textAnchor="middle"
                        fill="#9ca3af"
                    >
                        d{p.day}
                    </text>
                ))}

                {/* Axis labels */}
                <text
                    x={-PAD.left + 6}
                    y={INNER_H / 2}
                    fontSize={9}
                    fill="#6b7280"
                    transform={`rotate(-90, ${-PAD.left + 6}, ${INNER_H / 2})`}
                    textAnchor="middle"
                >
                    pain /10
                </text>
                <text
                    x={INNER_W / 2}
                    y={INNER_H + 26}
                    fontSize={9}
                    fill="#6b7280"
                    textAnchor="middle"
                >
                    recovery day
                </text>

                {/* Pain line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeLinejoin="round"
                />

                {/* Dots */}
                {series.map((p) => (
                    <circle
                        key={p.day}
                        cx={xScale(p.day)}
                        cy={yScale(p.pain)}
                        r={3}
                        fill="#ef4444"
                    />
                ))}
            </g>
        </svg>
    );
}

function ComplianceChart({
    data,
}: {
    data: { date: string; pct: number | null }[];
}) {
    const withData = data.filter((d) => d.pct !== null);
    if (withData.length === 0) {
        return (
            <p className="text-sm text-gray-400 italic">
                No compliance data logged yet.
            </p>
        );
    }

    const barW = Math.min(32, INNER_W / withData.length - 4);
    const gap = INNER_W / withData.length;

    const barColor = (pct: number) =>
        pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";

    const yTicks = [0, 25, 50, 75, 100];

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            aria-label="Daily plan completion"
        >
            <g transform={`translate(${PAD.left},${PAD.top})`}>
                {/* Grid + Y labels */}
                {yTicks.map((v) => (
                    <g key={v}>
                        <line
                            x1={0}
                            x2={INNER_W}
                            y1={INNER_H - (v / 100) * INNER_H}
                            y2={INNER_H - (v / 100) * INNER_H}
                            stroke="#e5e7eb"
                            strokeWidth={1}
                        />
                        <text
                            x={-6}
                            y={INNER_H - (v / 100) * INNER_H + 4}
                            fontSize={9}
                            textAnchor="end"
                            fill="#9ca3af"
                        >
                            {v}%
                        </text>
                    </g>
                ))}

                {/* Bars */}
                {withData.map((d, i) => {
                    const pct = d.pct!;
                    const barH = (pct / 100) * INNER_H;
                    const x = i * gap + (gap - barW) / 2;
                    const label = d.date.slice(5); // MM-DD
                    return (
                        <g key={d.date}>
                            <rect
                                x={x}
                                y={INNER_H - barH}
                                width={barW}
                                height={barH}
                                fill={barColor(pct)}
                                rx={2}
                            />
                            {withData.length <= 14 && (
                                <text
                                    x={x + barW / 2}
                                    y={INNER_H + 14}
                                    fontSize={8}
                                    textAnchor="middle"
                                    fill="#9ca3af"
                                >
                                    {label}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* Axis labels */}
                <text
                    x={-PAD.left + 6}
                    y={INNER_H / 2}
                    fontSize={9}
                    fill="#6b7280"
                    transform={`rotate(-90, ${-PAD.left + 6}, ${INNER_H / 2})`}
                    textAnchor="middle"
                >
                    completion %
                </text>
            </g>
        </svg>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ReportTab({ patientId }: { patientId: string }) {
    const [report, setReport] = useState<PatientReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleGenerate() {
        setLoading(true);
        setError(null);
        try {
            const result = await generatePatientReportAction(patientId);
            setReport(ensureAction(result));
        } catch (e: unknown) {
            setError((e as Error).message ?? "Failed to generate report");
        } finally {
            setLoading(false);
        }
    }

    if (!report) {
        return (
            <Card className="p-8 flex flex-col items-center gap-4 text-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Patient Report
                    </h2>
                    <p className="text-gray-500 max-w-md">
                        Generates a summary of recovery signals, pain/compliance
                        trends, and AI memory insights. No LLM call — computed
                        from stored data.
                    </p>
                </div>
                <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
                >
                    {loading ? "Generating…" : "Generate Report"}
                </Button>
                {error && <p className="text-red-600 text-sm">{error}</p>}
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                        Recovery Report — {report.patientName}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Generated{" "}
                        {new Date(report.generatedAt).toLocaleString(
                            undefined,
                            {
                                dateStyle: "medium",
                                timeStyle: "short",
                            },
                        )}
                    </p>
                </div>
                <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded disabled:opacity-50"
                >
                    {loading ? "Refreshing…" : "Refresh"}
                </Button>
            </div>

            {/* Active flags */}
            {report.flags.length > 0 && (
                <Card className="p-4 border-amber-300 bg-amber-50">
                    <h3 className="font-semibold text-amber-800 mb-2">
                        ⚠ Active Recovery Flags
                    </h3>
                    <ul className="space-y-1">
                        {report.flags.map((f) => (
                            <li key={f.kind} className="text-sm text-amber-700">
                                <span className="font-medium">{f.title}:</span>{" "}
                                {f.detail}
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Heuristic digest */}
            <Card className="p-5">
                <h3 className="font-semibold text-gray-800 mb-3">
                    Recovery Signals (computed)
                </h3>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded p-3">
                    {report.digestText}
                </pre>
            </Card>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">
                        Pain Trend
                    </h3>
                    <PainChart series={report.painSeries} />
                </Card>

                <Card className="p-5">
                    <h3 className="font-semibold text-gray-800 mb-3">
                        Daily Plan Completion
                    </h3>
                    <ComplianceChart data={report.compliancePerDay} />
                    <p className="text-xs text-gray-400 mt-2">
                        Green ≥ 80% · Amber ≥ 50% · Red &lt; 50%
                    </p>
                </Card>
            </div>

            {/* Memory */}
            {report.memory && (
                <Card className="p-5">
                    <h3 className="font-semibold text-gray-800 mb-4">
                        AI Memory Insights
                    </h3>

                    {report.memory.semantic && (
                        <div className="mb-5">
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                Stable Clinical Facts
                            </h4>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {report.memory.semantic}
                            </p>
                        </div>
                    )}

                    {report.memory.episodic.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                                Recovery Narrative
                            </h4>
                            <div className="space-y-4">
                                {report.memory.episodic.map((section) => (
                                    <div
                                        key={section.phase}
                                        className={`rounded-md px-4 py-3 ${
                                            section.closed
                                                ? "bg-gray-50"
                                                : "bg-blue-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-semibold text-gray-500 uppercase">
                                                {section.phase}
                                            </span>
                                            {section.closed ? (
                                                <span className="text-xs text-gray-400 bg-gray-200 rounded px-1.5 py-0.5">
                                                    closed
                                                </span>
                                            ) : (
                                                <span className="text-xs text-blue-700 bg-blue-100 rounded px-1.5 py-0.5">
                                                    active
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {section.narrative}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!report.memory.semantic &&
                        report.memory.episodic.length === 0 && (
                            <p className="text-sm text-gray-400 italic">
                                No memory consolidated yet (onboarding not
                                complete).
                            </p>
                        )}
                </Card>
            )}

            {!report.memory && (
                <Card className="p-5">
                    <h3 className="font-semibold text-gray-800 mb-2">
                        AI Memory Insights
                    </h3>
                    <p className="text-sm text-gray-400 italic">
                        No memory available — patient has not completed
                        onboarding.
                    </p>
                </Card>
            )}
        </div>
    );
}
