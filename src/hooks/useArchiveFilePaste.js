// tuf-search: #useArchiveFilePaste
import { useEffect, useRef } from 'react';
import { archiveFileFromClipboard, clipboardTextLooksLikeArchive } from '@/utils/zipUtils';

/** Last registered handler wins, so an open popup beats the page under it. */
const handlers = [];

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'radio',
  'range',
  'reset',
  'submit',
]);

function isEditablePasteTarget(target) {
  if (!(target instanceof Element)) return false;
  const field = target.closest('input, textarea, [contenteditable]');
  if (!field) return false;
  if (field instanceof HTMLInputElement) {
    const type = (field.type || 'text').toLowerCase();
    if (NON_TEXT_INPUT_TYPES.has(type) || field.disabled || field.readOnly) return false;
    return true;
  }
  if (field instanceof HTMLTextAreaElement) {
    return !field.disabled && !field.readOnly;
  }
  const editable = field.getAttribute('contenteditable');
  return editable != null && editable !== 'false';
}

function shouldLeavePasteToField(event) {
  if (!isEditablePasteTarget(event.target)) return false;
  const text = event.clipboardData?.getData('text/plain') || '';
  if (!text.trim()) return false;
  return !clipboardTextLooksLikeArchive(text);
}

function onDocumentPaste(event) {
  const file = archiveFileFromClipboard(event.clipboardData);
  if (!file || shouldLeavePasteToField(event)) return;
  const handler = handlers[handlers.length - 1];
  if (!handler) return;
  event.preventDefault();
  handler(file);
}

/**
 * While `enabled`, Ctrl/Cmd+V of a copied archive file is passed to `onFile`.
 * Text pastes, and pastes the browser cannot expose as a file, are ignored.
 *
 * @param {(file: File) => void} onFile
 * @param {boolean} [enabled]
 */
export function useArchiveFilePaste(onFile, enabled = true) {
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;

  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (file) => {
      onFileRef.current?.(file);
    };
    handlers.push(handler);
    if (handlers.length === 1) {
      document.addEventListener('paste', onDocumentPaste);
    }
    return () => {
      const index = handlers.indexOf(handler);
      if (index >= 0) handlers.splice(index, 1);
      if (handlers.length === 0) {
        document.removeEventListener('paste', onDocumentPaste);
      }
    };
  }, [enabled]);
}
