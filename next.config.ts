/** @type {import('next').NextConfig} */
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

const NO_STORE = {
  key: "Cache-Control",
  value: "no-store, no-cache, must-revalidate, proxy-revalidate",
};

const nextConfig = {
  serverExternalPackages: ["@mastra/*"],
  productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === "true",

  async headers() {
    return [
      {
        source: "/(position|play|puzzle|game|humaneval|lc0-test)",
        headers: [...ENGINE_HEADERS, NO_STORE],
      },
      {
        source: "/(position|play|puzzle|game|humaneval|lc0-test)/:path*",
        headers: [...ENGINE_HEADERS, NO_STORE],
      },

    
      {
        source: "/static/:path*",
        headers: [
          ...ENGINE_HEADERS,
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, immutable",
          },
        ],
      },

      {
        source: "/((?!position|play|puzzle|game|humaneval|lc0-test|static).*)",
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

export default nextConfig;