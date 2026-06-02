import { useState, useEffect, useRef } from 'react';
import { getSections, type SectionT } from '../utils/data';
import Link from './Link';
import { t, type Locale } from '../i18n';

interface SearchProps {
  initialQuery?: string;
  locale: string;
  initialSections?: SectionT[];
  inline?: boolean;
  isMobile?: boolean;
}

export interface SearchResult {
  type: 'section' | 'chapter';
  title: string;
  content: string;
  url: string;
  section: SectionT;
  chapter?: any;
  relevance: number;
}

// Calculate relevance score for search results (higher is more relevant)
export function calculateRelevance(text: string, title: string, searchQuery: string, isTitle: boolean): number {
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
}

// Helper to generate locale-aware URLs
export function getLocalizedUrl(locale: string, slug: string, hash?: string): string {
  const basePath = locale === 'de' ? '' : `/${locale}`;
  const hashPart = hash ? `#${hash}` : '';
  return `${basePath}/${slug}${hashPart}`;
}

// Highlight search terms in text
export function highlightText(text: string, searchQuery: string, color?: string): React.ReactNode {
  if (!searchQuery.trim()) return text;
  
  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className={color ? "px-1 rounded" : "bg-yellow-200 px-0.5 rounded"} style={color ? {backgroundColor: color} : undefined}>{part}</mark>
    ) : (
      part
    )
  );
}

export default function SearchComponent({ initialQuery = '', locale, initialSections = [], inline = false, isMobile = false }: SearchProps) {
  const MIN_QUERY_LENGTH = 2;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sections, setSections] = useState<SectionT[]>(initialSections);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Fetch sections on mount only if not provided
  useEffect(() => {
    // Skip if we already have sections from server
    if (initialSections && initialSections.length > 0) {
      return;
    }

    async function fetchSections() {
      setLoading(true);
      try {
        const data = await getSections(locale);
        setSections(data);
      } catch (error) {
        console.error('Failed to fetch sections:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, initialSections.length]);

  // Perform search
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH || sections.length === 0) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];

    sections.forEach(section => {
      const titleRelevance = calculateRelevance(section.content || '', section.title || '', query, true);
      const contentRelevance = calculateRelevance(section.content || '', section.title || '', query, false);
      const maxRelevance = Math.max(titleRelevance, contentRelevance);
      
      if (maxRelevance > 0) {
        searchResults.push({
          type: 'section',
          title: section.title,
          content: section.content,
          url: getLocalizedUrl(locale, section.slug || ''),
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
            url: getLocalizedUrl(locale, section.slug || '', chapter.slug),
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

  const navigateToSearchPage = () => {
    const searchUrl = locale === 'de' ? `/search?q=${encodeURIComponent(query)}` : `/${locale}/search?q=${encodeURIComponent(query)}`;
    window.location.href = searchUrl;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const maxIndex = inline ? Math.min(results.length - 1, 2) : results.length - 1;

    if (!showDropdown || results.length === 0) {
      if (e.key === 'Enter') {
        navigateToSearchPage();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < maxIndex ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          window.location.href = results[selectedIndex].url;
        } else {
          navigateToSearchPage();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (url: string) => {
    setShowDropdown(false);
    window.location.href = url;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowDropdown(newQuery.trim().length >= 1);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (query.trim().length >= 1) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Shared dropdown list used in both modes
  const renderDropdown = (maxItems: number) => (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto"
    >
      {query.trim().length < MIN_QUERY_LENGTH ? (
        <div className="px-4 py-3 text-gray-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" />
          </svg>
          {t('searchPage.keepTyping', locale as Locale)}
        </div>
      ) : results.length === 0 ? (
        <div className="px-4 py-3 text-gray-500 text-sm">
          {t('searchPage.noResults', locale as Locale)}
        </div>
      ) : (
        <ul>
          {results.slice(0, maxItems).map((result, idx) => {
            const sectionColor = result.section.color_primary || '#521d3a';
            const isSelected = idx === selectedIndex;

            return (
              <li key={idx}>
                <button
                  onClick={() => handleResultClick(result.url)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                    isSelected ? 'bg-gray-100' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected ? `color-mix(in srgb, ${sectionColor} 10%, white)` : undefined
                  }}
                  tabIndex={0}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${inline ? 'text-sm' : ''}`} style={{ color: sectionColor }}>
                        {highlightText(result.title, query, `color-mix(in srgb, ${sectionColor} 30%, white)`)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${sectionColor} 15%, white)`,
                            color: sectionColor
                          }}
                        >
                          {result.type === 'section' ? t('searchPage.section', locale as Locale) : t('searchPage.chapter', locale as Locale)}
                        </span>
                        <span className="text-xs text-gray-500 truncate">{result.section.title}</span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          {results.length > maxItems && (
            <li>
              <button
                onClick={navigateToSearchPage}
                className="w-full px-4 py-2 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 text-center transition-colors"
              >
                {t('searchPage.moreResults', locale as Locale).replace('{count}', String(results.length - maxItems))}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={t('searchPage.placeholder', locale as Locale)}
          className={`w-full rounded-md pl-4 pr-10 text-sm focus:outline-none focus:ring-2 placeholder-opacity-70 bg-white text-gray-700 focus:ring-blue-500 ${
            isMobile ? 'py-1.5' : 'h-8'
          }`}
          autoComplete="off"
        />
        <svg
          className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {showDropdown && query.trim() && renderDropdown(3)}
      </div>
    );
  }

  return (
    <div style={{ scrollMarginTop: '80px' }}>
      <div className="mb-8 relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={t('searchPage.placeholder', locale as Locale)}
          className="w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-500"
          autoComplete="off"
        />
        {/* Dropdown with search results */}
        {showDropdown && query.trim() && renderDropdown(10)}
      </div>

      <div id="search-results">
        {loading || (sections.length === 0 && !initialSections?.length) ? (
          <div className="text-center py-12 text-gray-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p>{t('searchPage.loading', locale as Locale)}</p>
          </div>
        ) : query.trim().length < MIN_QUERY_LENGTH ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t('searchPage.enterQuery', locale as Locale)}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-8">
            <p>{t('searchPage.noResultsFor', locale as Locale).replace('{query}', query)}</p>
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
                      {result.type === 'section' ? t('searchPage.section', locale as Locale) : t('searchPage.chapter', locale as Locale)}
                    </span>
                    <span className="text-gray-500" style={{ color: sectionColor }}>{result.section.title}</span>
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
