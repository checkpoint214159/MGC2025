"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle2, Footprints, Salad, ArrowRight, RotateCcw } from "lucide-react";
import { PhaseScope } from "@/components/wally/PhaseScope";
import { Button, Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Doc = { uploaded: boolean; file: string; size: string };

function UploadCard({
    icon,
    title,
    doc,
    onUpload,
    onClear,
}: {
    icon: React.ReactNode;
    title: string;
    doc: Doc;
    onUpload: () => void;
    onClear: () => void;
}) {
    return (
        <Card className="p-4">
            <div className="mb-3 flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-ink">{icon}</span>
                <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
            </div>
            {doc.uploaded ? (
                <div className="rounded-xl border border-progress/30 bg-progress-soft/40 p-3">
                    <div className="flex items-center gap-3">
                        <FileText size={22} className="shrink-0 text-progress-ink" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-ink">{doc.file}</p>
                            <p className="text-[12px] text-ink-muted">{doc.size}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-progress-ink">
                            <CheckCircle2 size={15} strokeWidth={2} /> Uploaded
                        </span>
                    </div>
                    <button type="button" onClick={onClear} className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink-muted hover:text-ink">
                        <RotateCcw size={12} /> Replace file
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={onUpload}
                    className={cn(
                        "flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-border-strong px-4 py-7 text-center transition-colors hover:bg-surface-sunken",
                    )}
                >
                    <Upload size={22} className="text-accent-ink" />
                    <span className="text-[14px] font-medium text-ink">Drag &amp; drop or tap to upload</span>
                    <span className="text-[12px] text-ink-subtle">PDF or a photo of the printout</span>
                </button>
            )}
        </Card>
    );
}

export function WallyDischarge() {
    const [pt, setPt] = useState<Doc>({ uploaded: true, file: "Physiotherapy_Care_Plan_MrTan.pdf", size: "248 KB" });
    const [dt, setDt] = useState<Doc>({ uploaded: false, file: "Dietary_Care_Plan_MrTan.pdf", size: "192 KB" });
    const ready = pt.uploaded && dt.uploaded;

    return (
        <PhaseScope phase="onboarding">
            <div className="mx-auto max-w-2xl px-5 py-8">
                <div className="mb-5">
                    <span className="rounded-md bg-accent-soft px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent-ink">
                        Discharge Care Plan
                    </span>
                </div>

                <Card className="mx-auto max-w-md p-6 md:p-7">
                    <div className="mb-5 text-center">
                        <h1 className="text-[22px] font-bold text-accent-ink">Upload your discharge plan</h1>
                        <p className="mt-1.5 text-[14px] text-ink-muted">
                            Add the physiotherapy and dietitian care plans you were given at discharge. Wally reads them to build your
                            personalised home recovery plan.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <UploadCard
                            icon={<Footprints size={18} />}
                            title="Physiotherapy Care Plan"
                            doc={pt}
                            onUpload={() => setPt((d) => ({ ...d, uploaded: true }))}
                            onClear={() => setPt((d) => ({ ...d, uploaded: false }))}
                        />
                        <UploadCard
                            icon={<Salad size={18} />}
                            title="Dietary Care Plan"
                            doc={dt}
                            onUpload={() => setDt((d) => ({ ...d, uploaded: true }))}
                            onClear={() => setDt((d) => ({ ...d, uploaded: false }))}
                        />
                    </div>

                    <p className="mt-4 text-center text-[12px] text-ink-subtle">
                        Your documents are private and shared only with your care team.
                    </p>

                    {ready ? (
                        <a href="/preview/wally/plan" className="mt-5 block">
                            <Button size="lg" className="w-full">
                                Generate my recovery plan <ArrowRight size={18} />
                            </Button>
                        </a>
                    ) : (
                        <Button size="lg" className="mt-5 w-full" disabled>
                            Upload both plans to continue
                        </Button>
                    )}
                </Card>
            </div>
        </PhaseScope>
    );
}
