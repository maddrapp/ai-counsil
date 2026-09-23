import { runCouncil } from '../../../lib/council';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_QUESTION_CHARS = 12000;
const MAX_CONTEXT_CHARS = 12000;

export async function POST(request) {
  try {
    const body = await request.json();
    const question = String(body.question || '').trim();
    const context = String(body.context || '').trim();
    const depth = body.depth === 'quick' ? 'quick' : 'council';
    const allowedStyles = new Set(['standard', 'research', 'tutor', 'decision', 'technical', 'devils-advocate']);
    const style = allowedStyles.has(body.style) ? body.style : 'standard';

    if (!question) {
      return Response.json({ error: 'Enter a question for the council.' }, { status: 400 });
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return Response.json({ error: `Question is too long. Limit: ${MAX_QUESTION_CHARS.toLocaleString()} characters.` }, { status: 400 });
    }
    if (context.length > MAX_CONTEXT_CHARS) {
      return Response.json({ error: `Context is too long. Limit: ${MAX_CONTEXT_CHARS.toLocaleString()} characters.` }, { status: 400 });
    }

    const result = await runCouncil({ question, context, depth, style });
    return Response.json(result);
  } catch (error) {
    console.error('Council run failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: 'Council run failed.', detail: message },
      { status: 500 },
    );
  }
}
