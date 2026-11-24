import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
const js = execSync("npx -y esbuild src/main.js --bundle --format=esm --minify", { maxBuffer: 1 << 26 }).toString();
mkdirSync("dist", { recursive: true });
const html = readFileSync("index.src.html", "utf8").replace("/*BUNDLE*/", () => js.replace(/<\/script/g, "<\\/script"));
writeFileSync("dist/index.html", html); writeFileSync("index.html", html);
console.log("dist/index.html", (html.length / 1024).toFixed(0) + "KB");
