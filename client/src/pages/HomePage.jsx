/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import React, { useEffect, useState } from "react";
import { Card, Footer, Navigation } from "../components";
import { Link, NavLink } from "react-router-dom";

const HomePage = () => {
    const [recent, setRecent] = useState([]);
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

        window.addEventListener("mousemove", (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        window.addEventListener("resize", () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            init();
        });

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
                if (mouse.x - this.x < 80 && mouse.x - this.x > -80 && mouse.y - this.y < 80 && mouse.y - this.y > -80) {
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

        const fireandice = new RevolvingCircles(innerWidth / 2, innerHeight / 2, 16, 4);

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
            window.removeEventListener("mousemove", mousemove);
            window.removeEventListener("resize", resize);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch("https://be.t21c.kro.kr/levels");
            const data = await res.json();
            //const lastRow = data.results[data.length - 1]
            const lastRow = [data.results[data.results.length - 1], data.results[data.results.length - 2], data.results[data.results.length - 3]];

            console.log(data);
            console.log(lastRow);

            setRecent(lastRow);
        };
        fetchData();
    }, []);

    const scrollToRecent = () => {
        const recent = document.querySelector("#recent");
        recent.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <>
            <div className="home">
                <Navigation>
                    <NavLink className={({ isActive }) => "nav-link " + (isActive ? "active-link" : "")} to="/">
                        <li>Levels</li>
                    </NavLink>

                    <NavLink className="nav-link">
                        <li>Leaderboard</li>
                    </NavLink>

                    <NavLink className="nav-link">
                        <li>Passes</li>
                    </NavLink>

                    <NavLink className="nav-link">
                        <li>Refrences</li>
                    </NavLink>

                    <NavLink className="nav-link">
                        <li>Credits</li>
                    </NavLink>
                </Navigation>
                <canvas className="homeCanvas" />

                <div className="hero-text">
                    <h1>
                        {" "}
                        <span>21</span> Forums
                    </h1>
                    <p>*To be informed that we're not affiliated nor approved by the 7th Beat Game (The creator of ADOFAI)</p>

                    <button onClick={scrollToRecent}>Explore ! </button>
                </div>

                {/* <svg className='spacer-svg' id="visual" viewBox="0 0 3500 300" width="3500" height="300" xmlns="http://www.w3.org/2000/svg" version="1.1"><path d="M0 91L36.5 100.5C73 110 146 129 219 151C292 173 365 198 437.8 206.5C510.7 215 583.3 207 656.2 184.7C729 162.3 802 125.7 875 118.3C948 111 1021 133 1094 141.3C1167 149.7 1240 144.3 1312.8 129.7C1385.7 115 1458.3 91 1531.2 80.7C1604 70.3 1677 73.7 1750 81C1823 88.3 1896 99.7 1969 111.5C2042 123.3 2115 135.7 2187.8 153.7C2260.7 171.7 2333.3 195.3 2406.2 175C2479 154.7 2552 90.3 2625 66.5C2698 42.7 2771 59.3 2844 65.5C2917 71.7 2990 67.3 3062.8 64.2C3135.7 61 3208.3 59 3281.2 84.5C3354 110 3427 163 3463.5 189.5L3500 216L3500 301L3463.5 301C3427 301 3354 301 3281.2 301C3208.3 301 3135.7 301 3062.8 301C2990 301 2917 301 2844 301C2771 301 2698 301 2625 301C2552 301 2479 301 2406.2 301C2333.3 301 2260.7 301 2187.8 301C2115 301 2042 301 1969 301C1896 301 1823 301 1750 301C1677 301 1604 301 1531.2 301C1458.3 301 1385.7 301 1312.8 301C1240 301 1167 301 1094 301C1021 301 948 301 875 301C802 301 729 301 656.2 301C583.3 301 510.7 301 437.8 301C365 301 292 301 219 301C146 301 73 301 36.5 301L0 301Z" fill="#6d23ce"></path><path d="M0 66L36.5 71C73 76 146 86 219 101.3C292 116.7 365 137.3 437.8 161.5C510.7 185.7 583.3 213.3 656.2 225.2C729 237 802 233 875 223.7C948 214.3 1021 199.7 1094 191C1167 182.3 1240 179.7 1312.8 170.5C1385.7 161.3 1458.3 145.7 1531.2 149.7C1604 153.7 1677 177.3 1750 193.8C1823 210.3 1896 219.7 1969 204.7C2042 189.7 2115 150.3 2187.8 133.5C2260.7 116.7 2333.3 122.3 2406.2 115.2C2479 108 2552 88 2625 100C2698 112 2771 156 2844 172.8C2917 189.7 2990 179.3 3062.8 184.3C3135.7 189.3 3208.3 209.7 3281.2 205C3354 200.3 3427 170.7 3463.5 155.8L3500 141L3500 301L3463.5 301C3427 301 3354 301 3281.2 301C3208.3 301 3135.7 301 3062.8 301C2990 301 2917 301 2844 301C2771 301 2698 301 2625 301C2552 301 2479 301 2406.2 301C2333.3 301 2260.7 301 2187.8 301C2115 301 2042 301 1969 301C1896 301 1823 301 1750 301C1677 301 1604 301 1531.2 301C1458.3 301 1385.7 301 1312.8 301C1240 301 1167 301 1094 301C1021 301 948 301 875 301C802 301 729 301 656.2 301C583.3 301 510.7 301 437.8 301C365 301 292 301 219 301C146 301 73 301 36.5 301L0 301Z" fill="#854dd7"></path><path d="M0 111L36.5 120.5C73 130 146 149 219 156.3C292 163.7 365 159.3 437.8 162.5C510.7 165.7 583.3 176.3 656.2 176C729 175.7 802 164.3 875 168.3C948 172.3 1021 191.7 1094 206.8C1167 222 1240 233 1312.8 221.3C1385.7 209.7 1458.3 175.3 1531.2 166.3C1604 157.3 1677 173.7 1750 180.2C1823 186.7 1896 183.3 1969 172.7C2042 162 2115 144 2187.8 154.3C2260.7 164.7 2333.3 203.3 2406.2 222.8C2479 242.3 2552 242.7 2625 242.3C2698 242 2771 241 2844 240.5C2917 240 2990 240 3062.8 235.3C3135.7 230.7 3208.3 221.3 3281.2 218.7C3354 216 3427 220 3463.5 222L3500 224L3500 301L3463.5 301C3427 301 3354 301 3281.2 301C3208.3 301 3135.7 301 3062.8 301C2990 301 2917 301 2844 301C2771 301 2698 301 2625 301C2552 301 2479 301 2406.2 301C2333.3 301 2260.7 301 2187.8 301C2115 301 2042 301 1969 301C1896 301 1823 301 1750 301C1677 301 1604 301 1531.2 301C1458.3 301 1385.7 301 1312.8 301C1240 301 1167 301 1094 301C1021 301 948 301 875 301C802 301 729 301 656.2 301C583.3 301 510.7 301 437.8 301C365 301 292 301 219 301C146 301 73 301 36.5 301L0 301Z" fill="#9c70df"></path><path d="M0 225L36.5 229.7C73 234.3 146 243.7 219 233.8C292 224 365 195 437.8 193.5C510.7 192 583.3 218 656.2 225.5C729 233 802 222 875 216.8C948 211.7 1021 212.3 1094 215.2C1167 218 1240 223 1312.8 215.3C1385.7 207.7 1458.3 187.3 1531.2 187.2C1604 187 1677 207 1750 218.5C1823 230 1896 233 1969 226.8C2042 220.7 2115 205.3 2187.8 202C2260.7 198.7 2333.3 207.3 2406.2 200C2479 192.7 2552 169.3 2625 162.7C2698 156 2771 166 2844 167.3C2917 168.7 2990 161.3 3062.8 173C3135.7 184.7 3208.3 215.3 3281.2 225.5C3354 235.7 3427 225.3 3463.5 220.2L3500 215L3500 301L3463.5 301C3427 301 3354 301 3281.2 301C3208.3 301 3135.7 301 3062.8 301C2990 301 2917 301 2844 301C2771 301 2698 301 2625 301C2552 301 2479 301 2406.2 301C2333.3 301 2260.7 301 2187.8 301C2115 301 2042 301 1969 301C1896 301 1823 301 1750 301C1677 301 1604 301 1531.2 301C1458.3 301 1385.7 301 1312.8 301C1240 301 1167 301 1094 301C1021 301 948 301 875 301C802 301 729 301 656.2 301C583.3 301 510.7 301 437.8 301C365 301 292 301 219 301C146 301 73 301 36.5 301L0 301Z" fill="#b292e6"></path><path d="M0 240L36.5 245.5C73 251 146 262 219 262.8C292 263.7 365 254.3 437.8 253C510.7 251.7 583.3 258.3 656.2 253.7C729 249 802 233 875 233.7C948 234.3 1021 251.7 1094 246.7C1167 241.7 1240 214.3 1312.8 206.3C1385.7 198.3 1458.3 209.7 1531.2 215C1604 220.3 1677 219.7 1750 226.7C1823 233.7 1896 248.3 1969 250.5C2042 252.7 2115 242.3 2187.8 241C2260.7 239.7 2333.3 247.3 2406.2 254.7C2479 262 2552 269 2625 271.7C2698 274.3 2771 272.7 2844 264.3C2917 256 2990 241 3062.8 232.2C3135.7 223.3 3208.3 220.7 3281.2 216.7C3354 212.7 3427 207.3 3463.5 204.7L3500 202L3500 301L3463.5 301C3427 301 3354 301 3281.2 301C3208.3 301 3135.7 301 3062.8 301C2990 301 2917 301 2844 301C2771 301 2698 301 2625 301C2552 301 2479 301 2406.2 301C2333.3 301 2260.7 301 2187.8 301C2115 301 2042 301 1969 301C1896 301 1823 301 1750 301C1677 301 1604 301 1531.2 301C1458.3 301 1385.7 301 1312.8 301C1240 301 1167 301 1094 301C1021 301 948 301 875 301C802 301 729 301 656.2 301C583.3 301 510.7 301 437.8 301C365 301 292 301 219 301C146 301 73 301 36.5 301L0 301Z" fill="#c8b3ec"></path><path d="M0 230L36.5 230C73 230 146 230 219 235.7C292 241.3 365 252.7 437.8 253.7C510.7 254.7 583.3 245.3 656.2 239.7C729 234 802 232 875 232.3C948 232.7 1021 235.3 1094 244.7C1167 254 1240 270 1312.8 274.7C1385.7 279.3 1458.3 272.7 1531.2 267.5C1604 262.3 1677 258.7 1750 259.8C1823 261 1896 267 1969 265C2042 263 2115 253 2187.8 251C2260.7 249 2333.3 255 2406.2 253.5C2479 252 2552 243 2625 247.8C2698 252.7 2771 271.3 2844 271.3C2917 271.3 2990 252.7 3062.8 241.5C3135.7 230.3 3208.3 226.7 3281.2 235.7C3354 244.7 3427 266.3 3463.5 277.2L3500 288L3500 301L3463.5 301C3427 301 3354 301 3281.2 301C3208.3 301 3135.7 301 3062.8 301C2990 301 2917 301 2844 301C2771 301 2698 301 2625 301C2552 301 2479 301 2406.2 301C2333.3 301 2260.7 301 2187.8 301C2115 301 2042 301 1969 301C1896 301 1823 301 1750 301C1677 301 1604 301 1531.2 301C1458.3 301 1385.7 301 1312.8 301C1240 301 1167 301 1094 301C1021 301 948 301 875 301C802 301 729 301 656.2 301C583.3 301 510.7 301 437.8 301C365 301 292 301 219 301C146 301 73 301 36.5 301L0 301Z" fill="#ded4f0">
        </path>
      </svg> */}

                <div className="spacer spacer-one"></div>
            </div>

            <div className="recent-rated" id="recent">
                <h1 className="title-recent">Recently Rated</h1>
                <div className="card-holder">
                    {/* <Card creator={"mumyeong"} song={"The Magical World and Imaginary Gems （魔法世界とイマジナリー・ジェム）"} artist={"Hei"} image={"lPJVi797Uy0"}/>
          <Card creator={"mumyeong"} song={"The Magical World and Imaginary Gems （魔法世界とイマジナリー・ジェム）"} artist={"Hei"} image={"lPJVi797Uy0"}/>
          <Card creator={"mumyeong"} song={"The Magical World and Imaginary Gems （魔法世界とイマジナリー・ジェム）"} artist={"Hei"} image={"lPJVi797Uy0"}/> */}

                    {recent.map((element, index) => (
                        <Card key={index} creator={element.creator} song={element.song} artist={element.artist} image={element.vidLink} />
                    ))}
                </div>
            </div>

            <button onClick={() => console.log(recent)}>test</button>

            <div className="spacer spacer-two"></div>
            <Footer />
        </>
    );
};

export default HomePage;
