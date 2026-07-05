// Build-time markdown rendering for Strapi content.
// Replaces the client-side React MarkdownRenderer so pages ship plain HTML;
// only quizzes remain interactive islands.
import { marked } from 'marked';
import type { Token, Tokens } from 'marked';
import { slugify } from './slugify';
import { getCachedImageDimensions } from './imageDimensions';

const BACKEND_URL = import.meta.env.BACKEND_URL || 'https://api.thilo.scouts.ch/';

export type MarkdownPart =
  | { type: 'html'; value: string }
  | { type: 'quiz'; value: string };

function isQuizLink(href: string | null | undefined): boolean {
  if (!href) return false;
  const h = href.toLowerCase();
  return h.includes('quiz') && h.includes('.json');
}

// Prefix site-internal links (leading slash) with the base path and locale;
// anchors, mailto:, tel: and relative links pass through untouched.
function localizeHref(href: string, base: string, locale: string): string {
  if (!href.startsWith('/')) return href;
  const localePrefix = locale === 'de' ? '' : `/${locale}`;
  return `${base}${localePrefix}${href}`;
}

// Strapi can emit relative upload paths; resolve them against the backend.
function resolveImageSrc(href: string): string {
  if (href.startsWith('/')) return BACKEND_URL.replace(/\/$/, '') + href;
  return href;
}

// Resolved URLs of all images embedded in the given markdown, for probing
// their dimensions (imageDimensions.ts) before rendering.
export function extractImageUrls(content: string | undefined): string[] {
  if (!content) return [];
  return [...content.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)/g)]
    .map(match => resolveImageSrc(match[1]));
}

// Content editors encode CSS and captions in image alt text, e.g.
// "caption: Logo OMMS; width: 300px;" - parse both out.
function parseCSSProperties(cssText: string): string | null {
  const properties = cssText.split(';').map(prop => prop.trim()).filter(prop => prop.length > 0);
  const validProperties: string[] = [];
  for (const property of properties) {
    const propMatch = property.match(/^\s*([\w-]+)\s*:\s*(.+)\s*$/);
    if (propMatch) {
      const [, propName, propValue] = propMatch;
      if (/^[\w-]+$/.test(propName) && propValue.trim().length > 0) {
        validProperties.push(`${propName}: ${propValue.trim()}`);
      }
    }
  }
  return validProperties.length > 0 ? validProperties.join('; ') : null;
}

function createRenderer(base: string, locale: string) {
  const renderer = new marked.Renderer();

  // Give headings stable ids so in-content anchor links and deep links work
  renderer.heading = function (token: Tokens.Heading): string {
    const inner = this.parser.parseInline(token.tokens);
    const id = slugify(token.text ?? '');
    const idAttr = id ? ` id="${id}"` : '';
    return `<h${token.depth}${idAttr}>${inner}</h${token.depth}>\n`;
  };

  renderer.link = function (token: Tokens.Link): string {
    const { href, title, text } = token;
    const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
    const titleAttr = title ? ` title="${title}"` : '';
    if (isExternal) {
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }
    return `<a href="${localizeHref(href ?? '', base, locale)}"${titleAttr}>${text}</a>`;
  };

  renderer.image = function (token: Tokens.Image): string {
    const { href, title, text } = token;

    let altText = text || '';
    let styleFromAlt = '';
    let finalAltText = '';

    const captionMatch = altText.match(/caption:\s*([^;]+);/i);
    if (captionMatch) {
      finalAltText = captionMatch[1].trim();
      altText = altText.replace(/caption:\s*[^;]+;\s*/i, '').trim();
    }

    const parsedStyles = altText ? parseCSSProperties(altText) : null;
    if (parsedStyles) {
      styleFromAlt = parsedStyles;
    }
    if (!captionMatch && !parsedStyles) {
      finalAltText = altText;
    }

    const src = resolveImageSrc(href ?? '');
    let imgTag = `<img src="${src}" alt="${finalAltText}" loading="lazy" decoding="async"`;
    // Dimensions probed at build time let the browser reserve space (no
    // layout shift); CSS keeps images responsive via max-width/height:auto
    const dimensions = getCachedImageDimensions(src);
    if (dimensions) {
      imgTag += ` width="${dimensions.width}" height="${dimensions.height}"`;
    }
    if (styleFromAlt) {
      imgTag += ` style="${styleFromAlt}"`;
    } else if (title) {
      // Strapi sometimes stores style information in the title attribute
      if (title.includes('width:') || title.includes('height:') || title.includes('float:')) {
        imgTag += ` style="${title}"`;
      } else {
        imgTag += ` title="${title}"`;
      }
    }
    imgTag += ' />';
    return imgTag;
  };

  return renderer;
}

// Renders Strapi markdown into alternating HTML and quiz parts. Quiz links
// (URLs containing "quiz" and ".json") become their own parts so the caller
// can mount the interactive quiz island in their place.
export function renderMarkdownParts(content: string, base: string, locale: string): MarkdownPart[] {
  const renderer = createRenderer(base, locale);
  // All parsing below is synchronous, so the module-level options can't leak
  // into a concurrent render with a different base/locale.
  marked.setOptions({ gfm: true, renderer });

  const tokens = marked.lexer(content || '');
  const parts: MarkdownPart[] = [];
  let html = '';

  const flushHtml = () => {
    if (html.trim()) parts.push({ type: 'html', value: html });
    html = '';
  };

  const renderTokens = (blockTokens: Token[]) => marked.parser(blockTokens);

  for (const token of tokens) {
    if (token.type === 'paragraph' && token.tokens?.some((t) => t.type === 'link' && isQuizLink((t as Tokens.Link).href))) {
      flushHtml();
      // Re-parse the surrounding inline markdown (via its raw source) so text
      // next to a quiz link is preserved.
      let rawRemainder = '';
      for (const t of token.tokens as Token[]) {
        if (t.type === 'link' && isQuizLink((t as Tokens.Link).href)) {
          if (rawRemainder.trim()) {
            parts.push({ type: 'html', value: renderTokens(marked.lexer(rawRemainder)) });
          }
          rawRemainder = '';
          parts.push({ type: 'quiz', value: (t as Tokens.Link).href });
        } else {
          rawRemainder += t.raw ?? '';
        }
      }
      if (rawRemainder.trim()) {
        parts.push({ type: 'html', value: renderTokens(marked.lexer(rawRemainder)) });
      }
      continue;
    }

    // Wrap tables so they scroll horizontally on mobile
    if (token.type === 'table') {
      html += `<div class="table-wrapper"><div class="table-inner">${renderTokens([token])}</div></div>`;
      continue;
    }

    html += renderTokens([token]);
  }

  flushHtml();
  return parts;
}
