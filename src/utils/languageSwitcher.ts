export function handleLanguageChange(targetLocale: string, base: string): void {
  const buildUrl = (path: string) => base + path;
  const currentHash = window.location.hash;

  let path = window.location.pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  path = path.replace(/^\/|\/$/g, '');
  if (path.startsWith('fr/'))      path = path.substring(3);
  else if (path.startsWith('it/')) path = path.substring(3);
  else if (path === 'fr' || path === 'it') path = '';

  if (path === 'impressum') {
    window.location.href = targetLocale === 'de'
      ? buildUrl('/impressum')
      : buildUrl(`/${targetLocale}/impressum`);
    return;
  }

  const allSectionsMeta = document
    .querySelector('meta[name="all-sections"]')
    ?.getAttribute('content');
  if (!allSectionsMeta) {
    window.location.href = targetLocale === 'de' ? buildUrl('/') : buildUrl(`/${targetLocale}/`);
    return;
  }

  const allSections: Record<string, any[]> = JSON.parse(allSectionsMeta);
  const currentLocale = document.documentElement.lang || 'de';
  const currentSection = (allSections[currentLocale] ?? []).find((s) => s.slug === path);

  if (currentSection) {
    const targetSection = (allSections[targetLocale] ?? []).find(
      (s) => s.sorting === currentSection.sorting
    );
    if (targetSection) {
      const targetUrl = buildUrl(
        targetLocale === 'de'
          ? `/${targetSection.slug}`
          : `/${targetLocale}/${targetSection.slug}`
      );
      if (currentHash && currentSection.chapters && targetSection.chapters) {
        const curChapter = currentSection.chapters.find(
          (c: any) => c.slug === currentHash.slice(1)
        );
        if (curChapter) {
          const tgtChapter = targetSection.chapters.find(
            (c: any) => c.sorting === curChapter.sorting
          );
          if (tgtChapter) {
            window.location.href = targetUrl + `#${tgtChapter.slug}`;
            return;
          }
        }
      }
      window.location.href = targetUrl;
      return;
    }
  }

  let targetUrl =
    path === 'search'
      ? targetLocale === 'de'
        ? buildUrl('/search')
        : buildUrl(`/${targetLocale}/search`)
      : targetLocale === 'de'
        ? buildUrl('/')
        : buildUrl(`/${targetLocale}/`);
  if (window.location.search) targetUrl += window.location.search;
  window.location.href = targetUrl;
}
