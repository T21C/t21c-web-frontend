import { useEffect, useRef, useState } from "react";
import { Card, Footer, CompleteNav } from "../components";
import { fetchRecent } from "../Repository/RemoteRepository";
import logo from "../assets/logo-full.png";
const ids = [1, 2, 3]

const HomePage = () => {
  const [recent, setRecent] = useState({});
  const heroRef = useRef(null);

  useEffect(() => {
    fetchRecent(ids).then(res => {
      console.log(res);
      setRecent(res.recent); // Adjust based on actual response structure
    });

    // Function to update cursor position relative to the "hero" section
    const updateCursorPosition = (e) => {
      if (heroRef.current) {
        const { left, top } = heroRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        // Update the blob's position state only if the cursor is within the "hero" section
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

    // Clean up
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
          <img src={logo} alt="" />
          


          <div className="many-recent">
            <input type="text" placeholder="Search artist, song, creator, #id"/>

            <div className="list">

            </div>


          </div>
        </div>

        <div className="spacer spacer-one"></div>
      </div>

      <div className="recent-rated" id="recent">
        <h1 className="title-recent">Featured Rated</h1>
        <div className="card-holder">
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
