import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getStateGenerationConfig,
  updateStateGenerationConfig,
  resetStateGenerationConfig,
} from "@/lib/state/graph/config";
import { requireRole } from "@/lib/auth-utils";

/**
 * GET /api/admin/graph-config
 *
 * Retrieve current state generation graph configuration.
 * Admin-only endpoint.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const config = await getStateGenerationConfig();
  return NextResponse.json(config);
}

/**
 * PATCH /api/admin/graph-config
 *
 * Update state generation graph configuration at runtime.
 * Changes take effect immediately (cache invalidated).
 *
 * Example body:
 * {
 *   "contextWindowDays": 7,
 *   "smartFiltering": true,
 *   "maxContextTokens": 10000
 * }
 *
 * Admin-only endpoint.
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    // Validate input
    if (
      body.contextWindowDays !== undefined &&
      typeof body.contextWindowDays !== "number"
    ) {
      return NextResponse.json(
        { error: "contextWindowDays must be a number" },
        { status: 400 }
      );
    }

    if (
      body.maxContextTokens !== undefined &&
      typeof body.maxContextTokens !== "number"
    ) {
      return NextResponse.json(
        { error: "maxContextTokens must be a number" },
        { status: 400 }
      );
    }

    const updated = await updateStateGenerationConfig(body);

    return NextResponse.json(
      {
        status: "updated",
        config: updated,
        message: "Configuration updated. Changes take effect immediately.",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Failed to update config:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update config" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/graph-config
 *
 * Reset configuration to defaults (useful for rollback or testing).
 * Admin-only endpoint.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  try {
    const config = await resetStateGenerationConfig();
    return NextResponse.json(
      {
        status: "reset",
        config,
        message: "Configuration reset to defaults.",
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Failed to reset config:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to reset config" },
      { status: 500 }
    );
  }
}
