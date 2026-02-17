import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

// Check if the --watch flag is used
const watch = process.argv.includes("--watch");

// Set paths for input and output
const entryPoints = [
  "src/content/injectSidebar.ts",
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
const uiDestDir = path.resolve("dist/ui");
if (!fs.existsSync(uiDestDir)) {
  fs.mkdirSync(uiDestDir, { recursive: true }); // Create the folder if it doesn't exist
}

// Copy sidebar.html and sidebar.css to dist/ui/
fs.copyFileSync(
  path.resolve("src/ui/sidebar.html"),
  path.resolve(uiDestDir, "sidebar.html"),
);
fs.copyFileSync(
  path.resolve("src/ui/sidebar.css"),
  path.resolve(uiDestDir, "sidebar.css"),
);
