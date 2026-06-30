import { BlogClientConfig, TOCEntry, BlogPost } from './types.js';
import { parseTOC, parseBlogPost } from './parser.js';
export * from './types.js';
export { parseTOC, parseBlogPost };
/**
 * Resolves the configuration properties and constructs the absolute base URL for fetching content.
 */
export declare function getBaseUrl(config: BlogClientConfig): string;
/**
 * Fetches the Table of Contents (TOC) for the specified language.
 *
 * @param lang Language of the TOC to fetch ('en' | 'es')
 * @param config Configuration options
 * @returns Parsed list of TOC entries
 */
export declare function fetchTOC(lang: 'en' | 'es', config?: BlogClientConfig): Promise<TOCEntry[]>;
/**
 * Fetches a single blog post for the specified slug and language.
 *
 * @param slug Directory slug of the post (e.g., '2026-06-30')
 * @param lang Language of the post to fetch ('en' | 'es')
 * @param config Configuration options
 * @returns Parsed blog post details
 */
export declare function fetchBlogPost(slug: string, lang: 'en' | 'es', config?: BlogClientConfig): Promise<BlogPost>;
