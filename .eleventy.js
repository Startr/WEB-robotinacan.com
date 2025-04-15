const { DateTime } = require("luxon");
const sectionizePlugin = require("./_plugins/eleventy-plugin-sectionize");

module.exports = function(eleventyConfig) {
  // Add date filter
  eleventyConfig.addFilter("date", function(date, format) {
    if (!(date instanceof Date)) {
      // Handle case when date is not a Date object
      return date;
    }
    // Handle both calling styles: date("yyyy") and date "yyyy"
    if (typeof format === 'string' && format.startsWith('(') && format.endsWith(')')) {
      format = format.substring(1, format.length - 1).replace(/^["']|["']$/g, '');
    }
    return DateTime.fromJSDate(date, {zone: "utc"}).toFormat(format);
  });

  // Register other built-in filters that might be useful
  eleventyConfig.addFilter("formatDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: "utc"}).toFormat("yyyy-LL-dd");
  });
  
  // Configure template files with custom file extension
  eleventyConfig.addTemplateFormats("template.html");
  
  // Process .template.html files and remove "template" from the output filename
  eleventyConfig.addExtension("template.html", {
    outputFileExtension: "html",
    compile: function(contents, inputPath) {
      return function(data) {
        return contents;
      };
    },
    getData: function(inputPath) {
      return {
        eleventyComputed: {
          permalink: function(data) {
            // Get the path relative to the input directory
            const srcPath = inputPath.replace(/^.*?\/src\//, "");
            // Get all parts of the path
            const pathParts = srcPath.split("/");
            // Get the filename without extension
            const filename = pathParts.pop();
            // Remove both .template and .html extensions
            const baseFilename = filename.replace(".template.html", "");
            // Combine the path back together
            pathParts.push(baseFilename + ".html");
            return pathParts.join("/");
          }
        }
      };
    }
  });

  // Set directories
  return {
    dir: {
      input: "src",
      output: "dist"
    }
  };
};
