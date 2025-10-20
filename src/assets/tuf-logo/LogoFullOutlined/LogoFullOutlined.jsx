import LogoFullSVG from "../logo-full";
import "./logofulloutlined.css";

export default function LogoFullOutlineSVG ({ className, strokeWidth = 30, strokeColor = "#fff" }) {
    return (
        <div className={`logo-full-outlined-container ${className}`}>
            <LogoFullSVG className="logo" />
            <LogoFullSVG className="background-logo" strokeWidth={strokeWidth} stroke={strokeColor} />
        </div>
    )
}