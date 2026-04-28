import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const target = process.argv[2];
if (!target || !["demo", "ad", "tiktok"].includes(target)) {
  console.error("Usage: node scripts/render-remotion.mjs <demo|ad|tiktok>");
  process.exit(1);
}

const outputs = {
  demo: "/mnt/documents/gameboi-demo.mp4",
  ad: "/mnt/documents/gameboi-ad.mp4",
  tiktok: "/mnt/documents/gameboi-tiktok-ad.mp4",
};

console.log(`Bundling for "${target}"...`);
const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

console.log("Launching browser...");
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: target,
  puppeteerInstance: browser,
});

console.log(`Rendering ${target} (${composition.durationInFrames} frames @ ${composition.fps}fps)...`);
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: outputs[target],
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
});

await browser.close({ silent: false });
console.log(`✓ Wrote ${outputs[target]}`);
