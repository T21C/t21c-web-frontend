import { useEffect, useState, useCallback } from "react";
import "./homepage.css"
import { Footer } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import api from "@/utils/api";
import { Link } from 'react-router-dom';
import { useDifficultyContext } from "@/contexts/DifficultyContext";
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
import { ScrollButton } from "@/components/common/buttons";
import { PassIcon, ChartIcon, LeaderboardIcon } from "@/components/common/icons";
import { RouletteWheel, SlotMachine } from '@/components/common/selectors';
import { createEventSystem } from "@/utils/Utility";
import { useAuth } from "@/contexts/AuthContext";
// Import the logo
import logoFull from '@/assets/tuf-logo/logo-full.svg';
import toast from "react-hot-toast";

const minus2Reasons = [
    ':(',
    '🗣️',
    '8k pseudos',
    'all 3ball',
    'angle perfect/diff spike',
    'anti pp gimmick',
    'bad gimmick',
    'basic',
    'beep beep',
    'blackhole? / basic charting',
    'camera',
    'charter requested to be -2',
    'cool',
    'copyright',
    'diff spike',
    'different from original',
    'remade from the ground up',
    'different from original ',
    'fast straight part was changed into a slow straight with midspins',
    'different from original ',
    'fast triangles were removed for balancing',
    'different from original ',
    'minor parts of the chart were recharted',
    'difffspiek',
    'diffspikes',
    'eepy',
    'eugh',
    'ew',
    'Free roam',
    'gimmick abuse',
    'god',
    'hand play balance',
    'hidden twirls',
    'hold offsync',
    'holds',
    'incomplete',
    'inconsistent',
    'inconsistent, offsync, certain sections are similar to other MCCXVI charts',
    'invis speedchange',
    'kamisis is pending',
    'L keylimit',
    'lmao',
    'math free roam',
    'me when i have a concussion',
    'me when the alarm is peaceful and waking',
    'mischarted',
    'mmmmm',
    'mrbeast',
    'multitap abuse',
    'need ysmod',
    'no',
    'no dl no vid',
    'no lmao',
    'NO PERMS',
    'no song',
    'no speedup on existing charts',
    'no vid',
    'no vid L',
    'no vid no DL',
    'no ysmod',
    'not complete',
    'not consistant',
    'offset',
    'offsync',
    'old version',
    'osu! original with verification error',
    'overcharted',
    'p sure camellia does not give perm for this',
    'pauses broken in download',
    'permission',
    'pi',
    'poor recording (no audio)',
    'poor recording, doubt theres permission for background, level by sprout?',
    'poor recording, doubt you have permission for the background',
    'probably copyright lmao',
    'readability',
    'recording',
    'removing MP',
    'requested by charter',
    'requested to be -2',
    'same chart',
    'sans',
    'short',
    'similar chart',
    'THIS HAd POTIENTAL DAM NIT',
    'tuyu',
    'uh',
    'unbalanced',
    'unfinished',
    'unreadable',
    'unverified',
    'upgrade your windows, also stop putting those images as background',
    'vid dead',
    'what the hell did you do to make the channel terminated',
    'will be rated after official level is out',
    'wooaa',
    'would be nice if recreated, dl wont work',
    'wrong offset',
    'yummy',
    'zzzzz',
    'zzzzzzzzzzzzzzzzzzzzzzzz',
]

const gimmickReasons = [
  'Angle Perfect',
  'Beep Beep',
  'Camera',
  'Free Roam',
  'Hidden Twirls',
  'Hold Offsync',
  'Invis Speedchange',
  'Math Free Roam',
  'Multitap',
  'Offset',
  'Offsync',
  'Readability',
  'Unreadable',
  'YS Mod Required'
];

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


