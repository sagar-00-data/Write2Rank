import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/founder/',
        '/founder/api/',
        '/login',
        '/profile',
        '/settings',
        '/evaluations/',
      ],
    },
    sitemap: 'https://xaminix.com/sitemap.xml',
  };
}
