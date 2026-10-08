import { routes } from '@/api/routes';
import { API_BASE } from '@/config/env';
import { apiUrl, healthUrl } from '@/config/urls';
// tuf-search: #HealthCheckPage #healthCheckPage #healthCheck
import React, { useState, useEffect, useMemo, useRef } from 'react';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './healthcheckpage.css';
import { formatDate } from '@/utils/Utility';
import i18next from 'i18next';
import { CustomSelect } from '@/components/common/selectors';

const OPTIONAL_PROBE_KEYS = ['cdn', 'nginx'];

const OPTIONAL_PROBE_TITLE_KEY = {
  cdn: 'cdnService',
  nginx: 'nginxService',
};

const LATENCY_WINDOWS = ['1h', '3h', '6h', '12h', '24h', '3d', '7d', '14d'];

function probeOutcome(probe, t) {
  if (!probe) {
    return { className: 'offline', label: t('healthCheck.serviceState.down') };
  }
  if (probe.skipped === true) {
    return { className: 'skipped', label: t('healthCheck.serviceChecks.skipped') };
  }
  if (probe.ok === true) {
    return { className: 'online', label: t('healthCheck.serviceState.ok') };
  }
  return { className: 'offline', label: t('healthCheck.serviceState.down') };
}

function boolOutcome(ok, t) {
  return ok
    ? { className: 'online', label: t('healthCheck.serviceState.ok') }
    : { className: 'offline', label: t('healthCheck.serviceState.down') };
}

/** Latest probe round-trip from `/health/api` `details.probes` (ms), or em dash when N/A. */
function formatProbeResponseTime(probe, t) {
  if (!probe) return t('healthCheck.responseTime.unavailable');
  if (probe.skipped === true) return t('healthCheck.responseTime.skipped');
  if (typeof probe.durationMs !== 'number' || Number.isNaN(probe.durationMs)) {
    return t('healthCheck.responseTime.unavailable');
  }
  return t('healthCheck.responseTime.ms', { ms: Math.round(probe.durationMs) });
}

