/**
 * User-facing greeting string for CLI / demos.
 */
export function buildGreeting(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "Hello, world!";
  }
  return `Hello, ${trimmed}!`;
}
