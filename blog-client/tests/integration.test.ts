import { expect, test, describe } from "bun:test";
import { fetchTOC, fetchBlogPost } from "../src/index.ts";

describe("Blog Client Fetching Integration", () => {
  // A mock fetch implementation that loads files from the actual local content directory
  const mockFetch: typeof fetch = async (url) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    if (urlString.endsWith("content/toc_en.md")) {
      const file = Bun.file("../content/toc_en.md");
      const text = await file.text();
      return new Response(text, { status: 200 });
    }
    
    if (urlString.endsWith("content/toc_es.md")) {
      const file = Bun.file("../content/toc_es.md");
      const text = await file.text();
      return new Response(text, { status: 200 });
    }
    
    if (urlString.endsWith("content/2026-06-30/en.md")) {
      const file = Bun.file("../content/2026-06-30/en.md");
      const text = await file.text();
      return new Response(text, { status: 200 });
    }
    
    if (urlString.endsWith("content/2026-06-30/es.md")) {
      const file = Bun.file("../content/2026-06-30/es.md");
      const text = await file.text();
      return new Response(text, { status: 200 });
    }
    
    return new Response("Not Found", { status: 404 });
  };

  test("should fetch and parse TOC using mock fetch mapping to actual workspace files", async () => {
    const result = await fetchTOC("en", {
      owner: "orbitaliai",
      repo: "blog",
      fetch: mockFetch
    });

    expect(result).toHaveLength(3);
    expect(result[2].title).toBe("Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model");
    expect(result[2].slug).toBe("2026-06-30");
    expect(result[2].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result[2].brief).toBe(
      `Most AI voice receptionists give you a "hello? ... hello?"`
    );
  });

  test("should fetch and parse Spanish TOC using mock fetch mapping to actual workspace files", async () => {
    const result = await fetchTOC("es", {
      owner: "orbitaliai",
      repo: "blog",
      fetch: mockFetch
    });

    expect(result).toHaveLength(3);
    expect(result[2].title).toBe("Presentamos Orbitali: Por qué cambiamos el pipeline de IA de voz por un único modelo en tiempo real");
    expect(result[2].slug).toBe("2026-06-30");
    expect(result[2].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result[2].brief).toBe(
      `La mayoría de los recepcionistas de voz de IA te dan un "¿hola? ... ¿hola?"`
    );
  });

  test("should fetch and parse an individual English blog post using mock fetch", async () => {
    const result = await fetchBlogPost("2026-06-30", "en", {
      owner: "orbitaliai",
      repo: "blog",
      fetch: mockFetch
    });

    expect(result.title).toBe("Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model");
    expect(result.image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result.content).toContain("Most AI voice receptionists give you a \"hello? ... hello?\"");
    // Check that title has been removed from the content body
    expect(result.content).not.toContain("# Introducing Orbitali");
  });

  test("should fetch and parse an individual Spanish blog post using mock fetch", async () => {
    const result = await fetchBlogPost("2026-06-30", "es", {
      owner: "orbitaliai",
      repo: "blog",
      fetch: mockFetch
    });

    expect(result.title).toBe("Presentamos Orbitali: Por qué cambiamos el pipeline de IA de voz por un único modelo en tiempo real");
    expect(result.image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result.content).toContain("La mayoría de los recepcionistas de voz de IA te dan");
    // Check that title has been removed from the content body
    expect(result.content).not.toContain("# Presentamos Orbitali");
  });
});
