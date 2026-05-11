import { useState, useEffect } from 'react';
import { getSections, type SectionT } from '../utils/data';
import Link from './Link';

interface SearchProps {
  initialQuery?: string;
  locale: string;
}

export default function SearchComponent({ initialQuery = '', locale }: SearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [sections, setSections] = useState<SectionT[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync with URL params on mount (for client-side navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const queryParam = urlParams.get('q');
      if (queryParam && queryParam !== query) {
        setQuery(queryParam);
      }
    }
  }, []);

  // Fetch sections on mount
  useEffect(() => {
    async function fetchSections() {
      try {
        const data = await getSections(locale);
        setSections(data);
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      }
    }
    fetchSections();
  }, [locale]);

  // Calculate relevance score for search results (higher is more relevant)
  const calculateRelevance = (text: string, title: string, searchQuery: string, isTitle: boolean): number => {
    if (!text && !title) return 0;
    
    const lowerText = text?.toLowerCase() || '';
    const lowerTitle = title?.toLowerCase() || '';
    const lowerQuery = searchQuery.toLowerCase().trim();
    const targetText = isTitle ? lowerTitle : lowerText;
    
    if (!targetText.includes(lowerQuery)) return 0;
    
    let score = 0;
    
    // Exact match (highest priority)
    if (targetText === lowerQuery) {
      score += 1000;
    }
    
    // Exact match in title (very high priority)
    if (lowerTitle === lowerQuery) {
      score += 800;
    }
    
    // Title contains exact match as whole phrase
    if (lowerTitle.includes(lowerQuery)) {
      score += 500;
    }
    
    // Whole word match in title
    const titleWordBoundaryRegex = new RegExp(`\\b${lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (titleWordBoundaryRegex.test(lowerTitle)) {
      score += 400;
    }
    
    // Starts with query in title
    if (lowerTitle.startsWith(lowerQuery)) {
      score += 300;
    }
    
    // Whole word match in content
    const contentWordBoundaryRegex = new RegExp(`\\b${lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (contentWordBoundaryRegex.test(lowerText)) {
      score += 200;
    }
    
    // Starts with query in content
    if (lowerText.startsWith(lowerQuery)) {
      score += 150;
    }
    
    // Partial match in title (contains substring)
    if (lowerTitle.includes(lowerQuery) && score < 300) {
      score += 100;
    }
    
    // Partial match in content
    if (lowerText.includes(lowerQuery) && score < 100) {
      score += 50;
    }
    
    // Boost score based on position (earlier matches are better)
    const position = targetText.indexOf(lowerQuery);
    if (position !== -1) {
      const positionBoost = Math.max(0, 50 - position);
      score += positionBoost;
    }
    
    // Boost for shorter text (more focused matches)
    const lengthPenalty = Math.min(50, targetText.length / 100);
    score -= lengthPenalty;
    
    return score;
  };

  // Perform search
  useEffect(() => {
    if (!query.trim() || sections.length === 0) {
      setResults([]);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const searchResults: any[] = [];

    // Helper to generate locale-aware URLs
    const getLocalizedUrl = (slug: string, hash?: string) => {
      const basePath = locale === 'de' ? '' : `/${locale}`;
      const hashPart = hash ? `#${hash}` : '';
      return `${basePath}/${slug}${hashPart}`;
    };

    sections.forEach(section => {
      const titleRelevance = calculateRelevance(section.content || '', section.title || '', query, true);
      const contentRelevance = calculateRelevance(section.content || '', section.title || '', query, false);
      const maxRelevance = Math.max(titleRelevance, contentRelevance);
      
      if (maxRelevance > 0) {
        searchResults.push({
          type: 'section',
          title: section.title,
          content: section.content,
          url: getLocalizedUrl(section.slug || ''),
          section,
          relevance: maxRelevance
        });
      }

      section.chapters?.forEach(chapter => {
        const chapterTitleRelevance = calculateRelevance(chapter.content || '', chapter.title || '', query, true);
        const chapterContentRelevance = calculateRelevance(chapter.content || '', chapter.title || '', query, false);
        const chapterMaxRelevance = Math.max(chapterTitleRelevance, chapterContentRelevance);
        
        if (chapterMaxRelevance > 0) {
          searchResults.push({
            type: 'chapter',
            title: chapter.title,
            content: chapter.content,
            url: getLocalizedUrl(section.slug || '', chapter.slug),
            section,
            chapter,
            relevance: chapterMaxRelevance
          });
        }
      });
    });

    // Sort by relevance score (highest first)
    searchResults.sort((a, b) => b.relevance - a.relevance);

    setResults(searchResults);
  }, [query, sections, locale]);

  const stripMarkdown = (text: string) => {
    if (!text) return '';
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/>\s+/g, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  };

  const highlightText = (text: string, searchQuery: string, color: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="px-1 rounded" style={{backgroundColor: color}}>{part}</mark>
      ) : (
        part
      )
    );
  };

  const getExcerpt = (text: string, searchQuery: string, maxLength: number = 200) => {
    const cleanText = stripMarkdown(text);
    const lowercaseText = cleanText.toLowerCase();
    const lowercaseQuery = searchQuery.toLowerCase();
    const queryIndex = lowercaseText.indexOf(lowercaseQuery);

    if (queryIndex === -1) {
      // Query not found in text, return start of text
      return cleanText.length > maxLength 
        ? cleanText.substring(0, maxLength) + '...' 
        : cleanText;
    }

    // Calculate excerpt bounds to center the search term
    const contextLength = Math.floor((maxLength - searchQuery.length) / 2);
    let start = Math.max(0, queryIndex - contextLength);
    let end = Math.min(cleanText.length, queryIndex + searchQuery.length + contextLength);

    // Adjust to not cut words
    if (start > 0) {
      const spaceIndex = cleanText.lastIndexOf(' ', start);
      if (spaceIndex > 0 && start - spaceIndex < 20) {
        start = spaceIndex + 1;
      }
    }

    if (end < cleanText.length) {
      const spaceIndex = cleanText.indexOf(' ', end);
      if (spaceIndex > 0 && spaceIndex - end < 20) {
        end = spaceIndex;
      }
    }

    const excerpt = cleanText.substring(start, end);
    return (start > 0 ? '...' : '') + excerpt + (end < cleanText.length ? '...' : '');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ scrollMarginTop: '80px' }}>
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchbegriff eingeben..."
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div id="search-results">
        {!query.trim() ? (
          <div className="text-center py-12 text-gray-500">
            <p>Geben Sie einen Suchbegriff ein</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8">
            <p>Keine Ergebnisse für "{query}" gefunden</p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result, idx) => {
              const excerpt = getExcerpt(result.content, query);
              const sectionColor = result.section.color_primary || '#521d3a';

              return (
                <div 
                  key={idx} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  style={{ 
                    '--section-color': sectionColor,
                    borderColor: sectionColor,
                    scrollMarginTop: '80px'
                  } as React.CSSProperties}
                >
                  <h3 className="text-lg font-semibold mb-2">
                    <Link href={result.url} className="hover:underline" style={{ color: sectionColor }}>
                      {highlightText(result.title, query, `color-mix(in srgb, ${sectionColor} 20%, white)`)}
                    </Link>
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    {highlightText(excerpt, query, `color-mix(in srgb, ${sectionColor} 20%, white)`)}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <span 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `color-mix(in srgb, ${sectionColor} 20%, white)`,
                        color: sectionColor 
                      }}
                    >
                      {result.type === 'section' ? 'Bereich' : 'Kapitel'}
                    </span>
                    <span className="text-gray-500" style={{color: sectionColor}}>{result.section.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
