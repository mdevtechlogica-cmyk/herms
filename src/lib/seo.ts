import { TECHLOGICA_WEBSITE } from "@/lib/techlogica";

export const SEO = {
  siteName: "HERMS",
  title: "HERMS — Heavy Equipment Rental Management System",
  description:
    "Cloud platform for heavy equipment rental businesses. Manage fleet inventory, bookings, maintenance, dispatch, invoicing, and payments across multiple branches.",
  keywords: [
    "heavy equipment rental software",
    "construction machinery fleet management",
    "equipment rental ERP",
    "rental booking system",
    "fleet maintenance scheduling",
    "rental invoicing",
    "multi-branch equipment rental",
    "HERMS",
    "Techlogica",
  ].join(", "),
  author: "Techlogica IT DT Solutions",
  publisher: "Techlogica IT DT Solutions",
  twitterCard: "summary_large_image" as const,
  ogImagePath: "/images/hero-equipment.jpg",
  themeColor: "#1c1917",
  locale: "en_US",
  /** Public Search Console verification token (also overridable via VITE_GOOGLE_SITE_VERIFICATION). */
  googleSiteVerification: "QNZKdci-E56Jh7hMznHH7ezWs07tLnv9e4PKQtk8XXw",
} as const;

type HeadMeta =
  | { charSet: string }
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type HeadLink = { rel: string; href: string; type?: string; sizes?: string };

export interface PageSeoOptions {
  title?: string;
  description?: string;
  path?: string;
  imagePath?: string;
  type?: "website" | "article";
  noindex?: boolean;
}

/** Resolve public site origin for canonical and Open Graph URLs. */
export function getSiteOrigin(): string {
  const candidates = [
    import.meta.env.VITE_SITE_URL,
    import.meta.env.VITE_APP_URL,
    import.meta.env.VITE_AUTH_REDIRECT_ORIGIN,
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      // try next
    }
  }

  if (typeof window !== "undefined") return window.location.origin;
  return "https://herms.app";
}

export function getGoogleSiteVerification(): string | null {
  const token = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined)?.trim();
  return token || SEO.googleSiteVerification || null;
}

export function getGoogleSiteVerificationHtmlToken(): string | null {
  const token = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION_HTML as string | undefined)?.trim();
  return token || null;
}

export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteOrigin()}${normalized}`;
}

export function buildPageHead(options: PageSeoOptions = {}): {
  meta: HeadMeta[];
  links?: HeadLink[];
} {
  const title = options.title ?? SEO.title;
  const description = options.description ?? SEO.description;
  const canonical = absoluteUrl(options.path ?? "/");
  const image = absoluteUrl(options.imagePath ?? SEO.ogImagePath);
  const type = options.type ?? "website";

  const meta: HeadMeta[] = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: SEO.keywords },
    { name: "author", content: SEO.author },
    { name: "publisher", content: SEO.publisher },
    { name: "robots", content: options.noindex ? "noindex, nofollow" : "index, follow" },
    { name: "theme-color", content: SEO.themeColor },
    { property: "og:site_name", content: SEO.siteName },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: type },
    { property: "og:url", content: canonical },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: "Heavy construction equipment on a rental yard" },
    { property: "og:locale", content: SEO.locale },
    { name: "twitter:card", content: SEO.twitterCard },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: "Heavy construction equipment on a rental yard" },
    { name: "application-name", content: SEO.siteName },
  ];

  const googleVerification = getGoogleSiteVerification();
  if (googleVerification) {
    meta.push({ name: "google-site-verification", content: googleVerification });
  }

  const links: HeadLink[] = [
    { rel: "canonical", href: canonical },
    { rel: "icon", href: "/images/techlogica-logo.png", type: "image/png" },
    { rel: "apple-touch-icon", href: "/images/techlogica-logo.png" },
  ];

  return { meta, links };
}

export function landingJsonLd() {
  const origin = getSiteOrigin();
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SEO.siteName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Android, iOS",
      description: SEO.description,
      url: origin,
      image: absoluteUrl(SEO.ogImagePath),
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "15-day free trial on all plans",
      },
      publisher: {
        "@type": "Organization",
        name: SEO.publisher,
        url: TECHLOGICA_WEBSITE,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Techlogica IT DT Solutions",
      url: TECHLOGICA_WEBSITE,
      logo: absoluteUrl("/images/techlogica-logo.png"),
      sameAs: [TECHLOGICA_WEBSITE],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SEO.siteName,
      url: origin,
      description: SEO.description,
      publisher: {
        "@type": "Organization",
        name: SEO.publisher,
      },
    },
  ];
}

export const PUBLIC_SITEMAP_PATHS = ["/"] as const;

export function buildSitemapXml(): string {
  const origin = getSiteOrigin();
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = PUBLIC_SITEMAP_PATHS.map(
    (path) => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === "/" ? "1.0" : "0.8"}</priority>
  </url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function buildRobotsTxt(): string {
  const origin = getSiteOrigin();
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth
Disallow: /profile

Sitemap: ${origin}/sitemap.xml
`;
}
