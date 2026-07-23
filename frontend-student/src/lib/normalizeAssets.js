/**
 * Normalize scraped NotebookLM / admin payloads into the shapes
 * expected by FlashcardFlipper, SteppedQuizPlayer, ZoomableMindmapViewer.
 */

function parseAssetsBlob(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      // Handle accidental double-encoding from MySQL/varchar storage
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(parsed) || {};
        } catch {
          return {};
        }
      }
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw;
  return {};
}

function normalizeFlashcards(raw) {
  const list = raw?.flashcards ?? raw?.interactive_assets?.flashcards ?? [];
  if (!Array.isArray(list)) return [];

  return list
    .map((fc, i) => {
      const question = fc.question ?? fc.q ?? fc.f ?? fc.front ?? '';
      const answer = fc.answer ?? fc.a ?? fc.b ?? fc.back ?? '';
      if (!question && !answer) return null;
      return {
        id: fc.id ?? `fc-${i}`,
        question: String(question),
        answer: String(answer),
      };
    })
    .filter(Boolean);
}

function normalizeQuiz(raw) {
  const list =
    raw?.quiz ??
    raw?.quizzes ??
    raw?.interactive_assets?.quizzes ??
    raw?.interactive_assets?.quiz ??
    [];
  if (!Array.isArray(list)) return [];

  return list
    .map((q, i) => {
      let options = [];
      let correctOptionIndex = 0;

      if (Array.isArray(q.options)) {
        options = q.options.map((o) => (typeof o === 'string' ? o : o?.text ?? String(o)));
        correctOptionIndex =
          typeof q.correct === 'number'
            ? q.correct
            : typeof q.correctOptionIndex === 'number'
              ? q.correctOptionIndex
              : 0;
      } else if (Array.isArray(q.answerOptions)) {
        options = q.answerOptions.map((o) => o?.text ?? String(o));
        const idx = q.answerOptions.findIndex((o) => o?.isCorrect === true);
        correctOptionIndex = idx >= 0 ? idx : 0;
      }

      const text = q.text ?? q.question ?? q.q ?? '';
      if (!text || options.length === 0) return null;

      return {
        id: q.id ?? `qz-${i}`,
        text: String(text),
        options,
        correctOptionIndex,
        hint: q.hint || null,
        explanation:
          q.explanation ||
          q.answerOptions?.find((o) => o?.isCorrect)?.rationale ||
          null,
      };
    })
    .filter(Boolean);
}

/** Convert NotebookLM { name, children } tree → nodes/edges with layout. */
function treeToGraph(root) {
  if (!root || typeof root !== 'object') return { nodes: [], edges: [] };

  const nodes = [];
  const edges = [];
  let counter = 0;

  const walk = (node, depth, index, siblings, parentId, parentX, parentY) => {
    if (!node) return;
    const id = `n${++counter}`;
    const label = node.name ?? node.label ?? node.title ?? 'Node';

    const spread = Math.max(siblings, 1);
    const x =
      depth === 0
        ? 400
        : parentX + (index - (spread - 1) / 2) * Math.max(180, 520 / spread);
    const y = depth === 0 ? 80 : parentY + 110;

    nodes.push({
      id,
      label: String(label).slice(0, 48),
      x,
      y,
      level: depth + 1,
      type: depth === 0 ? 'root' : depth === 1 ? 'child' : 'grandchild',
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
        from: parentId,
        to: id,
      });
    }

    const kids = Array.isArray(node.children) ? node.children : [];
    kids.forEach((child, i) => walk(child, depth + 1, i, kids.length, id, x, y));
  };

  walk(root, 0, 0, 1, null, 400, 80);
  return { nodes, edges };
}

