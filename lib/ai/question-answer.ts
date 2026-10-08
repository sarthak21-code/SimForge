const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "do", "does", "for", "from",
  "how", "if", "in", "is", "it", "of", "on", "or", "the", "to", "what", "when", "why",
  "with",
]);

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function meaningfulTokens(value: string): string[] {
  return normalizeAnswer(value).split(" ").filter((token) => token && !STOP_WORDS.has(token));
}

/** Compare an answer conservatively, allowing small wording/punctuation differences. */
export function isQuestionAnswerCorrect(
  response: string,
  expectedAnswer: string | undefined,
  prompt = ""
): boolean {
  if (typeof expectedAnswer !== "string" || !expectedAnswer.trim()) return false;
  const normalizedResponse = normalizeAnswer(response);
  const normalizedExpected = normalizeAnswer(expectedAnswer);
  if (!normalizedResponse || !normalizedExpected) return false;
  if (normalizedResponse === normalizedExpected) return true;

  const responseTokens = meaningfulTokens(response);
  const expectedTokens = meaningfulTokens(expectedAnswer);
  if (!responseTokens.length || !expectedTokens.length) return false;

  // A complete multi-word answer may appear inside a longer, well-formed response.
  if (expectedTokens.length >= 2 && normalizedResponse.includes(normalizedExpected)) return true;

  const responseSet = new Set(responseTokens);
  const overlap = expectedTokens.filter((token) => responseSet.has(token)).length;
  if (expectedTokens.length === 1) {
    if (overlap !== 1) return false;
    // Short answers such as "It decreases" need question context when paraphrased.
    const promptTokens = meaningfulTokens(prompt);
    const contextOverlap = new Set(promptTokens.filter((token) => responseSet.has(token))).size;
    return contextOverlap >= Math.min(2, new Set(promptTokens).size);
  }

  const expectedCoverage = overlap / expectedTokens.length;
  const responseCoverage = overlap / responseSet.size;
  return overlap >= 2 && expectedCoverage >= 0.6 && responseCoverage >= 0.5;
}
