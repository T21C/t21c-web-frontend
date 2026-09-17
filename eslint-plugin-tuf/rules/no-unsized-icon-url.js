'use strict';

/**
 * Ban unsized CDN icon URLs in <img> / backgroundImage.
 *
 * Icon URLs stored by the API use `/original` (unresized upload). Render sites
 * must pick a variant via selectIconSize(url, size) with an explicit size.
 */

const path = require('path');

const ALLOWLIST_PATH_SUBSTRINGS = [
  `${path.sep}utils${path.sep}Utility.js`,
  `${path.sep}eslint-plugin-tuf${path.sep}`,
];

const ALLOWED_SIZE_LITERALS = new Set(['small', 'medium', 'large', 'original']);
const ICON_SIZE_KEYS = new Set(['SMALL', 'MEDIUM', 'LARGE', 'ORIGINAL']);

const ICON_IDENTIFIER_NAMES = new Set([
  'icon',
  'iconUrl',
  'iconSrc',
  'iconPreview',
  'legacyIconPreview',
  'tagIconUrl',
  'diffIconUrl',
  'diffIcon',
  'curationIconUrl',
  'difficultyIcon',
]);

function isAllowlistedFile(filename) {
  if (!filename || filename === '<input>' || filename === '<text>') return false;
  const normalized = filename.replace(/\//g, path.sep);
  return ALLOWLIST_PATH_SUBSTRINGS.some((part) => normalized.includes(part));
}

function unwrap(node) {
  let current = node;
  while (current) {
    if (current.type === 'ChainExpression') {
      current = current.expression;
      continue;
    }
    if (current.type === 'JSXExpressionContainer') {
      current = current.expression;
      continue;
    }
    if (current.type === 'ParenthesizedExpression') {
      current = current.expression;
      continue;
    }
    break;
  }
  return current;
}

function getStaticString(node) {
  const n = unwrap(node);
  if (!n) return null;
  if (n.type === 'Literal' && typeof n.value === 'string') return n.value;
  if (n.type === 'TemplateLiteral' && n.expressions.length === 0) {
    return n.quasis.map((q) => q.value.cooked ?? '').join('');
  }
  return null;
}

function isSelectIconSizeCallee(node) {
  const n = unwrap(node);
  return n && n.type === 'Identifier' && n.name === 'selectIconSize';
}

function isValidSizeArg(node) {
  const n = unwrap(node);
  if (!n) return false;
  const literal = getStaticString(n);
  if (literal != null) return ALLOWED_SIZE_LITERALS.has(literal);
  if (
    n.type === 'MemberExpression' &&
    !n.computed &&
    n.object.type === 'Identifier' &&
    n.object.name === 'ICON_SIZE' &&
    n.property.type === 'Identifier' &&
    ICON_SIZE_KEYS.has(n.property.name)
  ) {
    return true;
  }
  return false;
}

function isSelectIconSizeCall(node) {
  const n = unwrap(node);
  return n && n.type === 'CallExpression' && isSelectIconSizeCallee(n.callee);
}

function memberPropertyName(node) {
  const n = unwrap(node);
  if (!n || (n.type !== 'MemberExpression' && n.type !== 'OptionalMemberExpression')) {
    return null;
  }
  if (!n.computed && n.property.type === 'Identifier') return n.property.name;
  if (n.computed) {
    const lit = getStaticString(n.property);
    if (lit != null) return lit;
  }
  return null;
}

function isIconMemberName(name) {
  return name === 'icon' || name === 'iconUrl';
}

function isIconUrlIdentifier(name) {
  if (!name) return false;
  if (ICON_IDENTIFIER_NAMES.has(name)) return true;
  if (/IconUrl$/.test(name) || /iconUrl$/.test(name)) return true;
  return false;
}

function isIconishLeaf(node) {
  const n = unwrap(node);
  if (!n) return false;
  if (n.type === 'Identifier') return isIconUrlIdentifier(n.name);
  if (n.type === 'MemberExpression' || n.type === 'OptionalMemberExpression') {
    return isIconMemberName(memberPropertyName(n));
  }
  return false;
}

function visitIconLeaves(node, onLeaf) {
  const n = unwrap(node);
  if (!n) return;
  if (isSelectIconSizeCall(n)) return;
  if (n.type === 'LogicalExpression') {
    visitIconLeaves(n.left, onLeaf);
    visitIconLeaves(n.right, onLeaf);
    return;
  }
  if (n.type === 'ConditionalExpression') {
    visitIconLeaves(n.consequent, onLeaf);
    visitIconLeaves(n.alternate, onLeaf);
    return;
  }
  if (isIconishLeaf(n)) onLeaf(n);
}

function findSelectIconSizeIssues(node, issues) {
  const n = unwrap(node);
  if (!n) return;
  if (n.type === 'CallExpression' && isSelectIconSizeCallee(n.callee)) {
    if (n.arguments.length < 2 || !isValidSizeArg(n.arguments[1])) {
      issues.push(n);
    }
    return;
  }
  if (n.type === 'LogicalExpression') {
    findSelectIconSizeIssues(n.left, issues);
    findSelectIconSizeIssues(n.right, issues);
    return;
  }
  if (n.type === 'ConditionalExpression') {
    findSelectIconSizeIssues(n.consequent, issues);
    findSelectIconSizeIssues(n.alternate, issues);
  }
}

function reportSrcIssues(context, attrNode, valueNode) {
  const expr = unwrap(valueNode);
  if (!expr) return;

  const sizeIssues = [];
  findSelectIconSizeIssues(expr, sizeIssues);
  if (sizeIssues.length) {
    context.report({ node: sizeIssues[0], messageId: 'needExplicitSize' });
    return;
  }

  let iconLeaf = null;
  visitIconLeaves(expr, (leaf) => {
    if (!iconLeaf) iconLeaf = leaf;
  });
  if (iconLeaf) {
    context.report({ node: iconLeaf, messageId: 'useSelectIconSize' });
  }
}

function backgroundImageValue(styleValue) {
  const expr = unwrap(styleValue);
  if (!expr || expr.type !== 'ObjectExpression') return null;
  for (const prop of expr.properties) {
    if (prop.type !== 'Property' || prop.computed) continue;
    const key =
      prop.key.type === 'Identifier'
        ? prop.key.name
        : typeof prop.key.value === 'string'
          ? prop.key.value
          : null;
    if (key === 'backgroundImage') return prop.value;
  }
  return null;
}

function reportTemplateExpressions(context, templateNode) {
  if (!templateNode || templateNode.type !== 'TemplateLiteral') return;
  for (const exp of templateNode.expressions) {
    reportSrcIssues(context, templateNode, exp);
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require selectIconSize(url, size) with an explicit size when rendering CDN icon URLs.',
    },
    schema: [],
    messages: {
      useSelectIconSize:
        'CDN icon URLs must go through selectIconSize(url, size) with an explicit size (small | medium | large | original, or ICON_SIZE.*). /original is the unresized upload.',
      needExplicitSize:
        'selectIconSize requires an explicit second argument: "small" | "medium" | "large" | "original" or ICON_SIZE.*',
    },
  },

  create(context) {
    if (isAllowlistedFile(context.getFilename())) {
      return {};
    }

    return {
      JSXAttribute(node) {
        if (!node.name) return;
        const attrName = node.name.name;
        const opening = node.parent;
        if (!opening || opening.type !== 'JSXOpeningElement') return;
        const tag = opening.name?.type === 'JSXIdentifier' ? opening.name.name : null;

        if ((attrName === 'src' || attrName === 'href') && tag === 'img') {
          if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
          reportSrcIssues(context, node, node.value.expression);
          return;
        }

        if (attrName === 'style') {
          const bg = backgroundImageValue(node.value);
          if (!bg) return;
          const unwrapped = unwrap(bg);
          if (unwrapped && unwrapped.type === 'TemplateLiteral') {
            reportTemplateExpressions(context, unwrapped);
          } else {
            reportSrcIssues(context, node, bg);
          }
        }
      },
    };
  },
};
