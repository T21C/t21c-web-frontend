import { CompleteNav } from "../../components"
import "./passsubmission.css"
import image from "../../assets/placeholder/3.png"

const PassSubmissionPage = () => {
  return (
    <div className="pass-submission-page">
        <CompleteNav/>
        <div className="background-level"></div>



        <form action="">

          <div className="img-wrapper">
            <img src={image} alt="" />
          </div>

          <div className="info">
            <h1>Pass Submission</h1>

            <div className="id-input">

              <input type="text" placeholder="Level Id"/>
              
              <div className="information">
                <div className="verified">
                  <svg fill="#ffc107" width="30px" height="30px" viewBox="-1.7 0 20.4 20.4" xmlns="http://www.w3.org/2000/svg" ><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M16.476 10.283A7.917 7.917 0 1 1 8.56 2.366a7.916 7.916 0 0 1 7.916 7.917zm-5.034-2.687a2.845 2.845 0 0 0-.223-1.13A2.877 2.877 0 0 0 9.692 4.92a2.747 2.747 0 0 0-1.116-.227 2.79 2.79 0 0 0-1.129.227 2.903 2.903 0 0 0-1.543 1.546 2.803 2.803 0 0 0-.227 1.128v.02a.792.792 0 0 0 1.583 0v-.02a1.23 1.23 0 0 1 .099-.503 1.32 1.32 0 0 1 .715-.717 1.223 1.223 0 0 1 .502-.098 1.18 1.18 0 0 1 .485.096 1.294 1.294 0 0 1 .418.283 1.307 1.307 0 0 1 .281.427 1.273 1.273 0 0 1 .099.513 1.706 1.706 0 0 1-.05.45 1.546 1.546 0 0 1-.132.335 2.11 2.11 0 0 1-.219.318c-.126.15-.25.293-.365.424-.135.142-.26.28-.374.412a4.113 4.113 0 0 0-.451.639 3.525 3.525 0 0 0-.342.842 3.904 3.904 0 0 0-.12.995v.035a.792.792 0 0 0 1.583 0v-.035a2.324 2.324 0 0 1 .068-.59 1.944 1.944 0 0 1 .187-.463 2.49 2.49 0 0 1 .276-.39c.098-.115.209-.237.329-.363l.018-.02c.129-.144.264-.301.403-.466a3.712 3.712 0 0 0 .384-.556 3.083 3.083 0 0 0 .28-.692 3.275 3.275 0 0 0 .108-.875zM9.58 14.895a.982.982 0 0 0-.294-.707 1.059 1.059 0 0 0-.32-.212l-.004-.001a.968.968 0 0 0-.382-.079 1.017 1.017 0 0 0-.397.08 1.053 1.053 0 0 0-.326.212 1.002 1.002 0 0 0-.215 1.098 1.028 1.028 0 0 0 .216.32 1.027 1.027 0 0 0 .722.295.968.968 0 0 0 .382-.078l.005-.002a1.01 1.01 0 0 0 .534-.534.98.98 0 0 0 .08-.392z"></path></g></svg>
                  <p style={{color : "#ffc107"}}>Verified</p>
                </div>
                <button style={{backgroundColor : "#ffc107"}}>Go to level</button>
              </div>
            </div>


            <div className="youtube-input">
              <input type="text" placeholder="Video Link"/>
              
              <div className="information">
                  <div className="yt-info">
                    <h4>YT Title</h4>
                    <p>-</p>
                  </div>

                  <div className="yt-info">
                    <h4>Time stamps</h4>
                    <p>-</p>
                  </div>

                  <div className="yt-info">
                    <h4>Channel</h4>
                    <p>-</p>
                  </div>


              </div>
            </div>

            <div className="feel-speed">
              <input type="text" placeholder="Speed (ex : 1.2)"/>
              <input type="text" placeholder="Feeling rating"/>
            </div>

            <div className="accuracy">

              <div className="top">
                
                <div className="each-accuracy">
                  <p>E Perfect</p>
                  <input type="text" placeholder="number"/>
                </div>

                <div className="each-accuracy">
                  <p>Perfect</p>
                  <input type="text" placeholder="number"/>
                </div>

                <div className="each-accuracy">
                  <p>L Perfect</p>
                  <input type="text" placeholder="number"/>
                </div>
              </div>

              <div className="bottom">

                <div className="each-accuracy">
                  <p>Too Early</p>
                  <input type="text" placeholder="number"/>
                </div>

                <div className="each-accuracy">
                  <p>Early</p>
                  <input type="text" placeholder="number"/>
                </div>

                <div className="each-accuracy">
                  <p>Late</p>
                  <input type="text" placeholder="number"/>
                </div>
              </div>

              <div className="acc-score">
                <p>Accuracy: -</p>

                <p>Score: -</p>
              </div>

            </div>

            <button className="submit">Submit</button>

          </div>


        </form>
    </div>
  )
}
export default PassSubmissionPage