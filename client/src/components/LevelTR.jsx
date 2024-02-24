import React from "react";

const LevelTR = ({ songName, songArtist, creator, diff, clearsNumber, driveDL, workshopDL }) => {
    return (
        <tr>
            <td>{songName}</td>
            <td>{songArtist}</td>
            <td>{creator}</td>
            <td>{diff}</td>
            <td>{clearsNumber}</td>
            <td>
                <div className="download">
                    {driveDL && <button onClick={() => window.open(driveDL, "_blank")}>drive</button>}
                    {workshopDL && <button onClick={() => window.open(workshopDL, "_blank")}>steam</button>}
                </div>
            </td>
        </tr>
    );
};

export default LevelTR;
