import { parseTOC, parseBlogPost } from './parser.js';
export * from './types.js';
export { parseTOC, parseBlogPost };
const DEFAULT_OWNER = 'orbitaliai';
const DEFAULT_REPO = 'blog';
const DEFAULT_BRANCH = 'main';
const DEFAULT_CONTENT_DIR = 'content';
/**
 * Resolves the configuration properties and constructs the absolute base URL for fetching content.
 */
export function getBaseUrl(config) {
    if (config.baseUrl) {
        return config.baseUrl;
    }
    const owner = config.owner || DEFAULT_OWNER;
    const repo = config.repo || DEFAULT_REPO;
    const branch = config.branch || DEFAULT_BRANCH;
    const contentDir = config.contentDir || DEFAULT_CONTENT_DIR;
    // Construct raw.githubusercontent.com URL
    // Example: https://raw.githubusercontent.com/orbitali/blog/main/content
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${contentDir}`;
}
/**
 * Fetches the Table of Contents (TOC) for the specified language.
 *
 * @param lang Language of the TOC to fetch ('en' | 'es')
 * @param config Configuration options
 * @returns Parsed list of TOC entries
 */
export async function fetchTOC(lang, config = {}) {
    const baseUrl = getBaseUrl(config);
    const tocFileName = `toc_${lang}.md`;
    const url = `${baseUrl.replace(/\/+$/, '')}/${tocFileName}`;
    const fetchFn = config.fetch || globalThis.fetch;
    if (!fetchFn) {
        throw new Error('fetch is not available in this environment. Please provide a custom fetch implementation in config.');
    }
    const response = await fetchFn(url, config.fetchOptions);
    if (!response.ok) {
        throw new Error(`Failed to fetch Table of Contents from ${url}: Status ${response.status} ${response.statusText}`);
    }
    const markdown = await response.text();
    return parseTOC(markdown, baseUrl);
}
/**
 * Fetches a single blog post for the specified slug and language.
 *
 * @param slug Directory slug of the post (e.g., '2026-06-30')
 * @param lang Language of the post to fetch ('en' | 'es')
 * @param config Configuration options
 * @returns Parsed blog post details
 */
export async function fetchBlogPost(slug, lang, config = {}) {
    const baseUrl = getBaseUrl(config);
    const url = `${baseUrl.replace(/\/+$/, '')}/${slug}/${lang}.md`;
    const fetchFn = config.fetch || globalThis.fetch;
    if (!fetchFn) {
        throw new Error('fetch is not available in this environment. Please provide a custom fetch implementation in config.');
    }
    const response = await fetchFn(url, config.fetchOptions);
    if (!response.ok) {
        throw new Error(`Failed to fetch blog post from ${url}: Status ${response.status} ${response.statusText}`);
    }
    const markdown = await response.text();
    return parseBlogPost(markdown, slug, baseUrl);
}
