/**
 * react-native-track-player: @ReactMethod fun x() = scope.launch { ... }
 * returns Job in Kotlin, which breaks TurboModule interop on New Architecture.
 * Wrap as fun x() { scope.launch { ... } } so the @ReactMethod returns Unit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const p = path.join(
  root,
  "node_modules/react-native-track-player/android/src/main/java/com/doublesymmetry/trackplayer/module/MusicModule.kt",
);

let s = fs.readFileSync(p, "utf8");

while (s.includes(") = scope.launch {")) {
  s = s.replace(") = scope.launch {", ") {\n        scope.launch {");
}
while (s.includes(") =\n        scope.launch {")) {
  s = s.replace(") =\n        scope.launch {", ") {\n        scope.launch {");
}

const openTag = "\n        scope.launch {";

function isReactMethodLaunch(s, hit) {
  const before = s.slice(0, hit);
  const lines = before.split(/\r?\n/);
  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i < 0) return false;
  const sigLine = lines[i];
  if (sigLine.includes("override")) return false;
  if (!sigLine.trimStart().startsWith("fun ")) return false;
  i--;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i < 0) return false;
  return lines[i].trim() === "@ReactMethod";
}

let pos = 0;
let out = "";
while (pos < s.length) {
  const hit = s.indexOf(openTag, pos);
  if (hit === -1) {
    out += s.slice(pos);
    break;
  }
  if (!isReactMethodLaunch(s, hit)) {
    out += s.slice(pos, hit + openTag.length);
    pos = hit + openTag.length;
    continue;
  }
  out += s.slice(pos, hit + openTag.length);
  const start = hit + openTag.length;
  let depth = 1;
  let i = start;
  while (i < s.length && depth > 0) {
    const c = s[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    i++;
  }
  // i is the index after the `}` that closes `scope.launch`; include that brace in `inner`
  const block = s.slice(start, i).replace(/\r\n/g, "\n");
  const lastNl = block.lastIndexOf("\n");
  const lastLine = lastNl === -1 ? block : block.slice(lastNl + 1);
  if (!/^\s+\}\s*$/.test(lastLine)) {
    console.error("Expected launch block to end with a sole closing brace line, got:", JSON.stringify(lastLine));
    process.exit(1);
  }
  const prefix = lastNl === -1 ? "" : block.slice(0, lastNl);
  out += prefix + "\n        }\n    }";
  pos = i;
}

fs.writeFileSync(p, out);
console.log("Updated", p);
