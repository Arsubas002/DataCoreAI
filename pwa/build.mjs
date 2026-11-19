/** Build only the public shell and its versioned frontend assets. */
import { cp, mkdir, readdir, rm, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const source = fileURLToPath(new URL("./", import.meta.url));
const output = path.resolve(source, "../public-demo");
const shell = ["manifest.webmanifest", "icon.svg", "assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"];
const styles = ["nova.css", "nova-shell.css", "nova-workspace.css", "nova-assistant.css"];
const modules = ["app.js", "novaretail-data.js", "icons.js", "nova-chat.js", "nova-analysis.js"].map(name => "js/" + name);
const font = ["assets/manrope-latin.woff2", "assets/manrope-OFL.txt"];

const readText = async file => (await readFile(path.join(source, file), "utf8")).replaceAll("\r\n", "\n");
const page = await readText("index.html");
const release = page.match(/name="datacore-release" content="(nova-\d{4}-v\d+)"/)?.[1];
const worker = await readText("sw.js");
if (!release || !worker.includes(`const RELEASE = '${release}';`)) throw new Error("The public shell and worker must use the same release");

await rm(output, { recursive: true, force: true });
for (const folder of ["assets", `${release}/js`, `${release}/assets`]) {
  await mkdir(path.join(output, folder), { recursive: true });
}
for (const file of shell) {
  await cp(path.join(source, file), path.join(output, file));
}
for (const file of [...styles, ...modules]) {
  await writeFile(path.join(output, release, file), await readText(file));
}
for (const file of font) {
  await cp(path.join(source, file), path.join(output, release, file));
}
const entrypoint = page.replace(/(src|href)="\.\/((?:nova[-\w]*\.css)|js\/app\.js)"/g,
  '$1="./' + release + '/$2"');
await writeFile(path.join(output, "index.html"), entrypoint);
// A legacy worker does not recognize this URL or the release-qualified assets.
await writeFile(path.join(output, "actualizada.html"), entrypoint);
await writeFile(path.join(output, "sw.js"), worker.replace("const RUNTIME = './';", `const RUNTIME = './${release}/';`));

const count = (await readdir(output, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile()).length;
if (count !== shell.length + styles.length + modules.length + font.length + 3) throw new Error("Unexpected public asset count");
console.log(`Built public-demo: ${count} allowlisted files for ${release}.`);
