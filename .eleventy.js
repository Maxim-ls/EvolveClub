const fs = require("node:fs");
const path = require("node:path");

function readFrontMatter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    const value = field[2].trim();
    data[field[1]] = value.replace(/^["']|["']$/g, "");
  }
  return data;
}

function readMarkdownData(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const filePath = path.join(dir, file);
      return {
        inputPath: filePath,
        data: readFrontMatter(filePath),
      };
    });
}

function validateContent() {
  const countries = readMarkdownData(path.join(__dirname, "content", "countries"));
  const hotels = readMarkdownData(path.join(__dirname, "content", "hotels"));
  const tours = readMarkdownData(path.join(__dirname, "content", "tours"));
  const countrySlugs = new Set(countries.map((country) => country.data.slug));
  const errors = [];

  for (const country of countries) {
    if (!country.data.title) errors.push(`${country.inputPath}: missing title`);
    if (!country.data.slug) errors.push(`${country.inputPath}: missing slug`);
  }

  for (const hotel of hotels) {
    if (!hotel.data.title) errors.push(`${hotel.inputPath}: missing title`);
    if (!hotel.data.slug) errors.push(`${hotel.inputPath}: missing slug`);
    if (!hotel.data.country) {
      errors.push(`${hotel.inputPath}: missing country`);
    } else if (!countrySlugs.has(hotel.data.country)) {
      errors.push(`${hotel.inputPath}: unknown country "${hotel.data.country}"`);
    }
  }

  for (const tour of tours) {
    if (!tour.data.title) errors.push(`${tour.inputPath}: missing title`);
    if (!tour.data.slug) errors.push(`${tour.inputPath}: missing slug`);
  }

  if (errors.length) {
    throw new Error(`Content validation failed:\n${errors.join("\n")}`);
  }
}

function walkFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(entryPath, extensions);
    if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) return [entryPath];
    return [];
  });
}

function collectImageRefs(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const refs = new Set();
  const imagePattern = /["'](\/?assets\/img\/[^"']+\.(?:jpe?g|png|webp|gif|svg))["']/gi;
  let match;

  while ((match = imagePattern.exec(content))) {
    refs.add(match[1]);
  }

  return [...refs];
}

function validateImageRefs() {
  const files = [
    ...walkFiles(path.join(__dirname, "content"), [".md"]),
    ...walkFiles(path.join(__dirname, "_data"), [".json"]),
  ];
  const errors = [];

  for (const file of files) {
    for (const ref of collectImageRefs(file)) {
      if (/^(https?:)?\/\//.test(ref) || ref.startsWith("data:")) continue;

      const normalizedRef = ref.replace(/^\/+/, "");
      const sourcePath = path.join(__dirname, normalizedRef);
      const optimizedPath = path.join(__dirname, optimizedImageUrl(ref).replace(/^\/+/, ""));

      if (!fs.existsSync(sourcePath)) {
        errors.push(`${path.relative(__dirname, file)}: missing image ${ref}`);
        continue;
      }

      if (!fs.existsSync(optimizedPath)) {
        errors.push(`${path.relative(__dirname, file)}: missing optimized image for ${ref}`);
      }
    }
  }

  if (errors.length) {
    throw new Error(`Image validation failed:\n${errors.join("\n")}`);
  }
}

function getByPath(value, keyPath) {
  return keyPath.split(".").reduce((result, key) => result?.[key], value);
}

function optimizedImageUrl(src) {
  if (typeof src !== "string" || !src) return src;
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;

  const cleanSrc = src.split(/[?#]/)[0];
  const hasLeadingSlash = cleanSrc.startsWith("/");
  const normalizedSrc = cleanSrc.replace(/^\/+/, "");
  const ext = path.extname(normalizedSrc).toLowerCase();

  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return src;
  if (!normalizedSrc.startsWith("assets/img/")) return src;
  if (normalizedSrc.startsWith("assets/img/generated/")) return src;

  const relativeImagePath = normalizedSrc.slice("assets/img/".length);
  const parsed = path.parse(relativeImagePath);
  const optimizedPath = path.join("assets", "img", "generated", parsed.dir, `${parsed.name}.webp`);
  const absoluteOptimizedPath = path.join(__dirname, optimizedPath);

  if (!fs.existsSync(absoluteOptimizedPath)) return src;

  const webPath = optimizedPath.split(path.sep).join("/");
  return `${hasLeadingSlash ? "/" : ""}${webPath}`;
}

function cleanOutputDirectory() {
  const outputRoot = path.join(__dirname, "_site");
  const resolvedOutputRoot = path.resolve(outputRoot);
  const resolvedProjectRoot = path.resolve(__dirname);

  if (!resolvedOutputRoot.startsWith(resolvedProjectRoot + path.sep)) return;
  fs.rmSync(resolvedOutputRoot, { recursive: true, force: true });
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets/css");
  eleventyConfig.addPassthroughCopy("assets/js");
  eleventyConfig.addPassthroughCopy("assets/img/generated");
  eleventyConfig.addPassthroughCopy(".htaccess");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.ignores.add("countries/**");
  eleventyConfig.ignores.add("tours/**");
  eleventyConfig.ignores.add("hotels/**");
  eleventyConfig.ignores.add("docs/**");

  eleventyConfig.addGlobalData("segmentLabels", () => {
    const data = require("./_data/segments.json");
    return Object.fromEntries(data.segments.map((segment) => [segment.value, segment.label]));
  });

  eleventyConfig.addCollection("publishedCountry", (collectionApi) => {
    return collectionApi.getFilteredByTag("country").filter((item) => item.data?.published !== false);
  });

  eleventyConfig.addCollection("publishedHotel", (collectionApi) => {
    return collectionApi.getFilteredByTag("hotel").filter((item) => item.data?.published !== false);
  });

  eleventyConfig.addCollection("publishedTour", (collectionApi) => {
    return collectionApi.getFilteredByTag("tour").filter((item) => item.data?.published !== false);
  });

  eleventyConfig.addFilter("whereEquals", (items, keyPath, expected) => {
    return (items || []).filter((item) => getByPath(item, keyPath) === expected);
  });

  eleventyConfig.addFilter("whereTruthy", (items, keyPath) => {
    return (items || []).filter((item) => Boolean(getByPath(item, keyPath)));
  });

  eleventyConfig.addFilter("sortByOrder", (items) => {
    return [...(items || [])].sort((a, b) => (a.data?.order || 999) - (b.data?.order || 999));
  });

  eleventyConfig.addFilter("findByData", (items, key, expected) => {
    return (items || []).find((item) => item.data?.[key] === expected);
  });

  eleventyConfig.addFilter("optimizedImage", optimizedImageUrl);

  eleventyConfig.on("eleventy.before", () => {
    cleanOutputDirectory();
    validateContent();
    validateImageRefs();
  });

  return {
    dir: {
      input: ".",
      output: "_site"
    },
    htmlTemplateEngine: "njk",
    ignores: [
      "node_modules/**",
      "_site/**",
      ".git/**",
      ".github/**",
      "countries/**",
      "tours/**",
      "hotels/**",
      "docs/**",
      "package.json",
      "package-lock.json"
    ]
  };
};
