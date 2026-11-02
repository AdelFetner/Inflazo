const DEFAULT_SITE_URL = 'http://localhost:3000';

/** NEXT_PUBLIC_SITE_URL, else the Vercel production domain, else localhost; no trailing slash. */
export function getSiteUrl(): string {
  const vercelHost = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  const url = process.env.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : DEFAULT_SITE_URL);
  return url.replace(/\/+$/, '');
}
