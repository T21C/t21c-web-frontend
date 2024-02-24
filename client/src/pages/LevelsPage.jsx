/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useContext, useState } from 'react'
import { Navigation } from '../components'
import { NavLink } from 'react-router-dom'
import { UserContext } from '../context/UserContext'

const LevelsPage = () => {


    const {levelData, setLevelData} = useContext(UserContext)
    const [filter, setFilter] = useState(["12K", "Non 12K"])
    const [sort, setSort] = useState(["Player", "Diff", "Score", "Date"])
  
    const [selectedSort, setSelectedSort] = useState(null)
    const [selectedFilter, setSelectedFilter] = useState(null)

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

        <div className="wrapper">
            <input type="text" placeholder='Search' />
        </div>

        <div className="wrapper">
            <div className="wrapper-inner">
                <p>Sort :</p>
                <div className="filter">
                    {
                        sort.map((el, index) => (
                            <p className={selectedSort === el ? "select-active" : ""} key={index} onClick={() => selectedSort === el ? setSelectedSort(null) : setSelectedSort(el)}>{el}</p>
                        ))
                    }
                </div>

                <p>Filter :</p>
                <div className="sort">
                    {
                        filter.map((el, index) => (
                            <p className={selectedFilter === el ? "select-active" : ""} onClick={() => selectedFilter === el ? setSelectedFilter(null) : setSelectedFilter(el)} key={index}>{el}</p>
                        ))
                    }
                </div>
            </div>
        </div>

        <div className="wrapper table-div">
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
                <td>
                    <div className="first-col">
                        <p>levelid</p>
                        <p>song artist</p>
                    </div>
                </td>
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
                <td>
                    <div className="first-col">
                        <p>levelid</p>
                        <p>song artist</p>
                    </div>
                </td>
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
                <td>
                    <div className="first-col">
                        <p>levelid</p>
                        <p>song artist</p>
                    </div>
                </td>
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

                    <button onClick={()=> console.log(selectedSort)}>test</button>
    </div>
  )
}

export default LevelsPage