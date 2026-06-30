export interface BlogClientConfig {
  owner?: string;        // Defaults to 'orbitali'
  repo?: string;         // Defaults to 'blog'
  branch?: string;       // Defaults to 'main'
  contentDir?: string;   // Defaults to 'content'
  baseUrl?: string;      // Override URL (e.g., '/content' or 'http://localhost:3000/content' for local dev)
  fetch?: typeof fetch;  // Custom fetch function (defaults to globalThis.fetch)
  fetchOptions?: RequestInit; // Custom request options (e.g., token headers to avoid rate limits)
}

export interface TOCEntry {
  title: string;
  image: string;         // Resolved absolute URL of the header image
  brief: string;         // Brief text description
  slug: string;          // Directory name (e.g., '2026-06-30')
  date: string;          // Normalized date string (e.g., '2026-06-30')
}

export interface BlogPost {
  title: string;
  image: string;         // Resolved absolute URL of the header image
  content: string;       // Markdown content with title line and empty lines stripped
}
