import { useEffect, useState, useCallback } from "react";
import "./homepage.css"
import { CompleteNav, Footer, MetaTags } from "../../components";
import api from "../../utils/api";
import { Link } from 'react-router-dom';
import { useDifficultyContext } from "../../contexts/DifficultyContext";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useLocation } from 'react-router-dom';
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import { PassIcon } from "../../components/Icons/PassIcon";
import { LevelIcon } from "../../components/Icons/LevelIcon";
import { LeaderboardIcon } from "../../components/Icons/LeaderboardIcon";

// Import the logo
import logoFull from '@/assets/tuf-logo/logo-full.png';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const difficulty = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <div className="tooltip-content">
          <div className="tooltip-left">
            <img 
              src={difficulty.icon} 
              alt={label} 
              className="difficulty-icon"
            />
            <span className="tooltip-label" style={{ color: difficulty.originalColor }}>
              {label}
            </span>
          </div>
          <div className="tooltip-right">
            <div className="tooltip-stats">
              <span className="tooltip-value">
                {difficulty.passCount.toLocaleString()} Passes
              </span>
              <span className="tooltip-value">
                {difficulty.levelCount.toLocaleString()} Levels
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const StatCard = ({ value, label }) => (
  <div className="stat-card">
    <span className="stat-value">{value.toLocaleString()}</span>
    <span className="stat-label">{label}</span>
  </div>
);

const DifficultyCard = ({ name, passCount }) => (
  <div className="difficulty-card">
    <span className="diff-name">{name}</span>
    <span className="diff-passes">{passCount.toLocaleString()} passes</span>
  </div>
);

