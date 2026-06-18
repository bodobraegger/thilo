import type { APIRoute } from 'astro';
import { fetchAllSections } from '../utils/sectionMappings';

const LOCALES = ['de', 'fr', 'it'] as const;

type Locale = typeof LOCALES[number];

function sectionUrl(locale: Locale, slug: string): string {
  return locale === 'de' ? `${SITE}/${slug}` : `${SITE}/${locale}/${slug}`;
}

function pageUrl(locale: Locale, path: string): string {
  return locale === 'de' ? `${SITE}${path}` : `${SITE}/${locale}${path}`;
}

function urlEntry(loc: string, alternates: Array<{ hreflang: string; href: string }>): string {
  const alts = alternates
    .map(a => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`)
    .join('\n');
  return `  <url>\n    <loc>${loc}</loc>\n${alts}\n  </url>`;
}

export const GET: APIRoute = async ({ site }) => {
  const SITE = (site?.href ?? 'https://thilo.scouts.ch').replace(/\/$/, '');
  const allSections = await fetchAllSections();
  const entries: string[] = [];

  // Static pages: home, search, impressum
  for (const path of ['/', '/search', '/impressum']) {
    const alternates = [
      ...LOCALES.map(l => ({ hreflang: l, href: pageUrl(l, path) })),
      { hreflang: 'x-default', href: pageUrl('de', path) },
    ];
    for (const locale of LOCALES) {
      entries.push(urlEntry(pageUrl(locale, path), alternates));
    }
  }

  // Section pages — group by sorting field so equivalent sections across locales share alternates
  const bySort = new Map<number, Array<{ locale: Locale; slug: string }>>();
  for (const locale of LOCALES) {
    for (const section of allSections.sections[locale] ?? []) {
      if (!bySort.has(section.sorting)) bySort.set(section.sorting, []);
      bySort.get(section.sorting)!.push({ locale: locale as Locale, slug: section.slug });
    }
  }

  for (const group of bySort.values()) {
    const deSlug = group.find(s => s.locale === 'de')?.slug ?? '';
    const alternates = [
      ...group.map(s => ({ hreflang: s.locale, href: sectionUrl(s.locale, s.slug) })),
      { hreflang: 'x-default', href: sectionUrl('de', deSlug) },
    ];
    for (const { locale, slug } of group) {
      entries.push(urlEntry(sectionUrl(locale, slug), alternates));
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${entries.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
