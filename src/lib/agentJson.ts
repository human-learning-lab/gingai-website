/**
 * Parse JSON out of an agent's text output.
 *
 * The report agent is told to return ONLY JSON, but the model intermittently
 * wraps it in ```json fences or prefaces it with a line of prose — the
 * briefing structurer strips fences server-side for exactly this reason. This
 * is the client-side counterpart, shared by every screen that reads a JSON
 * shape off the agent stream.
 */
export function parseAgentJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    /* Prose around the JSON: take the outermost bracket pair. */
    const start = cleaned.search(/[[{]/);
    if (start >= 0) {
      const close = cleaned[start] === '{' ? '}' : ']';
      const end = cleaned.lastIndexOf(close);
      if (end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error('The agent did not return readable JSON.');
  }
}
