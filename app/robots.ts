import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: "https://studio.a6ko.com/sitemap.xml",
    host: "https://studio.a6ko.com",
  };
}
