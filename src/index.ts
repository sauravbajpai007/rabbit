import { buildGreeting } from "./greeting";
import { add } from "./math";

export { buildGreeting, add };

export function main(): void {
  const greeting = buildGreeting(process.env["APP_NAME"] ?? "CI");
  const sum = add(1, 1);
  // eslint-disable-next-line no-console -- CLI-style entrypoint for `npm start`
  console.log(`${greeting} (1 + 1 = ${sum})`);
}

if (require.main === module) {
  main();
}
