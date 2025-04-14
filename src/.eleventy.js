const { DateTime } = require("luxon");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItAttrs = require("markdown-it-attrs");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const pluginBundle = require("@11ty/eleventy-plugin-bundle");
const pluginNavigation = require("@11ty/eleventy-navigation");
const pluginSyntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const Image = require("@11ty/eleventy-img");

/**
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
module.exports = function(eleventyConfig) {
	// Copy the contents of the `public` folder to the output folder
	// For example, `./public/css/` ends up in `_site/css/`
	eleventyConfig.addPassthroughCopy({
		"imgs": "imgs",
		"css": "css",
		"script.js": "script.js",
		"favicon.ico": "favicon.ico",
		"feather.min.js": "feather.min.js"
	});

	// Run Eleventy when these files change:
	// https://www.11ty.dev/docs/watch-serve/#add-your-own-watch-targets
	eleventyConfig.addWatchTarget("content/**/*");
	
	// Add plugins
	eleventyConfig.addPlugin(pluginRss);
	eleventyConfig.addPlugin(pluginBundle);
	eleventyConfig.addPlugin(pluginNavigation);
	eleventyConfig.addPlugin(pluginSyntaxHighlight);
	
	// Customize Markdown library settings:
	eleventyConfig.amendLibrary("md", mdLib => {
		mdLib.use(markdownItAnchor, {
			permalink: markdownItAnchor.permalink.ariaHidden({
				placement: "after",
				class: "header-anchor",
				symbol: "#",
				ariaHidden: false,
			}),
			level: [1,2,3,4],
			slugify: eleventyConfig.getFilter("slugify")
		});
		mdLib.use(markdownItAttrs);
	});

	// Date formatting (human readable)
	eleventyConfig.addFilter("readableDate", dateObj => {
		return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat("dd LLL yyyy");
	});

	// Date formatting (machine readable)
	eleventyConfig.addFilter("htmlDateString", dateObj => {
		return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
	});
	
	// Handle Pug templates
	eleventyConfig.addTemplateFormats("pug");
	
	// Get the first `n` elements of a collection.
	eleventyConfig.addFilter("head", (array, n) => {
		if(!Array.isArray(array) || array.length === 0) {
			return [];
		}
		if(n < 0) {
			return array.slice(n);
		}
		return array.slice(0, n);
	});

	return {
		// Control which files Eleventy will process
		templateFormats: [
			"md",
			"njk",
			"html",
			"pug"
		],

		// Pre-process *.md files with: (default: `liquid`)
		markdownTemplateEngine: "njk",

		// Pre-process *.html files with: (default: `liquid`)
		htmlTemplateEngine: "njk",

		// -----------------------------------------------------------------
		// If your site deploys to a subdirectory, change `pathPrefix`.
		// Don't worry about leading and trailing slashes, we normalize these.

		// If you don't have a subdirectory, use "" or "/" (they do the same thing)
		// This is only used for link URLs (it does not affect your file structure)
		// Best paired with the `url` filter: https://www.11ty.dev/docs/filters/url/

		// You can also pass this in on the command line using `--pathprefix`
		pathPrefix: "/",
		// -----------------------------------------------------------------

		// Directory structure
		dir: {
			input: ".", // default: "."
			includes: "_includes", // default: "_includes"
			data: "_data", // default: "_data"
			output: "../dist" // default: "_site"
		}
	};
};
