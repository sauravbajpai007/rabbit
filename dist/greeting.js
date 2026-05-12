"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGreeting = buildGreeting;
/**
 * User-facing greeting string for CLI / demos.
 */
function buildGreeting(name) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        return "Hello, world!";
    }
    return `Hello, ${trimmed}!`;
}
//# sourceMappingURL=greeting.js.map