function normalizeMindmap(raw) {
  let mm = raw?.mindmap ?? raw?.interactive_assets?.mindmap ?? null;
  if (!mm) return { nodes: [], edges: [] };

  if (typeof mm === 'string') {
    try {
      mm = JSON.parse(mm);
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  if (!mm || typeof mm !== 'object') return { nodes: [], edges: [] };

  // Already graph-shaped (landing mock / older payloads)
  if (Array.isArray(mm.nodes)) {
    const edgesRaw = mm.edges ?? mm.connections ?? [];
    const edges = edgesRaw.map((e, i) => ({
      id: e.id ?? `e-${i}`,
      source: e.source ?? e.from,
      target: e.target ?? e.to,
      from: e.from ?? e.source,
      to: e.to ?? e.target,
    }));
    return { nodes: mm.nodes, edges };
  }

  // NotebookLM tree
  if (mm.name || mm.children) {
    return treeToGraph(mm);
  }

  return { nodes: [], edges: [] };
}

function mediaUrl(...candidates) {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().startsWith('http')) return c.trim();
  }
  return null;
}

export function normalizeBundle(assetRow) {
  const raw = parseAssetsBlob(assetRow?.assets);
  const flashcards = normalizeFlashcards(raw);
  const quiz = normalizeQuiz(raw);
  const mindmap = normalizeMindmap(raw);

  const podcast_audio = mediaUrl(
    raw.podcast_audio,
    raw.downloadable_files?.podcast_audio
  );
  const video_overview = mediaUrl(
    raw.video_overview,
    raw.downloadable_files?.video_overview
  );
  const infographic = mediaUrl(raw.infographic);
  const slide_deck = mediaUrl(raw.slide_deck);
  const study_report_url = mediaUrl(raw.study_report);
  const data_table = mediaUrl(raw.data_table);

  const report =
    typeof raw.report === 'string'
      ? raw.report
      : typeof raw.study_report === 'string' && !raw.study_report.startsWith('http')
        ? raw.study_report
        : '';

  const slides = Array.isArray(raw.slides) ? raw.slides : [];
  const transcript = Array.isArray(raw.transcript) ? raw.transcript : [];

  const flashcards_url = mediaUrl(raw.flashcards_url);
  const quizzes_url = mediaUrl(raw.quizzes_url);
  const mindmap_url = mediaUrl(raw.mindmap_url);

  const counts = {
    flashcards: flashcards.length || Boolean(flashcards_url),
    quiz: quiz.length || Boolean(quizzes_url),
    mindmapNodes: mindmap.nodes.length || Boolean(mindmap_url),
    hasPodcast: Boolean(podcast_audio),
    hasVideo: Boolean(video_overview),
    hasInfographic: Boolean(infographic),
    hasSlides: Boolean(slide_deck) || slides.length > 0,
    hasReport: Boolean(report) || Boolean(study_report_url),
    hasTable: Boolean(data_table),
  };

  const availableTabs = [];
  if (counts.flashcards) availableTabs.push('flashcards');
  if (counts.quiz) availableTabs.push('quiz');
  if (counts.mindmapNodes) availableTabs.push('mindmap');
  if (counts.hasPodcast) availableTabs.push('podcast');
  if (counts.hasVideo || counts.hasInfographic || counts.hasSlides || counts.hasTable) {
    availableTabs.push('media');
  }
  if (counts.hasReport) availableTabs.push('report');

  return {
    id: assetRow.id,
    title: assetRow.title || 'Untitled Document',
    status: assetRow.status || 'PENDING',
    createdAt: assetRow.createdAt,
    originalFileUrl: assetRow.originalFileUrl,
    tagline: raw.tagline || 'Your personalized study suite',
    flashcards,
    quiz,
    mindmap,
    slides,
    report,
    transcript,
    podcast_audio,
    video_overview,
    infographic,
    slide_deck,
    study_report_url,
    data_table,
    flashcards_url,
    quizzes_url,
    mindmap_url,
    counts,
    availableTabs,
    hasContent: availableTabs.length > 0,
  };
}

export function summarizeStatus(status) {
  switch (status) {
    case 'COMPLETED':
      return { label: 'Ready', tone: 'ready' };
    case 'PROCESSING':
      return { label: 'Building', tone: 'processing' };
    case 'PENDING':
    default:
      return { label: 'Queued', tone: 'pending' };
  }
}
