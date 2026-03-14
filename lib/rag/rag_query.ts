import { generateObject } from "ai";
import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export interface QueryOptions {
  surgeryType: string;
  recoveryWeek: number;
  biometrics?: Record<string, number>;
  symptoms?: string[];
  additionalContext?: string;
}

// ============================================================================
// SYSTEM PROMPT FOR LLM-BASED QUERY GENERATION
// ============================================================================

const QUERY_GENERATION_SYSTEM_PROMPT = `You are a medical information retrieval specialist for a recovery guidance RAG system.

Your task: Given patient recovery context (surgery type, recovery phase, symptoms, physical metrics), 
generate a single, focused search query string that retrieves the most relevant recovery guidelines, 
protocols, and evidence-based recommendations from a medical vector database.

Output Requirements:
- Format: A single continuous string (no line breaks, markdown, or special formatting)
- Length: 15-100 words
- Style: Medical terminology with specific recovery phases
- Content: Include surgery type, recovery week, physical metrics, and key symptoms
- Tone: Informative and clinical; write as a search phrase, not a question
- Precision: Be specific enough to avoid irrelevant results, but general enough to find related guidelines

Guidelines:
- Prioritize specific medical terminology over generic terms
- Include recovery phase (acute, subacute, chronic)
- Reference physical constraints (pain level, mobility limitations)
- Do NOT include explanations, disclaimers, or reasoning
- Do NOT format as a question or command
- Do NOT output anything except the query string

Example transformations:
Input: ACL reconstruction, week 2, pain 5/10, swelling, limited ROM
Output: ACL reconstruction post-operative week 2 recovery: managing swelling, pain management strategies, range of motion exercises

Input: Colostomy, week 1, drain output high, mobility limited
Output: Post-operative colostomy recovery week 1: drain management complications, gentle mobility progression, activity restrictions`;

// Zod schema for validating LLM output
const QuerySchema = z.object({
  query: z
    .string()
    .min(15)
    .max(100)
    .describe("A focused search query optimized for medical RAG retrieval"),
});

// ============================================================================
// HARDCODED QUERY BUILDER (Fallback Strategy)
// ============================================================================

export function buildHardcodedQuery(options: QueryOptions): string {
  const parts: string[] = [];

  // Base: surgery type + phase
  parts.push(`${options.surgeryType} post-operative recovery week ${options.recoveryWeek}`);

  // Pain level with descriptive language
  if (options.biometrics?.painLevel !== undefined) {
    const painLevel = options.biometrics.painLevel;
    const painDesc =
      painLevel <= 2
        ? "minimal pain"
        : painLevel <= 4
          ? "mild pain"
          : painLevel <= 6
            ? "moderate pain"
            : "severe pain";
    parts.push(painDesc);
  }

  // Mobility/physical constraints
  if (options.biometrics?.mobilityScore !== undefined) {
    const mobilityScore = options.biometrics.mobilityScore;
    const mobilityDesc =
      mobilityScore >= 7 ? "full mobility" : mobilityScore >= 4 ? "partial mobility" : "limited mobility";
    parts.push(mobilityDesc);
  }

  // Specific symptoms
  if (options.symptoms && options.symptoms.length > 0) {
    // Take first 2-3 symptoms to keep it concise
    const topSymptoms = options.symptoms.slice(0, 3).join(", ");
    parts.push(`managing ${topSymptoms}`);
  }

  // Generic recovery terms to ensure we get guideline-type content
  parts.push("recovery guidelines, exercises, activity progression");

  return parts.join(", ");
}

// ============================================================================
// DYNAMIC QUERY GENERATION (LLM-Based Strategy)
// ============================================================================

export async function generateDynamicQuery(options: QueryOptions): Promise<string> {
  try {
    // Build context prompt from options
    const biometricsText = options.biometrics
      ? Object.entries(options.biometrics)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join("\n")
      : "- None provided";

    const symptomText = options.symptoms && options.symptoms.length > 0 
      ? options.symptoms.join(", ")
      : "None reported";

    const userPrompt = `Patient Recovery Context:
Surgery Type: ${options.surgeryType}
Recovery Week: ${options.recoveryWeek}
Physical Metrics:
${biometricsText}
Current Symptoms: ${symptomText}
${options.additionalContext ? `Additional Context: ${options.additionalContext}` : ""}

Generate an optimized search query for retrieving relevant recovery guidelines and protocols.`;

    const result = await generateObject({
      model: process.env.AI_MODEL || "anthropic/claude-sonnet-4",
      system: QUERY_GENERATION_SYSTEM_PROMPT,
      prompt: userPrompt,
      schema: QuerySchema,
    });

    return result.object.query;
  } catch (error) {
    console.error("[RAG Query] Dynamic query generation failed:", error);
    throw new Error(
      `Dynamic query generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================================================
// ORCHESTRATOR: Select and Build Query with Fallback Logic
// ============================================================================

export interface QueryBuilderConfig {
  /**
   * If true, skip LLM query generation and use hardcoded template (fastest fallback)
   */
  disableDynamic?: boolean;

  /**
   * If true, log debug information about decision-making process
   */
  devMode?: boolean;
}

export interface QueryBuilderResult {
  query: string;
  source: "dynamic" | "hardcoded";
  fallbackReason?: string;
}

/**
 * Intelligently select between dynamic (LLM) and hardcoded query strategies.
 * Implements fallback logic for graceful degradation.
 *
 * Decision Flow:
 * 1. If disableDynamic=true → use hardcoded (fast path)
 * 2. Try dynamic query generation
 * 3. On LLM failure (connection, auth, timeout) → fallback to hardcoded
 */
export async function selectAndBuildQuery(
  options: QueryOptions,
  config?: QueryBuilderConfig
): Promise<QueryBuilderResult> {
  const { disableDynamic = false, devMode = false } = config || {};

  // ─────────────────────────────────────────────────────────────────────
  // CASE 1: Dynamic disabled (e.g., in dev for speed, or if LLM service is down)
  // ─────────────────────────────────────────────────────────────────────
  if (disableDynamic) {
    if (devMode) {
      console.log("[RAG Query Builder] Hardcoded query selected (dynamic disabled)");
    }

    return {
      query: buildHardcodedQuery(options),
      source: "hardcoded",
      fallbackReason: "Dynamic query generation disabled in config",
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // CASE 2: Try dynamic, with graceful fallback to hardcoded
  // ─────────────────────────────────────────────────────────────────────
  try {
    if (devMode) {
      console.log("[RAG Query Builder] Attempting dynamic query generation...");
    }

    const dynamicQuery = await generateDynamicQuery(options);

    if (devMode) {
      console.log(`[RAG Query Builder] SUCCESS: Dynamic query generated (${dynamicQuery.length} chars)`);
    }

    return {
      query: dynamicQuery,
      source: "dynamic",
    };
  } catch (error) {
    // Log the failure but don't surface it to user - graceful degradation
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (devMode) {
      console.warn(
        `[RAG Query Builder] Dynamic query failed (${errorMessage}), using hardcoded fallback`
      );
    }

    return {
      query: buildHardcodedQuery(options),
      source: "hardcoded",
      fallbackReason: `Dynamic query generation failed: ${errorMessage}`,
    };
  }
}
