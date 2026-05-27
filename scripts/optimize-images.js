const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "assets", "img");
const outputDir = path.join(sourceDir, "generated");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const maxWidth = 1920;
const quality = 82;

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listImages(dir) {
  if (!(await exists(dir))) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entryPath === outputDir) continue;
      files.push(...await listImages(entryPath));
      continue;
    }

    if (entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
}

function getOutputPath(filePath) {
  const relativePath = path.relative(sourceDir, filePath);
  const parsed = path.parse(relativePath);
  return path.join(outputDir, parsed.dir, `${parsed.name}.webp`);
}

async function isFresh(sourcePath, targetPath) {
  if (!(await exists(targetPath))) return false;

  const [sourceStat, targetStat] = await Promise.all([
    fs.stat(sourcePath),
    fs.stat(targetPath),
  ]);

  return targetStat.mtimeMs >= sourceStat.mtimeMs;
}

async function optimizeImage(sourcePath) {
  const targetPath = getOutputPath(sourcePath);
  if (await isFresh(sourcePath, targetPath)) return { status: "skipped", sourcePath, targetPath };

  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: maxWidth,
      withoutEnlargement: true,
    })
    .webp({
      quality,
      effort: 5,
    })
    .toFile(targetPath);

  return { status: "optimized", sourcePath, targetPath };
}

async function main() {
  const images = await listImages(sourceDir);
  let optimized = 0;
  let skipped = 0;
  let failed = 0;

  for (const image of images) {
    try {
      const result = await optimizeImage(image);
      if (result.status === "optimized") optimized += 1;
      if (result.status === "skipped") skipped += 1;
    } catch (error) {
      failed += 1;
      console.warn(`[images] Failed: ${path.relative(root, image)}: ${error.message}`);
    }
  }

  console.log(`[images] Optimized: ${optimized}. Skipped: ${skipped}. Failed: ${failed}.`);
  if (failed) process.exitCode = 1;
}

main();
