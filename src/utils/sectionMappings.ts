// Simple utility to fetch all section data at build time (like React app)
import { slugify } from './slugify';

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
      };
    };
  };
}

// Cache for fetchAllSections - important for dev server performance
let cachedAllSections: SimpleSectionsData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache in dev

// Simple function to fetch all sections (like React app)
export async function fetchAllSections(): Promise<SimpleSectionsData> {
  // Return cached data if available and fresh
  if (cachedAllSections && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedAllSections;
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
          menu_name: section.menu_name || section.title,
          slug: slugify(section.title),
          locale,
          sorting: section.sorting,
          color_primary: section.color_primary,
          icon: section.icon ? {
            id: section.icon.id,
            url: section.icon.url,
            alternativeText: section.icon.alternativeText,
          } : undefined,
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

  // Cache the result
  cachedAllSections = result;
  cacheTimestamp = Date.now();

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
