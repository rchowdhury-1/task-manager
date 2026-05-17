import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register', '/terms', '/privacy'],
      disallow: ['/today', '/week', '/lists', '/boards', '/stats', '/settings', '/api/'],
    },
    sitemap: 'https://task-manager-nine-lake-56.vercel.app/sitemap.xml',
  };
}
