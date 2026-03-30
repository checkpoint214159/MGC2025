import { prisma } from "@/lib/prisma";
import { compileExternal } from "@/lib/external/service";
import { ExternalSchema } from "@/lib/external/schemas/external";
import { StateGenerationState } from "../state";

/**
 * Node: compile_external
 *
 * Maps to the compileExternalAction() call in generateNewState() in lib/state/service.ts:
 * - Re-fetch the user (in case profile was updated since load_context)
 * - Call compileExternal() to create and save an External record
 *   (threads + profile → External DB record)
 *
 * Returns:
 *   { external }
 *
 * 💡 LangGraph: This node creates the cross-cutting context record that will be
 * referenced by all subsequent operations. It's called after load_context and
 * before the module generation fan-out.
 */
export async function compileExternalNode(
  state: StateGenerationState
): Promise<Partial<StateGenerationState>> {
  const user = await prisma.user.findUnique({
    where: { id: state.userId },
    include: { threads: { include: { messages: true } } },
  });

  if (!user) throw new Error("User not found");

  const safeProfile = (user.profile as string) ?? "No profile data provided";

  // compileExternal calls prisma.external.create and returns the External record
  const external = await compileExternal(
    state.userId,
    user.threads as any,
    safeProfile
  );

  // Validate against schema
  const validatedExternal = ExternalSchema.parse(external);

  return { external: validatedExternal };
}
