import type { ComponentProps, PropsWithChildren } from 'react';

interface LinkProps extends PropsWithChildren<Omit<ComponentProps<'a'>, 'href'>> {
  href: string;
}

/**
 * Link component that automatically prepends the base path for internal links.
 * Handles sites hosted on subpages like /thilo/
 * 
 * @example
 * <Link href="/search">Search</Link>
 * // If hosted at example.com/thilo/, renders: <a href="/thilo/search">Search</a>
 */
export default function Link({ href, children, ...props }: LinkProps) {
  const getBasePath = () => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    // Extract base path if site is hosted on a subpage
    const match = path.match(/^(\/[^\/]+)\//);
    return match ? match[1] : '';
  };

  // Only prepend base path for internal links (starting with /)
  const isInternalLink = href.startsWith('/');
  const basePath = isInternalLink ? getBasePath() : '';
  const fullHref = isInternalLink ? `${basePath}${href}` : href;

  return (
    <a href={fullHref} {...props}>
      {children}
    </a>
  );
}
