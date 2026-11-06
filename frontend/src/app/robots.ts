import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/lib/site';

const AI_TRAINING_CRAWLERS = [
  'GPTBot',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'ClaudeBot',
  'anthropic-ai',
  'Bytespider',
  'meta-externalagent',
  'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/en/checkout', '/bn/checkout', '/en/order/', '/bn/order/'],
      },
      // Crawlers that collect text and photos to train AI models (Terms: Copyright). Search
      // engines (Googlebot, Bingbot) are not affected.
      { userAgent: AI_TRAINING_CRAWLERS, disallow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
