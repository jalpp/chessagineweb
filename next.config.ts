/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@mastra/*"],
  productionBrowserSourceMaps: process.env.ENABLE_SOURCE_MAPS === "true",
  headers() {
    return [
     
      {
        source: "/(position|play|puzzle|game)/:path*",
        headers: ENGINE_HEADERS,
      },
      {
        source: "/static/:path*",
        headers: ENGINE_HEADERS.concat({
          key: "Cache-Control",
          value: "public, max-age=2592000, immutable",
        }),
      },
   
      {
        source: "/((?!position|play|puzzle|game|static).*)",
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