import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";
const analyze = process.argv[3] === "analyze";

const context = await esbuild.context({
    entryPoints: ["src/main.ts"],
    loader: { ".md": "text", ".png": "dataurl" },
    bundle: true,
    external: ["obsidian", "electron", ...builtins],
    format: "cjs",
    target: "es2018",
    logLevel: "info",
    sourcemap: prod ? false : "inline",
    sourcesContent: !prod,
    treeShaking: true,
    minify: prod,
    outfile: "build/main.js",
    metafile: analyze,
    legalComments: "none",
    drop: prod ? ["console", "debugger"] : [],
    define: {
        "process.env.NODE_ENV": prod ? '"production"' : '"development"',
    },
});

if (prod) {
    const result = await context.rebuild();
    if (analyze && result.metafile) {
        const analysis = await esbuild.analyzeMetafile(result.metafile, {
            verbose: false,
        });
        console.log("\n📦 Bundle Analysis:\n");
        console.log(analysis);
    }
    context.dispose();
} else {
    context.watch().catch(() => process.exit(1));
}
