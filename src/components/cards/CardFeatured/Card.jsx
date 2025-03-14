import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getVideoDetails } from "@/Repository/RemoteRepository";
import "./card.css"
import { useTranslation } from "react-i18next";
// eslint-disable-next-line react/prop-types
const Card = ({ id,  creator, song, artist, image: videoLink }) => {
  const {t} = useTranslation()
  const cardRef = useRef(null);
  const imageContainerRef = useRef(null);
  const [videoDetail, setVideoDetail] = useState(null)
  

  useEffect(() => {
    getVideoDetails(videoLink).then((res) => {
      setVideoDetail(
        res
          ? res
          : null
      );
    });


  }, [videoLink]);

  let navigate = useNavigate();

  const redirect = () => {
    navigate(`/levels/${id}`);
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
        <h1>{song}</h1>
        <p className="song-name">
          {artist}
          <br />
          <br />
          <span className="artist-name">{t("cardFeaturedComponent.by", {creator : creator})}</span>
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
          {videoDetail ? (
        <img
          src={videoDetail.image}
          alt="Song Thumbnail"
          style={{ width: "100%" }}
        />
      ) : (
        <p>Loading thumbnail...</p> // Show loading state while fetching
      )}
        </div>
        <button
          onClick={()=>redirect()}
        >
          {t("cardFeaturedComponent.button")}
        </button>
      </div>
    </div>
  );
};

export default Card;
