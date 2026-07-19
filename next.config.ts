import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Build ofuscado (javascript-obfuscator) usa require() dinâmico que o
  // bundler não consegue analisar estaticamente — roda via Node puro no server.
  serverExternalPackages: ["@gooin/garmin-connect"],
}

export default nextConfig
