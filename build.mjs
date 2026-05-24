//build.mjs
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

// Check if the --watch flag is used
const watch = process.argv.includes("--watch");

// Set paths for input and output
const entryPoints = [
  "src/content/injectFloatingUi.ts",
  "src/background/serviceWorker.ts",
];
const outdir = "dist";

const ctx = await esbuild.context({
  entryPoints: entryPoints, // Specify entry files
  outdir: outdir, // Directory for compiled output
  bundle: true, // Bundle everything into one (or several) file(s)
  minify: false, // Don't minify during dev, enable minification later for production
  sourcemap: true, // Generate sourcemaps for debugging
  target: "chrome120", // Target the most recent Chrome (use latest version for future-proofing)
  format: "iife", // Immediately Invoked Function Expression (for the browser environment)
  loader: {
    ".ts": "tsx", // Handle TypeScript and JSX syntax
  },
  plugins: [],
});

if (watch) {
  await ctx.watch();
  console.log("Watching...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("Built.");
}

// Ensure that the ui folder exists in dist
const uiDestDir = path.resolve("dist/ui/floating");
if (!fs.existsSync(uiDestDir)) {
  fs.mkdirSync(uiDestDir, { recursive: true }); // Create the folder if it doesn't exist
}

// Copy html and css files to dist/ui/
fs.copyFileSync(
  path.resolve("src/ui/floating/floatingShell.html"),
  path.resolve(uiDestDir, "floatingShell.html"),
);
fs.copyFileSync(
  path.resolve("src/ui/floating/styles/floatingShell.css"),
  path.resolve(uiDestDir, "floatingShell.css"),
);
fs.copyFileSync(
  path.resolve("src/ui/floating/styles/root.css"),
  path.resolve(uiDestDir, "root.css"),
);
fs.copyFileSync(
  path.resolve("src/ui/floating/styles/orb.css"),
  path.resolve(uiDestDir, "orb.css"),
);
fs.copyFileSync(
  path.resolve("src/ui/floating/styles/actions.css"),
  path.resolve(uiDestDir, "actions.css"),
);
fs.copyFileSync(
  path.resolve("src/ui/floating/styles/panels.css"),
  path.resolve(uiDestDir, "panels.css"),
);
