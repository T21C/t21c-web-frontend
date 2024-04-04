import { useContext, useEffect, useState } from "react";
import { Card, Footer, CompleteNav } from "../components";
import { UserContext } from "../context/LevelContext";
import { fetchRecent } from "../Repository/RemoteRepository";
import SplineHeader from "../components/SplineHeader";

const HomePage = () => {
  const [recent, setRecent] = useState([]);
  const { levelData, setLevelData } = useContext(UserContext);

  useEffect(() => {
    fetchRecent().then((res)=> setRecent(res))
  }, [levelData, setLevelData]);

  // const scrollToRecent = () => {
  //   const recent = document.querySelector("#recent");
  //   recent.scrollIntoView({ behavior: "smooth" });
  // };

  return (
    <>
      <div className="home">
        <CompleteNav />

        <SplineHeader/>

        <div className="spacer spacer-one"></div>
      </div>

      <div className="recent-rated" id="recent">
        <h1 className="title-recent">Recently Rated</h1>
        <div className="card-holder">
          {/*Card creator, song, artist, image(vidLink) */}
          {recent && recent.length > 0 ? (
            recent.map((element, index) => (
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
