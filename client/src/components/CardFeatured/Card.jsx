import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getYouTubeThumbnailUrl } from "../../Repository/RemoteRepository";
import "./card.css"
// eslint-disable-next-line react/prop-types
const Card = ({ id,  creator, song, artist, image: vidLink }) => {
  const cardRef = useRef(null);
  const imageContainerRef = useRef(null);

  let navigate = useNavigate();

  const redirect = () => {
    navigate(`/leveldetail?id=${id}`);
  };

  useEffect(() => {
    const card = cardRef.current;
    const imageContainer = imageContainerRef.current;


    const handleMouseMove = (e) => {
      if (!card) return;

      const { clientX, clientY } = e;
      const { left, top, width, height } = card.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const posX = clientX - centerX;
      const posY = clientY - centerY;
      const rotateX = (posY / height) * 30;
      const rotateY = (posX / width) * -30;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

      const scaleAmount = 1.08;
      imageContainer.style.transform = `scale(${scaleAmount}) translateZ(50px)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = "rotateX(0) rotateY(0)";
      imageContainer.style.transform = "scale(1) translateZ(0px)";
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);


  return (
    <div
      className="perspective-container"
      style={{
        perspective: "1500px",
        maxWidth: "600px",
        margin: "auto",
      }}
    >
      <div
        ref={cardRef}
        className="card-tilt"
        style={{
          transition: "transform 0.2s all cubic-bezier(.25,.36,.81,.72)",
        }}
      >
        <h1>{creator}</h1>
        <p className="song-name">
          {song}
          <br />
          <span className="artist-name">by {artist}</span>
        </p>
        <div
          ref={imageContainerRef}
          className="img-container"
          style={{
            width: "100%",
            transition: "transform 0.2s ease",
            transformStyle: "preserve-3d",
          }}
        >
          <img
            src={`${getYouTubeThumbnailUrl(vidLink, creator)}`}
            alt="Song Thumbnail"
            style={{ width: "100%" }}
          />
        </div>
        <button
          onClick={()=>redirect()}
        >
          Check It Out !
        </button>
      </div>
    </div>
  );
};

export default Card;
