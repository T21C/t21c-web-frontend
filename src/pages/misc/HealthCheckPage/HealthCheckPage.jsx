import React, { useState, useEffect } from 'react';

import { MetaTags } from '@/components/common/display';
import { useTranslation } from 'react-i18next';
import './healthcheckpage.css';
import { formatDate } from '@/utils/Utility';
import i18next from 'i18next';

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

  const formatMemory = (bytes) => {
    if (!bytes) return 'N/A';
    
    // Convert to GB if over 1GB, otherwise show in MB
    if (bytes >= 1024 * 1024 * 1024) {
      const gb = bytes / (1024 * 1024 * 1024);
      return `${gb.toFixed(2)} GB`;
    }
    
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatMemoryForComparison = (bytes) => {
    if (!bytes) return 0;
    
    // Always convert to bytes for comparison
    return bytes;
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

  const calculateMemoryPercentage = (used, total) => {
    if (!used || !total) return 0;
    
    // Convert both values to the same unit (bytes) for accurate percentage calculation
    const usedBytes = formatMemoryForComparison(used);
    const totalBytes = formatMemoryForComparison(total);
    
    return Math.round((usedBytes / totalBytes) * 100);
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
      
      <div className="health-check-container">
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
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>{t('healthCheck.loading')}</p>
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
              
              <div className="memory-usage">
                <h3>{t('healthCheck.memoryUsage.title')}</h3>
                <div className="memory-grid">
                  <div className="memory-item">
                    <div className="memory-label">{t('healthCheck.memoryUsage.rssMemory')}</div>
                    <div className="memory-value">{formatMemory(healthData.memoryUsage?.rss)}</div>
                    {healthData.memoryLimits?.rssLimit && (
                      <div className="memory-limit">
                        <span>{t('healthCheck.memoryUsage.max', { value: formatMemory(healthData.memoryLimits.rssLimit) })}</span>
                        <div className="memory-bar">
                          <div 
                            className="memory-bar-fill" 
                            style={{ 
                              width: `${calculateMemoryPercentage(healthData.memoryUsage?.rss, healthData.memoryLimits?.rssLimit)}%`,
                              backgroundColor: calculateMemoryPercentage(healthData.memoryUsage?.rss, healthData.memoryLimits?.rssLimit) > 80 ? '#F44336' : '#4CAF50'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">{t('healthCheck.memoryUsage.heapTotal')}</div>
                    <div className="memory-value">{formatMemory(healthData.memoryUsage?.heapTotal)}</div>
                    {healthData.memoryLimits?.heapSizeLimit && (
                      <div className="memory-limit">
                        <span>{t('healthCheck.memoryUsage.max', { value: formatMemory(healthData.memoryLimits.heapSizeLimit) })}</span>
                        <div className="memory-bar">
                          <div 
                            className="memory-bar-fill" 
                            style={{ 
                              width: `${calculateMemoryPercentage(healthData.memoryUsage?.heapTotal, healthData.memoryLimits?.heapSizeLimit)}%`,
                              backgroundColor: calculateMemoryPercentage(healthData.memoryUsage?.heapTotal, healthData.memoryLimits?.heapSizeLimit) > 80 ? '#F44336' : '#4CAF50'
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">{t('healthCheck.memoryUsage.heapUsed')}</div>
                    <div className="memory-value">{formatMemory(healthData.memoryUsage?.heapUsed)}</div>
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">{t('healthCheck.memoryUsage.externalMemory')}</div>
                    <div className="memory-value">{formatMemory(healthData.memoryUsage?.external)}</div>
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">{t('healthCheck.memoryUsage.arrayBuffers')}</div>
                    <div className="memory-value">{formatMemory(healthData.memoryUsage?.arrayBuffers)}</div>
                  </div>
                </div>
              </div>
              
              {healthData.memoryLimits && (
                <div className="memory-limits">
                  <h3>{t('healthCheck.memoryLimits.title')}</h3>
                  <div className="limits-grid">
                    <div className="limit-item">
                      <div className="limit-label">{t('healthCheck.memoryLimits.heapSizeLimit')}</div>
                      <div className="limit-value">{formatMemory(healthData.memoryLimits.heapSizeLimit)}</div>
                    </div>
                    
                    <div className="limit-item">
                      <div className="limit-label">{t('healthCheck.memoryLimits.totalAvailableSize')}</div>
                      <div className="limit-value">{formatMemory(healthData.memoryLimits.totalAvailableSize)}</div>
                    </div>
                    
                    <div className="limit-item">
                      <div className="limit-label">{t('healthCheck.memoryLimits.totalHeapSizeExecutable')}</div>
                      <div className="limit-value">{formatMemory(healthData.memoryLimits.totalHeapSizeExecutable)}</div>
                    </div>
                    
                    <div className="limit-item">
                      <div className="limit-label">{t('healthCheck.memoryLimits.totalPhysicalSize')}</div>
                      <div className="limit-value">{formatMemory(healthData.memoryLimits.totalPhysicalSize)}</div>
                    </div>
                    
                    <div className="limit-item">
                      <div className="limit-label">{t('healthCheck.memoryLimits.maxRSS')}</div>
                      <div className="limit-value">{formatMemory(healthData.memoryLimits.rssLimit)}</div>
                    </div>
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
          <div className="refresh-spinner"></div>
        ) : (
          <span className="refresh-icon">↻</span>
        )}
      </button>
    </div>
  );
};

export default HealthCheckPage;