# Image Generation Guidelines

When generating images (such as blog headers, diagrams, or assets):
- Always use a light, minimalist, Apple-like rendering style.
- Use a color palette composed of an off-white/cream background with soft lavender and dusty purple accents.
- Focus on clean geometric lines and abstract metaphors that actually represent the specific technical flows and contents of the blog post, rather than screenshots, device mockups, or generic/excessive glass textures.
- Prefer matte and subtle polished finishes, using glass textures sparingly.
- Never include text on the image.
- Use the content of the session/blog post to design the image so that it is a concrete visual metaphor of the technical concept.

# Content Management Guidelines

- Do not use automated external pipelines or GitHub Actions for content translations or Table of Contents (TOC) updates.
- Antigravity (Gemini) is responsible for generating English and Spanish translations (`en.md` and `es.md`) and updating both Tables of Contents (`toc_en.md` and `toc_es.md`) directly in the workspace.
