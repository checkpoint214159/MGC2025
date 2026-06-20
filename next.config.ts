import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    typescript: {
        ignoreBuildErrors: false,
    },
};

export default nextConfig;

// Makes Cloudflare bindings (Hyperdrive, secrets, etc.) available during `next dev`.
// No-op outside the OpenNext/Wrangler context. See https://opennext.js.org/cloudflare
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
