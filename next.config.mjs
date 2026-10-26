import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/diagnostics";

const nextConfig = {
  output: "standalone",
  basePath,
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    cpus: 1,
  },
  webpack(config) {
    config.resolve.alias["@"] = __dirname;
    return config;
  },
};

export default nextConfig;
