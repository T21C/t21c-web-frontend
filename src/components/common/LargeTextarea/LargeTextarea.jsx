import { forwardRef } from 'react';
import { LARGE_TEXT_MAX } from '@/utils/textLimits';

export const LargeTextarea = forwardRef(function LargeTextarea(props, ref) {
  return <textarea {...props} ref={ref} maxLength={LARGE_TEXT_MAX} />;
});
