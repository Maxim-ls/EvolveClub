module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy(".htaccess");
  eleventyConfig.addPassthroughCopy("admin");

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
