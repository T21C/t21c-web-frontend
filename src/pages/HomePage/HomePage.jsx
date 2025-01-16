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
              <img src="/src/assets/tuf-logo/logo-full.png" alt="TUForums" className="logo" />
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
              <img width="32px" src="/src/assets/icons/chart.png" alt="arrow-right" className="arrow-right" />
            </Link>
            <Link to="/passes" className="action-button">
              <span>{tHome('buttons.browsePasses')}</span>
              &nbsp;
              <svg width="32px" version="1.1" id="Uploaded to svgrepo.com" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-3.2 -3.2 38.40 38.40" xmlSpace="preserve" fill="#ffffff" stroke="#ffffff" strokeWidth="0.8320000000000001"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M30.745,20.386L25,13l3.375-7.594C28.669,4.745,28.185,4,27.461,4H17.5l-0.361-2.164 C17.059,1.353,16.642,1,16.153,1H2.014L1.986,0.835c-0.09-0.544-0.604-0.914-1.15-0.822C0.347,0.095,0.02,0.521,0.019,1H0 l0.016,0.096C0.018,1.119,0.01,1.141,0.014,1.165l5,30C5.095,31.653,5.519,32,5.999,32c0.055,0,0.109-0.004,0.165-0.014 c0.545-0.091,0.913-0.606,0.822-1.151L5.014,19H14.5l0.361,2.164C14.941,21.647,15.358,22,15.847,22h14.108 C30.788,22,31.256,21.043,30.745,20.386z M15.306,3l2.342,14H4.694L2.361,3H15.306z M16.633,19.384L16.361,18h1.253L16.633,19.384z M17.436,20l1.391-1.983L16.827,6h9.095l-3.237,7.282L27.911,20C27.911,20,17.472,20.004,17.436,20z"></path> </g></svg></Link>
            <Link to="/leaderboard" className="action-button">
              <span>{tHome('buttons.leaderboard')}</span>
              &nbsp;
              <svg width="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M15 19H9V12.5V8.6C9 8.26863 9.26863 8 9.6 8H14.4C14.7314 8 15 8.26863 15 8.6V14.5V19Z" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M15 5H9" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M20.4 19H15V15.1C15 14.7686 15.2686 14.5 15.6 14.5H20.4C20.7314 14.5 21 14.7686 21 15.1V18.4C21 18.7314 20.7314 19 20.4 19Z" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path> <path d="M9 19V13.1C9 12.7686 8.73137 12.5 8.4 12.5H3.6C3.26863 12.5 3 12.7686 3 13.1V18.4C3 18.7314 3.26863 19 3.6 19H9Z" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
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
            <p style={{textAlign: "center", opacity: "0.5"}}>{tHome('stats.comingSoon')}</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  </>);
};

export default HomePage;
