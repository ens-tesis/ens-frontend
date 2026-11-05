import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El Service Worker no se cachea: si no, un cambio en sw.js puede tardar
  // en llegarle al navegador.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
