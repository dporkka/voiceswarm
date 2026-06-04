import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AASOP",
    short_name: "AASOP",
    description:
      "AI agent orchestration platform for autonomous software development, workflow automation, realtime observability, and voice-enabled operations.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    categories: ["developer tools", "productivity", "artificial intelligence", "software development"],
  };
}
