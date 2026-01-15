// Cross-platform copy of prisma/generated to src/prisma/generated
// Uses Node.js fs APIs to avoid shell differences
const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[copy-prisma-generated] Source not found: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const projectRoot = path.resolve(__dirname, "..");
const srcPath = path.join(projectRoot, "prisma", "generated");
const destPath = path.join(projectRoot, "src", "prisma", "generated");

copyDir(srcPath, destPath);
console.log(`[copy-prisma-generated] Copied ${srcPath} -> ${destPath}`);
