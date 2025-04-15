const { JSDOM } = require('jsdom');
// Node's built-in fetch is available in Node 18+
// If using older Node, you might need to install node-fetch: npm install node-fetch
// const fetch = require('node-fetch'); // Uncomment if needed

/**
 * Eleventy plugin to convert YouTube and Vimeo links in Markdown to clickable thumbnails.
 * Handles both plain text URLs and URLs already converted to <a> tags.
 * Usage: {{ content | videoThumbs | safe }}  <- Important: Use | safe filter in Nunjucks/Liquid
 */
module.exports = function(eleventyConfig) {
  // Use addNunjucksAsyncFilter for async operations like fetching data
  eleventyConfig.addNunjucksAsyncFilter("videoThumbs", async function(content) {
    if (!content) return content;

    const dom = new JSDOM(`<!DOCTYPE html><body>${content}</body>`);
    const document = dom.window.document;
    const body = document.body;

    // Regex to find YouTube or Vimeo URLs
    // Group 1: YouTube ID, Group 2: Vimeo ID
    const videoRegex = /https?:\/\/(?:(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})|(?:www\.)?vimeo\.com\/(?:video\/)?(\d+))/;
    const videoRegexGlobal = new RegExp(videoRegex.source, 'g'); // Add 'g' flag for global search

    // --- Thumbnail Fetching ---

    // Cache for fetched thumbnails to avoid redundant API calls
    const thumbnailCache = new Map();

    async function getThumbnailUrl(videoId, videoType) {
      const cacheKey = `${videoType}-${videoId}`;
      if (thumbnailCache.has(cacheKey)) {
        return thumbnailCache.get(cacheKey);
      }

      let thumbUrl = null; // Default/fallback thumbnail can be set here

      if (videoType === 'youtube') {
        thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (videoType === 'vimeo') {
        try {
          const response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
          if (!response.ok) {
            throw new Error(`Vimeo API error: ${response.statusText}`);
          }
          const data = await response.json();
          // Use the largest available thumbnail, fallback to medium/small
          thumbUrl = data[0]?.thumbnail_large || data[0]?.thumbnail_medium || data[0]?.thumbnail_small;
        } catch (error) {
          console.error(`Failed to fetch Vimeo thumbnail for ID ${videoId}:`, error.message);
          // Keep thumbUrl as null or set a default error image
        }
      }

      thumbnailCache.set(cacheKey, thumbUrl);
      return thumbUrl;
    }

    // --- Thumbnail Element Creation ---

    function createThumbnailElement(videoId, videoType, thumbnailUrl) {
      const isYoutube = videoType === 'youtube';
      const videoUrl = isYoutube
        ? `https://www.youtube.com/embed/${videoId}?autoplay=1`
        : `https://player.vimeo.com/video/${videoId}?autoplay=1`;
      const defaultThumb = '/path/to/default/thumbnail.jpg'; // Optional: Provide a default image path

      const link = document.createElement('a');
      link.className = 'video-thumb';
      link.href = videoUrl;
      // Consider using a lightbox library instead of target="_blank" for better UX
      link.target = '_blank';
      link.rel = 'noopener noreferrer'; // Added noreferrer
      link.style.position = 'relative';
      link.style.display = 'inline-block';
      link.style.backgroundColor = '#eee'; // Basic background for missing thumbs

      const thumbSrc = thumbnailUrl || defaultThumb; // Use fetched or default thumb

      link.innerHTML = `
          <span class="video-thumb__overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1; pointer-events: none;">
            <svg class="video-thumb__play" viewBox="0 0 68 48" width="68" height="48">
              <path d="M66.52 7.85a8 8 0 0 0-5.6-5.66C57.12 1.5 34 1.5 34 1.5s-23.12 0-26.92.69a8 8 0 0 0-5.6 5.66A83.4 83.4 0 0 0 0 24a83.4 83.4 0 0 0 1.48 16.15 8 8 0 0 0 5.6 5.66c3.8.69 26.92.69 26.92.69s23.12 0 26.92-.69a8 8 0 0 0 5.6-5.66A83.4 83.4 0 0 0 68 24a83.4 83.4 0 0 0-1.48-16.15z" fill="#212121" fill-opacity="0.8"/>
              <path d="M45 24 27 14v20z" fill="#fff"/>
            </svg>
          </span>
          <img class="video-thumb__img" src="${thumbSrc}" alt="${videoType} Video Thumbnail" loading="lazy" style="display: block; max-width: 100%; height: auto; border: none;"/>
      `;
       // Add error handling for the image itself
      const img = link.querySelector('img');
      if (img) {
        img.onerror = () => { img.src = defaultThumb; img.alt = 'Error loading thumbnail'; };
      }

      return link;
    }

    // --- Identify Videos and Prepare Replacements ---

    const replacements = []; // { nodeToReplace: node, videoId: string, videoType: 'youtube'|'vimeo' }
    const textNodeReplacements = []; // { textNode: node, fragments: [string|{videoId, videoType}] }

    // 1. Find existing <a> tags pointing to videos
    const links = body.querySelectorAll('a');
    links.forEach(link => {
      const match = link.href.match(videoRegex);
      if (match) {
        const videoId = match[1] || match[2]; // Group 1 for YouTube, Group 2 for Vimeo
        const videoType = match[1] ? 'youtube' : 'vimeo';
        replacements.push({ nodeToReplace: link, videoId, videoType });
      }
    });

    // 2. Find plain text video URLs using TreeWalker
    const walker = document.createTreeWalker(body, dom.window.NodeFilter.SHOW_TEXT, null, false);
    let node;
    while (node = walker.nextNode()) {
      // Avoid replacing text within script/style tags or existing links that will be replaced
      if (node.parentNode.tagName === 'SCRIPT' || node.parentNode.tagName === 'STYLE' || node.parentNode.closest('a[href*="youtube.com"], a[href*="youtu.be"], a[href*="vimeo.com"]')) {
          continue;
      }

      const text = node.nodeValue;
      let match;
      let lastIndex = 0;
      const fragments = []; // Holds strings and video objects for this node
      let hasMatches = false;

      videoRegexGlobal.lastIndex = 0; // Reset regex state for each node

      while ((match = videoRegexGlobal.exec(text)) !== null) {
          hasMatches = true;
          const videoId = match[1] || match[2];
          const videoType = match[1] ? 'youtube' : 'vimeo';
          const url = match[0];
          const index = match.index;

          // Add text before the match
          if (index > lastIndex) {
              fragments.push(text.substring(lastIndex, index));
          }
          // Add video placeholder
          fragments.push({ videoId, videoType });
          lastIndex = index + url.length;
      }

      if (hasMatches) {
          // Add any remaining text after the last match
          if (lastIndex < text.length) {
              fragments.push(text.substring(lastIndex));
          }
          textNodeReplacements.push({ textNode: node, fragments });
      }
    }

    // --- Fetch All Thumbnails Concurrently ---

    const uniqueVideos = new Map(); // Use Map to easily get unique video IDs/types
    replacements.forEach(r => uniqueVideos.set(`${r.videoType}-${r.videoId}`, { videoId: r.videoId, videoType: r.videoType }));
    textNodeReplacements.forEach(tnr => {
        tnr.fragments.forEach(frag => {
            if (typeof frag === 'object') {
                uniqueVideos.set(`${frag.videoType}-${frag.videoId}`, { videoId: frag.videoId, videoType: frag.videoType });
            }
        });
    });

    // Create promises to fetch all unique thumbnails
    const fetchPromises = Array.from(uniqueVideos.values())
        .map(video => getThumbnailUrl(video.videoId, video.videoType));

    // Wait for all thumbnail fetches to complete
    await Promise.all(fetchPromises);


    // --- Perform DOM Replacements ---

    // Replace <a> tags
    replacements.forEach(rep => {
      const thumbnailUrl = thumbnailCache.get(`${rep.videoType}-${rep.videoId}`);
      const thumbnailElement = createThumbnailElement(rep.videoId, rep.videoType, thumbnailUrl);
      if (rep.nodeToReplace.parentNode) {
        rep.nodeToReplace.parentNode.replaceChild(thumbnailElement, rep.nodeToReplace);
      }
    });

    // Replace text nodes
    textNodeReplacements.forEach(tnr => {
        const fragment = document.createDocumentFragment();
        tnr.fragments.forEach(f => {
            if (typeof f === 'string') {
                fragment.appendChild(document.createTextNode(f));
            } else {
                const thumbnailUrl = thumbnailCache.get(`${f.videoType}-${f.videoId}`);
                fragment.appendChild(createThumbnailElement(f.videoId, f.videoType, thumbnailUrl));
            }
        });
        if (tnr.textNode.parentNode) {
            tnr.textNode.parentNode.replaceChild(fragment, tnr.textNode);
        }
    });

    // Return the modified HTML content from the body
    return body.innerHTML;
  });
};
