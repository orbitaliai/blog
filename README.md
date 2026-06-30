# Orbitali Blog

This repository hosts the blog content and client fetching library for the [Orbitali](https://github.com/orbitaliai) landing page. It operates entirely as an open-source, serverless CMS using GitHub and GitHub Actions.

## Repository Structure

```
├── .github/workflows/
│   └── sync-blog.yml      # GitHub Action to translate posts and sync the TOC
├── blog-client/           # TypeScript client library for landing page integrations
├── content/               # Blog posts folder
│   ├── YYYY-MM-DD/        # Individual post directories grouped by publishing dates
│   │   ├── en.md          # Original English blog post
│   │   ├── es.md          # Translated Spanish blog post (auto-generated)
│   │   └── header.png     # Header image for the blog post
│   ├── toc_en.md          # English Table of Contents (auto-generated)
│   └── toc_es.md          # Spanish Table of Contents (auto-generated)
└── scripts/
    └── sync-blog.mjs      # Translation and TOC synchronization script
```

## How It Works

### 1. Authoring a Post
To publish a new blog post:
1. Create a date directory under `content/` (e.g., `content/2026-06-30/`).
2. Add your English post as `en.md` starting with a `# Title` header on the first line.
3. Save your header image in the same directory as `header.png`.
4. Commit and push your changes to the `main` branch.

### 2. Auto-Translation & TOC Synchronization (GitHub Action)
On every push to `main` containing content changes:
- A GitHub Action checks if the Spanish translation (`es.md`) is missing or if `en.md` was modified in the commit.
- If so, it calls OpenAI (`gpt-4o-mini`) using the `OPENAI_API_KEY` repository secret to automatically translate the post to Spanish, maintaining all markdown tags, code snippets, and math styling.
- It then extracts the metadata (title, header image, and a first-paragraph brief) for all posts and regenerates the English and Spanish Table of Contents files (`toc_en.md` and `toc_es.md`) sorted descending by date.
- The changes are automatically committed and pushed back to the branch with a `[skip ci]` flag.

---

## Client Library (`@orbitali/blog-client`)

The `blog-client/` directory contains a dependency-free TypeScript library that fetches the blog posts and table of contents directly from GitHub raw CDNs (or local filesystems during development).

### Installation

```sh
cd blog-client
bun install
```

### Usage

```typescript
import { fetchTOC, fetchBlogPost } from '@orbitali/blog-client';

// 1. Fetch English Table of Contents (TOC)
const toc = await fetchTOC('en', {
  owner: 'orbitaliai',
  repo: 'blog'
});

// Each TOC entry contains: title, slug, date, image, brief
console.log(toc);

// 2. Fetch an individual Spanish blog post
const post = await fetchBlogPost('2026-06-30', 'es', {
  owner: 'orbitaliai',
  repo: 'blog'
});

// Returns: title, image (absolute URL), and content (markdown with title/header image stripped)
console.log(post.title);
console.log(post.content);
```

### Development & Testing

Run unit and integration tests using Bun:
```sh
cd blog-client
bun test
```
To build/compile TypeScript files:
```sh
bun run build
```
