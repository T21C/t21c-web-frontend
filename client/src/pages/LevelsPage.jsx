// eslint-disable-next-line no-unused-vars
import React from 'react'
import { Navigation } from '../components'
import { NavLink } from 'react-router-dom'

const LevelsPage = () => {
  return (
    <div>
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
    </div>
  )
}

export default LevelsPage