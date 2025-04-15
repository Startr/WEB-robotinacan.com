const { JSDOM } = require('jsdom');

/**
 * Eleventy plugin to convert YouTube links in Markdown to clickable thumbnails with a play button overlay.
 * Handles both plain text URLs and URLs already converted to <a> tags.
 * Usage: {{ content | videoThumbs }}
 */
module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("videoThumbs", function(content) {
    if (!content) return content;

    // Wrap content in a body tag for proper parsing if it's a fragment
    const dom = new JSDOM(`<!DOCTYPE html><body>${content}</body>`);
    const document = dom.window.document;
    const body = document.body;

    const youtubeRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;

    // Function to create the thumbnail HTML element
    const createThumbnail = (videoId) => {
      const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      const videoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
      // Create elements using DOM API to avoid innerHTML parsing issues
      const link = document.createElement('a');
      link.className = 'video-thumb'; // Added class back
      link.href = videoUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.innerHTML = `
          <span class="video-thumb__overlay">
            <svg class="video-thumb__play" viewBox="0 0 68 48" width="68" height="48">
              <path d="M66.52 7.85a8 8 0 0 0-5.6-5.66C57.12 1.5 34 1.5 34 1.5s-23.12 0-26.92.69a8 8 0 0 0-5.6 5.66A83.4 83.4 0 0 0 0 24a83.4 83.4 0 0 0 1.48 16.15 8 8 0 0 0 5.6 5.66c3.8.69 26.92.69 26.92.69s23.12 0 26.92-.69a8 8 0 0 0 5.6-5.66A83.4 83.4 0 0 0 68 24a83.4 83.4 0 0 0-1.48-16.15z" fill="#212121" fill-opacity="0.8"/>
              <path d="M45 24 27 14v20z" fill="#fff"/>
            </svg>
          </span>
          <img class="video-thumb__img" src="${thumb}" alt="YouTube Video Thumbnail" loading="lazy"/>
      `;
      return link;
    };

    // 1. Replace existing <a> tags pointing to YouTube videos
    const links = body.querySelectorAll('a');
    const linksToReplace = [];
    links.forEach(link => {
      const match = link.href.match(youtubeRegex);
      // Check if href is a YouTube URL
      if (match && match[1]) { // Removed the check for link.textContent === link.href
        const videoId = match[1];
        const thumbnail = createThumbnail(videoId);
        linksToReplace.push({ oldNode: link, newNode: thumbnail });
      }
    });
    // Perform replacements after iteration
    linksToReplace.forEach(replacement => {
        // Ensure parentNode still exists before replacing
        if (replacement.oldNode.parentNode) {
            replacement.oldNode.parentNode.replaceChild(replacement.newNode, replacement.oldNode);
        }
    });


    // 2. Find and replace plain text YouTube URLs
    // Using TreeWalker to safely find and replace text nodes
    const walker = document.createTreeWalker(body, dom.window.NodeFilter.SHOW_TEXT, null, false);
    let node;
    const textNodesToReplace = []; // Collect nodes and replacements to avoid modifying during iteration

    while (node = walker.nextNode()) {
        // Avoid replacing text within script/style tags or existing links
        if (node.parentNode.tagName === 'SCRIPT' || node.parentNode.tagName === 'STYLE' || node.parentNode.closest('a')) {
            continue;
        }

        const text = node.nodeValue;
        // Use global flag for exec loop
        const youtubeUrlRegexGlobal = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/g;
        let match;
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let replaced = false; // Flag to check if any replacement happened in this node

        while ((match = youtubeUrlRegexGlobal.exec(text)) !== null) {
            replaced = true;
            const videoId = match[1];
            const url = match[0];
            const index = match.index;

            // Add text before the match
            if (index > lastIndex) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
            }
            // Add the thumbnail
            fragment.appendChild(createThumbnail(videoId));
            lastIndex = index + url.length;
        }

        // If any replacements were made for this text node
        if (replaced) {
            // Add any remaining text after the last match
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
            // Schedule the replacement of the original text node with the fragment
            textNodesToReplace.push({ oldNode: node, newNode: fragment });
        }
    }

    // Perform the replacements for text nodes
    textNodesToReplace.forEach(replacement => {
        replacement.oldNode.parentNode.replaceChild(replacement.newNode, replacement.oldNode);
    });


    // Return the modified HTML content from the body
    return body.innerHTML;
  });
};
