/**
 * Minimal Node smoke test for student asset normalizer.
 * Run: node frontend-student/scripts/test-normalize.mjs
 */
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

// Dynamic import of the JSX-free normalize module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modPath = path.join(__dirname, '../src/lib/normalizeAssets.js');

const {
  normalizeBundle,
  summarizeStatus,
} = await import(pathToFileURL(modPath).href);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// NotebookLM shapes
const scraped = normalizeBundle({
  id: '1',
  title: 'Bio.pdf',
  status: 'COMPLETED',
  createdAt: new Date().toISOString(),
  originalFileUrl: 'https://example.com/a.pdf',
  assets: JSON.stringify({
    flashcards: [{ f: 'Q?', b: 'A!' }],
    quizzes: [
      {
        question: 'Why?',
        answerOptions: [
          { text: 'Yes', isCorrect: true },
          { text: 'No', isCorrect: false },
        ],
      },
    ],
    mindmap: { name: 'Root', children: [{ name: 'Leaf', children: [] }] },
    podcast_audio: 'https://cdn.example.com/p.mp3',
  }),
});

assert(scraped.flashcards.length === 1, 'flashcards');
assert(scraped.flashcards[0].question === 'Q?', 'flashcard question from f');
assert(scraped.flashcards[0].answer === 'A!', 'flashcard answer from b');
assert(scraped.quiz.length === 1, 'quiz');
assert(scraped.quiz[0].correctOptionIndex === 0, 'quiz correct index');
assert(scraped.mindmap.nodes.length >= 2, 'mindmap nodes');
assert(scraped.mindmap.edges.length >= 1, 'mindmap edges');
assert(scraped.podcast_audio.includes('p.mp3'), 'podcast');
assert(scraped.hasContent === true, 'hasContent');
assert(summarizeStatus('PENDING').tone === 'pending', 'status');

console.log('PASS normalizeAssets smoke test');
