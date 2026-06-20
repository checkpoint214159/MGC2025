import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext configuration for deploying this Next.js app to Cloudflare Workers.
 *
 * Phase 1: defaults are sufficient (in-Worker behaviour, no external cache).
 * Later phases may wire an incremental cache (R2/KV) and other overrides here.
 *
 * Docs: https://opennext.js.org/cloudflare
 */
export default defineCloudflareConfig({});
