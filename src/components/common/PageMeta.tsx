import { useEffect } from 'react';

export function PageMeta({
  title,
  description,
  canonicalPath,
}: {
  title: string;
  description: string;
  canonicalPath?: string;
}) {
  useEffect(() => {
    document.title = title.includes('ScholarPath') ? title : `${title} | ScholarPath`;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', document.title);
    }

    if (canonicalPath && typeof window !== 'undefined') {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'canonical';
        document.head.appendChild(link);
      }
      link.href = `${window.location.origin}${canonicalPath}`;
    }
  }, [title, description, canonicalPath]);

  return null;
}