const WheelPopup = ({ items, seed, onSelect, onClose, handleTimeout }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDifficultyRoulette, setShowDifficultyRoulette] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { difficultyDict } = useDifficultyContext();
  const [showBaseScoreSlot, setShowBaseScoreSlot] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [baseScore, setBaseScore] = useState(null);
  const [isConfigComplete, setIsConfigComplete] = useState(false);
  const [pendingTimeout, setPendingTimeout] = useState(null);
  const [slots, setSlots] = useState(3);
  const [showMinus2Reason, setShowMinus2Reason] = useState(false);
  const [showGimmickReason, setShowGimmickReason] = useState(false);
  const [selectedMinus2Reason, setSelectedMinus2Reason] = useState(null);
  const [selectedGimmickReason, setSelectedGimmickReason] = useState(null);

  useEffect(() => {
    const modifiedSlots = createEventSystem({
      "3": 20,
      "4": 30,
      "5": 20,
      "6": 20,
      "7": 10
    });
    setSlots(parseInt(modifiedSlots() || 3));
  }, []);

  useEffect(() => {
    if (pendingTimeout) {
      handleTimeout(pendingTimeout);
      setPendingTimeout(null);
    }
  }, [pendingTimeout, handleTimeout]);

  useEffect(() => {
    const img = new Image();
    img.src = `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_WHEEL_IMAGE}/${seed}`;
    img.onload = () => setImageLoaded(true);
  }, [seed]);

  const calculateFinalRotation = (itemIndex) => {
    const itemCount = items.length;
    const anglePerItem = 360 / itemCount;
    return 1800 + (360 - (itemIndex * anglePerItem)-anglePerItem/2);
  };

  const spinWheel = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setSelectedItem(null);

    const selectedIndex = Math.floor(Math.random() * items.length);
    const finalRotation = calculateFinalRotation(selectedIndex);

    setRotation(finalRotation);

    window.setTimeout(() => {
      setIsSpinning(false);
      setSelectedItem(items[selectedIndex]);
      onSelect(items[selectedIndex]);
    }, 5000);
  };

  const handleDifficultySelect = async (difficulty) => {
    if (!selectedItem || isUpdating) return;
    
    setSelectedDifficulty(difficulty);
    setShowDifficultyRoulette(false);

    // Check if difficulty name is "-2"
    if (difficulty.name === "-2") {
      setShowMinus2Reason(true);
      return;
    }

    // Check if difficulty name is "Gimmick"
    if (difficulty.name === "Gimmick") {
      setShowGimmickReason(true);
      return;
    }

    // If difficulty has base score of 0, show the slot machine
    if (difficulty.baseScore === 0) {
      setShowBaseScoreSlot(true);
      return;
    }

    // Otherwise mark config as complete
    setIsConfigComplete(true);
  };

  const handleMinus2ReasonSelect = (reason) => {
    setShowMinus2Reason(false);
    setSelectedMinus2Reason(reason);
    setIsConfigComplete(true);
  };

  const handleGimmickReasonSelect = (reason) => {
    setShowGimmickReason(false);
    setSelectedGimmickReason(reason);
    setShowBaseScoreSlot(true);
  };

  const handleBaseScoreComplete = async (score) => {
    setShowBaseScoreSlot(false);
    setBaseScore(score);
    setIsConfigComplete(true);
  };

  const handleSubmitConfig = async () => {
    if (!selectedItem || !selectedDifficulty || isUpdating) return;
    
    setIsUpdating(true);
    try {
      const requestData = {
        diffId: selectedDifficulty.id,
        baseScore
      };

      // Add publicComment if minus2 reason is selected
      if (selectedMinus2Reason) {
        requestData.publicComments = selectedMinus2Reason;
      }
      // Add publicComment if gimmick reason is selected
      else if (selectedGimmickReason) {
        requestData.publicComments = selectedGimmickReason;
      }

      const response = await api.put(`${import.meta.env.VITE_LEVELS}/${selectedItem.id}/difficulty`, requestData);
      
      handleTimeout(response.data.timeout);
      
      setSelectedItem(prev => ({
        ...prev,
        diffId: selectedDifficulty.id
      }));

      toast.success('Level updated!');
      onClose();
    } catch (error) {
      console.error('Failed to update level:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!onClose) {
      setRotation(0);
      setSelectedItem(null);
    }
  }, [onClose]);

  return (
    <div className="level-wheel-popup">
      <div className="level-wheel-container">
        <button 
          className="level-close-button" 
          onClick={onClose}
          disabled={isSpinning}
          style={{ 
            opacity: isSpinning ? 0.5 : 1,
            cursor: isSpinning ? 'not-allowed' : 'pointer'
          }}
        >×</button>
        
        <div className="level-wheel-content">
          <div className="level-wheel-image-container" style={{paddingBottom: selectedItem ? "60%" : "80%"}}>
            {imageLoaded ? (
              <div 
                className="level-wheel-image"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 5s cubic-bezier(0.12, 0.67, 0.12, 1)' : 'none'
                }}
              >
                <img 
                  src={`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_WHEEL_IMAGE}/${seed}`}
                  alt="Roulette Wheel"
                />
              </div>
            ) : (
              <div className="level-wheel-loading">
                <div className="loader"></div>
                <span>Loading wheel...</span>
              </div>
            )}
            <div className="level-wheel-pointer"></div>
          </div>

          <div className="level-wheel-controls">
            <button 
              className={`level-spin-button`}
              onClick={spinWheel}
              disabled={isSpinning || !imageLoaded}
              style={{
                maxHeight: selectedItem ? '0' : '',
                padding: selectedItem ? '0' : ''
              }}
            >
              {isSpinning ? 'Spinning...' : 'Pick a level'}
            </button>
          </div>

          {selectedItem && (
            <div className="level-result-display">
              <div className="level-result-left">
                <div className="level-result-difficulty-icon" style={{boxShadow: `0 0 10px ${difficultyDict[selectedItem.diffId]?.color || '#666'}`}}>
                  <img src={difficultyDict[selectedItem.diffId]?.icon} alt={`ID: ${selectedItem.diffId}`} />
                </div>
                <div className="level-result-container">
                  <span className="level-result-name">{selectedItem.name}</span>
                  <span className="level-result-id">(ID: {selectedItem.id})</span>
                </div>
                
                {!isConfigComplete && (
                  <button 
                    className="level-difficulty-roulette-button"
                    onClick={() => setShowDifficultyRoulette(true)}
                  >
                    Roll difficulty
                  </button>
                )}
              </div>
              
              {isConfigComplete && (
                <div className="level-result-right">
                  <div className="level-config-preview">
                    <div className="config-details">
                      <div className="config-item">
                        <span className="config-label">Difficulty:</span>
                        <img className="config-difficulty-icon" src={selectedDifficulty.icon} alt={selectedDifficulty.name} />
                      </div>
                      {selectedMinus2Reason ? (
                        <div className="config-item">
                          <span className="config-label">Reason:</span>
                          <span className="config-value" style={{ color: '#e74c3c', fontSize: "14px" }}>{selectedMinus2Reason}</span>
                        </div>
                      ) : selectedGimmickReason ? (
                        <>
                          <div className="config-item">
                            <span className="config-label">Gimmick:</span>
                            <span className="config-value" style={{ color: '#f39c12', fontSize: "14px" }}>{selectedGimmickReason}</span>
                          </div>
                          <div className="config-item">
                            <span className="config-label">Base Score:</span>
                            <span className="config-value">{baseScore}</span>
                          </div>
                        </>
                      ) : baseScore !== null && (
                        <div className="config-item">
                          <span className="config-label">Base Score:</span>
                          <span className="config-value">{baseScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    className="level-submit-button"
                    onClick={handleSubmitConfig}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Update Level'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showDifficultyRoulette && (
        <RouletteWheel
          items={Object.values(difficultyDict)}
          onSelect={handleDifficultySelect}
          onClose={() => setShowDifficultyRoulette(false)}
          enableGimmicks={true}
        />
      )}

      {showBaseScoreSlot && (
        <SlotMachine
          onComplete={handleBaseScoreComplete}
          onClose={() => setShowBaseScoreSlot(false)}
          slots={slots}
        />
      )}

      {showMinus2Reason && (
        <RouletteWheel
          items={minus2Reasons}
          onSelect={handleMinus2ReasonSelect}
          onClose={() => setShowMinus2Reason(false)}
          mode="text"
          colors={['#e74c3c', '#c0392b']}
        />
      )}

      {showGimmickReason && (
        <RouletteWheel
          items={gimmickReasons}
          onSelect={handleGimmickReasonSelect}
          onClose={() => setShowGimmickReason(false)}
          mode="text"
          colors={['#f39c12', '#d35400']}
        />
      )}
    </div>
  );
};

const HomePage = () => {
  const { t } = useTranslation('pages');
  const tHome = (key, params = {}) => t(`home.${key}`, params);
  const [stats, setStats] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [boundingRect, setBoundingRect] = useState(null);
  const [graphMode, setGraphMode] = useState('passes');
  const [showWheel, setShowWheel] = useState(false);
  const [wheelData, setWheelData] = useState(null);
  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;
  const [timeout, setTimeoutState] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);

  const { user } = useAuth();
  const handleTimeout = (timeoutValue) => {
    if (timeoutValue > 0) {
      setTimeoutState(true);
      setRemainingTime(timeoutValue + 1);
    }
  };

  useEffect(() => {
    let interval;
    if (remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setTimeoutState(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [remainingTime]);

  useEffect(() => {
    preloadWheelData();
  }, [timeout]);

  const preloadWheelData = async () => {
    try {
      const [statsResponse, levelsResponse] = await Promise.all([
        api.get(import.meta.env.VITE_STATISTICS),
        api.get(`${import.meta.env.VITE_LEVELS}/all-levels`)
      ]);
      setStats(statsResponse.data);
      
      if (levelsResponse.data.timeout) {
        handleTimeout(levelsResponse.data.remainingTime);
        return;
      }
      
      setWheelData(levelsResponse.data);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const updateBoundingRect = useCallback(() => {
    const element = document.getElementById('main-title');
    if (element) {
      setBoundingRect(element.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    updateBoundingRect();
    window.addEventListener('scroll', updateBoundingRect);
    window.addEventListener('resize', updateBoundingRect);

    return () => {
      window.removeEventListener('scroll', updateBoundingRect);
      window.removeEventListener('resize', updateBoundingRect);
    };
  }, [updateBoundingRect]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (boundingRect) {
        const padding = 100;
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
    <div className="home">
      
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
            <button 
              className="action-button roulette-button"
              onClick={() => setShowWheel(true)}
              disabled={!wheelData || timeout || !user}
            >
              <span>
                {user ? "Random Level" : "Login Required"}
              </span>
              &nbsp;
              <div className="roulette-icon" 
              style={
                {
                  animation: !user || timeout ? `spin ${!user?16:8}s linear infinite reverse` : ""
                  }
                }>
                  🎲
                </div>
              {timeout && remainingTime > 0 && remainingTime < 60 ? (
                <span className="timeout-text">
                  {remainingTime} s
                </span>
              ) 
              : timeout && remainingTime >= 60 ? (
                <span className="timeout-text">
                  {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                </span>
              ) 
              : null}
            </button>
            <Link to="/levels" className="action-button">
              <span>{tHome('buttons.browseLevels')}</span>
              &nbsp;
              <ChartIcon size={32} />
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
            <p style={{textAlign: "center", opacity: "0.5"}}>{tHome('stats.comingSoon')}</p>
          </div>
        )}
      </div>
      
      <Footer />

      {showWheel && wheelData && (
        <WheelPopup
          key={`wheel-${showWheel}`}
          items={wheelData.items}
          seed={wheelData.seed}
          onSelect={() => {}}
          onClose={() => setShowWheel(false)}
          handleTimeout={handleTimeout}
        />
      )}
    </div>
  </>);
};

export default HomePage;
