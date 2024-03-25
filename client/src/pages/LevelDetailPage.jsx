import React from 'react'
import { CompleteNav } from '../components'

const LevelDetailPage = () => {
    const id = new URLSearchParams(window.location.search).get("id")
  return (
    <div className='level-detail'>
        <CompleteNav/>

        <div className="wrapper-level wrapper-level-top">
            <button>Back</button>
            <div className="header">

                <div className="left">

                    <div className="diff">
                        <p>20</p>
                    </div>

                    <div className="title">
                        <h1>Parodia Sonatina -Grande-</h1>
                        <p>{id}</p>
                    </div>
                    
                </div>

                <div className="right">

                    <button>steam</button>
                    <button>download</button>

                </div>
            </div>

            <div className="body">
                <div className="info">
                    <p>first clear by</p>
                    <p>first clear by</p>
                    <p>first clear by</p>
                    <p>first clear by</p>
                    <p>first clear by</p>
                </div>
                

                <div className="youtube">
                    <iframe src="https://www.youtube.com/embed/HhJoFpGGqDI?si=SNiSgkSryeTsqUaz" title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen></iframe>
                </div>
            </div>
            
            <div className="rank">
                <h1>Ranks</h1>

                <div className="rank-list">
                    <div className="list">
                        <p>playe</p>
                        <p>score</p>
                        <p>rank</p>
                        <p>percentage</p>
                        <p>fr</p>
                        <button>judgement</button>
                    </div>

                    <div className="list">
                        <p>playe</p>
                        <p>score</p>
                        <p>rank</p>
                        <p>percentage</p>
                        <p>fr</p>
                        <button>judgement</button>
                    </div>

                    <div className="list">
                        <p>playe</p>
                        <p>score</p>
                        <p>rank</p>
                        <p>percentage</p>
                        <p>fr</p>
                        <button>judgement</button>
                    </div>

                </div>
            </div>
        </div>
    </div>
  )
}

export default LevelDetailPage