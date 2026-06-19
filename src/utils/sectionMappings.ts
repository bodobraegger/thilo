import { getSections, type SectionT } from './data';

export interface SectionData {
  id: number;
  title: string;
  menu_name: string;
  slug: string;
  locale: string;
  sorting: number;
  color_primary?: string;
  icon?: {
    id: number;
    url: string;
    alternativeText?: string;
  };
  chapters?: Array<{
    id: number;
    title: string;
    slug: string;
    sorting: number;
  }>;
}

export interface SimpleSectionsData {
  sections: {
    [locale: string]: SectionData[];
  };
  sectionMappings: {
    [sectionId: string]: {
      [locale: string]: {
        title: string;
        slug: string;
        url: string;
        color_primary?: string;
      };
    };
  };
}

let cachedAllSections: SimpleSectionsData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1-hour TTL

function toSectionData(s: SectionT): SectionData {
  return {
    id: s.id,
    title: s.title,
    menu_name: s.menu_name,
    slug: s.slug!,
    locale: s.locale,
    sorting: s.sorting,
    color_primary: s.color_primary,
    icon: s.icon ? { id: s.icon.id, url: s.icon.url, alternativeText: s.icon.alternativeText } : undefined,
    chapters: s.chapters.map(c => ({
      id: c.id,
      title: c.title,
      slug: c.slug!,
      sorting: c.sorting,
    })),
  };
}

export async function fetchAllSections(): Promise<SimpleSectionsData> {
  if (cachedAllSections && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedAllSections;
  }

  const locales = ['de', 'fr', 'it'];
  const sections: { [locale: string]: SectionData[] } = {};

  await Promise.all(locales.map(async (locale) => {
    try {
      const raw = await getSections(locale);
      sections[locale] = raw.map(toSectionData);
    } catch (error) {
      console.error(`❌ Failed to fetch sections for ${locale}:`, error);
      sections[locale] = [];
    }
  }));

  const sectionMappings: SimpleSectionsData['sectionMappings'] = {};
  const sectionsBySort: { [sorting: number]: SectionData[] } = {};

  // Group parallel translations by their sorting order index
  for (const locale of locales) {
    for (const section of sections[locale]) {
      if (!sectionsBySort[section.sorting]) sectionsBySort[section.sorting] = [];
      sectionsBySort[section.sorting].push(section);
    }
  }

  // Build mappings
  for (const [_, group] of Object.entries(sectionsBySort)) {
    // Generate the localized inner map for this grouped cluster of pages
    const localeMap: { [locale: string]: any } = {};
    
    for (const section of group) {
      const url = section.locale === 'de'
        ? `/${section.slug}`
        : `/${section.locale}/${section.slug}`;
        
      localeMap[section.locale] = { 
        title: section.title, 
        slug: section.slug, 
        url,
        color_primary: section.color_primary 
      };
    }

    // ✨ FIX: Bind this translation map to EVERY unique section ID in the group
    // This ensures that looking up mapping[de_id], mapping[fr_id], or mapping[it_id] all resolve correctly!
    for (const section of group) {
      sectionMappings[section.id.toString()] = localeMap;
    }
  }

  const result = { sections, sectionMappings };
  cachedAllSections = result;
  cacheTimestamp = Date.now();
  return result;
}

export function getSectionUrlForLocaleFromCache(
  sectionId: string,
  targetLocale: string,
  sectionMappings: SimpleSectionsData['sectionMappings']
): string {
  const mapping = sectionMappings[sectionId];
  if (mapping?.[targetLocale]) return mapping[targetLocale].url;
  return targetLocale === 'de' ? '/' : `/${targetLocale}/`;
}
