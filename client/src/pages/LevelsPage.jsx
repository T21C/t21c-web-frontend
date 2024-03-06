/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
import React, { useContext, useEffect, useState } from 'react'
import { CompleteNav, LevelCard, Navigation } from '../components'
import { NavLink } from 'react-router-dom'
import { UserContext } from '../context/UserContext'

const LevelsPage = () => {


    const {levelData, setLevelData} = useContext(UserContext)
    const [filter, setFilter] = useState(["12K", "Non 12K"])
    const [sort, setSort] = useState(["Player", "Diff", "Score", "Date"])
  
    const [selectedSort, setSelectedSort] = useState(null)
    const [selectedFilter, setSelectedFilter] = useState(null)
    const [showLevel, setShowLevel] = useState([])

    useEffect(()=>{
        const fetchData = async () =>{

            if(levelData.length == 0){
                const res = await fetch("https://be.t21c.kro.kr/levels");
                if (!res.ok) {
                    // Handle non-200 responses
                    throw new Error(`API call failed with status code: ${res.status}`);
                }
                const data = await res.json();
                if (!data.results || !Array.isArray(data.results)) {
                    // Handle unexpected data structure
                    throw new Error("Unexpected API response structure");
                }   
                setLevelData(data.results)
            }
        }

        fetchData()
    })

    useEffect(()=>{
        let sortedLevel = [...levelData] 


        if(levelData.length > 0 && selectedSort != null || levelData.length > 0 && selectedFilter != null){
            if(selectedSort === "Player"){
                sortedLevel = sortedLevel.sort((a, b) =>
                    a.creator.localeCompare(b.creator)
                )
            }
        }



        setShowLevel(sortedLevel)

    }, [levelData, selectedFilter, selectedSort])
    return (
    <div className='level-page'>
        <CompleteNav/>

        <div className="wrapper-level">
            <input type="text" placeholder='Search' />
        </div>

        <div className="wrapper-level">
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

    {/* <button onClick={()=> console.log(levelData)}>test</button> */}

        <div className="grid-container wrapper-level">
        {/* Headers */}
            <div className="grid-header">Song</div>
            <div className="grid-header">Artist</div>
            <div className="grid-header">Creators</div>
            <div className="grid-header">Diff</div>
            <div className="grid-header">Clears</div>
            <div className="grid-header">Links</div>
            
            {/* Long Content Box that matches the headers */}
           

            {/* {levelData.length !== 0 ?
                <>
                    <LevelCard object={levelData[0]} />
                    <LevelCard object={levelData[1]} />
                    <LevelCard object={levelData[2]} />
                    <LevelCard object={levelData[3]} />
                    <LevelCard object={levelData[4]} />
                    <LevelCard object={levelData[5]} />
                    <LevelCard object={levelData[6]} />
                    <LevelCard object={levelData[7]} />


                </>
                : 
                <></>
            } */}

            {levelData.length !== 0 ?
            showLevel.map((element, index) => (
                <LevelCard key={index} object={element} />
            ))
            : 
            <></>
            }

        </div>

        {/* <div className="mobile-grid-container wrapper-level">
            <h2>Song</h2>
            <p>COntent</p>
            <h2>Artist</h2>
            <p>COntent</p>
            <h2>creators</h2>
            <p>COntent</p>
            <h2>Diff</h2>
            <p>COntent</p>
            <h2>Clears</h2>
            <p>Clears</p>
            <h2>Links</h2>
            <p>COntent</p>
        </div> */}
    </div>
  )
}

export default LevelsPage