import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    webpack: (config, { isServer, dev }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 300, // Check every 300ms (adjust as needed)
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    }
    return config;
  },
};

export default nextConfig;
