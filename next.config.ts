import path from "node:path";

const nextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
      maxDuration: 1800,
    },
  },
};

export default nextConfig;
