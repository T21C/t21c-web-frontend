import { CompleteNav } from "../../components";
import "./passsubmission.css";
import image from "../../assets/placeholder/3.png";
import {GoogleFormSubmitter} from "easyformjs"
import { useEffect, useState } from "react";
import { checkLevel, getYouTubeThumbnailUrl, getYouTubeVideoDetails } from "../../Repository/RemoteRepository";

const PassSubmissionPage = () => {
  const initialFormState = {
    levelId: '',
    videoLink: '',
    leaderboardName: '',
    speed: '',
    feelingRating: '',
    ePerfect: '',
    perfect: '',
    lPerfect: '',
    tooEarly: '',
    early: '',
    late: '',
  };

  const [form, setForm] = useState(initialFormState);

  const [level, setLevel] = useState('');
  const [levelLoading, setLevelLoading] = useState(true);

  const [youtubeDetail, setYoutubeDetail] = useState({
    title: '-',
    channelName: '-',
    timestamp: '-',
  });

  useEffect(() => {
    const { levelId } = form;

    if (!levelId) {
      setLevel('');
      setLevelLoading(false);
      return;
    }

    const cleanLevelId = levelId.startsWith('#') ? levelId.substring(1) : levelId;
    setLevelLoading(true);

    checkLevel(cleanLevelId)
      .then((res) => {
        setLevel(res ? cleanLevelId : '');
        setLevelLoading(false);
      })
      .catch(() => {
        setLevel('');
        setLevelLoading(false);
      });
  }, [form.levelId]);

  useEffect(() => {
    const { videoLink } = form;

    getYouTubeVideoDetails(videoLink).then((res) => {
      setYoutubeDetail(
        res
          ? res
          : {
              title: '-',
              channelName: '-',
              timestamp: '-',
            }
      );
    });
  }, [form.videoLink]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const googleForm = new GoogleFormSubmitter("https://docs.google.com/forms/u/0/d/e/1FAIpQLSczH_8JFCE8W-TUiKFgBNoBke9g1XLW2TlihTm-_hfY03ldSw/formResponse")
  const handleSubmit = (e) => {
    e.preventDefault();
    googleForm.setDetail('1501102710', form.levelId)
    googleForm.setDetail('863109178', form.speed)
    googleForm.setDetail('1017646927', form.leaderboardName)
    googleForm.setDetail('1622600394', form.feelingRating)
    googleForm.setDetail('662649267', youtubeDetail.title)
    googleForm.setDetail('188528298', form.videoLink)
    googleForm.setDetail('1922370523', youtubeDetail.timestamp)
    googleForm.setDetail('1155066920', form.tooEarly)
    googleForm.setDetail('1594163639', form.early)
    googleForm.setDetail('1084592024', form.ePerfect)
    googleForm.setDetail('169503435', form.perfect)
    googleForm.setDetail('1398756494', form.lPerfect)
    googleForm.setDetail('17648355', form.late)
    googleForm.submit();

    // setForm(initialFormState)
  }

  return (
    <div className="pass-submission-page">
      <CompleteNav />
      <div className="background-level"></div>

      <form>
        <div className="img-wrapper">
          <img src={getYouTubeThumbnailUrl(form.videoLink) || image} alt="" />
        </div>

        <div className="info">
          <h1>Pass Submission</h1>

          <div className="id-input">
            <input
              type="text"
              placeholder="Level Id"
              name="levelId"
              value={form.levelId}
              onChange={handleInputChange}
            />

            <div className="information">
              <div className="verified">
                {(() => {
                  const color = !form.levelId
                    ? '#ffc107'
                    : levelLoading
                    ? '#ffc107'
                    : level
                    ? '#28a745'
                    : '#dc3545';
                  return (
                    <>
                      <svg
                        fill={color}
                        width="30px"
                        height="30px"
                        viewBox="-1.7 0 20.4 20.4"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M16.476 10.283A7.917 7.917 0 1 1 8.56 2.366a7.916 7.916 0 0 1 7.916 7.917zm-5.034-2.687a2.845 2.845 0 0 0-.223-1.13A2.877 2.877 0 0 0 9.692 4.92a2.747 2.747 0 0 0-1.116-.227 2.79 2.79 0 0 0-1.129.227 2.903 2.903 0 0 0-1.543 1.546 2.803 2.803 0 0 0-.227 1.128v.02a.792.792 0 0 0 1.583 0v-.02a1.23 1.23 0 0 1 .099-.503 1.32 1.32 0 0 1 .715-.717 1.223 1.223 0 0 1 .502-.098 1.18 1.18 0 0 1 .485.096 1.294 1.294 0 0 1 .418.283 1.307 1.307 0 0 1 .281.427 1.273 1.273 0 0 1 .099.513 1.706 1.706 0 0 1-.05.45 1.546 1.546 0 0 1-.132.335 2.11 2.11 0 0 1-.219.318c-.126.15-.25.293-.365.424a4.113 4.113 0 0 0-.451.639 3.525 3.525 0 0 0-.342.842 3.904 3.904 0 0 0-.12.995v.035a.792.792 0 0 0 1.583 0v-.035a2.324 2.324 0 0 1 .068-.59 1.944 1.944 0 0 1 .187-.463 2.49 2.49 0 0 1 .276-.39c.098-.115.209-.237.c-"
                      />
                    </svg>
                    <p style={{ color }}>
                      {!form.levelId
                        ? 'Waiting'
                        : levelLoading
                        ? 'Fetching'
                        : level
                        ? 'Verified'
                        : 'Unverified'}
                    </p>
                  </>
                  );
                })()}
              </div>
              <a
                href={`/leveldetail?id=${level}`}
                target="_blank"
                rel="noopener noreferrer"
                className="button-goto"
                style={{
                  backgroundColor: !form.levelId ? "#ffc107" : levelLoading ? "#ffc107" : level ? "#28a745" : "#dc3545",
                }}
              >
                Go to level
              </a>
            </div>
          </div>

          <div className="youtube-input">
            <input
              type="text"
              placeholder="Video Link"
              name="videoLink"
              value={form.videoLink}
              onChange={handleInputChange}
            />

            <div className="information">
              <div className="yt-info">
                <h4>YT Title</h4>
                <p>{youtubeDetail.title}</p>
              </div>

              <div className="yt-info">
                <h4>Channel</h4>
                <p>{youtubeDetail.channelName}</p>
              </div>

              <div className="yt-info">
                <h4>Timestamp</h4>
                <p>{youtubeDetail.timestamp}</p>
              </div>
            </div>

            <input
              style={{ maxWidth: '15rem' }}
              type="text"
              placeholder="Alt Leaderboard Name"
              name="leaderboardName"
              value={form.leaderboardName}
              onChange={handleInputChange}
            />
          </div>

          <div className="feel-speed">
            <input
              type="text"
              placeholder="Speed (ex: 1.2)"
              name="speed"
              value={form.speed}
              onChange={handleInputChange}
            />

            <input
              type="text"
              placeholder="Feeling rating"
              name="feelingRating"
              value={form.feelingRating}
              onChange={handleInputChange}
            />
          </div>

          <div className="accuracy">
            <div className="top">
              <div className="each-accuracy">
                <p>E Perfect</p>
                <input
                  type="text"
                  placeholder="number"
                  name="ePerfect"
                  value={form.ePerfect}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>Perfect</p>
                <input
                  type="text"
                  placeholder="number"
                  name="perfect"
                  value={form.perfect}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>L Perfect</p>
                <input type="text"
                  name="lPerfect"
                  value={form.lPerfect}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="bottom">
              <div className="each-accuracy">
                <p>Too Early</p>
                <input
                  type="text"
                  placeholder="number"
                  name="tooEarly"
                  value={form.tooEarly}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>Early</p>
                <input
                  type="text"
                  placeholder="number"
                  name="early"
                  value={form.early}
                  onChange={handleInputChange}
                />
              </div>

              <div className="each-accuracy">
                <p>Late</p>
                <input
                  type="text"
                  placeholder="number"
                  name="late"
                  value={form.late}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="acc-score">
              <p>Accuracy: -</p>
              <p>Score: -</p>
            </div>
          </div>

          <button className="submit" onClick={handleSubmit}>Submit</button>
        </div>
      </form>
    </div>
  );
};

export default PassSubmissionPage;
