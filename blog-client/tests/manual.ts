import { fetchTOC, fetchBlogPost } from "../src/index.ts";

// A mock fetch mapping to actual workspace files
const mockFetch: typeof fetch = async (url) => {
  const urlString = url.toString();
  console.log(`[Fetch] Requesting URL: ${urlString}`);
  
  if (urlString.endsWith("content/toc_en.md")) {
    const file = Bun.file("../content/toc_en.md");
    return new Response(await file.text(), { status: 200 });
  }
  
  if (urlString.endsWith("content/2026-06-30/en.md")) {
    const file = Bun.file("../content/2026-06-30/en.md");
    return new Response(await file.text(), { status: 200 });
  }
  
  return new Response("Not Found", { status: 404 });
};

async function main() {
  console.log("=== Fetching Table of Contents ===");
  const toc = await fetchTOC("en", { fetch: mockFetch });
  console.log("Parsed TOC Output:", JSON.stringify(toc, null, 2));

  console.log("\n=== Fetching Blog Post (2026-06-30) ===");
  const post = await fetchBlogPost("2026-06-30", "en", { fetch: mockFetch });
  console.log("Parsed Blog Post Title:", post.title);
  console.log("Parsed Blog Post Image:", post.image);
  console.log("Parsed Blog Post Content (First 200 chars):", post.content.substring(0, 200) + "...");
}

main().catch(console.error);
