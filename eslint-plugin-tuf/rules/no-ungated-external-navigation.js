'use strict';

/**
 * Ban ungated external navigation / absolute hrefs.
 *
 * Catches what static analysis can prove:
 * - window.open(...) unless the URL is a same-app relative string
 * - location.href = / assign / replace unless relative string
 * - JSX/HTML href="https://..." (and http) string literals
 *
 * Cannot prove whether href={dynamicValue} is external — those stay covered by the
 * runtime LinkConfirm interceptor. Prefer navigateExternal for imperative opens.
 */

const ALLOWLIST_PATH_SUBSTRINGS = [
  `${require('path').sep}externalNavigationGate.js`,
  `${require('path').sep}LinkConfirm${require('path').sep}`,
  `${require('path').sep}eslint-plugin-tuf${require('path').sep}`,
];

function isAllowlistedFile(filename) {
  if (!filename || filename === '<input>' || filename === '<text>') return false;
  const normalized = filename.replace(/\//g, require('path').sep);
  return ALLOWLIST_PATH_SUBSTRINGS.some((part) => normalized.includes(part));
}

/** True when a string is clearly same-app / non-http navigation. */
function isRelativeOrSafeSchemeLiteral(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;
  if (/^(mailto|tel|sms|blob|about):/i.test(v)) return true;
  if (v.startsWith('#') || v.startsWith('?') || v.startsWith('/') || v.startsWith('./') || v.startsWith('../')) {
    return true;
  }
  // Bare path segment without scheme (e.g. "levels/1") — treat as relative.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return true;
  return false;
}

function isAbsoluteHttpLiteral(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function getStaticStringFromNode(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked ?? '').join('');
  }
  return null;
}

function isWindowIdentifier(node) {
  return node && node.type === 'Identifier' && node.name === 'window';
}

function isLocationIdentifier(node) {
  return node && node.type === 'Identifier' && node.name === 'location';
}

function isLocationMember(node) {
  // location / window.location
  if (isLocationIdentifier(node)) return true;
  return (
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    isWindowIdentifier(node.object) &&
    node.property.type === 'Identifier' &&
    node.property.name === 'location'
  );
}

function isLocationHrefMember(node) {
  // location.href / window.location.href
  return (
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    isLocationMember(node.object) &&
    node.property.type === 'Identifier' &&
    node.property.name === 'href'
  );
}

function isWindowOpenCallee(node) {
  return (
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    isWindowIdentifier(node.object) &&
    node.property.type === 'Identifier' &&
    node.property.name === 'open'
  );
}

function isLocationNavCallee(node, methodName) {
  return (
    node &&
    node.type === 'MemberExpression' &&
    !node.computed &&
    isLocationMember(node.object) &&
    node.property.type === 'Identifier' &&
    node.property.name === methodName
  );
}

function urlArgLooksSafe(arg) {
  if (!arg) return true; // window.open() with no url
  if (arg.type === 'Literal' && arg.value == null) return true;
  const staticStr = getStaticStringFromNode(arg);
  if (staticStr != null) return isRelativeOrSafeSchemeLiteral(staticStr);

  // `/levels/${id}` style templates are same-origin; `https://${host}/...` is not.
  if (arg.type === 'TemplateLiteral' && arg.quasis.length > 0) {
    const head = arg.quasis[0].value.cooked ?? '';
    if (
      head.startsWith('/') ||
      head.startsWith('#') ||
      head.startsWith('?') ||
      head.startsWith('./') ||
      head.startsWith('../')
    ) {
      return true;
    }
    if (isAbsoluteHttpLiteral(head)) return false;
  }

  // Dynamic URL — must go through navigateExternal.
  return false;
}

function hrefValueIsAbsoluteHttp(attrValue) {
  if (!attrValue) return false;
  if (attrValue.type === 'Literal') return isAbsoluteHttpLiteral(attrValue.value);
  if (attrValue.type === 'JSXExpressionContainer') {
    const staticStr = getStaticStringFromNode(attrValue.expression);
    return staticStr != null && isAbsoluteHttpLiteral(staticStr);
  }
  return false;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow ungated external navigation (window.open / location / absolute href). Use navigateExternal from @/utils/externalNavigationGate.',
    },
    schema: [],
    messages: {
      useNavigateExternal:
        'Use navigateExternal(...) from @/utils/externalNavigationGate instead of ungated {{kind}} (external destinations must go through the exit warning).',
      useNavigateExternalHref:
        'Absolute http(s) href must not be set directly. Use navigateExternal(...) or a relative/same-origin href (runtime interceptor still covers dynamic <a href>).',
    },
  },

  create(context) {
    if (isAllowlistedFile(context.getFilename())) {
      return {};
    }

    return {
      CallExpression(node) {
        if (isWindowOpenCallee(node.callee)) {
          const urlArg = node.arguments[0];
          if (!urlArgLooksSafe(urlArg)) {
            context.report({
              node,
              messageId: 'useNavigateExternal',
              data: { kind: 'window.open' },
            });
          }
          return;
        }

        for (const method of ['assign', 'replace']) {
          if (isLocationNavCallee(node.callee, method)) {
            const urlArg = node.arguments[0];
            if (!urlArgLooksSafe(urlArg)) {
              context.report({
                node,
                messageId: 'useNavigateExternal',
                data: { kind: `location.${method}` },
              });
            }
          }
        }
      },

      AssignmentExpression(node) {
        if (node.operator !== '=') return;
        if (!isLocationHrefMember(node.left)) return;
        if (!urlArgLooksSafe(node.right)) {
          context.report({
            node,
            messageId: 'useNavigateExternal',
            data: { kind: 'location.href' },
          });
        }
      },

      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'href') return;
        // Only native <a href="https://..."> — custom components may take an href prop.
        const opening = node.parent;
        if (!opening || opening.type !== 'JSXOpeningElement') return;
        if (opening.name?.type !== 'JSXIdentifier' || opening.name.name !== 'a') return;
        if (hrefValueIsAbsoluteHttp(node.value)) {
          context.report({
            node,
            messageId: 'useNavigateExternalHref',
          });
        }
      },
    };
  },
};
