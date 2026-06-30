import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const CONTENT_DIR = path.resolve('content');

function getModifiedFiles() {
  try {
    let diffCmd = 'git diff --name-only HEAD~1 HEAD';
    try {
      execSync('git rev-parse --verify HEAD~1', { stdio: 'ignore' });
    } catch (e) {
      // Fallback if HEAD~1 does not exist (e.g. single commit repository)
      diffCmd = 'git show --name-only --pretty="" HEAD';
    }
    const output = execSync(diffCmd, { encoding: 'utf-8' });
    return output.split(/\r?\n/).map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.warn(`[Warning] Could not get git diff: ${err.message}. Defaulting to empty diff.`);
    return [];
  }
}


async function translateText(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the following markdown blog post from English to Spanish. Retain all markdown formatting, headings, code blocks, math equations ($$...$$), images, spacing, and metadata exactly as they are. Translate ONLY the text content. Do not add any conversational text or markdown code fence wrappers (do not wrap the output in ```markdown).'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`OpenAI API request failed: Status ${response.status} - ${errorDetails}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

function parsePostMetadata(content) {
  const lines = content.split(/\r?\n/);
  let title = '';
  let titleIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) {
      title = line.replace(/^#+\s*/, '').trim();
      titleIndex = i;
      break;
    }
  }

  if (titleIndex === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() !== '') {
        title = lines[i].trim();
        titleIndex = i;
        break;
      }
    }
  }

  // Find the first paragraph after the title
  let brief = '';
  for (let i = titleIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    // A brief paragraph is a non-empty line that doesn't start with heading/image/list/math/etc.
    if (
      line !== '' &&
      !line.startsWith('#') &&
      !line.startsWith('!') &&
      !line.startsWith('-') &&
      !line.startsWith('*') &&
      !line.startsWith('$$') &&
      line !== '---'
    ) {
      brief = line;
      break;
    }
  }

  return { title, brief };
}

async function main() {
  try {
    // 1. Query modified files in git diff
    const modifiedFiles = getModifiedFiles();
    console.log(`Modified files in git diff:`, modifiedFiles);

    // 2. Scan the CONTENT_DIR for YYYY-MM-DD date folders
    const files = await fs.readdir(CONTENT_DIR, { withFileTypes: true });
    const dateDirs = files
      .filter(dirent => dirent.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dirent.name))
      .map(dirent => dirent.name);

    console.log(`Found date folders: ${dateDirs.join(', ')}`);

    // 3. Check for missing or modified translations
    for (const dir of dateDirs) {
      const dirPath = path.join(CONTENT_DIR, dir);
      const enPath = path.join(dirPath, 'en.md');
      const esPath = path.join(dirPath, 'es.md');

      try {
        await fs.access(enPath);
      } catch (err) {
        console.warn(`[Warning] No en.md found in ${dirPath}, skipping...`);
        continue;
      }

      let esExists = false;
      try {
        await fs.access(esPath);
        esExists = true;
      } catch (err) {
        // es.md is missing
      }

      // Check if the English post has been modified in git diff
      const relativeEnPath = path.relative(process.cwd(), enPath);
      const isEnModified = modifiedFiles.some(file => {
        return path.normalize(file) === path.normalize(relativeEnPath);
      });

      let shouldTranslate = false;
      if (!esExists) {
        console.log(`Translating English post (new post) for slug: ${dir}...`);
        shouldTranslate = true;
      } else if (isEnModified) {
        console.log(`Translating English post (modified post in git diff) for slug: ${dir}...`);
        shouldTranslate = true;
      }

      if (shouldTranslate) {
        const enContent = await fs.readFile(enPath, 'utf-8');
        
        // Call OpenAI to translate
        const esTranslated = await translateText(enContent);
        
        await fs.writeFile(esPath, esTranslated, 'utf-8');
        console.log(`Successfully translated and saved: ${esPath}`);
      } else {
        console.log(`Spanish translation already exists and English post not modified for slug: ${dir}. Skipping.`);
      }
    }

    // 3. Regenerate TOCs (sort dates descending)
    dateDirs.sort((a, b) => b.localeCompare(a));

    let tocEnMarkdown = '# Table of Contents\n\n';
    let tocEsMarkdown = '# Tabla de Contenidos\n\n';

    for (const dir of dateDirs) {
      const dirPath = path.join(CONTENT_DIR, dir);
      const enPath = path.join(dirPath, 'en.md');
      const esPath = path.join(dirPath, 'es.md');

      let enTitle = '';
      let enBrief = '';
      let esTitle = '';
      let esBrief = '';

      try {
        const enContent = await fs.readFile(enPath, 'utf-8');
        const meta = parsePostMetadata(enContent);
        enTitle = meta.title;
        enBrief = meta.brief;
      } catch (err) {
        console.warn(`[Warning] Could not read metadata from ${enPath}: ${err.message}`);
        continue;
      }

      try {
        const esContent = await fs.readFile(esPath, 'utf-8');
        const meta = parsePostMetadata(esContent);
        esTitle = meta.title;
        esBrief = meta.brief;
      } catch (err) {
        console.warn(`[Warning] Could not read metadata from ${esPath}: ${err.message}`);
        continue;
      }

      // Append English TOC Entry
      tocEnMarkdown += `## [${enTitle}](${dir})\n`;
      tocEnMarkdown += `![${enTitle}](${dir}/header.png)\n`;
      tocEnMarkdown += `${enBrief}\n\n`;

      // Append Spanish TOC Entry
      tocEsMarkdown += `## [${esTitle}](${dir})\n`;
      tocEsMarkdown += `![${esTitle}](${dir}/header.png)\n`;
      tocEsMarkdown += `${esBrief}\n\n`;
    }

    // Write updated TOC files
    await fs.writeFile(path.join(CONTENT_DIR, 'toc_en.md'), tocEnMarkdown.trim() + '\n', 'utf-8');
    await fs.writeFile(path.join(CONTENT_DIR, 'toc_es.md'), tocEsMarkdown.trim() + '\n', 'utf-8');

    console.log('Successfully regenerated toc_en.md and toc_es.md!');
  } catch (error) {
    console.error('Error during blog sync:', error);
    process.exit(1);
  }
}

main();
