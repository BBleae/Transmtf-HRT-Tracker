import DOMPurify from 'dompurify';

export const ANNOUNCEMENT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div',
  'a', 'blockquote', 'code', 'pre', 'hr', 'img'
];
export const ANNOUNCEMENT_ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel', 'src', 'alt',
  'colspan', 'rowspan', 'scope',
  'style'
];
export const ANNOUNCEMENT_SAFE_REL_TOKENS = ['noopener', 'noreferrer'] as const;
export const ANNOUNCEMENT_STYLE_TAGS = new Set([
  'a', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code', 'img', 'hr',
]);
export const ANNOUNCEMENT_ALLOWED_CSS_PROPERTIES = new Set([
  'display', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
  'color', 'font-size', 'font-weight', 'font-style', 'font-family',
  'text-align', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing',
  'background-color',
  'border', 'border-radius', 'border-color', 'border-style', 'border-width',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'gap', 'align-items', 'justify-content', 'flex-direction', 'flex-wrap',
  'opacity', 'cursor', 'box-shadow', 'vertical-align', 'white-space', 'overflow',
]);
export const ANNOUNCEMENT_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ANNOUNCEMENT_ALLOWED_TAGS,
  ALLOWED_ATTR: ANNOUNCEMENT_ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math'],
  FORBID_ATTR: [] as string[],
};

export function enforceSafeLinkTargets(html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.querySelectorAll('a[target]').forEach((anchor) => {
    const target = anchor.getAttribute('target');
    if (target == null) return;

    const normalizedTarget = target.trim().toLowerCase();
    if (normalizedTarget !== '_blank') {
      anchor.removeAttribute('target');
      return;
    }

    anchor.setAttribute('target', '_blank');
    const relTokens = new Set(
      (anchor.getAttribute('rel') ?? '')
        .split(/\s+/)
        .map(token => token.trim().toLowerCase())
        .filter(Boolean)
    );
    ANNOUNCEMENT_SAFE_REL_TOKENS.forEach(token => relTokens.add(token));
    anchor.setAttribute('rel', Array.from(relTokens).join(' '));
  });

  return template.innerHTML;
}

export function sanitizeCssValue(cssText: string): string {
  return cssText
    .split(';')
    .map(decl => decl.trim())
    .filter(decl => {
      if (!decl) return false;
      const colonIdx = decl.indexOf(':');
      if (colonIdx < 0) return false;
      const prop = decl.substring(0, colonIdx).trim().toLowerCase();
      const value = decl.substring(colonIdx + 1).trim().toLowerCase();
      if (!ANNOUNCEMENT_ALLOWED_CSS_PROPERTIES.has(prop)) return false;
      if (/(?:url|expression)\s*\(/.test(value)) return false;
      if (/javascript\s*:/.test(value)) return false;
      return true;
    })
    .join('; ');
}

const ANNOUNCEMENT_SAFE_URI_REGEXP = /^(?:https:|mailto:|tel:|\/(?!\/))/i;
const ANNOUNCEMENT_URI_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'xlink:href']);

export function sanitizeAnnouncementHtml(html: string): string {
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'style') {
      if (!ANNOUNCEMENT_STYLE_TAGS.has(node.nodeName.toLowerCase())) {
        data.keepAttr = false;
        return;
      }
      data.attrValue = sanitizeCssValue(data.attrValue);
      if (!data.attrValue) {
        data.keepAttr = false;
      }
    }
    if (ANNOUNCEMENT_URI_ATTRS.has(data.attrName)) {
      if (!ANNOUNCEMENT_SAFE_URI_REGEXP.test(data.attrValue)) {
        data.keepAttr = false;
      }
    }
  });
  const sanitized = DOMPurify.sanitize(html, ANNOUNCEMENT_SANITIZE_CONFIG);
  DOMPurify.removeAllHooks();
  return enforceSafeLinkTargets(sanitized);
}
