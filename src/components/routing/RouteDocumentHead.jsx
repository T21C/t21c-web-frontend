// tuf-search: #RouteDocumentHead #routing #meta
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MetaTags } from '@/components/common/display';
import { resolveRouteDocumentMeta } from '@/utils/meta/routeMeta';

/**
 * Sets document meta synchronously on navigation, before lazy route chunks load.
 * Page-level MetaTags refine title/description once data is available.
 */
export function RouteDocumentHead() {
  const location = useLocation();
  const { t, i18n } = useTranslation('pages');

  const meta = useMemo(
    () => resolveRouteDocumentMeta(location.pathname, t),
    [location.pathname, t, i18n.language],
  );

  return <MetaTags {...meta} helmetKey={location.pathname} />;
}
