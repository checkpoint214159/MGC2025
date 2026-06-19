import { describe, it, expect } from "vitest";
import { getModel } from "@/lib/llm/model";

// Regression guard for the @ai-sdk/openai <-> ai@5 pairing.
// ai@5's generateObject/streamText only accept v2-spec models. The @ai-sdk/openai@3
// default (Responses API) emits v3-spec models, which throw
// AI_UnsupportedModelVersionError at runtime (broke onboarding + plan generation).
// Keep the provider on the v2 line so the model the app actually uses is v2-spec.
describe("getModel", () => {
  it("returns a v2-spec model compatible with ai@5", () => {
    expect(getModel().specificationVersion).toBe("v2");
  });
});
