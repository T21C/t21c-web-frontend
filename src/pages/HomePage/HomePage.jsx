import "./homepage.css"
import { useContext, useEffect, useRef, useState } from "react";
import { Card, Footer, CompleteNav, LevelCard } from "../../components";
import logo from "../../assets/tuf-logo/logo-full.png";
import { useNavigate } from "react-router-dom";
import { LevelContext } from "../../context/LevelContext";
import { useTranslation } from "react-i18next";
// import wavesOne from "../../assets/important/dark/wavesOne.svg"
// import wavesTwo from "../../assets/important/dark/wavesTwo.svg"


const ids = [512, 564, 191]

const HomePage = () => {
  const {t} = useTranslation()
  const [recent, setRecent] = useState({});
  const heroRef = useRef(null);

  const {
    setLevelsData,
    query,
    setQuery,
    setSort,
    setPageNumber,
  } = useContext(LevelContext);

  //reset all when query from home page
  function resetAll() {
    setPageNumber(0);
    setSort("RECENT_DESC");
    setLevelsData([]);
  }

  //fetch res


  //query submit and bavigate
  const navigate = useNavigate(); 

  const handleSubmit = (e) => {
    e.preventDefault(); 
    resetAll()
    navigate(`/levels`); 
  };

  // const scrollToRecent = () => {
  //   const recent = document.querySelector("#recent");
  //   recent.scrollIntoView({ behavior: "smooth" });
  // };

  return (
    <>
    <div>
      <CompleteNav />
      <div className="home" ref={heroRef}>
        <div className="background-level"></div>

        <div className="hero  wrapper-top wrapper-body"  >
          <img className="img-hero" src={logo} alt="" />
          


          <div className="many-recent">
          <form onSubmit={handleSubmit} className="input-form"> 
            <input
              type="text"
              placeholder={t('homePage.inputPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button>{t('homePage.seeMore')}</button>
          </form>
            <div className="list">
              {recent && recent.recentRated && recent.recentRated.length > 0 ? (
                recent.recentRated.map((l, index) => (
                  <LevelCard
                  style={{
                    height: "2rem"
                  }}
                    key={index}
                    level={l}
                  /> 
              ))):(
                <div className="loader"></div>
              )}
            </div>


          </div>
        </div>

        <div className="spacer spacer-one"></div>
      </div>

      <div className="recent-rated" id="recent">
        <h1 className="title-recent">{t('homePage.featuredText')}</h1>
        <div className="card-holder">
          {recent && recent.recentFeatured && recent.recentFeatured.length > 0 ? (
            recent.recentFeatured.map((element, index) => (
              <Card
                key={index}
                id = {element.id}
                creator={element.creator}
                song={element.song}
                artist={element.artist}
                image={element.videoLink}
              />
            ))
          ) : (
            <div className="loader"></div>
          )}

        </div>
      </div>

      <div className="spacer spacer-two"></div>
      <Footer />
    </div>
    </>
  );
};

export default HomePage;
