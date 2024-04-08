/* eslint-disable no-unused-vars */
import "./footer.css"
import React from "react";
import image from "../../assets/logo.png"
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";



const Footer = () => {
  const {t} = useTranslation()
  return (
    <footer>
      <div className="wrapper">
        <div className="logo-container">
        <img src={image} alt="Logo" />
        </div>

        <div className="about-container">
          <h2>{t("footerComponent.aboutUs.header")}</h2>
          <p>
          {t("footerComponent.aboutUs.paragraph")}
          </p>
        </div>

        <div className="link-container">
          <h2>{t("footerComponent.links.header")}</h2>
          <Link className="link" to="/levels">{t("footerComponent.links.levels")}</Link>
          <Link className="link" to="/submission">{t("footerComponent.links.submission")}</Link>
        </div>

        <div className="self-promotion-container">
          <h2>{t("footerComponent.shoutOut.header")}</h2>
          <p>{t("footerComponent.shoutOut.paragraph")}</p>

          <a href="https://discord.gg/8FBDmAPrKe" target="_blank">
            <svg width="50px" height="50px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18.8944 4.34399C17.5184 3.71467 16.057 3.256 14.5317 3C14.3397 3.33067 14.1263 3.77866 13.977 4.13067C12.3546 3.89599 10.7439 3.89599 9.14394 4.13067C8.9946 3.77866 8.77059 3.33067 8.58925 3C7.05328 3.256 5.59194 3.71467 4.22555 4.34399C1.46289 8.41865 0.716219 12.3973 1.08955 16.3226C2.92421 17.6559 4.6949 18.4666 6.43463 19C6.86129 18.424 7.2453 17.8053 7.57597 17.1546C6.94663 16.92 6.3493 16.632 5.7733 16.2906C5.92263 16.184 6.07197 16.0667 6.21064 15.9493C9.68796 17.5387 13.4544 17.5387 16.889 15.9493C17.0383 16.0667 17.177 16.184 17.3263 16.2906C16.7503 16.632 16.153 16.92 15.5237 17.1546C15.8543 17.8053 16.2384 18.424 16.665 19C18.4037 18.4666 20.185 17.6559 22.0101 16.3226C22.4687 11.7787 21.2837 7.83202 18.8944 4.34399ZM8.05596 13.9013C7.01061 13.9013 6.15728 12.952 6.15728 11.7893C6.15728 10.6267 6.98928 9.67731 8.05596 9.67731C9.11194 9.67731 9.97591 10.6267 9.95457 11.7893C9.95457 12.952 9.11194 13.9013 8.05596 13.9013ZM15.065 13.9013C14.0197 13.9013 13.1653 12.952 13.1653 11.7893C13.1653 10.6267 13.9983 9.67731 15.065 9.67731C16.121 9.67731 16.985 10.6267 16.9637 11.7893C16.9637 12.952 16.1317 13.9013 15.065 13.9013Z" fill="#ffffff"></path> </g></svg>
          </a>
        </div>
      </div>

      <p className="copy-right">
      &copy; {t("footerComponent.copyRight")}
      </p>
    </footer>
  );
};

export default Footer;
