import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Solo la landing y el login son públicos; el resto pide sesión.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/bienvenido", "/login"], disallow: ["/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
