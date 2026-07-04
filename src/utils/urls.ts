// Absolute URLs for SEO artifacts (canonical, hreflang, sitemap, robots).
// Combines the `site` config with the base path (`base` config or --base flag)
// so every environment produces consistent URLs.
export function absoluteUrl(path: string): string {
  const site = (import.meta.env.SITE ?? 'https://thilo.scouts.ch').replace(/\/$/, '');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${site}${base}${normalizedPath}`;
}
