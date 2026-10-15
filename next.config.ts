import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home folder confuses root detection.
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
