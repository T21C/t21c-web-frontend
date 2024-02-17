// eslint-disable-next-line no-unused-vars
import React, { useRef, useEffect } from "react";

// eslint-disable-next-line react/prop-types
const Card = ({ creator, song, artist, image }) => {
    const cardRef = useRef(null);
    const imageContainerRef = useRef(null);
    function getYouTubeThumbnailUrl(url) {
      // Regular expressions to match both short and long YouTube URLs
      const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
      const longUrlRegex = /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/;
    
      // Try to match the input URL with the regular expressions
      const shortMatch = url.match(shortUrlRegex);
      const longMatch = url.match(longUrlRegex);
    
      // Extract video ID from the matched regex groups
      const videoId = shortMatch ? shortMatch[1] : (longMatch ? longMatch[1] : null);
    
      if (videoId) {
        // Construct the thumbnail URL
        return `https://img.youtube.com/vi/${videoId}/default.jpg`;
      } else {
        // If no match is found, return null or handle it accordingly
        return null;
      }
    }
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
                padding: "20px",
            }}
        >
            <div
                ref={cardRef}
                className="card-tilt"
                style={{
                    transition: "transform 0.2s all cubic-bezier(.25,.36,.81,.72)",
                    transformStyle: "preserve-3d",
                    width: "100%",
                    borderRadius: "20px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
                }}
            >
                <h1>{creator}</h1>
                <p className="song-name">
                    {song}
                    <br />
                    <span className="artist-name">- by {artist}</span>
                </p>
                <div ref={imageContainerRef} className="img-container" style={{ width: "100%", transition: "transform 0.2s ease", transformStyle: "preserve-3d" }}>
                    <img src={`${getYouTubeThumbnailUrl(image)}`} alt="Song Thumbnail" style={{ width: "100%" }} />
                </div>
                <button>Check It Out !</button>
            </div>
        </div>
    );
};

export default Card;