const DifficultyGraph = ({ data, mode }) => {
  const { difficultyDict } = useDifficultyContext();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const chartData = data.map(diff => {
    const difficultyInfo = difficultyDict[diff.id] || {};
    return {
      name: diff.name,
      value: mode === 'passes' ? diff.passCount : diff.levelCount,
      passCount: diff.passCount,
      levelCount: diff.levelCount,
      fill: difficultyInfo.color || '#ff2ad1',
      originalColor: difficultyInfo.color || '#ff2ad1',
      icon: difficultyInfo.icon || null
    };
  });

  const containerProps = isMobile ? {
    width: "124%",
    height: 200,
    style: { position: "relative", left: "-12%" }
  } : {
    width: "100%",
    height: 300
  };

  return (
    <ResponsiveContainer {...containerProps}>
      <BarChart 
        data={chartData} 
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barGap={0}
        barCategoryGap={-0.5}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke="rgba(255, 255, 255, 0.05)" 
          vertical={false}
        />
        <XAxis 
          dataKey="name" 
          stroke="#ffffff" 
          fontSize={12}
          tickLine={false}
          interval={isMobile ? 3 : 1}
          angle={isMobile ? 45 : 0}
          textAnchor={isMobile ? "start" : "middle"}
          height={isMobile ? 60 : 30}
        />
        <YAxis 
          stroke="#ffffff" 
          fontSize={isMobile ? 10 : 12}
          tickLine={false}
          axisLine={false}
          width={isMobile ? 35 : 45}
        />
        <Tooltip 
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          offset={10}
          wrapperStyle={{ 
            outline: 'none',
            zIndex: 100
          }}
          animationDuration={0}
        />
        <Bar 
          dataKey="value" 
          name={mode === 'passes' ? 'Passes' : 'Levels'}
          onMouseEnter={(data, index, e) => {
            e.target.style.fill = data.payload.originalColor;
          }}
          onMouseLeave={(data, index, e) => {
            e.target.style.fill = data.payload.fill;
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const HomePage = () => {
  const { t } = useTranslation('pages');
  const tHome = (key, params = {}) => t(`home.${key}`, params);
  const [stats, setStats] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [boundingRect, setBoundingRect] = useState(null);
  const [graphMode, setGraphMode] = useState('passes'); // 'passes' or 'levels'
  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;

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

  // Memoize the update function to avoid recreating it on every render
  const updateBoundingRect = useCallback(() => {
    const element = document.getElementById('main-title');
    if (element) {
      setBoundingRect(element.getBoundingClientRect());
    }
  }, []);

  // Update bounding rect on mount and scroll
  useEffect(() => {
    updateBoundingRect();
    window.addEventListener('scroll', updateBoundingRect);
    window.addEventListener('resize', updateBoundingRect);

    return () => {
      window.removeEventListener('scroll', updateBoundingRect);
      window.removeEventListener('resize', updateBoundingRect);
    };
  }, [updateBoundingRect]);

  // Update to track mouse position only when near the title
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (boundingRect) {
        // Check if mouse is within or near the title area (adding some padding)
        const padding = 100; // pixels of padding around the title
        if (
          e.clientX >= boundingRect.left - padding &&
          e.clientX <= boundingRect.right + padding &&
          e.clientY >= boundingRect.top - padding &&
          e.clientY <= boundingRect.bottom + padding
        ) {
          setMousePosition({ 
            x: e.clientX - boundingRect.left, 
            y: e.clientY - boundingRect.top 
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [boundingRect]);

  return (<>
    <MetaTags
      title={tHome('meta.title')}
      description={tHome('meta.description')}
      url={currentUrl}
      image="/og-image.jpg"
      type="website"
    />
    <div className="background-level"></div>
    <div className="home">
      <CompleteNav />
      <ScrollButton />
      <div className="home-container">
        <div className="content-container">
          <div className="title-section">
            <div className="logo-container">
              <img src={logoFull} alt="TUForums" className="logo" />
            </div>
            <h1 
              className={`main-title`}
              id="main-title"
              style={{
                '--mouse-x': `${mousePosition.x}px`,
                '--mouse-y': `${mousePosition.y}px`
              }}
            >
              <span className="title-mask">{tHome('title.revamped')}</span>
              <span className="title-glow">{tHome('title.revamped')}</span>
            </h1>
          </div>

          <div className="action-buttons">
            <Link to="/levels" className="action-button">
              <span>{tHome('buttons.browseLevels')}</span>
              &nbsp;
              <LevelIcon size={32} />
            </Link>
            <Link to="/passes" className="action-button">
              <span>{tHome('buttons.browsePasses')}</span>
              &nbsp;
              <PassIcon size={32} />
            </Link>
            <Link to="/leaderboard" className="action-button">
              <span>{tHome('buttons.leaderboard')}</span>
              &nbsp;
              <LeaderboardIcon size={32} />
            </Link>
          </div>
        </div>

        {stats == null ? 
        (<div className="loader loader-level-page" style={{marginBottom: "400px"}}/>)
        :(
          <div className="stats-container">
            <section className="stats-section overview">
              <h2>{tHome('stats.overview.title')}</h2>
              <div className="stats-grid">
                <StatCard value={stats.overview.totalLevels} label={tHome('stats.overview.totalLevels')} />
                <StatCard value={stats.overview.totalPasses} label={tHome('stats.overview.totalPasses')} />
                <StatCard value={stats.overview.totalPlayers} label={tHome('stats.overview.totalPlayers')} />
                <StatCard value={stats.overview.passesLast30Days} label={tHome('stats.overview.passesLast30Days')} />
              </div>
            </section>

            <section className="stats-section difficulties">
              <h2>{tHome('stats.difficulties.title')}</h2>
              <div className="graph-controls">
                <button 
                  className={`graph-mode ${graphMode === 'passes' ? 'active' : ''}`}
                  onClick={() => {
                    setGraphMode('passes');
                  }}
                >
                  {tHome('stats.difficulties.graphModes.passes')}
                </button>
                <button 
                  className={`graph-mode ${graphMode === 'levels' ? 'active' : ''}`}
                  onClick={() => {
                    setGraphMode('levels');
                  }}
                  
                >
                  {tHome('stats.difficulties.graphModes.levels')}
                </button>
              </div>
              {Object.entries(stats.difficulties.byType).filter(([type]) => type !== 'SPECIAL').map(([type, difficulties]) => (
                <div key={type} className="difficulty-type-section">
                  <h3>{type}</h3>
                  <DifficultyGraph data={difficulties} mode={graphMode} />
                </div>
              ))}
            </section>
            <section className="stats-section discord-section">
              <div className="discord-container">
                <span className="discord-title">{tHome('stats.discord.title')}</span>
                <iframe 
                src="https://discord.com/widget?id=1024941834373439509&theme=dark" 
                width="83.333%" 
                height="300"
                allowtransparency="true" 
                frameborder="0" 
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                style={{position: "relative", zIndex: "1", transform: "scale(1.2)", transformOrigin: "0 0", paddingBottom: "50px"}}
                />
              </div>
            </section>
            <p style={{textAlign: "center", opacity: "0.5"}}>{tHome('stats.comingSoon')}</p>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  </>);
};

export default HomePage;
