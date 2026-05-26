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

function getByPath(value, keyPath) {
  return keyPath.split(".").reduce((result, key) => result?.[key], value);
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy(".htaccess");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.ignores.add("countries/**");
  eleventyConfig.ignores.add("tours/**");
  eleventyConfig.ignores.add("hotels/maldives/waldorf-astoria-ithaafushi.html");

  eleventyConfig.addGlobalData("segmentLabels", () => {
    const data = require("./_data/segments.json");
    return Object.fromEntries(data.segments.map((segment) => [segment.value, segment.label]));
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

  eleventyConfig.on("eleventy.before", validateContent);

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
      "hotels/maldives/waldorf-astoria-ithaafushi.html",
      "package.json",
      "package-lock.json"
    ]
  };
};
