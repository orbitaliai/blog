# Image Generation Guidelines

When generating images (such as blog headers, diagrams, or assets):
- Match the established blog-header style: dark, futuristic technical schematics on a subtle square grid, composed from precise geometric linework, simple outlined icons, connected system-flow diagrams, and waveform motifs. Keep compositions spacious and balanced, with a restrained purple glow and minimal depth.
- Read the post before designing its image, then build the composition around its specific subject and central idea. Every metaphor, icon, waveform, and system-flow element must help communicate the content being written rather than serve as generic technical decoration.
- Use the approved Orbitali palette: Ink (`#171419`) as the primary background; Orbitali Purple (`#2D064F`) for the brand glow and focal areas; Orbital Lilac (`#B8A5C2`) and Dust Purple (`#75647F`) for supporting accents; and Porcelain (`#FAF8F6`), White (`#FFFFFF`), or Mist Lilac (`#EEE8F1`) for high-contrast linework and highlights. Use Warm Sand (`#F2EBDD`) only as a restrained alternate accent.
- Prefer matte and subtle polished finishes, using glass textures sparingly.
- Never include text on the image.

# Content Management Guidelines

- Do not use automated external pipelines or GitHub Actions for content translations or Table of Contents (TOC) updates.
- The coding agent is responsible for generating English and Spanish translations (`en.md` and `es.md`) and updating both Tables of Contents (`toc_en.md` and `toc_es.md`) directly in the workspace.

# Technical Documentation

- Never write about internal company information.
- When writing about technical topics, read the relevant documentation at ../internal_docs.
- If you need to write code sample, make sure they are accurate Orbitali code.
- For image generation, follow the instructions in this AGENTS.md, not in ../internal_docs.
