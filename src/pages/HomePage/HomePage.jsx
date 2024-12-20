import { useEffect, useState, useCallback } from "react";
import "./homepage.css"
import { CompleteNav } from "../../components";
import api from "../../utils/api";
import { Link } from 'react-router-dom';
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
  const chartData = data.map(diff => ({
    name: diff.name,
    value: mode === 'passes' ? diff.passCount : diff.levelCount,
    passCount: diff.passCount,
    levelCount: diff.levelCount,
    fill: diff.color ? `${diff.color}` : '#ff2ad1',
    originalColor: diff.color || '#ff2ad1',
    icon: diff.icon
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
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
        />
        <YAxis 
          stroke="#ffffff" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip 
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          offset={10}
          wrapperStyle={{ 
            outline: 'none',
            zIndex: 100
          }}
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
          isAnimationActive={true}
          animationBegin={0}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

const Footer = () => (
  <footer className="home-footer">
    <div className="footer-content">
      <div className="footer-logo">
        <img src="/src/assets/tuf-logo/logo.png" alt="TUF" />
      </div>
      <div className="footer-section">
        <h4>TUF</h4>
        <p>The Universal Forums is a community-driven organization focused on collecting and rating difficulties on custom levels of the game ADOFAI.</p>
      </div>
      <div className="footer-section links">
        <h4>Quick Links</h4>
        <Link to="/levels">Browse Levels</Link>
        <Link to="/upload">Browse Passes</Link>
        <Link to="/leaderboard">Leaderboard</Link>
      </div>
      <div className="footer-section">
        <h4>Community</h4>
        <a className="footer-link" href="https://discord.gg/adofai" target="_blank" rel="noopener noreferrer"> 
        <svg height="24px"viewBox="0 -28.5 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="#ffffff" fill-rule="nonzero"> </path> </g> </g></svg>
        Discord
        </a>
        <a className="footer-link" href="https://github.com/T21C" target="_blank" rel="noopener noreferrer">
        <svg height="24px" viewBox="0 -3.5 256 256" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g fill="#ffffff"> <path d="M127.505 0C57.095 0 0 57.085 0 127.505c0 56.336 36.534 104.13 87.196 120.99 6.372 1.18 8.712-2.766 8.712-6.134 0-3.04-.119-13.085-.173-23.739-35.473 7.713-42.958-15.044-42.958-15.044-5.8-14.738-14.157-18.656-14.157-18.656-11.568-7.914.872-7.752.872-7.752 12.804.9 19.546 13.14 19.546 13.14 11.372 19.493 29.828 13.857 37.104 10.6 1.144-8.242 4.449-13.866 8.095-17.05-28.32-3.225-58.092-14.158-58.092-63.014 0-13.92 4.981-25.295 13.138-34.224-1.324-3.212-5.688-16.18 1.235-33.743 0 0 10.707-3.427 35.073 13.07 10.17-2.826 21.078-4.242 31.914-4.29 10.836.048 21.752 1.464 31.942 4.29 24.337-16.497 35.029-13.07 35.029-13.07 6.94 17.563 2.574 30.531 1.25 33.743 8.175 8.929 13.122 20.303 13.122 34.224 0 48.972-29.828 59.756-58.22 62.912 4.573 3.957 8.648 11.717 8.648 23.612 0 17.06-.148 30.791-.148 34.991 0 3.393 2.295 7.369 8.759 6.117 50.634-16.879 87.122-64.656 87.122-120.973C255.009 57.085 197.922 0 127.505 0"></path> <path d="M47.755 181.634c-.28.633-1.278.823-2.185.389-.925-.416-1.445-1.28-1.145-1.916.275-.652 1.273-.834 2.196-.396.927.415 1.455 1.287 1.134 1.923M54.027 187.23c-.608.564-1.797.302-2.604-.589-.834-.889-.99-2.077-.373-2.65.627-.563 1.78-.3 2.616.59.834.899.996 2.08.36 2.65M58.33 194.39c-.782.543-2.06.034-2.849-1.1-.781-1.133-.781-2.493.017-3.038.792-.545 2.05-.055 2.85 1.07.78 1.153.78 2.513-.019 3.069M65.606 202.683c-.699.77-2.187.564-3.277-.488-1.114-1.028-1.425-2.487-.724-3.258.707-.772 2.204-.555 3.302.488 1.107 1.026 1.445 2.496.7 3.258M75.01 205.483c-.307.998-1.741 1.452-3.185 1.028-1.442-.437-2.386-1.607-2.095-2.616.3-1.005 1.74-1.478 3.195-1.024 1.44.435 2.386 1.596 2.086 2.612M85.714 206.67c.036 1.052-1.189 1.924-2.705 1.943-1.525.033-2.758-.818-2.774-1.852 0-1.062 1.197-1.926 2.721-1.951 1.516-.03 2.758.815 2.758 1.86M96.228 206.267c.182 1.026-.872 2.08-2.377 2.36-1.48.27-2.85-.363-3.039-1.38-.184-1.052.89-2.105 2.367-2.378 1.508-.262 2.857.355 3.049 1.398"></path> </g> </g></svg>
        GitHub
        </a>
      </div>
    </div>
    <div className="footer-bottom">
      <p>© {new Date().getFullYear()} TUF. Not affiliated with 7th Beat Games.</p>
      <p>Made with ❤️ by V0W4N</p>
    </div>
  </footer>
);

const HomePage = () => {
  const [stats, setStats] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [boundingRect, setBoundingRect] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [graphMode, setGraphMode] = useState('passes'); // 'passes' or 'levels'

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get(import.meta.env.VITE_STATS_API_URL);
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

  // Update to track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (boundingRect) {
        setMousePosition({ 
          x: e.clientX - boundingRect.left, 
          y: e.clientY - boundingRect.top 
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [boundingRect]);

  return (<>
    <div className="background-level"></div>
    <div className="home">
      <CompleteNav />
      <div className="home-container">
        <div className="content-container">
          <div className="title-section">
            <div className="logo-container">
              <img src="/src/assets/tuf-logo/logo-full.png" alt="TUForums" className="logo" />
            </div>
            <h1 
              className={`main-title ${isVisible ? 'visible' : ''}`}
              id="main-title"
              style={{
                '--mouse-x': `${mousePosition.x}px`,
                '--mouse-y': `${mousePosition.y}px`
              }}
            >
              <span className="title-mask">Revamped</span>
              <span className="title-glow">Revamped</span>
            </h1>
          </div>

          <div className="action-buttons">
            <Link to="/levels" className="action-button">
              <span>Browse Levels</span>
              &nbsp;
              <img width="32px" src="/src/assets/icons/chart.png" alt="arrow-right" className="arrow-right" />
            </Link>
            <Link to="/upload" className="action-button">
              <span>Browse Passes</span>
              &nbsp;
              <svg width="32px" version="1.1" id="Uploaded to svgrepo.com" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-3.2 -3.2 38.40 38.40" xml:space="preserve" fill="#ffffff" stroke="#ffffff" stroke-width="0.8320000000000001"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path class="blueprint_een" d="M30.745,20.386L25,13l3.375-7.594C28.669,4.745,28.185,4,27.461,4H17.5l-0.361-2.164 C17.059,1.353,16.642,1,16.153,1H2.014L1.986,0.835c-0.09-0.544-0.604-0.914-1.15-0.822C0.347,0.095,0.02,0.521,0.019,1H0 l0.016,0.096C0.018,1.119,0.01,1.141,0.014,1.165l5,30C5.095,31.653,5.519,32,5.999,32c0.055,0,0.109-0.004,0.165-0.014 c0.545-0.091,0.913-0.606,0.822-1.151L5.014,19H14.5l0.361,2.164C14.941,21.647,15.358,22,15.847,22h14.108 C30.788,22,31.256,21.043,30.745,20.386z M15.306,3l2.342,14H4.694L2.361,3H15.306z M16.633,19.384L16.361,18h1.253L16.633,19.384z M17.436,20l1.391-1.983L16.827,6h9.095l-3.237,7.282L27.911,20C27.911,20,17.472,20.004,17.436,20z"></path> </g></svg></Link>
            <Link to="/leaderboard" className="action-button">
              <span>Leaderboard</span>
              &nbsp;
              <svg width="32px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M15 19H9V12.5V8.6C9 8.26863 9.26863 8 9.6 8H14.4C14.7314 8 15 8.26863 15 8.6V14.5V19Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M15 5H9" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M20.4 19H15V15.1C15 14.7686 15.2686 14.5 15.6 14.5H20.4C20.7314 14.5 21 14.7686 21 15.1V18.4C21 18.7314 20.7314 19 20.4 19Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M9 19V13.1C9 12.7686 8.73137 12.5 8.4 12.5H3.6C3.26863 12.5 3 12.7686 3 13.1V18.4C3 18.7314 3.26863 19 3.6 19H9Z" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
            </Link>
          </div>
        </div>

        {stats == null ? 
        (<div className="loader loader-level-page" style={{marginBottom: "400px"}}/>)
        :(
          <div className="stats-container">
            <section className="stats-section overview">
              <h2>Overview</h2>
              <div className="stats-grid">
                <StatCard value={stats.overview.totalLevels} label="Total Levels" />
                <StatCard value={stats.overview.totalPasses} label="Total Passes" />
                <StatCard value={stats.overview.totalPlayers} label="Total Players" />
                <StatCard value={stats.overview.passesLast30Days} label="Passes (30 Days)" />
              </div>
            </section>

            <section className="stats-section difficulties">
              <h2>Difficulty Statistics</h2>
              <div className="graph-controls">
                <button 
                  className={`graph-mode ${graphMode === 'passes' ? 'active' : ''}`}
                  onClick={() => setGraphMode('passes')}
                >
                  Passes
                </button>
                <button 
                  className={`graph-mode ${graphMode === 'levels' ? 'active' : ''}`}
                  onClick={() => setGraphMode('levels')}
                >
                  Levels
                </button>
              </div>
              {Object.entries(stats.difficulties.byType).slice(0, 1).map(([type, difficulties]) => (
                <div key={type} className="difficulty-type-section">
                  <h3>{type}</h3>
                  <DifficultyGraph data={difficulties} mode={graphMode} />
                </div>
              ))}
            </section>
            <p style={{textAlign: "center", opacity: "0.5"}}>More fun stuff coming soon...</p>
          </div>
        )
        
        }
      </div>
      <Footer />
    </div>
  </>);
};

export default HomePage;
