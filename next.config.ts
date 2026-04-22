import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

const nextConfig = {
  turbopack: {
    root: path.join(rootDir),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
      maxDuration: 1800,
    },
  },
};

export default nextConfig;
