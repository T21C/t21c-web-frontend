import React, { useState, useEffect } from 'react';

import { MetaTags } from '@/components/common/display';
import { useTranslation } from 'react-i18next';
import './healthcheckpage.css';
import { formatDate } from '@/utils/Utility';
import i18next from 'i18next';

/** Order matches the standalone health service probe list. */
const PROBE_ORDER = ['database', 'mainServer', 'cdn', 'cdc', 'nginx'];

/** Strip large / redundant fields from `details` before rendering (e.g. full main API JSON). */
function getProbeDetailEntries(details) {
  if (!details || typeof details !== 'object') return [];
  const out = [];
  const { url, status, errorCode } = details;
  if (typeof url === 'string' && url.length > 0) {
    out.push({ key: 'url', value: url });
  }
  if (typeof status === 'number') {
    out.push({ key: 'status', value: String(status) });
  }
  if (errorCode !== undefined && errorCode !== null && String(errorCode).length > 0) {
    out.push({ key: 'errorCode', value: String(errorCode) });
  }
  return out;
}

const HealthCheckPage = () => {
  const { t } = useTranslation('pages');
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const development = process.env.NODE_ENV === 'development';
  const fetchHealthData = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await fetch(development ? 'http://localhost:3883/health/api' : 'https://api.tuforums.com/health/api');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(formatDate(new Date(), i18next?.language));
    } catch (err) {
      setError(t('healthCheck.error', { error: err.message }));
      console.error('Error fetching health data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(fetchHealthData, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  const formatUptime = (uptime) => {
    if (!uptime) return 'N/A';
    
    // Handle both string format and numeric seconds
    if (typeof uptime === 'string') {
      return uptime;
    }
    
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

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
      <MetaTags
        title={t('healthCheck.title') + " | TUF"}
        description="Monitor the health status of TUF servers and services"
        url={window.location.origin + '/health'}
        image="/og-image.jpg"
        type="website"
      />
      
      <div className="health-check-container page-content">
        <h1>{t('healthCheck.title')}</h1>
        
        {lastUpdated && (
          <div className="last-updated">{t('healthCheck.lastUpdated', { time: lastUpdated })}</div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {loading && !healthData && (
          <div className="loading-container">
            <div className="spinner spinner-xlarge"></div>
            <p className="loading-label">{t('loading.generic', { ns: 'common' })}</p>
          </div>
        )}
        
        {healthData && (
          <div className="health-dashboard">
            <div className="health-summary">
              <div 
                className="status-badge" 
                style={{ backgroundColor: getStatusColor(healthData.status) }}
              >
                <span className="status-icon">{getStatusIcon(healthData.status)}</span>
                <span>{t(`healthCheck.status.${healthData.status}`)}</span>
              </div>
              <div className="timestamp">
                {t('healthCheck.serverInfo.uptime')}: {formatUptime(healthData.uptime)}
              </div>
            </div>
            
            <div className="health-grid">
              <div className="health-card">
                <h3>{t('healthCheck.serviceChecks.database')}</h3>
                <div className={`status-indicator ${healthData.checks.database ? 'online' : 'offline'}`}>
                  {healthData.checks.database ? t('healthCheck.status.online') : t('healthCheck.status.offline')}
                </div>
                {healthData.mainServerInfo?.checks?.database?.message && (
                  <p>{healthData.mainServerInfo.checks.database.message}</p>
                )}
              </div>
              
              <div className="health-card">
                <h3>{t('healthCheck.serviceChecks.socketServer')}</h3>
                <div className={`status-indicator ${healthData.mainServerInfo?.checks?.socket?.connected ? 'online' : 'offline'}`}>
                  {healthData.mainServerInfo?.checks?.socket?.connected ? t('healthCheck.status.online') : t('healthCheck.status.offline')}
                </div>
                {healthData.mainServerInfo?.checks?.socket?.message && (
                  <p>{healthData.mainServerInfo.checks.socket.message}</p>
                )}
              </div>
            </div>
            
            <div className="server-details">
              <h2>{t('healthCheck.serverInfo.title')}</h2>
              
              <div className="server-status">
                <div>
                  <strong>{t('healthCheck.serverInfo.status')}:</strong> {t(`status.${healthData.status}`)}
                </div>
                <div>
                  <strong>{t('healthCheck.serverInfo.uptime')}:</strong> {formatUptime(healthData.uptime)}
                </div>
              </div>
              
              <div className="server-checks">
                <h3>{t('healthCheck.serviceChecks.title')}</h3>
                <div className="check-grid">
                  <div className="check-item">
                    <div className="check-label">{t('healthCheck.serviceChecks.database')}</div>
                    <div className={`check-status ${healthData.checks.database ? 'online' : 'offline'}`}>
                      {healthData.checks.database ? t('healthCheck.status.online') : t('healthCheck.status.offline')}
                    </div>
                    {healthData.mainServerInfo?.checks?.database?.message && (
                      <div className="check-message">{healthData.mainServerInfo.checks.database.message}</div>
                    )}
                  </div>
                  
                  <div className="check-item">
                    <div className="check-label">{t('healthCheck.serviceChecks.socketServer')}</div>
                    <div className={`check-status ${healthData.mainServerInfo?.checks?.socket?.connected ? 'online' : 'offline'}`}>
                      {healthData.mainServerInfo?.checks?.socket?.connected ? t('healthCheck.status.online') : t('healthCheck.status.offline')}
                    </div>
                    {healthData.mainServerInfo?.checks?.socket?.message && (
                      <div className="check-message">{healthData.mainServerInfo.checks.socket.message}</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="server-info">
                <h3>{t('healthCheck.systemInfo.title')}</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">{t('healthCheck.systemInfo.nodeVersion')}</div>
                    <div className="info-value">{healthData.mainServerInfo?.system?.nodeVersion || 'N/A'}</div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-label">{t('healthCheck.systemInfo.platform')}</div>
                    <div className="info-value">{healthData.mainServerInfo?.system?.platform || 'N/A'}</div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-label">{t('healthCheck.systemInfo.environment')}</div>
                    <div className="info-value">{healthData.mainServerInfo?.system?.env || 'N/A'}</div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-label">{t('healthCheck.systemInfo.mainServerStatus')}</div>
                    <div className="info-value">{healthData.mainServerInfo?.status || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {healthData.details?.probes && (
                <div className="probes-section">
                  <h3>{t('healthCheck.probes.title')}</h3>
                  <p className="probes-intro">{t('healthCheck.probes.description')}</p>

                  {healthData.details.config && (
                    <div className="probes-config">
                      <h4>{t('healthCheck.probes.configTitle')}</h4>
                      <dl className="probes-config-grid">
                        <div className="probes-config-row">
                          <dt>{t('healthCheck.probes.configMain')}</dt>
                          <dd>{healthData.details.config.mainServerUrl || '—'}</dd>
                        </div>
                        <div className="probes-config-row">
                          <dt>{t('healthCheck.probes.configCdn')}</dt>
                          <dd>{healthData.details.config.cdnUrl || '—'}</dd>
                        </div>
                        <div className="probes-config-row">
                          <dt>{t('healthCheck.probes.configCdc')}</dt>
                          <dd>{healthData.details.config.cdcUrl || '—'}</dd>
                        </div>
                        <div className="probes-config-row">
                          <dt>{t('healthCheck.probes.configNginx')}</dt>
                          <dd>
                            {healthData.details.config.nginxUrl
                              ? healthData.details.config.nginxUrl
                              : t('healthCheck.probes.configNone')}
                          </dd>
                        </div>
                        <div className="probes-config-row">
                          <dt>{t('healthCheck.probes.configInterval')}</dt>
                          <dd>{healthData.details.config.probeIntervalMs ?? '—'} ms</dd>
                        </div>
                        <div className="probes-config-row">
                          <dt>{t('healthCheck.probes.configTimeout')}</dt>
                          <dd>{healthData.details.config.probeTimeoutMs ?? '—'} ms</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  <div className="probes-grid">
                    {PROBE_ORDER.map((probeName) => {
                      const probe = healthData.details.probes[probeName];
                      if (!probe) return null;
                      const skipped = probe.skipped === true;
                      const stateClass = skipped ? 'skipped' : probe.ok ? 'online' : 'offline';
                      const label = t(`healthCheck.probes.names.${probeName}`);
                      const detailRows = getProbeDetailEntries(probe.details);

                      return (
                        <div key={probeName} className={`probe-card ${stateClass}`}>
                          <div className="probe-card-header">
                            <h4>{label}</h4>
                            <span className={`probe-state ${stateClass}`}>
                              {skipped
                                ? t('healthCheck.probes.skipped')
                                : probe.ok
                                  ? t('healthCheck.status.online')
                                  : t('healthCheck.status.offline')}
                            </span>
                          </div>
                          {skipped && probe.message && (
                            <p className="probe-skipped-note">{probe.message}</p>
                          )}
                          {!skipped && (
                            <dl className="probe-meta">
                              <div className="probe-meta-row">
                                <dt>{t('healthCheck.probes.latency')}</dt>
                                <dd>{typeof probe.durationMs === 'number' ? `${probe.durationMs} ms` : '—'}</dd>
                              </div>
                              {probe.message && (
                                <div className="probe-meta-row">
                                  <dt>{t('healthCheck.probes.message')}</dt>
                                  <dd className="probe-message">{probe.message}</dd>
                                </div>
                              )}
                              {detailRows.map((row) => (
                                <div key={row.key} className="probe-meta-row">
                                  <dt>
                                    {row.key === 'url' && t('healthCheck.probes.detailUrl')}
                                    {row.key === 'status' && t('healthCheck.probes.detailHttpStatus')}
                                    {row.key === 'errorCode' && t('healthCheck.probes.errorCode')}
                                  </dt>
                                  <dd className="probe-detail-value">{row.value}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <button 
        className="fixed-refresh-button" 
        onClick={fetchHealthData} 
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