/**
 * Transaction poolers (Supabase on port 6543, Neon's "-pooler" hosts) hand each query to
 * whichever server connection is free, so session-level prepared statements can't be relied on.
 */
export const isPooledUrl = (url: string | undefined) => !!url && (/:6543\//.test(url) || /-pooler\./.test(url));
