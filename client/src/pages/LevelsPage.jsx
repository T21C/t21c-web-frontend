/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react'
import { LevelTR, Navigation } from '../components'
import { NavLink } from 'react-router-dom'
import { UserContext } from '../context/UserContext'

const LevelsPage = () => {


    const {levelData, setLevelData} = useContext(UserContext)


  return (
    <div className='level-page'>
        <Navigation>
            <NavLink className={({ isActive }) => "nav-link " + (isActive ? "active-link" : "")} to="/levels">
                <li>Levels</li>
            </NavLink>

            <NavLink className={({ isActive }) => "nav-link " + (isActive ? "active-link" : "")} to="/" >
                <li>Leaderboard</li>
            </NavLink>

            <NavLink className={({ isActive }) => "nav-link " + (isActive ? "active-link" : "")} to="/">
                <li>Passes</li>
            </NavLink>

            <NavLink className={({ isActive }) => "nav-link " + (isActive ? "active-link" : "")} to="/">
                <li>Refrences</li>
            </NavLink>

            <NavLink className={({ isActive }) => "nav-link " + (isActive ? "active-link" : "")} to="/">
                <li>Credits</li>
            </NavLink>
        </Navigation>

        <input type="text" />
        <div className="filter-wrapper">
            <p>Filter :</p>
            <div className="filter">
                <p>Player</p>
                <p>Diff</p>
                <p>Score</p>
                <p>Date</p>
            </div>

            <p>sort :</p>
            <div className="sort">
                <p>12K</p>
                <p>Non 12K</p>
            </div>
        </div>

        <div className="table-wrapper">
    <table>
        <thead>
            <tr>
                <th>Song</th>
                <th>Artist</th>
                <th>Creators</th>
                <th>Diff</th>
                <th>Clears</th>
                <th>Link</th>
            </tr>
        </thead>

        <tbody>
            <LevelTR songName={"Song"} songArtist={"Artist"} creator={"Creator"} diff={"difficulty"} clearsNumber={727} driveDL={"https://www.youtube.com"} workshopDL={"https://www.youtube.com"}></LevelTR>
        </tbody>
    </table>
</div>


    </div>
  )
}

export default LevelsPage