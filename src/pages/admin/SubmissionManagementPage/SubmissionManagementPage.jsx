// tuf-search: #SubmissionManagementPage #submissionManagementPage #admin #submissionManagement — Submission Management
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import "./adminsubmissionpage.css";
import { AccessDenied, MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { routes } from '@/api/routes';
import api from '@/utils/api';

import { ScrollButton } from '@/components/common/buttons';
import LevelSubmissions from './components/LevelSubmissions';
import PassSubmissions from './components/PassSubmissions';
import SubmissionJobsDrawer from './components/SubmissionJobsDrawer';
import { RefreshIcon } from '@/components/common/icons';
import { useNotification } from '@/contexts/NotificationContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { useSubmissionEvents } from '@/hooks/useSubmissionEvents';

function upsertRequestTree(list, request, fallbackItems) {
  if (!request?.requestId) return list;
  const idx = list.findIndex(r => r.requestId === request.requestId);
  const prev = idx >= 0 ? list[idx] : null;
  const items =
    Array.isArray(request.items) && request.items.length > 0
      ? request.items
      : (prev?.items?.length ? prev.items : fallbackItems) || request.items || [];
  const merged = { ...prev, ...request, items };
  if (idx < 0) return [merged, ...list];
  const next = [...list];
  next[idx] = merged;
  return next;
}

function patchItemInTrees(list, item) {
  if (!item) return list;
  return list.map(req => {
    if (!req.itemIds?.includes(item.itemId) && !req.items?.some(i => i.itemId === item.itemId && i.kind === item.kind)) {
      return req;
    }
    const items = [...(req.items || [])];
    const idx = items.findIndex(i => i.itemId === item.itemId && i.kind === item.kind);
    if (idx >= 0) items[idx] = { ...items[idx], ...item };
    else items.push(item);
    return { ...req, items };
  });
}

function emitJobItem(item) {
  if (!item) return;
  window.dispatchEvent(new CustomEvent('submissionJobItem', { detail: item }));
}

function emitQueuedJobItem(item) {
  if (!item) return;
  if (item.status !== 'queued' && item.status !== 'processing') return;
  emitJobItem(item);
}

const SubmissionManagementPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('submissionManagement.meta.title'),
        description: t('submissionManagement.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        noindex: true,
      }),
    [t, location.pathname],
  );
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('levels');
  const [isAutoAllowing, setIsAutoAllowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [openJobs, setOpenJobs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [panelReady, setPanelReady] = useState(false);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const snapshotReqIdRef = useRef(0);
  const { pendingLevelSubmissions, pendingPassSubmissions } = useNotification();
  const canUsePanel = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const handleRefresh = () => {
    setIsLoading(true);
    window.dispatchEvent(new Event('refreshSubmissions'));
    setTimeout(() => setIsLoading(false), 1000);
  };

  const fetchSnapshot = useCallback(async () => {
    if (!canUsePanel) return;
    const reqId = ++snapshotReqIdRef.current;
    try {
      const { data } = await api.get(routes.admin.submissions.jobs());
      if (reqId !== snapshotReqIdRef.current) return;
      const open = data.open || [];
      const recent = data.recent || [];
      setOpenJobs(open);
      setRecentJobs(recent);
      setPanelReady(true);
      open.forEach(req => (req.items || []).forEach(emitQueuedJobItem));
      if (open.length > 0) setDrawerExpanded(true);
    } catch (err) {
      if (reqId !== snapshotReqIdRef.current) return;
      console.error('Error fetching submission jobs:', err);
      setPanelReady(true);
    }
  }, [canUsePanel]);

  const handleSseEvent = useCallback((event) => {
    const { type, data } = event || {};
    if (!type || !type.startsWith('submission.')) return;

    const request = data?.request;
    const item = data?.item;

    if (item) emitJobItem(item);

    if (type === 'submission.request.created' || type === 'submission.request.merged') {
      if (request) {
        setOpenJobs(prev => upsertRequestTree(prev, { ...request, items: request.items || [] }));
        (request.items || []).forEach(emitQueuedJobItem);
        setDrawerExpanded(true);
      }
      return;
    }

    if (type === 'submission.request.updated' && request) {
      if (request.status === 'completed' || request.status === 'failed') {
        setOpenJobs(prev => {
          const existing = prev.find(r => r.requestId === request.requestId);
          setRecentJobs(recent =>
            upsertRequestTree(recent, request, existing?.items).slice(0, 25),
          );
          return prev.filter(r => r.requestId !== request.requestId);
        });
      } else {
        setOpenJobs(prev => upsertRequestTree(prev, request));
        setDrawerExpanded(true);
      }
      return;
    }

    if ((type === 'submission.item.updated' || type === 'submission.item.completed') && item) {
      setOpenJobs(prev => patchItemInTrees(prev, item));
      setRecentJobs(prev => patchItemInTrees(prev, item));
    }
  }, []);

  useSubmissionEvents({
    enabled: canUsePanel,
    userId: user?.id,
    onEvent: handleSseEvent,
    onConnected: fetchSnapshot,
  });

  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoading(false);
      fetchSnapshot();
    };
    window.addEventListener('submissionsLoadingComplete', handleLoadingComplete);
    
    return () => {
      window.removeEventListener('submissionsLoadingComplete', handleLoadingComplete);
    };
  }, [fetchSnapshot]);

  if (user.permissionFlags === undefined) {
    return (
      <>
        <MetaTags {...pageMeta} />
        
        <div className="submission-admin-page">
          <div className="submissions-admin-container">
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied
        metaTitle={t('submissionManagement.meta.title')}
        metaDescription={t('submissionManagement.meta.description')}
      />
    );
  }

  return (
    <>
      <MetaTags {...pageMeta} />
      
      <div className="submission-admin-page">
        <ScrollButton />
        <div className="submissions-admin-container page-content">
          <div className="header-container">
            <h1>{t('submissionManagement.header.title')}</h1>
            <button 
              className="refresh-button" 
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label={t('submissionManagement.header.refresh')}
            >
              <RefreshIcon color="#fff" size="40px" />
            </button>
          </div>
          
          <div className="submission-tabs">
            <div 
              className={`tab-button ${activeTab === 'levels' ? 'active' : ''}`}
              onClick={() => setActiveTab('levels')}
            >
              {t('submissionManagement.tabs.levels')}
              <span className="notification-badge" style={{visibility: pendingLevelSubmissions > 0 ? 'visible' : 'hidden'}}>
                {pendingLevelSubmissions || pendingLevelSubmissions > 0 && (
                  pendingLevelSubmissions > 99 ? "99+" : pendingLevelSubmissions
                )}
              </span>
            </div>
            
            <div 
              className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
              onClick={() => setActiveTab('passes')}
            >
              {t('submissionManagement.tabs.passes')}
              <span className="notification-badge" style={{visibility: pendingPassSubmissions > 0 ? 'visible' : 'hidden'}}>
                {pendingPassSubmissions || pendingPassSubmissions > 0 && (
                  pendingPassSubmissions > 99 ? "99+" : pendingPassSubmissions
                )}
              </span>
            </div>
            {activeTab === 'passes' && (
              <button 
                className="auto-allow-button"
                onClick={() => window.dispatchEvent(new Event('autoAllowPasses'))}
                disabled={isAutoAllowing}
              >
                {t('submissionManagement.tabs.autoAllow')}
              </button>
            )}
          </div>

          {activeTab === 'levels' ? (
            <LevelSubmissions />
          ) : (
            <PassSubmissions setIsAutoAllowing={setIsAutoAllowing} />
          )}
        </div>
        <SubmissionJobsDrawer
          open={openJobs}
          recent={recentJobs}
          loading={!panelReady}
          expanded={drawerExpanded}
          onToggle={() => setDrawerExpanded(v => !v)}
        />
      </div>
    </>
  );
}

export default SubmissionManagementPage;
