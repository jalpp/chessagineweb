/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@mastra/*"],
  productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === "true",
  headers() {
    return [
      // Pages that use ONNX (chess engine + Maia nets) need COEP + COOP
      // so SharedArrayBuffer / WASM threads work correctly.
      {
        source: "/(position|play|puzzle|game)/:path*",
        headers: ENGINE_HEADERS,
      },
      // /_next/static must also send COEP so that when an engine page loads,
      // the ort.bundle.min.*.mjs chunk (bundled by Next.js) isn't blocked.
      {
        source: "/_next/static/:path*",
        headers: ENGINE_HEADERS,
      },
      // Public model + static assets: long-lived cache + COEP
      {
        source: "/static/:path*",
        headers: ENGINE_HEADERS.concat({
          key: "Cache-Control",
          value: "public, max-age=2592000, immutable",
        }),
      },

      {
        source: "/((?!position|play|puzzle|game|static|_next\\/static).*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

const ENGINE_HEADERS = [
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "require-corp",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
];

export default nextConfig;