import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const siteBase = (site?.href ?? 'https://thilo.scouts.ch').replace(/\/$/, '');
  return new Response(
    `# https://www.robotstxt.org/robotstxt.html\nUser-agent: *\nDisallow:\n\nSitemap: ${siteBase}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
