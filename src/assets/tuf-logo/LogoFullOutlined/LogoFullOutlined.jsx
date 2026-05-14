// tuf-search: #LogoFullOutlined #logoFullOutlined #tufLogo
import LogoFullSVG from "../logo-full";
import "./logofulloutlined.css";

export default function LogoFullOutlineSVG ({ className, strokeWidth = 30, strokeColor = "#fff", children }) {
    return (
        <div className={`logo-full-outlined-container ${className}`}>
            <LogoFullSVG className="logo" />
            <LogoFullSVG className="background-logo" strokeWidth={strokeWidth} stroke={strokeColor} />
            {children}
        </div>
    )
}