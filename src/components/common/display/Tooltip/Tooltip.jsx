// tuf-search: #Tooltip #tooltip
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { Portal } from '@/components/common/Portal';
import { usePopoverRoot } from '@/utils/portalRoot';

function stripZIndex(style) {
  if (style == null || style.zIndex == null) return style;
  const { zIndex: _zIndex, ...rest } = style;
  return rest;
}

/**
 * react-tooltip mounted in the popup-stack popover slot so it paints with
 * dropdowns (above the owning dialog, under later dialogs) instead of
 * competing with overlay z-index from inside the page tree.
 */
export function Tooltip({ style, ...props }) {
  const root = usePopoverRoot();
  return (
    <Portal root={root}>
      <ReactTooltip {...props} positionStrategy="fixed" style={stripZIndex(style)} />
    </Portal>
  );
}
