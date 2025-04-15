const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItAttrs = require("markdown-it-attrs");
const fs = require('fs');
const matter = require('gray-matter');

function configureMarkdown(permalinksEnabled = false) {
  const md = markdownIt({ html: true }).use(markdownItAttrs);

  if (permalinksEnabled) {
    md.use(markdownItAnchor, {
      permalink: true,
      permalinkClass: 'header-anchor',
      permalinkSymbol: '🔗',
      permalinkBefore: true,
      slugify: s => s.toLowerCase().replace(/[^\w]+/g, '-')
    });
  }

  function wrapSections(tokens) {
    let result = [];
    let stack = [];
    let lastLevel = 0;
    let sectionAttrs = '';
    let pendingSectionAttrs = '';

    tokens.forEach((token, index) => {
      // Handle attribute blocks
      if (token.type === 'inline' && token.content.startsWith('{') && token.content.endsWith('}')) {
        pendingSectionAttrs = token.content.slice(1, -1);
        return; // Skip attribute tokens
      }

      // Handle heading tokens
      if (token.type === 'heading_open') {
        let level = parseInt(token.tag.slice(1));
        
        // Close previous sections if necessary
        while (stack.length && lastLevel >= level) {
          result.push(stack.pop());
          lastLevel--;
        }

        // Use pending attributes if available, otherwise use existing section attributes
        sectionAttrs = pendingSectionAttrs || sectionAttrs;
        result.push({ type: 'html_block', content: `<section ${sectionAttrs}>` });
        stack.push({ type: 'html_block', content: '</section>' });
        lastLevel = level;
        sectionAttrs = ''; // Reset attributes
        pendingSectionAttrs = ''; // Reset pending attributes
      }

      // Handle empty paragraphs and skip them
      if (token.type === 'paragraph_open') {
        const nextToken = tokens[index + 1];
        const closingToken = tokens[index + 2];
        if (
          nextToken.type === 'inline' &&
          (nextToken.content.trim() === '' || (nextToken.content.startsWith('{') && nextToken.content.endsWith('}'))) &&
          closingToken.type === 'paragraph_close'
        ) {
          return; // Skip empty paragraph tokens
        }
      }

      result.push(token); // Add valid tokens to the result
    });

    // Close any remaining open sections
    while (stack.length) {
      result.push(stack.pop());
    }

    return result;
  }

  // Add the wrapSections function to the Markdown-It core ruler
  md.core.ruler.push('wrap_sections', state => {
    state.tokens = wrapSections(state.tokens);
  });

  return md;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("markdown", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }

    const inputPath = this.page.inputPath;
    const fileContent = fs.readFileSync(inputPath, 'utf8');
    const data = matter(fileContent).data;
    const permalinksEnabled = data.permalinks === true;

    const md = configureMarkdown(permalinksEnabled);
    return md.render(content);
  });

  // Set the default Markdown library without permalinks
  eleventyConfig.setLibrary("md", configureMarkdown(false));
};
