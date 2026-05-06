// tuf-search: #HomePage #homePage #home — Home
import { useEffect, useState, useCallback } from "react";
import "./homepage.css"
import { Footer } from "@/components/layout";
import { MetaTags, WeeklyGallery, DifficultyGraph } from "@/components/common/display";
import api from "@/utils/api";
import { Link } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useLocation } from 'react-router-dom';
import { ScrollButton } from "@/components/common/buttons";
import { PassIcon, ChartIcon, LeaderboardIcon, PackIcon } from "@/components/common/icons";
import { useWeeklyCurations } from "@/hooks/useWeeklyCurations";
import LogoFullOutlineSVG from "@/assets/tuf-logo/LogoFullOutlined/LogoFullOutlined";

const SupportButton = () => {
  const { t } = useTranslation('pages');
  return (
    <button onClick={() => window.open('https://ko-fi.com/v0w4n', '_blank')} className="support-button rainbow-box">

        <span className="support-text">{t('home.stats.donate')}</span>
        <img className="support-icon" src="https://cdn.prod.website-files.com/5c14e387dab576fe667689cf/670f5a01229bf8a18f97a3c1_favion.png" alt="Ko-fi" />
        <div className="rainbow-background" />
    </button>
  )
}

const StatCard = ({ value, label }) => (
  <div className="stat-card">
    <span className="stat-value">{value.toLocaleString()}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const HomePage = () => {
  const { t } = useTranslation('pages');
  const [stats, setStats] = useState(null);
  const [graphMode, setGraphMode] = useState('passes'); // 'passes' or 'levels'
  const [isUserActive, setIsUserActive] = useState(true);
  const [activeListType, setActiveListType] = useState('primary'); // 'primary' or 'secondary'
  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;
  
  // Fetch weekly curations
  const { weeklies, isLoading: weekliesLoading, error: weekliesError } = useWeeklyCurations();

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(import.meta.env.VITE_STATISTICS);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch statistics:', error);
      }
    };

    fetchStats();
  }, []);

  // Track user activity for auto-scroll control
  useEffect(() => {
    let activityTimeout;
    
    const handleUserActivity = () => {
      setIsUserActive(true);
      clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => setIsUserActive(false), 30000); // 30 seconds
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearTimeout(activityTimeout);
    };
  }, []);

  return (<>
    <MetaTags
      title={t('home.meta.title')}
      description={t('home.meta.description')}
      url={currentUrl}
      image="/og-image.jpg"
      type="website"
    />
    <div className="home">
      
      <ScrollButton />
      <div className="home-container">
        <div className="content-container">
          <div className="title-section">
            <LogoFullOutlineSVG className="logo-container" />
            { /*
            <h1 
              className={`main-title`}
              id="main-title"
              style={{
                '--mouse-x': `${mousePosition.x}px`,
                '--mouse-y': `${mousePosition.y}px`
              }}
            >
              <span className="title-mask">{t('home.title.revamped')}</span>
              <span className="title-glow">{t('home.title.revamped')}</span>
            </h1>
            */ }
          </div>

          <div className="action-buttons">
            <div className="action-buttons-row">
            <Link to="/levels" className="action-button">
              <span>{t('home.buttons.browseLevels')}</span>
              &nbsp;
              <ChartIcon size={32} />
            </Link>
            <Link to="/packs" className="action-button">
              <span>{t('home.buttons.browsePacks')}</span>
              &nbsp;
              <PackIcon size={32} />
            </Link>
            </div>
            <div className="action-buttons-row"> 
            <Link to="/passes" className="action-button">
              <span>{t('home.buttons.browsePasses')}</span>
              &nbsp;
              <PassIcon size={32} />
            </Link>
            <Link to="/leaderboard" className="action-button">
              <span>{t('home.buttons.leaderboard')}</span>
              &nbsp;
              <LeaderboardIcon size={32} />
            </Link>
            </div>
          </div>
          {/* Weekly Curations Section */}

          
          <Link to="/health">
          <button
            className="health-button visible"
            aria-label="Health"
           >
              <span className="button-content">
                  <svg fill="#0f0" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 316.89 316.89" xmlSpace="preserve" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M182.47,212.195c0-0.754,0.036-1.5,0.057-2.25H38.5c-21.229,0-38.5,17.271-38.5,38.5s17.271,38.5,38.5,38.5h199.493 C205.905,277.24,182.47,247.408,182.47,212.195z M81.5,258.445h-35c-5.514,0-10-4.486-10-10c0-5.514,4.486-10,10-10h35 c5.514,0,10,4.486,10,10C91.5,253.959,87.014,258.445,81.5,258.445z"></path> <path d="M38.5,196.945h145.476c7.114-35.78,38.743-62.837,76.581-62.837c9.54,0,18.682,1.727,27.139,4.872 c-6.697-11.378-19.066-19.035-33.196-19.035h-216c-21.229,0-38.5,17.271-38.5,38.5S17.271,196.945,38.5,196.945z M46.5,148.445h35 c5.514,0,10,4.486,10,10c0,5.514-4.486,10-10,10h-35c-5.514,0-10-4.486-10-10C36.5,152.931,40.986,148.445,46.5,148.445z"></path> <path d="M38.5,106.945h216c21.228,0,38.5-17.271,38.5-38.5s-17.272-38.5-38.5-38.5h-216c-21.229,0-38.5,17.271-38.5,38.5 S17.271,106.945,38.5,106.945z M237.5,55.695c7.03,0,12.75,5.72,12.75,12.75s-5.72,12.75-12.75,12.75 c-7.03,0-12.75-5.72-12.75-12.75S230.47,55.695,237.5,55.695z M46.5,58.445h35c5.514,0,10,4.486,10,10s-4.486,10-10,10h-35 c-5.514,0-10-4.486-10-10S40.986,58.445,46.5,58.445z"></path> <path d="M260.557,155.862c-31.112,0-56.333,25.221-56.333,56.333s25.221,56.333,56.333,56.333s56.332-25.221,56.332-56.333 S291.669,155.862,260.557,155.862z M290.653,200.261l-35.654,35.653c-0.754,0.755-1.759,1.172-2.828,1.172 c-1.069,0-2.074-0.416-2.829-1.172l-17.88-17.88c-0.756-0.755-1.172-1.76-1.172-2.828c0-1.068,0.416-2.073,1.172-2.829l3.535-3.535 c0.754-0.755,1.759-1.172,2.828-1.172c1.068,0,2.073,0.416,2.828,1.171l11.518,11.517l29.291-29.289 c0.754-0.755,1.759-1.172,2.828-1.172c1.069,0,2.074,0.417,2.829,1.172l3.535,3.535c0.755,0.754,1.172,1.759,1.172,2.828 C291.825,198.501,291.409,199.506,290.653,200.261z"></path> </g> </g></svg>
                  
                <span className="button-text">Health</span>
              </span>
            </button>
          </Link>
        </div>

        <div className="weekly-curations-section">
            <h2 className="weekly-curations-title">{t('home.weeklies.title')}</h2>
            {weekliesLoading ? (
              <div className="weekly-curations-loading">
                <div className="spinner spinner-xlarge spinner-accent"></div>
                <p>{t('loading.generic', { ns: 'common' })}</p>
              </div>
            ) : weekliesError ? (
              <div className="weekly-curations-error">
                <p>{t('home.weeklies.error')}</p>
              </div>
            ) : weeklies.length > 0 ? (
              <div className="weekly-curations-container">
                <div className="weekly-curations-stack">
                  {/* Primary Weeklies */}
                  {weeklies.filter(w => w.listType === 'primary').length > 0 && (
                    <div className={`weekly-curations-group ${activeListType === 'primary' ? 'active' : 'inactive'}`}>
                      <h3 className="weekly-curations-group-title">{t('home.weeklies.primary')}</h3>
                      <WeeklyGallery
                        curations={weeklies.filter(w => w.listType === 'primary').map(w => w.scheduledCuration)}
                        autoScroll={isUserActive && weeklies.filter(w => w.listType === 'primary').length > 1}
                        autoScrollInterval={6000}
                        onCurationClick={(curation) => {
                        }}
                        className="weekly-gallery--primary"
                      />
                    </div>
                  )}
                  
                  {/* Secondary Weeklies */}
                  {weeklies.filter(w => w.listType === 'secondary').length > 0 && (
                    <div className={`weekly-curations-group ${activeListType === 'secondary' ? 'active' : 'inactive'}`}>
                      <h3 className="weekly-curations-group-title">{t('home.weeklies.secondary')}</h3>
                      <WeeklyGallery
                        curations={weeklies.filter(w => w.listType === 'secondary').map(w => w.scheduledCuration)}
                        autoScroll={isUserActive && weeklies.filter(w => w.listType === 'secondary').length > 1}
                        autoScrollInterval={7000}
                        onCurationClick={(curation) => {
                        }}
                        className="weekly-gallery--secondary"
                      />
                    </div>
                  )}
                  
                  {/* Switch Button - only show if both lists exist */}
                  {weeklies.filter(w => w.listType === 'primary').length > 0 && 
                   weeklies.filter(w => w.listType === 'secondary').length > 0 && (
                    <button 
                      className="weekly-curations-switch-btn"
                      onClick={() => setActiveListType(activeListType === 'primary' ? 'secondary' : 'primary')}
                      aria-label={`Switch to ${activeListType === 'primary' ? 'secondary' : 'primary'} list`}
                    >
                      <span className="switch-btn-text">
                      ▼ &nbsp;&nbsp;{activeListType === 'primary' ? t('home.weeklies.secondary') : t('home.weeklies.primary')}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="weekly-curations-empty">
                <div className="weekly-curations-empty-icon">🎵</div>
                <p>{t('home.weeklies.empty')}</p>
              </div>
            )}
          </div>

        {stats == null ? (
          <div className="stats-container">
            <section className="stats-section overview">
              <h2>{t('home.stats.overview.title')}</h2>
              <div className="stats-grid empty">
                <StatCard value={0} label={t('home.stats.overview.totalLevels')} />
                <StatCard value={0} label={t('home.stats.overview.totalPasses')} />
                <StatCard value={0} label={t('home.stats.overview.totalPlayers')} />
                <StatCard value={0} label={t('home.stats.overview.passesLast30Days')} />
              </div>
            </section>

            <section className="stats-section difficulties">
              <h2>{t('home.stats.difficulties.title')}</h2>
              <div style={{ opacity: 0.5, transform: 'scaleY(0)', height: 0, transformOrigin: 'top' }}>
                <div className="graph-controls">
                  <button 
                    className={`graph-mode ${graphMode === 'passes' ? 'active' : ''}`}
                    onClick={() => setGraphMode('passes')}
                  >
                    {t('home.stats.difficulties.graphModes.passes')}
                  </button>
                  <button 
                    className={`graph-mode ${graphMode === 'levels' ? 'active' : ''}`}
                    onClick={() => setGraphMode('levels')}
                  >
                    {t('home.stats.difficulties.graphModes.levels')}
                  </button>
                </div>
                <div style={{ height: "300px" }}></div>
              </div>
            </section>

            <section className="stats-section discord-section">
              <div className="discord-container">
                <span className="discord-title">{t('home.stats.discord.title')}</span>
                <iframe 
                src="https://discord.com/widget?id=1024941834373439509&theme=dark" 
                width="83.333%" 
                height="300"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                style={{
                  position: "relative", 
                  zIndex: "1", 
                  transform: "scale(1.2)", 
                  transformOrigin: "0 0", 
                  paddingBottom: "50px",
                  border: "none"
                }}
                />
              </div>
            </section>
            <p style={{textAlign: "center", opacity: "0.5"}}>{t('home.stats.comingSoon')}</p>
          </div>
        ) : (
          <div className="stats-container">
            <section className="stats-section overview">
              <h2>{t('home.stats.overview.title')}</h2>
              <div className="stats-grid">
                <StatCard value={stats.overview.totalLevels} label={t('home.stats.overview.totalLevels')} />
                <StatCard value={stats.overview.totalPasses} label={t('home.stats.overview.totalPasses')} />
                <StatCard value={stats.overview.totalPlayers} label={t('home.stats.overview.totalPlayers')} />
                <StatCard value={stats.overview.passesLast30Days} label={t('home.stats.overview.passesLast30Days')} />
              </div>
            </section>

            <section className="stats-section difficulties">
              <h2>{t('home.stats.difficulties.title')}</h2>
              <div style={{ 
                transformOrigin: 'top' 
              }}>
                <div className="graph-controls">
                  <button 
                    className={`graph-mode ${graphMode === 'passes' ? 'active' : ''}`}
                    onClick={() => setGraphMode('passes')}
                  >
                    {t('home.stats.difficulties.graphModes.passes')}
                  </button>
                  <button 
                    className={`graph-mode ${graphMode === 'levels' ? 'active' : ''}`}
                    onClick={() => setGraphMode('levels')}
                  >
                    {t('home.stats.difficulties.graphModes.levels')}
                  </button>
                </div>
                {Object.entries(stats.difficulties.byType).filter(([type]) => type == 'PGU').map(([type, difficulties]) => (
                  <div key={type} className="difficulty-type-section">
                    <h3>{type}</h3>
                    <DifficultyGraph data={difficulties} mode={graphMode} labelMode="all" />
                  </div>
                ))}
              </div>
            </section>
            <section className="stats-section discord-section">
              <div className="discord-container">
                <span className="discord-title">{t('home.stats.discord.title')}</span>
                <iframe 
                src="https://discord.com/widget?id=1024941834373439509&theme=dark" 
                width="83.333%" 
                height="300"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                style={{
                  position: "relative", 
                  zIndex: "1", 
                  transform: "scale(1.2)", 
                  transformOrigin: "0 0", 
                  paddingBottom: "50px",
                  border: "none"
                }}
                />
              </div>
            </section>
          </div>
        )}
      </div>
      <SupportButton />
      <Footer />
    </div>
  </>);
};

export default HomePage;
