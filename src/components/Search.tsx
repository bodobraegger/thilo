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
      if (section.title?.toLowerCase().includes(lowercaseQuery) || 
          section.content?.toLowerCase().includes(lowercaseQuery)) {
        searchResults.push({
          type: 'section',
          title: section.title,
          content: section.content,
          url: getLocalizedUrl(section.slug || ''),
          section
        });
      }

      section.chapters?.forEach(chapter => {
        if (chapter.title?.toLowerCase().includes(lowercaseQuery) || 
            chapter.content?.toLowerCase().includes(lowercaseQuery)) {
          searchResults.push({
            type: 'chapter',
            title: chapter.title,
            content: chapter.content,
            url: getLocalizedUrl(section.slug || '', chapter.slug),
            section,
            chapter
          });
        }
      });
    });

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

  const highlightText = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
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
                      {highlightText(result.title, query)}
                    </Link>
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    {highlightText(excerpt, query)}
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
