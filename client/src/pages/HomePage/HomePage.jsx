import "./homepage.css"
import { useContext, useEffect, useRef, useState } from "react";
import { Card, Footer, CompleteNav, LevelCardRev } from "../../components";
import { fetchRecent } from "../../Repository/RemoteRepository";
import logo from "../../assets/logo-full.png";
import { useNavigate } from "react-router-dom";
import { LevelContext } from "../../context/LevelContext";
const ids = [1, 2, 3]

const HomePage = () => {
  const [recent, setRecent] = useState({});
  const heroRef = useRef(null);

  const {
    setLevelsData,
    query,
    setQuery,
    setSort,
    setPageNumber,
  } = useContext(LevelContext);

  function resetAll() {
    setPageNumber(0);
    setSort("RECENT_DESC");
    setLevelsData([]);
  }

  useEffect(()=>{
    fetchRecent(ids).then(res => {
      setRecent(res)
      console.log(res)
    });
  }, [])

  const navigate = useNavigate(); 

  const handleSubmit = (e) => {
    e.preventDefault(); 
    resetAll()
    navigate(`/levels`); 
  };

  useEffect(() => {

    const updateCursorPosition = (e) => {
      if (heroRef.current) {
        const { left, top } = heroRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        if (x >= 0 && y >= 0 && x <= heroRef.current.offsetWidth && y <= heroRef.current.offsetHeight) {
          const blob = heroRef.current.querySelector('.blob');
          if (blob) {
            blob.style.left = `${x}px`;
            blob.style.top = `${y}px`;
          }
        }
      }
    };

    document.addEventListener('mousemove', updateCursorPosition);

    return () => {
      document.removeEventListener('mousemove', updateCursorPosition);
    };
  }, []);

  // const scrollToRecent = () => {
  //   const recent = document.querySelector("#recent");
  //   recent.scrollIntoView({ behavior: "smooth" });
  // };

  return (
    <>
      <CompleteNav />
      <div className="home" ref={heroRef}>

        <div className="blob"></div>
        <div className="blur"></div>
        <div className="hero  wrapper-top wrapper-body"  >
          <img className="img-hero" src={logo} alt="" />
          


          <div className="many-recent">
          <form onSubmit={handleSubmit}> 
            <input
              type="text"
              placeholder="Search artist, song, creator, #id"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
            <div className="list">
              {recent && recent.recentRated && recent.recentRated.length > 0 ? (
                recent.recentRated.map((l, index) => (
                  <LevelCardRev
                  style={{
                    height: "2rem"
                  }}
                    key={index}
                    creator={l.creator}
                    pdnDiff={l.pdnDiff}
                    pguDiff={l.pguDiff}                    
                    id={l.id}
                    artist={l.artist}
                    song={l.song}
                    dl={l.dl}
                    ws={l.ws}
                    team={l.team}
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
        <h1 className="title-recent">Featured Levels</h1>
        <div className="card-holder">
          {recent && recent.recentFeatured && recent.recentFeatured.length > 0 ? (
            recent.recentFeatured.map((element, index) => (
              <Card
                key={index}
                id = {element.id}
                creator={element.creator}
                song={element.song}
                artist={element.artist}
                image={element.vidLink}
              />
            ))
          ) : (
            <div className="loader"></div>
          )}

        </div>
      </div>

      <div className="spacer spacer-two"></div>
      <Footer />
    </>
  );
};

export default HomePage;
