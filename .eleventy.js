module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy(".htaccess");
  eleventyConfig.addPassthroughCopy("admin");

  eleventyConfig.addGlobalData("segmentLabels", () => {
    const data = require("./_data/segments.json");
    return Object.fromEntries(data.segments.map((segment) => [segment.value, segment.label]));
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
      "package.json",
      "package-lock.json"
    ]
  };
};
