// tuf-search: #SearchHelpPopup #searchHelpTransUtils
import { cloneElement, isValidElement } from 'react';

/**
 * Decode HTML entities in Trans-rendered text nodes.
 * JSON strings use entities (e.g. &gt;) so i18next does not treat < as tags;
 * React text nodes do not decode entities, so we restore literals here.
 */
export function decodeSearchHelpEntities(value) {
  if (value == null || typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    return value
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }

  if (Array.isArray(value)) {
    return value.map(decodeSearchHelpEntities);
  }

  if (isValidElement(value)) {
    return cloneElement(
      value,
      value.props,
      decodeSearchHelpEntities(value.props.children),
    );
  }

  return value;
}

/** <code> slot for SearchHelpPopup Trans — decodes entities inside monospace snippets. */
export function SearchHelpCode({ children }) {
  return <code>{decodeSearchHelpEntities(children)}</code>;
}
