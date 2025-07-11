import "./submissionpage.css"
import { CompleteNav } from "@/components/layout";
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next";
import { MetaTags } from "@/components/common/display";
import { useLocation } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";

const SubmissionPage = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth()
  const tSubmission = (key, params = {}) => t(`submission.${key}`, params);
  const navigate = useNavigate();
  const location = useLocation();
  const currentUrl = window.location.origin + location.pathname;
  if (!user) {
    navigate('/login')
  }

  const handleSubmitLevelClick = () => {
    navigate('/submission/level');
  };

  const handleSubmitPassClick = () => {
    navigate('/submission/pass');
  };

  const noAccess = user.player.isSubmissionsPaused || user.player.isBanned || !user.isEmailVerified

  return (
    <div className="submission-page">
      <MetaTags
        title={tSubmission('meta.title')}
        description={tSubmission('meta.description')}
        url={currentUrl}
        image="/submission-preview.jpg"
        type={tSubmission('meta.type')}
      />
      <CompleteNav/>
      <div className="background-level"></div>
      
      <div className={`submission-container ${noAccess && "banner-container"}`}>
      {user.player.isSubmissionsPaused ? (
        <div className="banner">
          <span className="banner-text">
            <span className="submissions-paused">{tSubmission('banner.submissionSuspended')}</span>
            <br />
            <span className="contact">{tSubmission('banner.contact')}</span>
          </span>
        </div>
      ) : user.player.isBanned ? (
        <div className="banner">
          <span className="banner-text">
            <span className="banned">{tSubmission('banner.banned')}</span>
            <br />
            <span className="contact">{tSubmission('banner.contact')}</span>
          </span>
        </div>
      ) : !user.isEmailVerified ? (
        <div className="email-not-verified banner">
          <span className="banner-text verify-email">{tSubmission('banner.emailVerification')}</span>
          <span className="verify-email">
            <button className="button" onClick={() => navigate('/profile/verify-email')}>{tSubmission('banner.verifyEmail')}</button>
          </span>
        </div>
      ) : (
        <>
        <div className="submission-passes wrapper-body wrapper-top">
          <h2>{tSubmission('header.headerPass')}</h2>
          <svg className="submission-svg" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" width="513.81934" height="644.97162" viewBox="0 0 513.81934 644.97162" xmlnsXlink="http://www.w3.org/1999/xlink"><path d="M467.4095,264.94912H345.59016V156.5624H467.4095Z" transform="translate(-343.09033 -127.51419)" fill="#fff"/><path d="M469.90967,267.44922H343.09033V154.0625H469.90967Zm-121.81934-5H464.90967V159.0625H348.09033Z" transform="translate(-343.09033 -127.51419)" fill="#ccc"/><polygon points="147.753 586.078 135.493 586.077 129.66 538.789 147.755 538.79 147.753 586.078" fill="#ffb7b7"/><path d="M493.96951,725.47582l-39.53076-.00146v-.5a15.3873,15.3873,0,0,1,15.38647-15.38623h.001l24.144.001Z" transform="translate(-343.09033 -127.51419)" fill="#2f2e41"/><polygon points="262.162 578.548 250.187 581.177 234.349 536.24 252.023 532.36 262.162 578.548" fill="#ffb7b7"/><path d="M610.85474,716.99943l-38.6113,8.47639-.10723-.48836a15.38732,15.38732,0,0,1,11.72872-18.328l.00095-.00021,23.58248-5.177Z" transform="translate(-343.09033 -127.51419)" fill="#2f2e41"/><path d="M456.43436,547.47725l-60.55575,13.06184c-11.614-21.89446-14.22377-44.76462-14.32048-66.39235l60.55543-13.0618A135.60092,135.60092,0,0,0,456.43436,547.47725Z" transform="translate(-343.09033 -127.51419)" fill="#6d23ce"/><polygon points="52.282 378.755 51.766 376.455 83.236 370.097 83.752 372.397 52.282 378.755" fill="#fff"/><polygon points="54.346 387.953 53.83 385.654 85.3 379.296 85.816 381.596 54.346 387.953" fill="#fff"/><polygon points="56.41 397.152 55.894 394.852 87.364 388.495 87.88 390.794 56.41 397.152" fill="#fff"/><polygon points="58.474 406.351 57.958 404.051 89.428 397.693 89.944 399.993 58.474 406.351" fill="#fff"/><polygon points="60.538 415.549 60.022 413.25 91.492 406.892 92.008 409.191 60.538 415.549" fill="#fff"/><path d="M594.50133,493.81605a11.62615,11.62615,0,0,0-4.982-17.117L590.068,450.137l-16.06037-4.27033-.248,37.52166a11.68915,11.68915,0,0,0,20.74163,10.42776Z" transform="translate(-343.09033 -127.51419)" fill="#ffb7b7"/><path d="M440.24266,246.87863l-61.93258-1.40222c-6.19485-23.99742-3.40586-46.84642,1.53768-67.9018L441.78,178.97679A135.60083,135.60083,0,0,0,440.24266,246.87863Z" transform="translate(-343.09033 -127.51419)" fill="#6d23ce"/><polygon points="47.368 65.067 47.401 62.71 79.487 63.857 79.453 66.214 47.368 65.067" fill="#fff"/><polygon points="47.233 74.493 47.266 72.137 79.352 73.284 79.318 75.64 47.233 74.493" fill="#fff"/><polygon points="47.097 83.92 47.131 81.563 79.217 82.71 79.183 85.067 47.097 83.92" fill="#fff"/><polygon points="46.962 93.346 46.996 90.989 79.082 92.136 79.048 94.493 46.962 93.346" fill="#fff"/><polygon points="46.827 102.772 46.861 100.416 78.946 101.563 78.913 103.919 46.827 102.772" fill="#fff"/><circle cx="126.71087" cy="22.45943" r="22.45944" fill="#6c63ff"/><polygon points="125.91 33.403 117.404 23.006 118.742 21.912 125.784 30.52 138.091 12.471 139.518 13.444 125.91 33.403" fill="#fff"/><path d="M854.4095,455.94912H732.59016V347.5624H854.4095Z" transform="translate(-343.09033 -127.51419)" fill="#fff"/><path d="M856.90967,458.44922H730.09033V345.0625H856.90967Zm-121.81934-5H851.90967V350.0625H735.09033Z" transform="translate(-343.09033 -127.51419)" fill="#e6e6e6"/><path d="M854.4095,264.94912H732.59016V156.5624H854.4095Z" transform="translate(-343.09033 -127.51419)" fill="#fff"/><path d="M856.90967,267.44922H730.09033V154.0625H856.90967Zm-121.81934-5H851.90967V159.0625H735.09033Z" transform="translate(-343.09033 -127.51419)" fill="#e6e6e6"/><path d="M660.4095,455.94912H538.59016V347.5624H660.4095Z" transform="translate(-343.09033 -127.51419)" fill="#fff"/><path d="M662.90967,458.44922H536.09033V345.0625H662.90967Zm-121.81934-5H657.90967V350.0625H541.09033Z" transform="translate(-343.09033 -127.51419)" fill="#ccc"/><path d="M467.4095,455.94912H345.59016V347.5624H467.4095Z" transform="translate(-343.09033 -127.51419)" fill="#fff"/><path d="M469.90967,458.44922H343.09033V345.0625H469.90967Zm-121.81934-5H464.90967V350.0625H348.09033Z" transform="translate(-343.09033 -127.51419)" fill="#e6e6e6"/><path d="M660.4095,264.94912H538.59016V156.5624H660.4095Z" transform="translate(-343.09033 -127.51419)" fill="#fff"/><path d="M662.90967,267.44922H536.09033V154.0625H662.90967Zm-121.81934-5H657.90967V159.0625H541.09033Z" transform="translate(-343.09033 -127.51419)" fill="#e6e6e6"/><path d="M643.49868,769.27237l16.27423-31.54126c30.03216,4.94037,35.33276,3.93085,61.57648.52368l6.97775,34.231A378.16618,378.16618,0,0,0,643.49868,769.27237Z" transform="translate(-343.09033 -127.51419)" fill="#e6e6e6"/><polygon points="368.304 636.07 367.794 618.336 369.658 618.406 370.168 636.14 368.304 636.07" fill="#fff"/><polygon points="360.847 635.787 360.336 618.053 362.201 618.124 362.711 635.858 360.847 635.787" fill="#fff"/><polygon points="353.389 635.505 352.879 617.771 354.743 617.841 355.254 635.575 353.389 635.505" fill="#fff"/><path d="M468.39226,451.99393s-5.9104,2.36413,0,92.2019l2.36414,146.57733h23.64148l26.60977-199.19855,32.494,92.81177,29.55188,109.933L606.695,688.409s-24.82361-222.23023-46.101-236.4151S468.39226,451.99393,468.39226,451.99393Z" transform="translate(-343.09033 -127.51419)" fill="#2f2e41"/><circle cx="172.77673" cy="117.94477" r="24.56942" fill="#ffb8b8"/><path d="M539.31676,285.32126s-21.27734-10.63867-41.37262-3.54624-30.734,15.367-30.734,15.367l13.00281,68.56036-17.73108,92.20188s91.01984-7.09247,99.29431,0,8.27454-8.27454,8.27454-8.27454l-7.09247-87.47357,13.00287-55.55753Z" transform="translate(-343.09033 -127.51419)" fill="#3f3d56"/><path d="M494.95892,243.76409,500.16,257.05253c2.13134,5.44539,4.57243,11.27134,9.56836,14.31034,6.16828,3.75216,14.40559,1.92259,20.37269-2.142a31.81312,31.81312,0,0,0-14.31932-57.90282l-.24691,4.44763-5.45772-4.57469a5.306,5.306,0,0,1-8.24787,1.16642c1.43367,2.97177-.221,6.59623-2.61041,8.87276-2.93577,2.79666-11.332,6.15776-10.98353,11.15707C488.46775,235.72354,493.60571,240.30664,494.95892,243.76409Z" transform="translate(-343.09033 -127.51419)" fill="#2f2e41"/><path d="M449.51256,495.38894a11.62611,11.62611,0,0,0,.02419-17.82728l7.98411-25.33966-14.21547-8.60766L432.53288,479.5572a11.68915,11.68915,0,0,0,16.97968,15.83174Z" transform="translate(-343.09033 -127.51419)" fill="#ffb7b7"/><path d="M475.48467,297.142h-8.27454s-13.00283,8.27453-13.00283,20.09527-18.91318,150.12363-18.91318,150.12363l20.09527,3.54621,17.73114-96.93021,13.00287-26.00568Z" transform="translate(-343.09033 -127.51419)" fill="#3f3d56"/><path d="M553.5017,306.59863h22.45941s7.09247,7.09244,10.63867,23.64151,7.09247,81.5632,7.09247,81.5632l-2.36413,59.1038H573.597l-2.36413-76.8349L559.4121,344.42508Z" transform="translate(-343.09033 -127.51419)" fill="#3f3d56"/><path d="M726.988,726.57461h-381a1,1,0,0,1,0-2h381a1,1,0,0,1,0,2Z" transform="translate(-343.09033 -127.51419)" fill="#cbcbcb"/></svg>
          <button className="submit-button" onClick={handleSubmitPassClick}>
            {tSubmission('button.buttonPass')}
          </button>
        </div>

        <div className="submission-level wrapper-body wrapper-top">
          <h2>{tSubmission('header.headerLevel')}</h2>
          <svg className="submission-svg" xmlns="http://www.w3.org/2000/svg" data-name="Layer 1" width="628.95175" height="540.74875" viewBox="0 0 628.95175 540.74875" xmlnsXlink="http://www.w3.org/1999/xlink"><rect id="ae13a9af-8be6-48d2-be97-15b9bb35f653" data-name="Rectangle 246" x="0.32514" y="0.43193" width="532.26441" height="313.47738" fill="#e6e6e6"/><rect id="a5b6fe3b-52e9-48cc-a961-c4a66fbfd4e0" data-name="Rectangle 264" width="532.26441" height="32.39915" fill="#6d23ce"/><rect id="f9022efb-4ab6-4da5-b9f8-05744185cb65" data-name="Rectangle 247" x="12.2742" y="42.35071" width="507.51155" height="255.96132" fill="#fff"/><circle id="b8863a4f-d6d1-45f4-aeb2-54ce0fc41c58" data-name="Ellipse 194" cx="50.43802" cy="16.1168" r="5.35947" fill="#fff"/><circle id="bbe8bb57-e8a1-4ebb-9530-09dc8d102d8f" data-name="Ellipse 195" cx="70.78166" cy="16.1168" r="5.35947" fill="#fff"/><circle id="e8afff7b-3b6f-4dbf-9548-6e45ece64f65" data-name="Ellipse 246" cx="30.04157" cy="16.1168" r="5.35947" fill="#fff"/><rect id="b1f15dfa-2d28-41bb-b4d1-13ec40007797" data-name="Rectangle 250" x="71.46529" y="86.55195" width="389.12937" height="10.16355" fill="#e6e6e6"/><rect id="ad95e1cc-3eac-41f8-b758-723622ce1f63" data-name="Rectangle 251" x="196.65866" y="111.96048" width="138.74262" height="10.16355" fill="#e6e6e6"/><rect id="b780e72c-b22a-4ee2-b16a-5905a6a8a985" data-name="Rectangle 251" x="196.65866" y="163.50023" width="138.74262" height="10.16355" fill="#e6e6e6"/><rect id="a53233dc-737e-4f4d-ba21-0434f7dacc3a" data-name="Rectangle 251" x="196.65866" y="189.89863" width="138.74262" height="10.16355" fill="#e6e6e6"/><rect id="a2199747-3d5b-4c24-9aea-bee34d6022f4" data-name="Rectangle 252" x="127.82906" y="137.36902" width="276.40183" height="10.16355" fill="#e6e6e6"/><rect x="387.59466" y="236.06219" width="73" height="18.0486" fill="#6d23ce"/><polygon points="531.231 529.365 518.972 529.364 513.139 482.076 531.234 482.077 531.231 529.365" fill="#9f616a"/><path d="M510.21452,525.861h23.64384a0,0,0,0,1,0,0v14.88687a0,0,0,0,1,0,0H495.32765a0,0,0,0,1,0,0v0A14.88688,14.88688,0,0,1,510.21452,525.861Z" fill="#2f2e41"/><polygon points="577.231 529.365 564.972 529.364 559.139 482.076 577.234 482.077 577.231 529.365" fill="#9f616a"/><path d="M556.21449,525.861h23.64387a0,0,0,0,1,0,0v14.88687a0,0,0,0,1,0,0H541.32764a0,0,0,0,1,0,0v0A14.88686,14.88686,0,0,1,556.21449,525.861Z" fill="#2f2e41"/><path d="M861.25816,568.15162a10.74271,10.74271,0,0,1-2.06222-16.343l-8.0725-114.55784,23.253,2.25509.63867,112.18666a10.80091,10.80091,0,0,1-13.757,16.45913Z" transform="translate(-285.52412 -179.62562)" fill="#9f616a"/><path d="M816.17638,685.16736,802.68,684.52381a4.499,4.499,0,0,1-4.28589-4.46289l-.9419-136.55665a4.50113,4.50113,0,0,1,5.14649-4.48535l53.99365,7.83789a4.47383,4.47383,0,0,1,3.85352,4.41993l6.94433,126.53418a4.50045,4.50045,0,0,1-4.5,4.53417h-14.55a4.47889,4.47889,0,0,1-4.44531-3.80078s-10.99023-94.91216-12.49927-94.8565c-1.51733.02832-10.53686,97.51959-10.53686,97.51959a4.51711,4.51711,0,0,1-4.46875,3.96582Q816.2838,685.17322,816.17638,685.16736Z" transform="translate(-285.52412 -179.62562)" fill="#2f2e41"/><path d="M856.38719,475.74376a4.48167,4.48167,0,0,1-1.85872-3.40065L852.82462,441.467a12.39863,12.39863,0,0,1,24.34643-3.92684l7.48456,27.60491a4.50508,4.50508,0,0,1-3.16562,5.52076l-21.29064,5.77257A4.4829,4.4829,0,0,1,856.38719,475.74376Z" transform="translate(-285.52412 -179.62562)" fill="#3f3d56"/><circle cx="550.97489" cy="198.17616" r="24.56103" fill="#9f616a"/><path d="M747.49529,426.05641a10.52722,10.52722,0,0,1,.2393,1.64013l42.95745,24.782,10.44141-6.01093,11.13117,14.57227-22.33714,15.92056-49.00792-38.66268a10.4958,10.4958,0,1,1,6.57573-12.24133Z" transform="translate(-285.52412 -179.62562)" fill="#9f616a"/><path d="M792.22631,450.3712a4.48171,4.48171,0,0,1,1.29315-3.65336l21.86341-21.86849a12.39862,12.39862,0,0,1,19.16808,15.51622l-15.57,23.9922a4.50508,4.50508,0,0,1-6.22448,1.32511l-18.5043-12.00853A4.48292,4.48292,0,0,1,792.22631,450.3712Z" transform="translate(-285.52412 -179.62562)" fill="#3f3d56"/><path d="M853.87961,397.23335c-4.582,4.88079-13.09132,2.26067-13.68835-4.40717a8.05467,8.05467,0,0,1,.01014-1.55569c.30826-2.95357,2.01461-5.635,1.60587-8.7536a4.59038,4.59038,0,0,0-.84011-2.14891c-3.65124-4.88934-12.22227,2.18686-15.6682-2.2393-2.113-2.714.3708-6.98713-1.25065-10.02051-2.14006-4.00358-8.47881-2.0286-12.45388-4.22115-4.42275-2.43949-4.15822-9.22525-1.24686-13.3527,3.55052-5.03359,9.77572-7.71951,15.92336-8.10661s12.25292,1.27475,17.99229,3.51145c6.52109,2.54134,12.98768,6.05351,17.00067,11.78753,4.88021,6.97317,5.34986,16.34793,2.90917,24.50175C862.68836,387.18848,857.62128,393.24767,853.87961,397.23335Z" transform="translate(-285.52412 -179.62562)" fill="#2f2e41"/><path d="M913.47588,720.18781h-193a1,1,0,0,1,0-2h193a1,1,0,0,1,0,2Z" transform="translate(-285.52412 -179.62562)" fill="#3f3d56"/><path d="M861.01455,418.76893q-.64014-.46-1.30517-.90332a32.36092,32.36092,0,0,0-7.59571-3.72418v-6.45362h-19v5.98767a33.31967,33.31967,0,0,0-24.16308,27.68622l-12.9375,96.05078a4.47759,4.47759,0,0,0,.93066,3.40137,4.41909,4.41909,0,0,0,3.05371,1.67285c4.48291.44727,13.78028,2.18457,25.67969,8.7959a38.12545,38.12545,0,0,0,18.70557,4.77441,45.08927,45.08927,0,0,0,15.22607-2.71093,4.46654,4.46654,0,0,0,2.918-4.00489c.46582-10.33691,3.19043-63.54394,11.124-95.999A33.17758,33.17758,0,0,0,861.01455,418.76893Z" transform="translate(-285.52412 -179.62562)" fill="#3f3d56"/></svg>
          <button className="submit-button" onClick={handleSubmitLevelClick}>
            {tSubmission('button.buttonLevel')}
          </button>
        </div>
        </>
      )}
      
      </div>
    </div>
  )
}

export default SubmissionPage