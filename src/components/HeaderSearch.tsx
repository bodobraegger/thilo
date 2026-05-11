import { useState, useEffect, useRef } from 'react';
import { getSections, type SectionT } from '../utils/data';
import { calculateRelevance, getLocalizedUrl, highlightText, type SearchResult } from './Search';

interface HeaderSearchProps {
  locale: string;
  placeholder: string;
  isMobile?: boolean;
}

export default function HeaderSearch({ locale, placeholder, isMobile = false }: HeaderSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sections, setSections] = useState<SectionT[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim() || sections.length === 0) {
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

    searchResults.sort((a, b) => b.relevance - a.relevance);
    setResults(searchResults);
  }, [query, sections, locale]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || results.length === 0) {
      if (e.key === 'Enter') {
        navigateToSearchPage();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < Math.min(results.length - 1, 2) ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        // Always navigate to search page, but if a result is selected, scroll to it
        navigateToSearchPage();
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const navigateToSearchPage = () => {
    const searchUrl = locale === 'de' ? `/search?q=${encodeURIComponent(query)}` : `/${locale}/search?q=${encodeURIComponent(query)}`;
    window.location.href = searchUrl;
  };

  const handleResultClick = (url: string) => {
    // Navigate to search page instead of directly to result
    navigateToSearchPage();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setShowDropdown(newQuery.trim().length > 0);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (query.trim().length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Check if the blur is due to clicking inside the dropdown
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    setTimeout(() => {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className={`relative ${isMobile ? 'w-full' : 'w-64'}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
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

      {/* Dropdown */}
      {showDropdown && query.trim() && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto"
          style={{ minWidth: isMobile ? '300px' : '400px' }}
        >
          {results.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              Keine Ergebnisse gefunden
            </div>
          ) : (
            <ul>
              {results.slice(0, 3).map((result, idx) => {
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
                          <div className="font-medium text-gray-900 truncate text-sm" style={{ color: sectionColor }}>
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
                              {result.type === 'section' ? 'Bereich' : 'Kapitel'}
                            </span>
                            <span className="text-xs text-gray-500 truncate">{result.section.title}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
              {results.length > 3 && (
                <li className="px-4 py-2 text-xs text-gray-500 bg-gray-50 text-center">
                  +{results.length - 3} weitere Ergebnisse
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
