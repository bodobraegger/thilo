import { useState, useEffect } from 'react';
import type { SectionT } from '../utils/data';

interface SearchProps {
  initialQuery?: string;
  locale: string;
}

export default function SearchComponent({ initialQuery = '', locale }: SearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [sections, setSections] = useState<SectionT[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch sections on mount
  useEffect(() => {
    async function fetchSections() {
      try {
        const response = await fetch(`https://api.thilo.scouts.ch/sections?_locale=${locale}`);
        const data = await response.json();
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

    sections.forEach(section => {
      if (section.title?.toLowerCase().includes(lowercaseQuery) || 
          section.content?.toLowerCase().includes(lowercaseQuery)) {
        searchResults.push({
          type: 'section',
          title: section.title,
          content: section.content,
          url: `/${section.slug}`,
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
            url: `/${section.slug}#${chapter.slug}`,
            section,
            chapter
          });
        }
      });
    });

    setResults(searchResults);
  }, [query, sections]);

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              const cleanContent = stripMarkdown(result.content);
              const excerpt = cleanContent.length > 200 
                ? cleanContent.substring(0, 200) + '...' 
                : cleanContent;

              return (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold mb-2">
                    <a href={result.url} className="hover:underline text-primary-600">
                      {result.title}
                    </a>
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-3">{excerpt}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      {result.type === 'section' ? 'Bereich' : 'Kapitel'}
                    </span>
                    <span className="text-gray-500">{result.section.title}</span>
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
