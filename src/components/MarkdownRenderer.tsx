import React from 'react';
import { marked } from 'marked';
import type { Token } from 'marked';
import QuizComponent from './Quiz';

export const prerender = false;

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Custom renderer for links and images
  const renderer = new marked.Renderer();

  // Configure marked options
  marked.setOptions({
    gfm: true,
    renderer: renderer,
  });

  renderer.link = function(token: any): string {
    const { href, title, text } = token;
    const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
    const titleAttr = title ? ` title="${title}"` : '';

    if (isExternal) {
      return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
    }

    return `<a href="${href}"${titleAttr}>${text}</a>`;
  };

  renderer.image = function(token: any): string {
    const { href, title, text } = token;

    // Parse CSS specifications and caption from alt text
    let altText = text || '';
    let styleFromAlt = '';
    let finalAltText = '';

    // First, look for caption specification like "caption: Logo OMMS;"
    const captionMatch = altText.match(/caption:\s*([^;]+);/i);
    if (captionMatch) {
      finalAltText = captionMatch[1].trim();
      // Remove the caption part from altText for CSS processing
      altText = altText.replace(/caption:\s*[^;]+;\s*/i, '').trim();
    }

    // Look for CSS specifications directly in remaining alt text like "width: 300px; height: 200px;"
    const parsedStyles = parseCSSProperties(altText);
    if (parsedStyles) {
      styleFromAlt = parsedStyles;
    }

    // If no caption was specified and we only had CSS properties, alt should be empty
    if (!captionMatch && parsedStyles) {
      finalAltText = '';
    } else if (!captionMatch) {
      // If no caption and no CSS properties, use original alt text
      finalAltText = altText;
    }

    // Helper function to parse and validate CSS properties
    function parseCSSProperties(cssText: string): string | null {
      try {
        // Split by semicolon and process each property
        const properties = cssText.split(';').map(prop => prop.trim()).filter(prop => prop.length > 0);
        const validProperties: string[] = [];

        for (const property of properties) {
          // Match CSS property: value pattern
          const propMatch = property.match(/^\s*([\w-]+)\s*:\s*(.+)\s*$/);
          if (propMatch) {
            const [, propName, propValue] = propMatch;

            // Basic validation: property name should be valid CSS property format
            if (/^[\w-]+$/.test(propName) && propValue.trim().length > 0) {
              validProperties.push(`${propName}: ${propValue.trim()}`);
            }
          }
        }

        return validProperties.length > 0 ? validProperties.join('; ') : null;
      } catch (error) {
        return null;
      }
    }

    let imgTag = `<img src="${href}" alt="${finalAltText}"`;

    // Handle style from alt text first (higher priority)
    if (styleFromAlt) {
      imgTag += ` style="${styleFromAlt}"`;
    } else if (title) {
      // Check if title contains style information (from Strapi)
      if (title.includes('width:') || title.includes('height:') || title.includes('float:')) {
        imgTag += ` style="${title}"`;
      } else {
        imgTag += ` title="${title}"`;
      }
    }

    imgTag += ' />';

    let wrappedTag = `<span class="md-img-wrap">${imgTag} <caption>${finalAltText}</caption></span>`;

    return wrappedTag;
  };

  // Parse the content and identify quiz links
  const tokens = marked.lexer(content || '');
  const elements: React.ReactNode[] = [];

  const processTokens = (tokens: Token[]) => {
    let currentHtml = '';
    
    const flushHtml = () => {
      if (currentHtml.trim()) {
        elements.push(
          <div key={`html-${elements.length}`} dangerouslySetInnerHTML={{ __html: currentHtml }} />
        );
        currentHtml = '';
      }
    };

    tokens.forEach((token, index) => {
      if (token.type === 'link' && token.href) {
        const href = token.href.toLowerCase();
        if (href.includes('quiz') && href.includes('.json')) {
          flushHtml();
          elements.push(
            <QuizComponent key={`quiz-${index}`} url={token.href} />
          );
          return;
        }
      }

      if (token.type === 'paragraph' && token.tokens) {
        // Check for quiz links in paragraph tokens
        const hasQuizLink = token.tokens.some((t: any) =>
          t.type === 'link' && t.href && t.href.toLowerCase().includes('quiz') && t.href.toLowerCase().includes('.json')
        );

        if (hasQuizLink) {
          flushHtml();
          // Process paragraph with quiz links
          const paragraphElements: React.ReactNode[] = [];
          token.tokens.forEach((t: any, i: number) => {
            if (t.type === 'link' && t.href && t.href.toLowerCase().includes('quiz') && t.href.toLowerCase().includes('.json')) {
              paragraphElements.push(
                <QuizComponent key={`quiz-${index}-${i}`} url={t.href} />
              );
            } else {
              // Render other content as HTML
              const html = marked.parser([t]);
              paragraphElements.push(
                <span key={`text-${index}-${i}`} dangerouslySetInnerHTML={{ __html: html }} />
              );
            }
          });
          elements.push(
            <div className="markdownrenderer-quiz-wrapper" key={`para-${index}`}>
              {paragraphElements}
            </div>
          );
          return;
        }
      }

      // Default rendering - accumulate HTML
      const html = marked.parser([token]);
      currentHtml += html;
    });
    
    flushHtml(); // Flush any remaining HTML
  };

  processTokens(tokens);

  return (
    <div className={`markdown-content ${className}`}>
      {elements}
    </div>
  );
};

export default MarkdownRenderer;
