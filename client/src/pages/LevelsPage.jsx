/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react'
import { Navigation } from '../components'
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
                <th>Song Artist</th>
                <th>Artist</th>
                <th>Creators</th>
                <th>Diff</th>
                <th>Clears</th>
                <th>Link</th>
            </tr>
        </thead>

        <tbody>
            <tr>
                <td>Song artist</td>
                <td>artist</td>
                <td>creators</td>
                <td>diff</td>
                <td>clears</td>
                <td>
                    <div className="download">
                        <button>download</button>
                        <button>download</button>
                    </div>
                </td>
            </tr>

            <tr>
                <td>Song artist</td>
                <td>artist</td>
                <td>creators</td>
                <td>diff</td>
                <td>clears</td>
                <td>
                    <div className="download">
                        <button>download</button>
                        <button>download</button>
                    </div>
                </td>
            </tr>

            <tr>
                <td>Song artist</td>
                <td>artist</td>
                <td>creators</td>
                <td>diff</td>
                <td>clears</td>
                <td>
                    <div className="download">
                        <button>download</button>
                        <button>download</button>
                    </div>
                </td>
            </tr>

            <tr>
                <td>Song artist</td>
                <td>artist</td>
                <td>creators</td>
                <td>diff</td>
                <td>clears</td>
                <td>
                    <div className="download">
                        <button>download</button>
                        <button>download</button>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</div>


    </div>
  )
}

export default LevelsPage