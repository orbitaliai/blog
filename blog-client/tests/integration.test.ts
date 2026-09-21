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

    if (urlString.endsWith("content/toc_it.md")) {
      const file = Bun.file("../content/toc_it.md");
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

    if (urlString.endsWith("content/2026-06-30/it.md")) {
      const file = Bun.file("../content/2026-06-30/it.md");
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

    expect(result).toHaveLength(11);
    expect(result[0].title).toBe("The BYOC Advantage: Why You Should Always Own Your Company's Phone Numbers");
    expect(result[0].slug).toBe("2026-09-18");
    expect(result[0].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-09-18/header.png");
    expect(result[result.length - 1].title).toBe("Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model");
    expect(result[result.length - 1].slug).toBe("2026-06-30");
    expect(result[result.length - 1].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result[result.length - 1].brief).toBe(
      `Most AI voice receptionists give you a "hello? ... hello?"`
    );
  });

  test("should fetch and parse Spanish TOC using mock fetch mapping to actual workspace files", async () => {
    const result = await fetchTOC("es", {
      owner: "orbitaliai",
      repo: "blog",
      fetch: mockFetch
    });

    expect(result).toHaveLength(11);
    expect(result[0].title).toBe("La ventaja de BYOC: Por qué tu empresa siempre debería ser dueña de sus números de teléfono");
    expect(result[0].slug).toBe("2026-09-18");
    expect(result[0].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-09-18/header.png");
    expect(result[result.length - 1].title).toBe("Presentamos Orbitali: Por qué cambiamos el pipeline de IA de voz por un único modelo en tiempo real");
    expect(result[result.length - 1].slug).toBe("2026-06-30");
    expect(result[result.length - 1].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result[result.length - 1].brief).toBe(
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

  test("should fetch and parse Italian TOC using mock fetch mapping to actual workspace files", async () => {
    const result = await fetchTOC("it", {
      owner: "orbitaliai",
      repo: "blog",
      fetch: mockFetch
    });

    expect(result).toHaveLength(11);
    expect(result[0].title).toBe("Il vantaggio del BYOC: Perché dovresti sempre possedere i numeri telefonici della tua azienda");
    expect(result[0].slug).toBe("2026-09-18");
    expect(result[0].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-09-18/header.png");
    expect(result[result.length - 1].title).toBe("Presentazione di Orbitali: Perché abbiamo sostituito la pipeline di Voice AI con un singolo modello in tempo reale");
    expect(result[result.length - 1].slug).toBe("2026-06-30");
    expect(result[result.length - 1].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result[result.length - 1].brief).toBe(
      `La maggior parte dei receptionist vocali basati su IA ti lascia con un "pronto? ... pronto?"`
    );
  });

  test("should fetch and parse an individual Italian blog post using mock fetch", async () => {
    const result = await fetchBlogPost("2026-06-30", "it", {
      owner: "orbitaliai",
      repo: "blog",
      fetch: mockFetch
    });

    expect(result.title).toBe("Presentazione di Orbitali: Perché abbiamo sostituito la pipeline di Voice AI con un singolo modello in tempo reale");
    expect(result.image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
    expect(result.content).toContain("La maggior parte dei receptionist vocali basati su IA ti lascia con");
    // Check that title has been removed from the content body
    expect(result.content).not.toContain("# Presentazione di Orbitali");
  });
});
