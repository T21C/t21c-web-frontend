import React, { useState, useEffect } from 'react';
import { CompleteNav } from '@/components/layout';
import { MetaTags } from '@/components/common/display';
import './healthcheckpage.css';

const HealthCheckPage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealthData = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.tuforums.com/health/api');
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(`Failed to fetch health data: ${err.message}`);
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
    
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return '#4CAF50';
      case 'degraded':
        return '#FF9800';
      case 'unhealthy':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'unhealthy':
        return '✗';
      default:
        return '?';
    }
  };

  const calculateMemoryPercentage = (used, total) => {
    if (!used || !total) return 0;
    return Math.round((used / total) * 100);
  };

  return (
    <div className="health-check-page">
      <MetaTags
        title="System Health Status | TUF"
        description="Monitor the health status of TUF servers and services"
        url={window.location.origin + '/health'}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav />
      <div className="background-level" />
      <div className="health-check-container">
        <h1>System Health Status</h1>
        
        <div className="health-refresh">
          <button 
            className="refresh-button" 
            onClick={fetchHealthData} 
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
          {lastUpdated && (
            <span className="last-updated">Last updated: {lastUpdated}</span>
          )}
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {loading && !healthData && (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading health data...</p>
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
                <span>{healthData.status.toUpperCase()}</span>
              </div>
              <div className="timestamp">
                Uptime: {formatUptime(healthData.uptime)}
              </div>
            </div>
            
            <div className="health-grid">
              <div className="health-card">
                <h3>Database</h3>
                <div className={`status-indicator ${healthData.checks.database ? 'healthy' : 'unhealthy'}`}>
                  {healthData.checks.database ? 'Healthy' : 'Unhealthy'}
                </div>
                {healthData.mainServerInfo?.checks?.database?.message && (
                  <p>{healthData.mainServerInfo.checks.database.message}</p>
                )}
              </div>
              
              <div className="health-card">
                <h3>Socket Server</h3>
                <div className={`status-indicator ${healthData.mainServerInfo?.checks?.socket?.connected ? 'healthy' : 'unhealthy'}`}>
                  {healthData.mainServerInfo?.checks?.socket?.connected ? 'Healthy' : 'Unhealthy'}
                </div>
                {healthData.mainServerInfo?.checks?.socket?.message && (
                  <p>{healthData.mainServerInfo.checks.socket.message}</p>
                )}
              </div>
            </div>
            
            <div className="server-details">
              <h2>Server Information</h2>
              
              <div className="server-status">
                <div>
                  <strong>Status:</strong> {healthData.status}
                </div>
                <div>
                  <strong>Uptime:</strong> {formatUptime(healthData.uptime)}
                </div>
              </div>
              
              <div className="server-checks">
                <h3>Service Checks</h3>
                <div className="check-grid">
                  <div className="check-item">
                    <div className="check-label">Database</div>
                    <div className={`check-status ${healthData.checks.database ? 'healthy' : 'unhealthy'}`}>
                      {healthData.checks.database ? 'Healthy' : 'Unhealthy'}
                    </div>
                    {healthData.mainServerInfo?.checks?.database?.message && (
                      <div className="check-message">{healthData.mainServerInfo.checks.database.message}</div>
                    )}
                  </div>
                  
                  <div className="check-item">
                    <div className="check-label">Socket Server</div>
                    <div className={`check-status ${healthData.mainServerInfo?.checks?.socket?.connected ? 'healthy' : 'unhealthy'}`}>
                      {healthData.mainServerInfo?.checks?.socket?.connected ? 'Healthy' : 'Unhealthy'}
                    </div>
                    {healthData.mainServerInfo?.checks?.socket?.message && (
                      <div className="check-message">{healthData.mainServerInfo.checks.socket.message}</div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="server-info">
                <h3>System Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-label">Node Version</div>
                    <div className="info-value">{healthData.mainServerInfo?.system?.nodeVersion || 'N/A'}</div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-label">Platform</div>
                    <div className="info-value">{healthData.mainServerInfo?.system?.platform || 'N/A'}</div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-label">Environment</div>
                    <div className="info-value">{healthData.mainServerInfo?.system?.env || 'N/A'}</div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-label">Main Server Status</div>
                    <div className="info-value">{healthData.mainServerInfo?.status || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              <div className="memory-usage">
                <h3>Memory Usage</h3>
                <div className="memory-grid">
                  <div className="memory-item">
                    <div className="memory-label">RSS Memory</div>
                    <div className="memory-value">{formatMemory(healthData.mainServerInfo?.system?.memory?.rss)}</div>
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">Heap Total</div>
                    <div className="memory-value">{formatMemory(healthData.mainServerInfo?.system?.memory?.heapTotal)}</div>
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">Heap Used</div>
                    <div className="memory-value">{formatMemory(healthData.mainServerInfo?.system?.memory?.heapUsed)}</div>
                    {healthData.mainServerInfo?.system?.memory?.heapTotal && healthData.mainServerInfo?.system?.memory?.heapUsed && (
                      <div className="memory-bar">
                        <div 
                          className="memory-bar-fill" 
                          style={{ 
                            width: `${calculateMemoryPercentage(
                              healthData.mainServerInfo.system.memory.heapUsed, 
                              healthData.mainServerInfo.system.memory.heapTotal
                            )}%`,
                            backgroundColor: calculateMemoryPercentage(
                              healthData.mainServerInfo.system.memory.heapUsed, 
                              healthData.mainServerInfo.system.memory.heapTotal
                            ) > 80 ? '#F44336' : '#4CAF50'
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">External Memory</div>
                    <div className="memory-value">{formatMemory(healthData.mainServerInfo?.system?.memory?.external)}</div>
                  </div>
                  
                  <div className="memory-item">
                    <div className="memory-label">Array Buffers</div>
                    <div className="memory-value">{formatMemory(healthData.mainServerInfo?.system?.memory?.arrayBuffers)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HealthCheckPage;