function HealthDashboardBody({ healthData, t, getStatusColor, getStatusIcon }) {
  const probes = healthData.details?.probes ?? {};
  const databaseProbe = probes.database;
  const mainServerProbe = probes.mainServer;

  const databaseOutcome = boolOutcome(healthData.checks?.database === true, t);
  const mainServerOutcome = boolOutcome(healthData.checks?.mainServer === true, t);

  const databaseResponseLabel = formatProbeResponseTime(databaseProbe, t);
  const mainServerResponseLabel = formatProbeResponseTime(mainServerProbe, t);
  const responseTimeHint = t('healthCheck.responseTime.ariaLabel');

  return (
    <div className="health-dashboard">
      <div className="health-summary">
        <div className="status-badge" style={{ backgroundColor: getStatusColor(healthData.status) }}>
          <span className="status-icon">{getStatusIcon(healthData.status)}</span>
          <span>{t(`healthCheck.overall.${healthData.status}`)}</span>
        </div>
      </div>

      <div className="health-grid">
        <div className="health-card">
          <div className="health-card-header">
            <h3>{t('healthCheck.serviceChecks.database')}</h3>
            <span
              className="health-card-response-time"
              title={responseTimeHint}
              aria-label={`${t('healthCheck.serviceChecks.database')}, ${responseTimeHint}: ${databaseResponseLabel}`}
            >
              {databaseResponseLabel}
            </span>
          </div>
          <div className={`status-indicator ${databaseOutcome.className}`}>{databaseOutcome.label}</div>
        </div>

        <div className="health-card">
          <div className="health-card-header">
            <h3>{t('healthCheck.serviceChecks.mainServer')}</h3>
            <span
              className="health-card-response-time"
              title={responseTimeHint}
              aria-label={`${t('healthCheck.serviceChecks.mainServer')}, ${responseTimeHint}: ${mainServerResponseLabel}`}
            >
              {mainServerResponseLabel}
            </span>
          </div>
          <div className={`status-indicator ${mainServerOutcome.className}`}>{mainServerOutcome.label}</div>
        </div>

        {OPTIONAL_PROBE_KEYS.map((key) => {
          const probe = probes[key];
          if (!probe) return null;
          const titleKey = OPTIONAL_PROBE_TITLE_KEY[key];
          const serviceTitle = t(`healthCheck.serviceChecks.${titleKey}`);
          const optionalResponseLabel = formatProbeResponseTime(probe, t);
          const { className, label } = probeOutcome(probe, t);
          return (
            <div key={key} className="health-card">
              <div className="health-card-header">
                <h3>{serviceTitle}</h3>
                <span
                  className="health-card-response-time"
                  title={responseTimeHint}
                  aria-label={`${serviceTitle}, ${responseTimeHint}: ${optionalResponseLabel}`}
                >
                  {optionalResponseLabel}
                </span>
              </div>
              <div className={`status-indicator ${className}`}>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthLatencySection({ t, refreshId = 0 }) {
  const [windowKey, setWindowKey] = useState('24h');
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [latError, setLatError] = useState(null);
  const [instantRedraw, setInstantRedraw] = useState(false);
  const chartDrawnRef = useRef(false);
  const loadedWindowRef = useRef(null);

  const windowOptions = useMemo(
    () =>
      LATENCY_WINDOWS.map((value) => ({
        value,
        label: t(`healthCheck.latency.windows.${value}`),
      })),
    [t],
  );

  const selectedOption = useMemo(
    () => windowOptions.find((o) => o.value === windowKey) ?? windowOptions[4],
    [windowOptions, windowKey],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const sameWindowUpdate =
        chartDrawnRef.current && loadedWindowRef.current === windowKey;
      if (!sameWindowUpdate) {
        setLoading(true);
      }
      setLatError(null);
      try {
        const url = `${apiUrl(routes.health.latency())}?window=${encodeURIComponent(windowKey)}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = await response.json();
        if (cancelled) return;
        const hasPoints = Array.isArray(json?.points) && json.points.length > 0;
        if (sameWindowUpdate) {
          setInstantRedraw(true);
        }
        if (hasPoints) {
          chartDrawnRef.current = true;
          loadedWindowRef.current = windowKey;
        }
        setPayload(json);
      } catch (err) {
        console.error('Latency history fetch failed:', err);
        if (cancelled) return;
        setLatError(t('healthCheck.latency.loadError'));
        if (!sameWindowUpdate) {
          setPayload(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [windowKey, refreshId, t]);

  const chartRows = useMemo(() => {
    const pts = payload?.points;
    if (!Array.isArray(pts)) return [];
    return pts.map((p) => ({
      t: Date.parse(p.at),
      database: p.database,
      mainServer: p.main_server,
      cdn: p.cdn,
    }));
  }, [payload]);

  // Dev calls /v2 through the Vite proxy, so API_BASE is empty there. Production needs an absolute origin.
  if (!import.meta.env.DEV && !API_BASE) {
    return null;
  }

  const lineMotion = instantRedraw
    ? { isAnimationActive: false, animationDuration: 0 }
    : { isAnimationActive: true };

  return (
    <div className="health-latency-section">
      <h2 className="health-latency-title">{t('healthCheck.latency.title')}</h2>

      <div className="health-latency-toolbar">
        <span className="health-latency-window-label">{t('healthCheck.latency.windowLabel')}</span>
        <CustomSelect
          options={windowOptions}
          value={selectedOption}
          onChange={(opt) => opt && setWindowKey(opt.value)}
          aria-label={t('healthCheck.latency.windowLabel')}
        />
      </div>

      {latError && <div className="error-message health-latency-error">{latError}</div>}

      {loading && (
        <div className="health-latency-chart-loading">
          <div className="spinner spinner-large"></div>
        </div>
      )}

      {!loading && !latError && chartRows.length === 0 && (
        <p className="health-latency-empty">{t('healthCheck.latency.empty')}</p>
      )}

      {!loading && chartRows.length > 0 && (
        <div className="health-latency-chart-wrap">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartRows} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis
                dataKey="t"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(ts) =>
                  new Date(ts).toLocaleString(i18next.language || undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 11, fontWeight: 500 }}
              />
              <YAxis
                stroke="#aaa"
                tick={{ fill: '#aaa', fontSize: 11 }}
                label={{
                  value: t('healthCheck.latency.yAxisLabel'),
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#aaa',
                  style: { textAnchor: 'middle' },
                }}
              />
              <Tooltip
                formatter={(value) => (value == null ? '—' : `${value} ms`)}
                labelFormatter={(ts) => new Date(ts).toLocaleString(i18next.language || undefined)}
                contentStyle={{
                  backgroundColor: 'rgba(25, 25, 25, 0.97)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  fontWeight: 500
                }}
                labelStyle={{ color: '#eee' }}
              />
              <Legend wrapperStyle={{ 
                color: '#ddd'
                }} />
              <Line
                type="linear"
                dataKey="database"
                name={t('healthCheck.latency.series.database')}
                stroke="var(--btn-success)"
                strokeWidth={2}
                dot={false}
                {...lineMotion}
              />
              <Line
                type="linear"
                dataKey="mainServer"
                name={t('healthCheck.latency.series.mainServer')}
                stroke="var(--danger-color)"
                strokeWidth={2}
                dot={false}
                {...lineMotion}
              />
              <Line
                type="linear"
                dataKey="cdn"
                name={t('healthCheck.latency.series.cdn')}
                stroke="var(--warning-color)"
                strokeWidth={2}
                dot={false}
                {...lineMotion}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const HealthCheckPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('healthCheck.title'),
        description: t('healthCheck.metaDescription'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
        noindex: true,
      }),
    [t, location.pathname],
  );
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latencyRefreshId, setLatencyRefreshId] = useState(0);

  const fetchHealthData = async ({ refreshLatency = false } = {}) => {
    if (refreshLatency) {
      setLatencyRefreshId((id) => id + 1);
    }
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(healthUrl('/health/api'));

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setHealthData(data);
      setLastUpdated(formatDate(new Date(), i18next?.language));
    } catch (err) {
      setError(t('healthCheck.loadError'));
      console.error('Error fetching health data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    const intervalId = setInterval(() => {
      fetchHealthData({ refreshLatency: true });
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'degraded':
        return '#FF9800';
      case 'offline':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'offline':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <div className="health-check-page">
      <MetaTags {...pageMeta} />

      <div className="health-check-container page-content">
        <h1>{t('healthCheck.title')}</h1>

        {lastUpdated && (
          <div className="last-updated">{t('healthCheck.lastUpdated', { time: lastUpdated })}</div>
        )}

        {error && <div className="error-message">{error}</div>}

        {loading && !healthData && (
          <div className="loading-container">
            <div className="spinner spinner-xlarge"></div>
            <p className="loading-label">{t('loading.generic', { ns: 'common' })}</p>
          </div>
        )}

        {healthData && (
          <HealthDashboardBody
            healthData={healthData}
            t={t}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
          />
        )}

        <HealthLatencySection t={t} refreshId={latencyRefreshId} />
      </div>

      <button
        className="fixed-refresh-button"
        onClick={() => fetchHealthData({ refreshLatency: true })}
        disabled={isRefreshing}
        aria-label={t('healthCheck.refresh.ariaLabel')}
      >
        {isRefreshing ? (
          <div className="spinner refresh-spinner"></div>
        ) : (
          <span className="refresh-icon">↻</span>
        )}
      </button>
    </div>
  );
};

export default HealthCheckPage;
