import type { APIRoute, GetStaticPaths } from 'astro';
import { getSections } from '../../utils/data';
import { stripMarkdown, type SearchIndexEntry } from '../../utils/search';

// Static per-locale search index, fetched lazily by the search widget and
// precached by the service worker. Keeps section content out of every page's
// HTML and lets search score plain text instead of raw markdown.

export const getStaticPaths: GetStaticPaths = () =>
  ['de', 'fr', 'it'].map(locale => ({ params: { locale } }));

export const GET: APIRoute = async ({ params }) => {
  const sections = await getSections(params.locale!);
  const entries: SearchIndexEntry[] = [];

  for (const section of sections) {
    entries.push({
      type: 'section',
      title: section.title,
      text: stripMarkdown(section.content ?? ''),
      slug: section.slug!,
      sectionTitle: section.title,
      color: section.color_primary,
    });
    for (const chapter of section.chapters ?? []) {
      const targetTexts = (chapter.targets ?? [])
        .map(target => `${target.title}\n${target.content ?? ''}`)
        .join('\n');
      entries.push({
        type: 'chapter',
        title: chapter.title,
        text: stripMarkdown(`${chapter.content ?? ''}\n${targetTexts}`),
        slug: section.slug!,
        chapterSlug: chapter.slug,
        sectionTitle: section.title,
        color: section.color_primary,
      });
    }
  }

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
