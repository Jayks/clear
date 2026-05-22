import fs from "fs";
import path from "path";

const dirs = ["app", "components", "lib", "hooks"];
const bad = [];

function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && !f.name.startsWith(".") && f.name !== "node_modules") { scan(full); continue; }
    if (!f.isFile() || !/\.(ts|tsx)$/.test(f.name)) continue;
    const lines = fs.readFileSync(full, "utf8").split("\n");
    let sawCode = false;
    let inMultilineImport = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l || l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) continue;
      if (l === '"use client"' || l === '"use client";' || l === "'use client'" || l === "'use client';" ||
          l === '"use server"' || l === '"use server";' || l === "'use server'" || l === "'use server';") continue;
      if ((l.startsWith("import ") || l.startsWith("import type ")) && l.includes("{") && !l.includes("}")) {
        inMultilineImport = true; continue;
      }
      if (inMultilineImport) {
        if (l.startsWith("} from") || l === "}") inMultilineImport = false;
        continue;
      }
      if (l.startsWith("import ") || l.startsWith("import type ")) {
        if (sawCode) bad.push(full.replace(/\\/g, "/") + ":" + (i + 1));
        continue;
      }
      sawCode = true;
    }
  }
}

dirs.forEach(scan);
if (bad.length) console.log(bad.join("\n"));
else console.log("ALL CLEAN");
