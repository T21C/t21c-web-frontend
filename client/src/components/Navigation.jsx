/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState } from 'react'

const Navigation = ({children}) => {

  const[openNav, setOpenNav] = useState(false)

  function changeNavState(){
    setOpenNav(!openNav)
  }
  return (
    <>
      <nav>

        <div className='wrapper'>

          <div>
              LOGO
          </div>

          <div className='nav-menu'>
              <ul>
                {children}
              </ul>
          </div>

          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="" onClick={changeNavState}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>

        </div>

      </nav>

      <div className={`nav-menu-outer ${openNav ? "open-nav" : "close-nav"}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="close" onClick={changeNavState}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>

          <ul>
            {children}
          </ul>
      </div>
    </>

  )
}

export default Navigation