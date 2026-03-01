import { describe, it, expect } from 'vitest';
import {
  sanitizeCssValue,
  sanitizeAnnouncementHtml,
  enforceSafeLinkTargets,
  ANNOUNCEMENT_ALLOWED_TAGS,
  ANNOUNCEMENT_ALLOWED_CSS_PROPERTIES,
  ANNOUNCEMENT_STYLE_TAGS,
} from '../announcementSanitizer';

// ──────────────────────────────────────────────────
// 1. sanitizeCssValue – CSS property allowlist
// ──────────────────────────────────────────────────
describe('sanitizeCssValue', () => {
  // ---- allowed properties ----
  it('keeps allowed simple properties', () => {
    expect(sanitizeCssValue('color: red')).toBe('color: red');
    expect(sanitizeCssValue('font-size: 14px')).toBe('font-size: 14px');
    expect(sanitizeCssValue('padding: 8px 12px')).toBe('padding: 8px 12px');
  });

  it('keeps multiple allowed properties', () => {
    const input = 'color: red; font-size: 14px; padding: 8px';
    const result = sanitizeCssValue(input);
    expect(result).toContain('color: red');
    expect(result).toContain('font-size: 14px');
    expect(result).toContain('padding: 8px');
  });

  it('allows all declared CSS properties', () => {
    const samples: Record<string, string> = {
      'display': 'inline-block',
      'margin': '10px',
      'margin-top': '5px',
      'margin-right': '5px',
      'margin-bottom': '5px',
      'margin-left': '5px',
      'padding': '10px',
      'padding-top': '5px',
      'padding-right': '5px',
      'padding-bottom': '5px',
      'padding-left': '5px',
      'width': '100px',
      'max-width': '200px',
      'min-width': '50px',
      'height': '100px',
      'max-height': '200px',
      'min-height': '50px',
      'color': '#333',
      'font-size': '16px',
      'font-weight': 'bold',
      'font-style': 'italic',
      'font-family': 'Arial, sans-serif',
      'text-align': 'center',
      'text-decoration': 'underline',
      'text-transform': 'uppercase',
      'line-height': '1.5',
      'letter-spacing': '0.5px',
      'background-color': '#fff',
      'border': '1px solid #ccc',
      'border-radius': '8px',
      'border-color': '#ccc',
      'border-style': 'solid',
      'border-width': '1px',
      'border-top': '1px solid red',
      'border-right': '1px solid red',
      'border-bottom': '1px solid red',
      'border-left': '1px solid red',
      'gap': '8px',
      'align-items': 'center',
      'justify-content': 'center',
      'flex-direction': 'row',
      'flex-wrap': 'wrap',
      'opacity': '0.8',
      'cursor': 'pointer',
      'box-shadow': '0 2px 4px rgba(0,0,0,0.1)',
      'vertical-align': 'middle',
      'white-space': 'nowrap',
      'overflow': 'hidden',
    };

    for (const [prop, value] of Object.entries(samples)) {
      const result = sanitizeCssValue(`${prop}: ${value}`);
      expect(result).toBe(`${prop}: ${value}`);
    }
  });

  // ---- disallowed properties ----
  it('strips non-allowlisted properties', () => {
    expect(sanitizeCssValue('position: absolute')).toBe('');
    expect(sanitizeCssValue('z-index: 9999')).toBe('');
    expect(sanitizeCssValue('float: left')).toBe('');
    expect(sanitizeCssValue('visibility: hidden')).toBe('');
    expect(sanitizeCssValue('content: "hacked"')).toBe('');
    expect(sanitizeCssValue('transform: rotate(45deg)')).toBe('');
    expect(sanitizeCssValue('animation: blink 1s infinite')).toBe('');
    expect(sanitizeCssValue('transition: all 0.3s')).toBe('');
    expect(sanitizeCssValue('list-style: none')).toBe('');
    expect(sanitizeCssValue('clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%)')).toBe('');
    expect(sanitizeCssValue('filter: blur(5px)')).toBe('');
    expect(sanitizeCssValue('-webkit-appearance: none')).toBe('');
    expect(sanitizeCssValue('-moz-appearance: none')).toBe('');
  });

  it('strips disallowed properties but keeps allowed ones', () => {
    const input = 'color: red; position: absolute; font-size: 14px; z-index: 9999';
    const result = sanitizeCssValue(input);
    expect(result).toContain('color: red');
    expect(result).toContain('font-size: 14px');
    expect(result).not.toContain('position');
    expect(result).not.toContain('z-index');
  });

  // ---- XSS via CSS values ----
  it('blocks url() in CSS values', () => {
    expect(sanitizeCssValue('background-color: url(https://evil.com/track.png)')).toBe('');
    expect(sanitizeCssValue('background-color: url("javascript:alert(1)")')).toBe('');
    expect(sanitizeCssValue('cursor: url(data:image/png;base64,abc), auto')).toBe('');
  });

  it('blocks expression() in CSS values', () => {
    expect(sanitizeCssValue('width: expression(alert(1))')).toBe('');
    expect(sanitizeCssValue('color: expression(document.cookie)')).toBe('');
  });

  it('blocks javascript: in CSS values', () => {
    expect(sanitizeCssValue('background-color: javascript:alert(1)')).toBe('');
  });

  it('blocks url() with whitespace variations', () => {
    expect(sanitizeCssValue('background-color: url (https://evil.com)')).toBe('');
    expect(sanitizeCssValue('background-color: url  (https://evil.com)')).toBe('');
  });

  // ---- edge cases ----
  it('returns empty string for empty input', () => {
    expect(sanitizeCssValue('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeCssValue('   ')).toBe('');
  });

  it('handles declarations without colon', () => {
    expect(sanitizeCssValue('notaproperty')).toBe('');
  });

  it('handles trailing semicolons', () => {
    const result = sanitizeCssValue('color: red;');
    expect(result).toBe('color: red');
  });

  it('handles multiple semicolons', () => {
    const result = sanitizeCssValue('color: red;;; font-size: 14px;;');
    expect(result).toContain('color: red');
    expect(result).toContain('font-size: 14px');
  });

  it('handles property names case-insensitively', () => {
    expect(sanitizeCssValue('COLOR: red')).toBe('COLOR: red');
    expect(sanitizeCssValue('Font-Size: 14px')).toBe('Font-Size: 14px');
    expect(sanitizeCssValue('PADDING: 10px')).toBe('PADDING: 10px');
  });

  it('strips the background shorthand (url injection risk)', () => {
    expect(sanitizeCssValue('background: red')).toBe('');
    expect(sanitizeCssValue('background: url(evil.png)')).toBe('');
    expect(sanitizeCssValue('background: #fff url(track.png) no-repeat')).toBe('');
  });
});

// ──────────────────────────────────────────────────
// 2. enforceSafeLinkTargets
// ──────────────────────────────────────────────────
describe('enforceSafeLinkTargets', () => {
  it('adds noopener noreferrer to target="_blank" links', () => {
    const html = '<a href="https://example.com" target="_blank">Link</a>';
    const result = enforceSafeLinkTargets(html);
    expect(result).toContain('rel="noopener noreferrer"');
    expect(result).toContain('target="_blank"');
  });

  it('removes non-_blank target attributes', () => {
    const html = '<a href="https://example.com" target="_self">Link</a>';
    const result = enforceSafeLinkTargets(html);
    expect(result).not.toContain('target=');
  });

  it('removes target="_parent"', () => {
    const result = enforceSafeLinkTargets('<a href="https://example.com" target="_parent">Link</a>');
    expect(result).not.toContain('target=');
  });

  it('removes target="_top"', () => {
    const result = enforceSafeLinkTargets('<a href="https://example.com" target="_top">Link</a>');
    expect(result).not.toContain('target=');
  });

  it('removes arbitrary target values', () => {
    const result = enforceSafeLinkTargets('<a href="https://example.com" target="my_frame">Link</a>');
    expect(result).not.toContain('target=');
  });

  it('preserves existing rel tokens alongside noopener/noreferrer', () => {
    const html = '<a href="https://example.com" target="_blank" rel="external">Link</a>';
    const result = enforceSafeLinkTargets(html);
    expect(result).toContain('external');
    expect(result).toContain('noopener');
    expect(result).toContain('noreferrer');
  });

  it('deduplicates rel tokens', () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener noopener">Link</a>';
    const result = enforceSafeLinkTargets(html);
    const rel = result.match(/rel="([^"]+)"/)?.[1] ?? '';
    const tokens = rel.split(/\s+/);
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it('handles links without target attribute (no change)', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = enforceSafeLinkTargets(html);
    expect(result).not.toContain('target=');
    expect(result).not.toContain('rel=');
  });

  it('handles multiple links', () => {
    const html = `
      <a href="https://a.com" target="_blank">A</a>
      <a href="https://b.com" target="_self">B</a>
      <a href="https://c.com">C</a>
    `;
    const result = enforceSafeLinkTargets(html);
    // First link should keep target and get rel
    expect(result).toContain('target="_blank"');
    expect(result).toContain('noopener');
    // Second link should have target removed
    const bLink = result.match(/<a[^>]*href="https:\/\/b\.com"[^>]*>/)?.[0] ?? '';
    expect(bLink).not.toContain('target=');
  });

  it('normalizes whitespace in target attribute', () => {
    const html = '<a href="https://example.com" target="  _blank  ">Link</a>';
    const result = enforceSafeLinkTargets(html);
    expect(result).toContain('target="_blank"');
    expect(result).toContain('noopener');
  });
});

// ──────────────────────────────────────────────────
// 3. sanitizeAnnouncementHtml – full pipeline
// ──────────────────────────────────────────────────
describe('sanitizeAnnouncementHtml', () => {
  // ---- CTA button preservation ----
  describe('CTA button / inline style preservation', () => {
    it('preserves inline styles on anchor tags (CTA buttons)', () => {
      const html = '<a href="https://example.com" style="display: inline-block; padding: 10px 20px; background-color: #ec4899; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Click Me</a>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('style=');
      expect(result).toContain('display: inline-block');
      expect(result).toContain('padding: 10px 20px');
      expect(result).toContain('background-color: #ec4899');
      expect(result).toContain('border-radius: 8px');
      expect(result).toContain('text-decoration: none');
      expect(result).toContain('font-weight: bold');
    });

    it('preserves inline styles on div containers', () => {
      const html = '<div style="text-align: center; margin: 20px 0;"><a href="https://example.com" style="display: inline-block; padding: 12px 24px; background-color: #7c3aed; color: #fff; border-radius: 12px;">Get Started</a></div>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('text-align: center');
      expect(result).toContain('margin: 20px 0');
      expect(result).toContain('display: inline-block');
      expect(result).toContain('background-color: #7c3aed');
    });

    it('preserves CTA link href and target behavior', () => {
      const html = '<a href="https://example.com/signup" target="_blank" style="display: inline-block; padding: 10px; background-color: blue;">Sign Up</a>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('href="https://example.com/signup"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('style=');
    });

    it('preserves styles on span elements', () => {
      const html = '<span style="color: #ec4899; font-weight: bold;">Important</span>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('style=');
      expect(result).toContain('color: #ec4899');
      expect(result).toContain('font-weight: bold');
    });

    it('preserves styles on paragraph elements', () => {
      const html = '<p style="text-align: center; margin-bottom: 16px;">Welcome</p>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('style=');
      expect(result).toContain('text-align: center');
    });

    it('preserves styles on heading elements', () => {
      const html = '<h1 style="font-size: 24px; color: #111;">Title</h1><h2 style="font-size: 20px;">Subtitle</h2>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('font-size: 24px');
      expect(result).toContain('font-size: 20px');
    });

    it('preserves flexbox layout styles', () => {
      const html = '<div style="display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap;"><a href="https://a.com" style="padding: 8px 16px;">A</a><a href="https://b.com" style="padding: 8px 16px;">B</a></div>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('display: flex');
      expect(result).toContain('gap: 12px');
      expect(result).toContain('align-items: center');
      expect(result).toContain('justify-content: center');
      expect(result).toContain('flex-wrap: wrap');
    });

    it('preserves a realistic CTA button announcement', () => {
      const html = `
        <div style="text-align: center; padding: 20px;">
          <h2 style="color: #111; font-size: 20px;">🎉 New Feature Available!</h2>
          <p style="color: #666; margin-bottom: 16px;">Check out our latest update with improved tracking.</p>
          <a href="https://example.com/update" target="_blank" style="display: inline-block; padding: 12px 32px; background-color: #ec4899; color: #fff; border-radius: 12px; font-weight: bold; text-decoration: none; cursor: pointer;">
            Update Now
          </a>
        </div>
      `;
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('href="https://example.com/update"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('display: inline-block');
      expect(result).toContain('padding: 12px 32px');
      expect(result).toContain('background-color: #ec4899');
      expect(result).toContain('border-radius: 12px');
      expect(result).toContain('font-weight: bold');
      expect(result).toContain('cursor: pointer');
      expect(result).toContain('Update Now');
    });
  });

  // ---- Tag allowlisting ----
  describe('tag allowlisting', () => {
    it('allows all declared tags', () => {
      // Some tags (thead, tbody, tr, th, td) need proper table context to be preserved by DOM parser
      const tableTags = new Set(['thead', 'tbody', 'tr', 'th', 'td']);
      const skipTags = new Set(['br', 'hr', 'img']); // self-closing
      for (const tag of ANNOUNCEMENT_ALLOWED_TAGS) {
        if (skipTags.has(tag) || tableTags.has(tag)) continue;
        const html = `<${tag}>content</${tag}>`;
        const result = sanitizeAnnouncementHtml(html);
        expect(result).toContain(`<${tag}`);
      }
    });

    it('allows table tags in proper context', () => {
      const html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('<table>');
      expect(result).toContain('<thead>');
      expect(result).toContain('<tbody>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<th>');
      expect(result).toContain('<td>');
    });

    it('allows self-closing tags', () => {
      expect(sanitizeAnnouncementHtml('<br>')).toContain('<br');
      expect(sanitizeAnnouncementHtml('<hr>')).toContain('<hr');
      expect(sanitizeAnnouncementHtml('<img src="https://example.com/img.png" alt="test">')).toContain('<img');
    });

    it('strips script tags', () => {
      expect(sanitizeAnnouncementHtml('<script>alert(1)</script>')).not.toContain('<script');
      expect(sanitizeAnnouncementHtml('<script>alert(1)</script>')).not.toContain('alert');
    });

    it('strips iframe tags', () => {
      expect(sanitizeAnnouncementHtml('<iframe src="https://evil.com"></iframe>')).not.toContain('<iframe');
    });

    it('strips form-related tags', () => {
      expect(sanitizeAnnouncementHtml('<form action="/steal"><input type="text"><button>Submit</button></form>')).not.toContain('<form');
      expect(sanitizeAnnouncementHtml('<form action="/steal"><input type="text"><button>Submit</button></form>')).not.toContain('<input');
      expect(sanitizeAnnouncementHtml('<form action="/steal"><input type="text"><button>Submit</button></form>')).not.toContain('<button');
    });

    it('strips object/embed tags', () => {
      expect(sanitizeAnnouncementHtml('<object data="evil.swf"></object>')).not.toContain('<object');
      expect(sanitizeAnnouncementHtml('<embed src="evil.swf">')).not.toContain('<embed');
    });

    it('strips <style> tag (not attribute)', () => {
      expect(sanitizeAnnouncementHtml('<style>body{display:none}</style>')).not.toContain('<style');
    });

    it('strips svg tags', () => {
      expect(sanitizeAnnouncementHtml('<svg onload="alert(1)"><circle r="10"/></svg>')).not.toContain('<svg');
    });

    it('strips textarea/select', () => {
      expect(sanitizeAnnouncementHtml('<textarea>text</textarea>')).not.toContain('<textarea');
      expect(sanitizeAnnouncementHtml('<select><option>opt</option></select>')).not.toContain('<select');
    });

    it('strips math tags', () => {
      expect(sanitizeAnnouncementHtml('<math><mi>x</mi></math>')).not.toContain('<math');
    });
  });

  // ---- Attribute allowlisting ----
  describe('attribute allowlisting', () => {
    it('allows href on anchor tags', () => {
      const result = sanitizeAnnouncementHtml('<a href="https://example.com">link</a>');
      expect(result).toContain('href="https://example.com"');
    });

    it('allows title attribute', () => {
      const result = sanitizeAnnouncementHtml('<a href="https://example.com" title="example">link</a>');
      expect(result).toContain('title="example"');
    });

    it('allows target and rel attributes', () => {
      const result = sanitizeAnnouncementHtml('<a href="https://example.com" target="_blank" rel="noopener">link</a>');
      expect(result).toContain('target="_blank"');
    });

    it('allows img src and alt', () => {
      const result = sanitizeAnnouncementHtml('<img src="https://example.com/img.png" alt="test">');
      expect(result).toContain('src="https://example.com/img.png"');
      expect(result).toContain('alt="test"');
    });

    it('allows table attributes (colspan, rowspan, scope)', () => {
      const result = sanitizeAnnouncementHtml('<table><thead><tr><th scope="col" colspan="2" rowspan="3">Header</th></tr></thead></table>');
      expect(result).toContain('colspan="2"');
      expect(result).toContain('rowspan="3"');
    });

    it('strips data attributes', () => {
      const result = sanitizeAnnouncementHtml('<div data-custom="value">content</div>');
      expect(result).not.toContain('data-custom');
    });

    it('strips onclick and other event handlers', () => {
      const result = sanitizeAnnouncementHtml('<a href="https://example.com" onclick="alert(1)">link</a>');
      expect(result).not.toContain('onclick');
    });

    it('strips onmouseover', () => {
      const result = sanitizeAnnouncementHtml('<div onmouseover="alert(1)">hover</div>');
      expect(result).not.toContain('onmouseover');
    });

    it('strips onerror on img', () => {
      const result = sanitizeAnnouncementHtml('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain('onerror');
    });

    it('strips class attribute', () => {
      const result = sanitizeAnnouncementHtml('<div class="evil-class">content</div>');
      expect(result).not.toContain('class=');
    });

    it('strips id attribute', () => {
      const result = sanitizeAnnouncementHtml('<div id="evil-id">content</div>');
      expect(result).not.toContain('id=');
    });
  });

  // ---- URI restrictions ----
  describe('URI restrictions', () => {
    it('allows https: URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="https://example.com">link</a>');
      expect(result).toContain('href="https://example.com"');
    });

    it('allows mailto: URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="mailto:test@example.com">email</a>');
      expect(result).toContain('href="mailto:test@example.com"');
    });

    it('allows tel: URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="tel:+1234567890">call</a>');
      expect(result).toContain('href="tel:+1234567890"');
    });

    it('allows relative URLs starting with /', () => {
      const result = sanitizeAnnouncementHtml('<a href="/about">about</a>');
      expect(result).toContain('href="/about"');
    });

    it('blocks javascript: URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="javascript:alert(1)">link</a>');
      expect(result).not.toContain('javascript:');
    });

    it('blocks javascript: URLs with encoding', () => {
      const result = sanitizeAnnouncementHtml('<a href="&#106;avascript:alert(1)">link</a>');
      expect(result).not.toContain('javascript:');
    });

    it('blocks data: URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="data:text/html,<script>alert(1)</script>">link</a>');
      expect(result).not.toContain('data:');
    });

    it('blocks http: URLs (only https allowed)', () => {
      const result = sanitizeAnnouncementHtml('<a href="http://example.com">link</a>');
      expect(result).not.toContain('http://example.com');
    });

    it('blocks // protocol-relative URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="//evil.com/track">link</a>');
      expect(result).not.toContain('//evil.com');
    });

    it('blocks ftp: URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="ftp://files.example.com/file">link</a>');
      expect(result).not.toContain('ftp:');
    });

    it('blocks vbscript: URLs', () => {
      const result = sanitizeAnnouncementHtml('<a href="vbscript:MsgBox(1)">link</a>');
      expect(result).not.toContain('vbscript:');
    });
  });

  // ---- XSS attack vectors ----
  describe('XSS attack vectors', () => {
    it('strips script tags completely', () => {
      const result = sanitizeAnnouncementHtml('<script>document.cookie</script>');
      expect(result).not.toContain('script');
      expect(result).not.toContain('document.cookie');
    });

    it('handles nested script injection', () => {
      const result = sanitizeAnnouncementHtml('<div><scr<script>ipt>alert(1)</scr</script>ipt></div>');
      // DOMPurify strips the <script> tag; remaining text like "ipt>alert(1)ipt>" is safe (plain text, not executable)
      expect(result).not.toContain('<script');
    });

    it('strips event handlers from all elements', () => {
      const payloads = [
        '<img src="x" onerror="alert(1)">',
        '<div onmouseover="alert(1)">hover</div>',
        '<a href="https://ok.com" onfocus="alert(1)">link</a>',
        '<p onload="alert(1)">text</p>',
        '<span onmouseenter="alert(1)">text</span>',
      ];
      for (const payload of payloads) {
        const result = sanitizeAnnouncementHtml(payload);
        expect(result).not.toMatch(/on\w+=/i);
      }
    });

    it('strips javascript: in href with various encodings', () => {
      const payloads = [
        '<a href="javascript:alert(1)">xss</a>',
        '<a href="JAVASCRIPT:alert(1)">xss</a>',
        '<a href="  javascript:alert(1)">xss</a>',
        '<a href="&#0000106avascript:alert(1)">xss</a>',
        '<a href="java\tscript:alert(1)">xss</a>',
        '<a href="java\nscript:alert(1)">xss</a>',
      ];
      for (const payload of payloads) {
        const result = sanitizeAnnouncementHtml(payload);
        expect(result).not.toContain('javascript');
      }
    });

    it('strips SVG-based XSS', () => {
      const result = sanitizeAnnouncementHtml('<svg onload="alert(1)"><circle r="40"/></svg>');
      expect(result).not.toContain('svg');
      expect(result).not.toContain('alert');
    });

    it('strips math-based XSS', () => {
      const result = sanitizeAnnouncementHtml('<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>');
      expect(result).not.toContain('onerror');
    });

    it('strips iframe injection', () => {
      const result = sanitizeAnnouncementHtml('<iframe src="https://evil.com" onload="alert(1)"></iframe>');
      expect(result).not.toContain('iframe');
      expect(result).not.toContain('alert');
    });

    it('handles mutation XSS attempt with noscript', () => {
      const result = sanitizeAnnouncementHtml('<noscript><p title="</noscript><img src=x onerror=alert(1)>">');
      // DOMPurify strips <noscript> as a non-allowed tag; the <img src=x onerror=...>
      // ends up inside a title attribute value which is safe text, not an executable element.
      // Verify <noscript> is removed and the onerror handler is not an actual attribute on any element.
      expect(result).not.toContain('<noscript');
      // The critical check: onerror should NOT be an actual attribute on an element
      const template = document.createElement('template');
      template.innerHTML = result;
      const imgs = template.content.querySelectorAll('img[onerror]');
      expect(imgs.length).toBe(0);
    });

    it('strips base tag injection', () => {
      const result = sanitizeAnnouncementHtml('<base href="https://evil.com">');
      expect(result).not.toContain('<base');
    });

    it('strips meta tag injection', () => {
      const result = sanitizeAnnouncementHtml('<meta http-equiv="refresh" content="0;url=https://evil.com">');
      expect(result).not.toContain('<meta');
    });

    it('strips object/embed with Flash payload', () => {
      const result = sanitizeAnnouncementHtml('<object type="application/x-shockwave-flash" data="evil.swf"><param name="movie" value="evil.swf"></object>');
      expect(result).not.toContain('object');
      expect(result).not.toContain('param');
    });

    it('handles deeply nested XSS attempts', () => {
      const result = sanitizeAnnouncementHtml(
        '<div><div><div><div><div><img src=x onerror=alert(1)></div></div></div></div></div>'
      );
      expect(result).not.toContain('onerror');
    });
  });

  // ---- CSS-based XSS vectors ----
  describe('CSS-based XSS in style attributes', () => {
    it('strips url() from allowed CSS properties', () => {
      const result = sanitizeAnnouncementHtml('<div style="background-color: url(https://evil.com/track)">content</div>');
      // The style should be stripped entirely because url() is blocked
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('url');
      }
    });

    it('strips expression() from CSS values', () => {
      const result = sanitizeAnnouncementHtml('<div style="width: expression(alert(1))">content</div>');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('expression');
      }
    });

    it('strips javascript: from CSS values', () => {
      const result = sanitizeAnnouncementHtml('<div style="background-color: javascript:alert(1)">content</div>');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('javascript');
      }
    });

    it('strips background shorthand (potential url injection)', () => {
      const result = sanitizeAnnouncementHtml('<div style="background: url(https://evil.com/pixel.gif)">content</div>');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('background');
      }
    });

    it('strips position property (could be used for overlay attacks)', () => {
      const result = sanitizeAnnouncementHtml('<div style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;">overlay</div>');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('position');
        expect(styleMatch[1]).not.toContain('top');
        expect(styleMatch[1]).not.toContain('left');
      }
    });

    it('strips z-index (overlay attack vector)', () => {
      const result = sanitizeAnnouncementHtml('<div style="z-index: 99999">content</div>');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('z-index');
      }
    });

    it('handles mixed allowed and blocked CSS properties', () => {
      const html = '<div style="color: red; position: fixed; padding: 10px; z-index: 9999; font-size: 14px;">content</div>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('color: red');
      expect(result).toContain('padding: 10px');
      expect(result).toContain('font-size: 14px');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('position');
        expect(styleMatch[1]).not.toContain('z-index');
      }
    });

    it('strips -moz-binding CSS property', () => {
      const result = sanitizeAnnouncementHtml('<div style="-moz-binding: url(evil.xml#xss)">content</div>');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('-moz-binding');
      }
    });

    it('strips behavior property (IE-specific XSS)', () => {
      const result = sanitizeAnnouncementHtml('<div style="behavior: url(xss.htc)">content</div>');
      const styleMatch = result.match(/style="([^"]*)"/);
      if (styleMatch) {
        expect(styleMatch[1]).not.toContain('behavior');
      }
    });
  });

  // ---- Style attribute on specific tags ----
  describe('style attribute tag restrictions', () => {
    it('allows style on all tags in ANNOUNCEMENT_STYLE_TAGS', () => {
      // Tags that need table context or are self-closing
      const tableTags = new Set(['thead', 'tbody', 'tr', 'th', 'td']);
      const skipTags = new Set(['br', 'hr', 'img']);
      for (const tag of ANNOUNCEMENT_STYLE_TAGS) {
        if (skipTags.has(tag) || tableTags.has(tag)) continue;
        const html = `<${tag} style="color: red;">content</${tag}>`;
        const result = sanitizeAnnouncementHtml(html);
        expect(result).toContain('style=');
      }
    });

    it('allows style on table elements in proper context', () => {
      const html = '<table style="border: 1px solid black;"><thead><tr><th style="padding: 8px;">H</th></tr></thead><tbody><tr style="color: blue;"><td style="padding: 4px;">C</td></tr></tbody></table>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('style=');
    });

    it('allows style on img tag', () => {
      const result = sanitizeAnnouncementHtml('<img src="https://example.com/img.png" alt="test" style="max-width: 100px; border-radius: 8px;">');
      expect(result).toContain('style=');
      expect(result).toContain('max-width: 100px');
      expect(result).toContain('border-radius: 8px');
    });

    it('strips style from tags NOT in ANNOUNCEMENT_STYLE_TAGS (e.g. strong, em, b)', () => {
      // strong, em, b, i, u, br are allowed tags but NOT in ANNOUNCEMENT_STYLE_TAGS
      const result1 = sanitizeAnnouncementHtml('<strong style="color: red;">bold</strong>');
      // DOMPurify should strip the style attribute from strong since it's not in ANNOUNCEMENT_STYLE_TAGS
      expect(result1).toContain('<strong>');
      expect(result1).not.toContain('style=');

      const result2 = sanitizeAnnouncementHtml('<em style="color: red;">italic</em>');
      expect(result2).not.toContain('style=');

      const result3 = sanitizeAnnouncementHtml('<b style="color: red;">bold</b>');
      expect(result3).not.toContain('style=');
    });
  });

  // ---- Link safety ----
  describe('link safety enforcement', () => {
    it('adds noopener noreferrer to target=_blank links', () => {
      const html = '<a href="https://example.com" target="_blank">link</a>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('removes non-_blank target values', () => {
      const html = '<a href="https://example.com" target="_top">link</a>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).not.toContain('target="_top"');
    });

    it('handles CTA link with full safety attributes', () => {
      const html = '<a href="https://example.com/cta" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #ec4899; color: white; border-radius: 8px;">CTA Button</a>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('href="https://example.com/cta"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('noopener');
      expect(result).toContain('noreferrer');
      expect(result).toContain('display: inline-block');
      expect(result).toContain('CTA Button');
    });
  });

  // ---- Idempotency / repeated calls ----
  describe('idempotency and hook cleanup', () => {
    it('produces same result when called multiple times', () => {
      const html = '<a href="https://example.com" style="color: red; padding: 10px;" target="_blank">link</a>';
      const result1 = sanitizeAnnouncementHtml(html);
      const result2 = sanitizeAnnouncementHtml(html);
      const result3 = sanitizeAnnouncementHtml(html);
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('cleans up hooks between calls (no accumulation)', () => {
      // First call with style
      const html1 = '<div style="color: red;">first</div>';
      const result1 = sanitizeAnnouncementHtml(html1);
      expect(result1).toContain('style=');

      // Second call without style
      const html2 = '<div>second</div>';
      const result2 = sanitizeAnnouncementHtml(html2);
      expect(result2).not.toContain('style=');

      // Third call with style again
      const html3 = '<span style="font-size: 14px;">third</span>';
      const result3 = sanitizeAnnouncementHtml(html3);
      expect(result3).toContain('style=');
    });
  });

  // ---- Edge cases ----
  describe('edge cases', () => {
    it('handles empty string input', () => {
      expect(sanitizeAnnouncementHtml('')).toBe('');
    });

    it('handles whitespace-only input', () => {
      expect(sanitizeAnnouncementHtml('   ')).toBe('   ');
    });

    it('handles plain text (no HTML)', () => {
      expect(sanitizeAnnouncementHtml('Hello World')).toBe('Hello World');
    });

    it('handles entities correctly', () => {
      const result = sanitizeAnnouncementHtml('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('handles style attribute with only disallowed properties', () => {
      const result = sanitizeAnnouncementHtml('<div style="position: fixed; z-index: 9999;">content</div>');
      // All properties stripped, so style attr should be removed entirely
      expect(result).not.toContain('style=');
    });

    it('handles style attribute with empty value', () => {
      const result = sanitizeAnnouncementHtml('<div style="">content</div>');
      // Empty style should be stripped
      expect(result).not.toContain('style=');
    });

    it('handles very long CSS values', () => {
      const longValue = 'a'.repeat(10000);
      const result = sanitizeAnnouncementHtml(`<div style="color: ${longValue};">content</div>`);
      expect(result).toContain('<div');
    });

    it('handles malformed HTML gracefully', () => {
      const result = sanitizeAnnouncementHtml('<div><p>unclosed<span>tags');
      // Should not throw and should return something sensible
      expect(typeof result).toBe('string');
    });

    it('handles nested tags with mixed styles', () => {
      const html = '<div style="padding: 20px;"><p style="color: blue;"><a href="https://x.com" style="font-weight: bold;">link</a></p></div>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('padding: 20px');
      expect(result).toContain('color: blue');
      expect(result).toContain('font-weight: bold');
    });

    it('preserves text content through sanitization', () => {
      const html = '<div style="color: red;">Hello <strong>World</strong>!</div>';
      const result = sanitizeAnnouncementHtml(html);
      expect(result).toContain('Hello');
      expect(result).toContain('World');
      expect(result).toContain('!');
    });
  });
});
