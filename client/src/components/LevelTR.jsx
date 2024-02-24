import React from "react";

const LevelTR = ({ songName, songArtist, creator, diff, clearsNumber, driveDL, steamDL }) => {
    const buttonStyle = {
        color : 'white',
        padding : '2px',
        margin : '2px',
        backgroundColor: 'rgba(0, 0, 0, 0.13)',
    }
    const buttonImgStyle = {
        width : '16px',
        height : '16px',
    };
    const driveimg = "https://icons.iconarchive.com/icons/marcus-roberto/google-play/512/Google-Drive-icon.png";
    const steamimg = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/512px-Steam_icon_logo.svg.png";

    return (
        <tr>
            <td>{songName}</td>
            <td>{songArtist}</td>
            <td>{creator}</td>
            <td>{diff}</td>
            <td>{clearsNumber}</td>
            <td>
                <div className="download">
                    {driveDL && <button style={buttonStyle} onClick={() => window.open(driveDL, "_blank")}><img style={buttonImgStyle} src={driveimg}/>link</button>}
                    {steamDL && <button style={buttonStyle} onClick={() => window.open(steamDL, "_blank")}><img style={buttonImgStyle} src={steamimg}/>link</button>}
                </div>
            </td>
        </tr>
    );
};

export default LevelTR;
