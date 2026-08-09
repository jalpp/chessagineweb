import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ChessAgine",
    short_name: "ChessAgine",
    description:
      "a modern, free, open-source chess app suite for playing, analyzing, and learning chess with a clean interface and powerful tools",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#520567",
    icons: [
      {
        src: "/static/images/aginelogov2.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
