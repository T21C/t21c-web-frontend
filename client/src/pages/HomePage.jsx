/* eslint-disable react/no-unescaped-entities */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useContext, useEffect, useState } from "react";
import { Card, Footer, Navigation, CompleteNav } from "../components";
import { Link, NavLink } from "react-router-dom";
import { UserContext } from "../context/UserContext";

const HomePage = () => {
  const [recent, setRecent] = useState([]);
  const { levelData, setLevelData } = useContext(UserContext);

  useEffect(() => {
    const canvas = document.querySelector(".homeCanvas");
    const home = document.querySelector(".home");
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const c = canvas.getContext("2d");

    let mouse = {
      x: null,
      y: null,
    };

    const maxRadius = 30;
    const minRadius = 2;
    const colorArray = ["#ffffff", "#e5c7ff"];

    const updateMousePosition = (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("resize", resizeCanvas);

    class Star {
      constructor(x, y, dx, dy, radius, numberOfPoints) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.radius = radius;
        this.minRadius = radius;
        this.color = colorArray[Math.floor(Math.random() * colorArray.length)];
        this.numberOfPoints = numberOfPoints;
      }

      draw() {
        c.beginPath();
        for (let i = 0; i < this.numberOfPoints * 2; i++) {
          const angle = (Math.PI / this.numberOfPoints) * i;
          const radius = i % 2 === 0 ? this.radius : this.radius / 2; // Alternate between outer and inner radius
          const x = this.x + radius * Math.cos(angle);
          const y = this.y + radius * Math.sin(angle);

          if (i === 0) {
            c.moveTo(x, y);
          } else {
            c.lineTo(x, y);
          }
        }
        c.closePath();
        c.fillStyle = this.color;
        c.fill();
      }

      update() {
        if (this.x + this.radius > innerWidth || this.x - this.radius < 0) {
          this.dx = -this.dx;
        }

        if (this.y + this.radius > innerHeight || this.y - this.radius < 0) {
          this.dy = -this.dy;
        }

        this.x += this.dx;
        this.y += this.dy;

        // Interactivity
        if (
          mouse.x - this.x < 80 &&
          mouse.x - this.x > -80 &&
          mouse.y - this.y < 80 &&
          mouse.y - this.y > -80
        ) {
          if (this.radius < maxRadius) {
            this.radius += 1;
          }
        } else if (this.radius > this.minRadius) {
          this.radius -= 1;
        }

        this.draw();
      }
      1;
    }
    class Circle {
      constructor(x, y, dx, dy, radius, color) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.radius = radius;
        this.minRadius = radius;
        this.color = color;
      }

      draw() {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        c.fillStyle = this.color;
        c.fill();
      }
    }
    class RevolvingCircles {
      constructor(x, y, radius, speed) {
        this.x = x;
        this.y = y;
        this.circle1 = new Circle(x, y, 0, 0, radius, "red");
        this.circle2 = new Circle(x, y, 0, 0, radius, "blue");
        this.speed = speed;
        this.trailLength = 20; // Number of points to keep for the trail
        this.trailPointDistance = 5; // Distance between trail points
        this.circle1Trail = []; // Array to store previous positions for circle1 trail
        this.circle2Trail = []; // Array to store previous positions for circle2 trail
      }

      update() {
        // Update the angles for both circles to make them revolve around each other
        const angle1 = (performance.now() * this.speed) / 1000;
        const angle2 = angle1 + Math.PI; // Offset the second circle's angle

        // Update positions for both circles
        let gap = 48;
        this.circle1.x = this.x / 2 + Math.cos(angle1) * gap;
        this.circle2.x = this.x / 2 + Math.cos(angle2) * gap;
        this.circle1.y = this.y / 2 + Math.sin(angle1) * gap;
        this.circle2.y = this.y / 2 + Math.sin(angle2) * gap;

        // Store the previous positions in the trail arrays
        this.circle1Trail.push({ x: this.circle1.x, y: this.circle1.y });
        this.circle2Trail.push({ x: this.circle2.x, y: this.circle2.y });

        // Limit the trail length
        if (this.circle1Trail.length > this.trailLength) {
          this.circle1Trail.shift(); // Remove the oldest trail point
        }
        if (this.circle2Trail.length > this.trailLength) {
          this.circle2Trail.shift(); // Remove the oldest trail point
        }

        // Draw the circles
        this.drawCirclesWithTrail();
      }

      drawCirclesWithTrail() {
        // Draw circles
        this.circle1.draw();
        this.circle2.draw();

        // Draw trails
        this.drawTrail(this.circle1Trail, "red");
        this.drawTrail(this.circle2Trail, "blue");
      }

      drawTrail(trail, color) {
        for (let i = 0; i < trail.length; i++) {
          const alpha = i / (trail.length - 1); // Calculate alpha based on the position in the trail
          const radius = this.circle1.radius * alpha; // Adjust the radius based on alpha

          const fillColor = color;

          c.beginPath();
          c.fillStyle = fillColor;
          c.globalAlpha = alpha; // Apply alpha separately
          c.arc(trail[i].x, trail[i].y, radius, 0, Math.PI * 2, false);
          c.fill();
        }
      }
    }

    const fireandice = new RevolvingCircles(
      innerWidth / 2,
      innerHeight / 2,
      16,
      4
    );

    let starArray = [];
    function init() {
      starArray = [];
      for (let i = 0; i < 50; i++) {
        const radius = Math.random() * 5 + 1;
        const x = Math.random() * (innerWidth - radius * 2) + radius;
        const y = Math.random() * (innerHeight - radius * 2) + radius;
        const dx = Math.random() - 0.5;
        const dy = Math.random() - 0.5;

        starArray.push(new Star(x, y, dx, dy, radius, 4));
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      c.clearRect(0, 0, innerWidth, innerHeight);

      for (let i = 0; i < starArray.length; i++) {
        starArray[i].update();
      }
      fireandice.update();
    }

    init();
    animate();

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (levelData.length > 0) {
        setRecent(levelData.slice(-3));
      } else {
        try {
          const res = await fetch("https://be.t21c.kro.kr/levels");
          if (!res.ok) {
            // Handle non-200 responses
            throw new Error(`API call failed with status code: ${res.status}`);
          }
          const data = await res.json();
          if (!data.results || !Array.isArray(data.results)) {
            // Handle unexpected data structure
            throw new Error("Unexpected API response structure");
          }

          // Safely get the last three items, even if there are fewer than three

          const lastRow = data.results.slice(-3);

          console.log(data);
          console.log(lastRow);

          setRecent(lastRow);
          setLevelData(data.results);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    fetchData();
  }, [levelData, setLevelData]);

  const scrollToRecent = () => {
    const recent = document.querySelector("#recent");
    recent.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="home">
        <CompleteNav />

        <canvas className="homeCanvas" />

        <div className="hero-text">
          <h1>
            {" "}
            <span>21</span> Forums
          </h1>
          <p>
            *To be informed that we're not affiliated nor approved by the 7th
            Beat Game (The creator of ADOFAI)
          </p>

          <button onClick={scrollToRecent}>Explore ! </button>
        </div>

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

      {/* <button onClick={() => console.log(levelData)}>test</button> */}

      <div className="spacer spacer-two"></div>
      <Footer />
    </>
  );
};

export default HomePage;
