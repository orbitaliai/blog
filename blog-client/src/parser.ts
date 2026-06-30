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
export function parseTOC(markdown: string, baseUrl: string): TOCEntry[] {
  const entries: TOCEntry[] = [];
  
  // Split by '## [' which starts a blog post item in the TOC
  const parts = markdown.split(/##\s*\[/);
  // The first part is the header preamble, skip it.
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    
    // Structure is: Title](slug)
    const titleSlugMatch = chunk.match(/^([^\]]+)\]\(([^)]+)\)/);
    if (!titleSlugMatch) continue;
    
    const title = titleSlugMatch[1].trim();
    const slug = titleSlugMatch[2].trim();
    
    // Look for the image: ![alt](image_path)
    const imageMatch = chunk.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    let rawImage = '';
    if (imageMatch) {
      rawImage = imageMatch[2].trim();
    } else {
      // Fallback naming convention
      rawImage = `${slug}/header.png`;
    }
    
    // Construct resolved image URL
    let image = rawImage;
    if (!/^https?:\/\//i.test(rawImage) && !rawImage.startsWith('/')) {
      const cleanBase = baseUrl.replace(/\/+$/, '');
      const cleanImg = rawImage.replace(/^\/+/, '');
      image = `${cleanBase}/${cleanImg}`;
    }
    
    // Extract the brief
    const lines = chunk.split(/\r?\n/);
    // Filter out the title line (first line) and any image line
    const briefLines = lines.slice(1).filter(line => {
      const trimmed = line.trim();
      // Ignore image tags
      if (trimmed.startsWith('![') && trimmed.endsWith(')')) return false;
      // Ignore horizontal rules or decorative markdown breaks
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') return false;
      return true;
    });
    
    const brief = briefLines.join('\n').trim();
    const date = slug; // The directories use the publishing dates (e.g. '2026-06-30')
    
    entries.push({
      title,
      image,
      brief,
      slug,
      date
    });
  }
  
  return entries;
}

/**
 * Parses an individual blog post markdown content.
 * 
 * Separates the title (first header line) from the rest of the markdown content.
 * 
 * @param markdown Raw markdown content of the blog post file
 * @param slug Directory/date slug of the blog post
 * @param baseUrl Base URL to resolve relative image paths
 */
export function parseBlogPost(markdown: string, slug: string, baseUrl: string): BlogPost {
  const lines = markdown.split(/\r?\n/);
  
  let title = '';
  let titleLineIndex = -1;
  
  // Find the first heading line starting with '#' which is the title
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) {
      title = line.replace(/^#+\s*/, '').trim();
      titleLineIndex = i;
      break;
    }
  }
  
  if (titleLineIndex === -1) {
    // Fallback: use first non-empty line as title
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line !== '') {
        title = line;
        titleLineIndex = i;
        break;
      }
    }
  }
  
  // Extract all lines after the title
  const remainingLines = titleLineIndex !== -1 ? lines.slice(titleLineIndex + 1) : lines;
  
  // Find the first non-empty line after title and check if it's an image
  let imagePath = '';
  let imageLineIndexInRemaining = -1;
  
  for (let i = 0; i < remainingLines.length; i++) {
    const trimmedLine = remainingLines[i].trim();
    if (trimmedLine === '') continue;
    
    // Check if this first non-empty element is an image tag
    const imageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      imagePath = imageMatch[2].trim();
      imageLineIndexInRemaining = i;
    }
    // We only inspect the very first non-empty block
    break;
  }
  
  // If no inline image was found, default to YYYY-MM-DD/header.png
  if (!imagePath) {
    imagePath = `${slug}/header.png`;
  }
  
  // Resolve imagePath to absolute URL
  let image = imagePath;
  if (!/^https?:\/\//i.test(imagePath) && !imagePath.startsWith('/')) {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanImg = imagePath.replace(/^\/+/, '');
    
    if (cleanImg.startsWith(`${slug}/`)) {
      image = `${cleanBase}/${cleanImg}`;
    } else {
      image = `${cleanBase}/${slug}/${cleanImg}`;
    }
  }
  
  // Prepare content lines: if we found an inline image line, filter it out
  const contentLines = imageLineIndexInRemaining !== -1
    ? [...remainingLines.slice(0, imageLineIndexInRemaining), ...remainingLines.slice(imageLineIndexInRemaining + 1)]
    : remainingLines;
  
  // Strip leading empty lines from content
  let firstNonEmptyIndex = 0;
  while (firstNonEmptyIndex < contentLines.length && contentLines[firstNonEmptyIndex].trim() === '') {
    firstNonEmptyIndex++;
  }
  
  const content = contentLines.slice(firstNonEmptyIndex).join('\n').trim();
  
  return {
    title,
    image,
    content
  };
}
