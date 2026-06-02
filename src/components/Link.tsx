import type { ComponentProps, PropsWithChildren } from 'react';

interface LinkProps extends PropsWithChildren<Omit<ComponentProps<'a'>, 'href'>> {
  href: string;
}

/**
 * Link component that automatically prepends the base path for internal links.
 * Handles sites hosted on subpages like /thilo/
 * BASE_URL is injected at build time via the data-base attribute on <body> or
 * read from the <base> tag. We use import.meta.env.BASE_URL via a global set in BaseLayout.
 */
export default function Link({ href, children, ...props }: LinkProps) {
  const getBase = () => {
    if (typeof window === 'undefined') return '';
    // Read the base injected by BaseLayout into a meta tag
    const meta = document.querySelector('meta[name="base-url"]');
    return meta?.getAttribute('content') ?? '';
  };

  const isInternalLink = href.startsWith('/');
  const fullHref = isInternalLink ? `${getBase()}${href}` : href;

  return (
    <a href={fullHref} {...props}>
      {children}
    </a>
  );
}
