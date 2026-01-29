import { gateway } from "ai";

export function getModel() {
    const modelId = process.env.AI_MODEL || 'anthropic/claude-sonnet-4'
    console.log('modelId?', modelId)
    return gateway(modelId)
}

