import "./aboutuspage.css";
import { CompleteNav, Footer, UserAvatar } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback } from "react";
import api from "@/utils/api";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

const CURRENT_VERSION = 'v2.4';

const AboutUsPage = () => {
  const { t } = useTranslation('pages');
  const tAbout = (key, params = {}) => t(`about.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;
  const [raters, setRaters] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [boundingRect, setBoundingRect] = useState(null);

  useEffect(() => {
    const fetchRaters = async () => {
      try {
        const response = await api.get(import.meta.env.VITE_RATERS_API);
        // Sort raters with super admins first
        setRaters(response.data.sort((a, b) => {
          if (hasFlag(a, permissionFlags.SUPER_ADMIN) === hasFlag(b, permissionFlags.SUPER_ADMIN)) {
            return a.discordUsername?.localeCompare(b.discordUsername) || 0;
          }
          return hasFlag(b, permissionFlags.SUPER_ADMIN) - hasFlag(a, permissionFlags.SUPER_ADMIN);
        }));
      } catch (error) {
        console.error('Failed to fetch raters:', error);
      }
    };

    fetchRaters();
  }, []);

  const updateBoundingRect = useCallback(() => {
    const element = document.querySelector('.main-title');
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
        setMousePosition({ 
          x: e.clientX - boundingRect.left, 
          y: e.clientY - boundingRect.top 
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [boundingRect]);


  
  return (
    <>
      <MetaTags
        title={tAbout('meta.title')}
        description={tAbout('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
        <CompleteNav />
        <div className="background-level" />
        <div className="about-us">
        <div className="about-us-container">
          <div className="about-content">
            <section className="about-section">
              <h2>{tAbout('sections.whoWeAre.title')}</h2>
              <p>{tAbout('sections.whoWeAre.content')}</p>
            </section>

            <section className="about-section">
              <h2>{tAbout('sections.mission.title')}</h2>
              <p>{tAbout('sections.mission.intro')}</p>
              <ul>
                {tAbout('sections.mission.points', { returnObjects: true }).map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="about-section">
              <h2>{tAbout('sections.values.title')}</h2>
              <div className="values-grid">
                {Object.entries(tAbout('sections.values.cards', { returnObjects: true })).map(([key, value]) => (
                  <div key={key} className="value-card">
                    <h3>{value.title}</h3>
                    <p>{value.content}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="about-section">
              <h2>{tAbout('sections.join.title')}</h2>
              <div className="community-links">
                <a href="https://discord.gg/adofai" target="_blank" rel="noopener noreferrer" className="community-link discord">
                  <svg height="24px" viewBox="0 -28.5 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid" fill="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="#ffffff" fillRule="nonzero"> </path> </g> </g></svg>
                  {tAbout('sections.join.links.discord')}
                </a>
                <a href="https://github.com/T21C" target="_blank" rel="noopener noreferrer" className="community-link github">
                  <svg height="24px" viewBox="0 -3.5 256 256" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" fill="#ffffff">
                    <g>
                      <path d="M127.505 0C57.095 0 0 57.085 0 127.505c0 56.336 36.534 104.13 87.196 120.99 6.372 1.18 8.712-2.766 8.712-6.134 0-3.04-.119-13.085-.173-23.739-35.473 7.713-42.958-15.044-42.958-15.044-5.8-14.738-14.157-18.656-14.157-18.656-11.568-7.914.872-7.752.872-7.752 12.804.9 19.546 13.14 19.546 13.14 11.372 19.493 29.828 13.857 37.104 10.6 1.144-8.242 4.449-13.866 8.095-17.05-28.32-3.225-58.092-14.158-58.092-63.014 0-13.92 4.981-25.295 13.138-34.224-1.324-3.212-5.688-16.18 1.235-33.743 0 0 10.707-3.427 35.073 13.07 10.17-2.826 21.078-4.242 31.914-4.29 10.836.048 21.752 1.464 31.942 4.29 24.337-16.497 35.029-13.07 35.029-13.07 6.94 17.563 2.574 30.531 1.25 33.743 8.175 8.929 13.122 20.303 13.122 34.224 0 48.972-29.828 59.756-58.22 62.912 4.573 3.957 8.648 11.717 8.648 23.612 0 17.06-.148 30.791-.148 34.991 0 3.393 2.295 7.369 8.759 6.117 50.634-16.879 87.122-64.656 87.122-120.973C255.009 57.085 197.922 0 127.505 0"></path>
                    </g>
                  </svg>
                  {tAbout('sections.join.links.github')}
                </a>
              </div>
            </section>
            <section className="credits-section">
              <div className="section-content">
                <h2>{tAbout('sections.credits.title')}</h2>
                <div className="version-info" style={{
                  '--mouse-x': `${mousePosition.x}px`,
                  '--mouse-y': `${mousePosition.y}px`
                }}>
                  <div className="main-title">
                    <span className="title-mask">{tAbout('sections.credits.version', { version: CURRENT_VERSION })}</span>
                    <span className="title-glow">{tAbout('sections.credits.version', { version: CURRENT_VERSION })}</span>
                  </div>
                </div>
                <div className="credits-grid">
                  <div className="credit-category">
                    <h3>{tAbout('sections.credits.categories.rating.title')}</h3>
                    <div className="credit-list">
                      {raters.map((rater) => (
                        <div key={rater.discordId} className="credit-item">
                          <UserAvatar 
                            primaryUrl={rater.avatarUrl}
                            fallbackUrl={rater.player.pfp}
                            className="rater-avatar"
                          />
                          <div className="rater-info">
                            <span className="credit-name">
                              <span className="at">@</span>
                              {rater.username}
                              {hasFlag(rater, permissionFlags.SUPER_ADMIN) ? ' ⭐' : ''}
                            </span>
                            <span className="credit-role">
                              {tAbout('sections.credits.categories.rating.roles.' + (hasFlag(rater, permissionFlags.SUPER_ADMIN) ? 'manager' : 'rater'))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default AboutUsPage; 