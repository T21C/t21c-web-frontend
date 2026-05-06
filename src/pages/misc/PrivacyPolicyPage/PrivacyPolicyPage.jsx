// tuf-search: #PrivacyPolicyPage #privacyPolicyPage #privacyPolicy
import "./privacyPolicyPage.css";
import { Footer } from "@/components/layout";
import { MetaTags } from "@/components/common/display";

const PrivacyPolicyPage = () => {
  const currentUrl = window.location.origin + location.pathname;
  
  return (
    <>
      <MetaTags
        title="Privacy Policy | TUF"
        description="Learn about how The Universal Forums (TUF) collects, uses, and protects your personal information"
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      
      <div className="privacy-policy">
        <div className="privacy-container page-content-70rem">
          <div className="privacy-content">
            <section className="privacy-section">
              <h1>Privacy Policy</h1>
              <p>At The Universal Forums (TUF), we take your privacy seriously. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. 
                Please read this privacy policy carefully. 
                If you do not agree with the terms of this privacy policy, please do not access the site.</p>
              <p className="last-updated">Last Updated: April 12, 2025</p>
            </section>

            <section className="privacy-section">
              <h2>Information We Collect</h2>
              <p>We collect only the information that is necessary for basic functionality and preferences.</p>
              <div className="data-categories">
                <div className="data-category">
                  <h3>Personal Information</h3>
                  <p>Information that you provide directly to us when you register for an account, create or modify your profile, or communicate with us.</p>
                  <ul>
                    <li>Name and username</li>
                    <li>Email address</li>
                    <li>Password (one-way hashed)</li>
                    <li>Profile picture</li>
                    <li>View-only Discord token and data (upon connection)</li>
                    <li>Video links for passes or created levels</li>
                  </ul>
                </div>
                <div className="data-category">
                  <h3>Cookies and Storage</h3>
                  <p>Information maintained through cookies and similar tracking technologies.</p>
                  <ul>
                    <li>Session authentication cookies</li>
                    <li>Local storage for preferences and settings</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="privacy-section">
              <h2>How We Use Your Information</h2>
              <p>We use the information we collect <b>only and only</b> for the following purposes:</p>
              <ul>
                <li>To provide and maintain our service</li>
                <li>To notify you about changes to our service</li>
                <li>To process and display levels and passes you have created or uploaded</li>
                <li>To manage your account and provide you with support</li>
                <li>To send you important technical notices, updates, security alerts, and support messages</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>Sharing Your Information</h2>
              <p>We may share your information with third parties in the following circumstances:</p>
              <div className="sharing-partners">
                <div className="partner-card">
                  <h3>Service Providers</h3>
                  <p>We may share your information with third-party vendors or service providers who perform services on our behalf, such as ingame mods (TUFHelper).</p>
                </div>
                <div className="partner-card">
                  <h3>Legal Requirements</h3>
                  <p>We may disclose your information if required to do so by law.</p>
                </div>
              </div>
            </section>

            <section className="privacy-section">
              <h2>Data Security</h2>
              <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. However, please note that no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
            </section>

            <section className="privacy-section">
              <h2>Cookies</h2>
              <p>We use cookies only and only to store your authentication token. It will never be used to track your browsing activity or to store any other information.</p>
              <p>These cookies are required for the authentication system to function. By creating and using an account, you agree to the use of these cookies.</p>
            </section>

            <section className="privacy-section">
              <h2>Your Rights</h2>
              <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul>
                <li>The right to access the personal information we hold about you</li>
                <li>The right to request correction of inaccurate information</li>
                <li>The right to request deletion of your information</li>
                <li>The right to withdraw consent at any time</li>
                <li>The right to data portability</li>
                <li>The right to object to processing of your information</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>Changes to This Privacy Policy</h2>
              <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.</p>
            </section>

            <section className="privacy-section">
              <h2>Contact Us</h2>
              <p>If you have any questions about our Privacy Policy, please contact managers on our Discord server:</p>

                <p>Discord: <button className="discord-button" onClick={() => window.open("https://discord.gg/MaW353r8xg", "_blank")}>Join</button></p>

            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicyPage; 