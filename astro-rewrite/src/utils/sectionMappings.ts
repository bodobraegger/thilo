// Simple utility to fetch all section data at build time (like React app)
import { slugify } from './slugify';

export interface SectionData {
  id: number;
  title: string;
  slug: string;
  locale: string;
  sorting: number;
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

// Simple function to fetch all sections (like React app)
export async function fetchAllSections(): Promise<SimpleSectionsData> {
  const locales = ['de', 'fr', 'it'];
  const sections: { [locale: string]: SectionData[] } = {};
  
  console.log('🔄 Fetching all sections for all locales...');
  
  // Fetch sections for each locale
  for (const locale of locales) {
    try {
      const response = await fetch(`https://api.thilo.scouts.ch/sections?_locale=${locale}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sections for ${locale}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Process sections and add generated slugs (same as React app)
      sections[locale] = data.map((section: any) => ({
        id: section.id,
        title: section.title,
        slug: slugify(section.title),
        locale,
        sorting: section.sorting,
        chapters: section.chapters?.map((chapter: any) => ({
          id: chapter.id,
          title: chapter.title,
          slug: slugify(chapter.title),
          sorting: chapter.sorting
        })) || []
      }));
      
      console.log(`✅ Fetched ${sections[locale].length} sections for ${locale}`);
    } catch (error) {
      console.error(`❌ Failed to fetch sections for ${locale}:`, error);
      sections[locale] = [];
    }
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
  
  console.log(`✅ Built section mappings for ${Object.keys(sectionMappings).length} sections`);
  
  return {
    sections,
    sectionMappings
  };
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
