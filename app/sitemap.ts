import type { MetadataRoute } from 'next';

const BASE = 'https://task-manager-nine-lake-56.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, lastModified: new Date(), priority: 1.0 },
    { url: `${BASE}/register`, lastModified: new Date(), priority: 0.8 },
    { url: `${BASE}/terms`, lastModified: new Date(), priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: new Date(), priority: 0.3 },
  ];
}
