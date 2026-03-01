import React, { useEffect, useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import DOMPurify from 'dompurify';

const ANNOUNCEMENT_URL = 'https://www.transmtf.com/api/announcement/tmtf_b243d43f97b51b4fef747016';
const STORAGE_KEY = 'tmtf_announcement_hash';
const ANNOUNCEMENT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'span', 'div',
  'a', 'blockquote', 'code', 'pre', 'hr', 'img'
];
const ANNOUNCEMENT_ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel', 'src', 'alt',
  'colspan', 'rowspan', 'scope',
  'style'
];
const ANNOUNCEMENT_SAFE_REL_TOKENS = ['noopener', 'noreferrer'] as const;
const ANNOUNCEMENT_STYLE_TAGS = new Set([
  'a', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code', 'img', 'hr',
]);
const ANNOUNCEMENT_ALLOWED_CSS_PROPERTIES = new Set([
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
const ANNOUNCEMENT_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ANNOUNCEMENT_ALLOWED_TAGS,
  ALLOWED_ATTR: ANNOUNCEMENT_ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'svg', 'math'],
  FORBID_ATTR: [] as string[],
  ALLOWED_URI_REGEXP: /^(?:https:|mailto:|tel:|\/(?!\/))/i,
};

function enforceSafeLinkTargets(html: string): string {
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

function sanitizeCssValue(cssText: string): string {
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
      if (/(?:url|expression|javascript)\s*\(/.test(value)) return false;
      return true;
    })
    .join('; ');
}

function sanitizeAnnouncementHtml(html: string): string {
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
  });
  const sanitized = DOMPurify.sanitize(html, ANNOUNCEMENT_SANITIZE_CONFIG);
  DOMPurify.removeAllHooks();
  return enforceSafeLinkTargets(sanitized);
}

async function hashContent(content: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const AnnouncementModal: React.FC = () => {
  const [content, setContent] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(ANNOUNCEMENT_URL);
        if (!res.ok) return;
        const text = (await res.text()).trim();
        if (!text) return;

        const sanitized = sanitizeAnnouncementHtml(text).trim();
        if (!sanitized) return;

        const currentHash = await hashContent(sanitized);
        const storedHash = localStorage.getItem(STORAGE_KEY);

        // Backward compatibility: older versions stored hash of raw content.
        if (storedHash === currentHash) return;
        if (storedHash) {
          const legacyHash = await hashContent(text);
          if (storedHash === legacyHash) {
            localStorage.setItem(STORAGE_KEY, currentHash);
            return;
          }
        }

        localStorage.setItem(STORAGE_KEY, currentHash);
        setContent(sanitized);
        setVisible(true);
      } catch {
        // 公告是非关键功能，静默失败
      }
    };
    check();
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center px-4 py-6 overflow-y-auto"
      style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setVisible(false); }}
    >
      <div
        className="relative w-full max-w-lg mx-auto my-auto bg-white rounded-3xl shadow-2xl overflow-hidden animate-announcement-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-50 to-purple-50 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Megaphone size={18} className="text-white" strokeWidth={2} />
          </div>
          <h2 className="text-base font-bold text-gray-900 flex-1">公告 · Announcement</h2>
          <button
            onClick={() => setVisible(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          className="px-6 py-5 max-h-[60vh] overflow-y-auto text-sm text-gray-700 leading-relaxed announcement-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => setVisible(false)}
            className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white text-sm font-medium rounded-xl transition shadow-sm shadow-pink-200"
          >
            知道了 · Got it
          </button>
        </div>
      </div>

      <style>{`
        @keyframes announcement-in {
          from { opacity: 0; transform: scale(0.96) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .animate-announcement-in {
          animation: announcement-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .announcement-content a {
          color: #ec4899;
          text-decoration: underline;
        }
        .announcement-content h1, .announcement-content h2, .announcement-content h3 {
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .announcement-content h1 { font-size: 1.25rem; }
        .announcement-content h2 { font-size: 1.1rem; }
        .announcement-content h3 { font-size: 1rem; }
        .announcement-content p { margin-bottom: 0.75rem; }
        .announcement-content ul, .announcement-content ol {
          padding-left: 1.25rem;
          margin-bottom: 0.75rem;
        }
        .announcement-content li { margin-bottom: 0.25rem; }
        .announcement-content strong { font-weight: 600; color: #111827; }
        .announcement-content hr { border-color: #e5e7eb; margin: 1rem 0; }
        .announcement-content img { max-width: 100%; border-radius: 0.5rem; }
        .announcement-content code {
          background: #f3f4f6;
          padding: 0.1rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.85em;
        }
      `}</style>
    </div>
  );
};

export default AnnouncementModal;
