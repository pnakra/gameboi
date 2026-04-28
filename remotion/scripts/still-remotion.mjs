import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const target = process.argv[2]; // demo | ad
const frameStr = process.argv[3]; // frame number
const output = process.argv[4]; // /tmp/x.png

if (!target || !frameStr || !output) {
  console.error("Usage: node scripts/still-remotion.mjs <comp> <frame> <output>");
  process.exit(1);
}

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: target,
  puppeteerInstance: browser,
});

await renderStill({
  composition,
  serveUrl: bundled,
  output,
  frame: Number(frameStr),
  puppeteerInstance: browser,
});

await browser.close({ silent: false });
console.log(`✓ Wrote ${output} (frame ${frameStr})`);
