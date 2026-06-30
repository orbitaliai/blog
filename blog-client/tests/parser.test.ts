import { expect, test, describe } from "bun:test";
import { parseTOC, parseBlogPost } from "../src/parser.ts";

describe("Blog Client Parser", () => {
  describe("parseTOC", () => {
    test("should correctly parse a standard markdown table of contents", () => {
      const mockTOC = `# Table of Contents

## [Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model](2026-06-30)
![Introducing Orbitali](2026-06-30/header.png)
Most AI voice receptionists give you a "hello? ... hello?"
This 1.5-second lag isn't just annoying; it is a conversion killer. In human-to-human conversations, the natural response window is tight: between 200ms and 400ms.

## [Second Blog Post Entry](2026-07-01)
![Second Entry](2026-07-01/header.png)
Another brief description.
`;
      const baseUrl = "https://raw.githubusercontent.com/orbitaliai/blog/main/content";
      const result = parseTOC(mockTOC, baseUrl);

      expect(result).toHaveLength(2);

      expect(result[0].title).toBe("Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model");
      expect(result[0].slug).toBe("2026-06-30");
      expect(result[0].date).toBe("2026-06-30");
      expect(result[0].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
      expect(result[0].brief).toBe(
        `Most AI voice receptionists give you a "hello? ... hello?"\nThis 1.5-second lag isn't just annoying; it is a conversion killer. In human-to-human conversations, the natural response window is tight: between 200ms and 400ms.`
      );

      expect(result[1].title).toBe("Second Blog Post Entry");
      expect(result[1].slug).toBe("2026-07-01");
      expect(result[1].date).toBe("2026-07-01");
      expect(result[1].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-07-01/header.png");
      expect(result[1].brief).toBe("Another brief description.");
    });

    test("should handle missing image gracefully with fallback to header.png", () => {
      const mockTOC = `# Table of Contents

## [No Image Post](2026-07-02)
No image provided, only this brief text.
`;
      const baseUrl = "https://raw.githubusercontent.com/orbitaliai/blog/main/content";
      const result = parseTOC(mockTOC, baseUrl);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("No Image Post");
      expect(result[0].slug).toBe("2026-07-02");
      expect(result[0].image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-07-02/header.png");
      expect(result[0].brief).toBe("No image provided, only this brief text.");
    });
  });

  describe("parseBlogPost", () => {
    test("should correctly separate title from article content", () => {
      const mockPost = `# Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model

Most AI voice receptionists give you a "hello? ... hello?"

This 1.5-second lag isn't just annoying; it is a conversion killer.
`;
      const baseUrl = "https://raw.githubusercontent.com/orbitaliai/blog/main/content";
      const result = parseBlogPost(mockPost, "2026-06-30", baseUrl);

      expect(result.title).toBe("Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model");
      expect(result.image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
      expect(result.content).toBe(
        `Most AI voice receptionists give you a "hello? ... hello?"\n\nThis 1.5-second lag isn't just annoying; it is a conversion killer.`
      );
    });

    test("should extract and strip inline header image if present right after title", () => {
      const mockPost = `# Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model

![Introducing Orbitali](header.png)

Most AI voice receptionists give you a "hello? ... hello?"

This 1.5-second lag isn't just annoying; it is a conversion killer.
`;
      const baseUrl = "https://raw.githubusercontent.com/orbitaliai/blog/main/content";
      const result = parseBlogPost(mockPost, "2026-06-30", baseUrl);

      expect(result.title).toBe("Introducing Orbitali: Why We Traded the Voice AI Pipeline for a Single Real-Time Model");
      expect(result.image).toBe("https://raw.githubusercontent.com/orbitaliai/blog/main/content/2026-06-30/header.png");
      expect(result.content).toBe(
        `Most AI voice receptionists give you a "hello? ... hello?"\n\nThis 1.5-second lag isn't just annoying; it is a conversion killer.`
      );
    });

    test("should fallback to first non-empty line as title if no heading is found", () => {
      const mockPost = `Introducing Orbitali (No Hash Header)

Most AI voice receptionists give you a "hello? ... hello?"
`;
      const baseUrl = "https://raw.githubusercontent.com/orbitaliai/blog/main/content";
      const result = parseBlogPost(mockPost, "2026-06-30", baseUrl);

      expect(result.title).toBe("Introducing Orbitali (No Hash Header)");
      expect(result.content).toBe(`Most AI voice receptionists give you a "hello? ... hello?"`);
    });
  });
});
