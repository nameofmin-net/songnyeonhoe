import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
mkdirSync("dist", { recursive: true });
for (const [entry, tpl, out] of [["src/main.js", "index.src.html", "index.html"], ["src/join.js", "join.src.html", "join.html"]]) {
  const js = execSync(`npx -y esbuild ${entry} --bundle --format=esm --target=es2019 --minify --charset=utf8`, { maxBuffer: 1 << 26 }).toString();
  const html = readFileSync(tpl, "utf8").replace("/*BUNDLE*/", () => js.replace(/<\/script/g, "<\\/script"));
  writeFileSync("dist/" + out, html);
  writeFileSync(out, html);
  console.log(out, (html.length / 1024).toFixed(0) + "KB");
}
