import { ensureAction } from "@/lib/utils";
import { updateBiometricsAction } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { Biometrics, BiometricsSchema } from "@/lib/user/schema";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/primitives";

const fieldClass =
  "mt-1.5 h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-[16px] text-ink placeholder:text-ink-subtle";
const labelClass = "text-[14px] font-medium text-ink";

export function BiometricsForm({ onComplete }: { onComplete: (data: Biometrics) => void }) {
  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-surface p-7 shadow-sm md:p-8">
      <h1 className="text-[26px] font-semibold text-ink">A few details to start</h1>
      <p className="mt-1 text-[15px] text-ink-muted">
        This shapes a plan that fits your surgery and where you are in recovery.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const raw = Object.fromEntries(formData);
          onComplete({
            treatment: raw.treatment as string,
            sex: raw.sex as Biometrics["sex"],
            age: parseInt(raw.age as string, 10),
            surgeryDate: new Date(raw.surgeryDate as string),
          });
        }}
        className="mt-6 space-y-4"
      >
        <div>
          <label htmlFor="treatment" className={labelClass}>
            Treatment / surgery
          </label>
          <input id="treatment" name="treatment" required placeholder="e.g. Open colectomy" className={fieldClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className={labelClass}>
              Age
            </label>
            <input id="age" name="age" type="number" min={0} max={120} required className={fieldClass} />
          </div>
          <div>
            <label htmlFor="sex" className={labelClass}>
              Sex
            </label>
            <select id="sex" name="sex" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                Select…
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="surgeryDate" className={labelClass}>
            Date of surgery
          </label>
          <input id="surgeryDate" name="surgeryDate" type="date" required className={fieldClass} />
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}

export function SubmitBiometricsPage() {
  const { data: session, update } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function submitBio(bio: Biometrics) {
    const userId = session?.user?.id;
    const updatedBioResult = await updateBiometricsAction(bio);
    const updatedBio = ensureAction(updatedBioResult);
    BiometricsSchema.parse(updatedBio);
    await queryClient.invalidateQueries({ queryKey: ["onboarding", userId] });
    await update({ session });
    router.refresh();
  }

  return <BiometricsForm onComplete={submitBio} />;
}
