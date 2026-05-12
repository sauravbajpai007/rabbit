"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.add = exports.buildGreeting = void 0;
exports.main = main;
const greeting_1 = require("./greeting");
Object.defineProperty(exports, "buildGreeting", { enumerable: true, get: function () { return greeting_1.buildGreeting; } });
const math_1 = require("./math");
Object.defineProperty(exports, "add", { enumerable: true, get: function () { return math_1.add; } });
function main() {
    const greeting = (0, greeting_1.buildGreeting)(process.env["APP_NAME"] ?? "CI");
    const sum = (0, math_1.add)(1, 1);
    console.log(`${greeting} (1 + 1 = ${sum})`);
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=index.js.map