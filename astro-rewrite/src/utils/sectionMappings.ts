// Utility to fetch and process all section data at build time
import { slugify } from './slugify';

export interface ChapterMapping {
  [fromLocaleChapter: string]: {
    [toLocale: string]: string;
  };
}

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

export interface AllSectionsData {
  sections: {
    [locale: string]: SectionData[];
  };
  chapterMappings: ChapterMapping;
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

// Fetch all sections for all locales at build time
export async function fetchAllSections(): Promise<AllSectionsData> {
  const locales = ['de', 'fr', 'it'];
  const sections: { [locale: string]: SectionData[] } = {};
  
  console.log('🔄 Fetching all sections for all locales at build time...');
  
  // Fetch sections for each locale
  for (const locale of locales) {
    try {
      const response = await fetch(`https://api.thilo.scouts.ch/sections?_locale=${locale}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sections for ${locale}: ${response.statusText}`);
      }
      const data = await response.json();
      
      // Process sections and add generated slugs
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
      
      const sectionsWithChapters = sections[locale].filter(s => s.chapters && s.chapters.length > 0);
      console.log(`✅ Fetched ${sections[locale].length} sections for ${locale} (${sectionsWithChapters.length} with chapters)`);
    } catch (error) {
      console.error(`❌ Failed to fetch sections for ${locale}:`, error);
      sections[locale] = [];
    }
  }
  
  // Build comprehensive chapter mappings
  const chapterMappings: ChapterMapping = {};
  
  // Build section mappings (section ID to locale data)
  const sectionMappings: AllSectionsData['sectionMappings'] = {};
  
  // Group sections by ID across locales
  const sectionGroups: { [sectionId: string]: SectionData[] } = {};
  
  for (const locale of locales) {
    for (const section of sections[locale]) {
      if (!sectionGroups[section.id]) {
        sectionGroups[section.id] = [];
      }
      sectionGroups[section.id].push(section);
    }
  }
  
  // Build mappings for each section group
  for (const [sectionId, sectionGroup] of Object.entries(sectionGroups)) {
    console.log(`🔄 Processing section group ${sectionId}:`, sectionGroup.map(s => `${s.locale}:${s.title}`));
    
    // Build section mapping
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
    
    // Build chapter mappings for this section group (always, not just when length > 1)
    console.log(`📊 Section group has ${sectionGroup.length} locales`);
    
    // Create chapter mappings between all locale pairs
    for (const fromSection of sectionGroup) {
      console.log(`📖 Processing chapters for ${fromSection.locale}:${fromSection.title}`, fromSection.chapters?.length || 0, 'chapters');
      
      for (const fromChapter of fromSection.chapters || []) {
        const fromKey = `${fromSection.locale}_${fromChapter.slug}`;
        
        if (!chapterMappings[fromKey]) {
          chapterMappings[fromKey] = {};
        }
        
        // Find equivalent chapters in other locales by sorting
        for (const toSection of sectionGroup) {
          if (fromSection.locale === toSection.locale) continue;
          
          const toChapter = toSection.chapters?.find(c => c.sorting === fromChapter.sorting);
          if (toChapter) {
            chapterMappings[fromKey][toSection.locale] = toChapter.slug;
            console.log(`✅ Mapped: ${fromKey} → ${toSection.locale}:${toChapter.slug}`);
          } else {
            console.log(`❌ No chapter found in ${toSection.locale} with sorting ${fromChapter.sorting}`);
          }
        }
      }
    }
  }
  
  console.log('✅ Built comprehensive mappings:', {
    sectionsCount: Object.keys(sectionMappings).length,
    chapterMappingsCount: Object.keys(chapterMappings).length
  });
  
  return {
    sections,
    chapterMappings,
    sectionMappings
  };
}

// Get section URL for a specific locale (using cached data)
export function getSectionUrlForLocaleFromCache(
  sectionId: string, 
  targetLocale: string, 
  sectionMappings: AllSectionsData['sectionMappings']
): string {
  const mapping = sectionMappings[sectionId];
  if (mapping && mapping[targetLocale]) {
    return mapping[targetLocale].url;
  }
  
  // Fallback
  return targetLocale === 'de' ? '/' : `/${targetLocale}/`;
}
