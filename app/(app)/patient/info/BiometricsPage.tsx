import { ensureAction } from "@/lib/utils";
import { updateBiometricsAction, startOnboardingAction } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { Biometrics, BiometricsSchema } from "@/lib/user/schema";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/primitives";

const fieldClass =
    "w-full mt-1.5 h-11 rounded-md border border-border-strong bg-surface px-3 text-[16px] text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-ring";
const labelClass = "text-[13px] font-medium text-ink-muted";

export function BiometricsForm({
    onComplete,
}: {
    onComplete: (data: Biometrics) => void;
}) {
    return (
        <div className="w-full max-w-md rounded-xl border border-border bg-surface p-7 md:p-8">
            <h2 className="text-[22px] font-semibold text-ink">
                A few details to start
            </h2>
            <p className="mt-1 text-[14px] text-ink-muted">
                These help us tailor your recovery plan. It only takes a minute.
            </p>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);

                    onComplete({
                        treatment: String(formData.get("treatment") ?? ""),
                        sex: formData.get("sex") as Biometrics["sex"],
                        age: parseInt(String(formData.get("age") ?? "0"), 10),
                        surgeryDate: new Date(
                            String(formData.get("surgeryDate") ?? ""),
                        ),
                    });
                }}
                className="mt-6 space-y-5"
            >
                {/* Treatment Field */}
                <div>
                    <label htmlFor="treatment" className={labelClass}>
                        Treatment / surgery
                    </label>
                    <input
                        id="treatment"
                        name="treatment"
                        required
                        className={fieldClass}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Age Field */}
                    <div>
                        <label htmlFor="age" className={labelClass}>
                            Age
                        </label>
                        <input
                            id="age"
                            name="age"
                            type="number"
                            required
                            className={`${fieldClass} tabular-nums`}
                        />
                    </div>

                    {/* Sex Field */}
                    <div>
                        <label htmlFor="sex" className={labelClass}>
                            Sex
                        </label>
                        <select
                            id="sex"
                            name="sex"
                            required
                            defaultValue=""
                            className={`${fieldClass} cursor-pointer`}
                        >
                            <option value="" disabled>
                                Select…
                            </option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>

                {/* Surgery Date Field */}
                <div>
                    <label htmlFor="surgeryDate" className={labelClass}>
                        Date of surgery
                    </label>
                    <input
                        id="surgeryDate"
                        name="surgeryDate"
                        type="date"
                        required
                        className={`${fieldClass} tabular-nums [color-scheme:light]`}
                    />
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="mt-1 w-full"
                >
                    Start assessment
                </Button>
            </form>
        </div>
    );
}

export function SubmitBiometricsPage() {
    const { data: session } = useSession();
    const queryClient = useQueryClient();

    async function submitBio(bio: Biometrics) {
        const userId = session?.user?.id;
        const updatedBioResult = await updateBiometricsAction(bio);
        ensureAction(updatedBioResult);
        BiometricsSchema.parse(updatedBioResult.data);

        // Kick off the onboarding graph — runs until the first interrupt
        // (collect_screening_responses), then returns. Page query re-fetch
        // will pick up the new phase.
        await startOnboardingAction();
        await queryClient.invalidateQueries({
            queryKey: ["onboarding-state", userId],
        });
    }

    return <BiometricsForm onComplete={submitBio} />;
}
