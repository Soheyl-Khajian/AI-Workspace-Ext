import * as esbuild from "esbuild";
import path from "path";

// Set paths for input and output
const entryPoints = ["src/content/injectSidebar.ts", "src/background/serviceWorker.ts"];
const outdir = "dist";

// Run the esbuild process
const ctx = await esbuild.context({
  entryPoints: entryPoints,            // Specify entry files
  outdir: outdir,                      // Directory for compiled output
  bundle: true,                        // Bundle everything into one (or several) file(s)
  minify: false,                       // Don't minify during dev, enable minification later for production
  sourcemap: true,                     // Generate sourcemaps for debugging
  target: "chrome120",                  // Target the most recent Chrome (use latest version for future-proofing)
  format: "iife",                      // Immediately Invoked Function Expression (for the browser environment)
  loader: {
    ".ts": "tsx"                       // Handle TypeScript and JSX syntax
  },
  plugins: [],
});

await ctx.rebuild();                   // Build the files
await ctx.dispose();                   // Dispose after build (clean up)

console.log("Build completed! Output at:", path.resolve(outdir));
