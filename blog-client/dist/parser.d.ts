import { TOCEntry, BlogPost } from './types.js';
/**
 * Parses the Table of Contents (TOC) markdown content.
 *
 * Expected structure for each entry:
 * ## [Title](slug)
 * ![alt](image_path)
 * Brief description here...
 *
 * @param markdown Raw markdown content of the TOC file
 * @param baseUrl Base URL to resolve relative image paths
 */
export declare function parseTOC(markdown: string, baseUrl: string): TOCEntry[];
/**
 * Parses an individual blog post markdown content.
 *
 * Separates the title (first header line) from the rest of the markdown content.
 *
 * @param markdown Raw markdown content of the blog post file
 * @param slug Directory/date slug of the blog post
 * @param baseUrl Base URL to resolve relative image paths
 */
export declare function parseBlogPost(markdown: string, slug: string, baseUrl: string): BlogPost;
