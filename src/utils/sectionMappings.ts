// Simple utility to fetch all section data at build time (like React app)
import { slugify } from './slugify';

export interface SectionData {
  id: number;
  title: string;
  slug: string;
  locale: string;
  sorting: number;
  menu_name?: string;
  color_primary?: string;
  color_primary_light?: string;
  icon?: {
    id: number;
    name: string;
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
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
      };
    };
  };
}

// Dev-only cache to avoid slow repeated fetches
const isDev = import.meta.env.DEV;
let devCache: SimpleSectionsData | null = null;

// Simple function to fetch all sections (like React app)
// PWA service worker handles caching with stale-while-revalidate
export async function fetchAllSections(): Promise<SimpleSectionsData> {
  // In dev mode, use simple cache to avoid repeated slow fetches
  if (isDev && devCache) {
    return devCache;
  }

  const locales = ['de', 'fr', 'it'];
  const sections: { [locale: string]: SectionData[] } = {};
  
  // Fetch sections for all locales IN PARALLEL
  const fetchPromises = locales.map(async (locale) => {
    try {
      const response = await fetch(`https://api.thilo.scouts.ch/sections?_locale=${locale}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sections for ${locale}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Process sections and add generated slugs (same as React app)
      return {
        locale,
        sections: data.map((section: any) => ({
          id: section.id,
          title: section.title,
          slug: slugify(section.title),
          locale,
          sorting: section.sorting,
          menu_name: section.menu_name,
          color_primary: section.color_primary,
          color_primary_light: section.color_primary_light,
          icon: section.icon,
          chapters: section.chapters?.map((chapter: any) => ({
            id: chapter.id,
            title: chapter.title,
            slug: slugify(chapter.title),
            sorting: chapter.sorting
          })) || []
        }))
      };
    } catch (error) {
      console.error(`❌ Failed to fetch sections for ${locale}:`, error);
      return { locale, sections: [] };
    }
  });

  // Wait for all fetches to complete in parallel
  const results = await Promise.all(fetchPromises);
  
  // Populate sections object
  for (const result of results) {
    sections[result.locale] = result.sections;
  }
  
  // Build simple section mappings by sorting (like React app)
  const sectionMappings: SimpleSectionsData['sectionMappings'] = {};
  
  // Group sections by sorting across locales (like React app uses sorting to match)
  const sectionsBySort: { [sorting: number]: SectionData[] } = {};
  
  for (const locale of locales) {
    for (const section of sections[locale]) {
      if (!sectionsBySort[section.sorting]) {
        sectionsBySort[section.sorting] = [];
      }
      sectionsBySort[section.sorting].push(section);
    }
  }
  
  // Build mappings for each sorting group
  for (const [sorting, sectionGroup] of Object.entries(sectionsBySort)) {
    // Use first section's ID as key (they should all have same ID anyway)
    const sectionId = sectionGroup[0]?.id.toString() || sorting;
    sectionMappings[sectionId] = {};
    
    for (const section of sectionGroup) {
      const url = section.locale === 'de' 
        ? `/${section.slug}` 
        : `/${section.locale}/${section.slug}`;
        
      sectionMappings[sectionId][section.locale] = {
        title: section.title,
        slug: section.slug,
        url
      };
    }
  }
  
  const result = {
    sections,
    sectionMappings
  };

  // Cache in dev mode
  if (isDev) {
    devCache = result;
  }

  return result;
}

// Get section URL for a specific locale (using cached data)
export function getSectionUrlForLocaleFromCache(
  sectionId: string, 
  targetLocale: string, 
  sectionMappings: SimpleSectionsData['sectionMappings']
): string {
  const mapping = sectionMappings[sectionId];
  if (mapping && mapping[targetLocale]) {
    return mapping[targetLocale].url;
  }
  
  // Fallback
  return targetLocale === 'de' ? '/' : `/${targetLocale}/`;
}
