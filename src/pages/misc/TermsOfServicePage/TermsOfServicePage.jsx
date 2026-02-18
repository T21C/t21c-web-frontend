import "./termsOfServicePage.css";
import { Footer } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { ExternalLinkIcon } from "@/components/common/icons";

const TermsOfServicePage = () => {
  const currentUrl = window.location.origin + location.pathname;
  
  return (
    <>
      <MetaTags
        title="Terms of Service | TUF"
        description="Read the Terms of Service for The Universal Forums (TUF) - A community-driven organization for ADOFAI custom levels"
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
    
      <div className="terms-of-service">
        <div className="terms-container page-content-70rem">
          <div className="terms-content">
            <section className="terms-section">
              <h1>Terms of Service</h1>
              <p>Welcome to The Universal Forums (TUF). By accessing or using our website, you agree to be bound by these Terms of Service. Please read these terms carefully before using our services.</p>
              <p className="last-updated">Last Updated: June 18, 2025</p>
            </section>

            <section className="terms-section">
              <h2>Agreement to Terms</h2>
              <p>By accessing or using our website, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
            </section>

            <section className="terms-section">
              <h2>User Accounts</h2>
              <p>To access certain features of our website, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
              <ul>
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for maintaining the security of your account</li>
                <li>You must notify us immediately of any unauthorized use of your account</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>User Content</h2>
              <p>Our website allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content that you post on or through our website.</p>
              <div className="content-guidelines">
                <div className="guideline-card">
                  <h3>Prohibited Content</h3>
                  <p>You may not post content that is illegal, 
                    harmful, threatening, abusive, harassing, defamatory, 
                    vulgar, obscene, or otherwise objectionable.</p>
                </div>
                <div className="guideline-card">
                  <h3>Content Rights</h3>
                  <p>You retain all rights to your content, 
                    but you grant us a license to use, 
                    reproduce, modify, adapt, publish, 
                    translate, and distribute it in any medium. 
                    This includes level data, passes, and other content provided by you.</p>
                </div>
                <div className="guideline-card">
                  <h3>Content Removal</h3>
                  <p>We reserve the right to remove any content that violates these terms or that we find objectionable for any reason.</p>
                </div>
              </div>
            </section>

            <section className="terms-section">
              <h2>Intellectual Property</h2>
              <p>The content on our website, including text, graphics, and logos,
                is the property of TUF or its content suppliers and is protected
                by international copyright and other intellectual property laws.
                The code for the website is open source and can be found <a href="https://github.com/orgs/T21C/repositories" className="tos-link" target="_blank" rel="noopener noreferrer">
                here
                <ExternalLinkIcon size={16} color="#4a9eff" className="tos-link-icon" />
                </a>
                .</p>
            </section>

            <section className="terms-section">
              <h2>Termination</h2>
              <p>We may terminate or suspend your account and bar access to our services immediately,
                without prior notice or liability, under our sole discretion, 
                for any reason whatsoever, including without limitation if you breach these Terms.</p>
            </section>

            <section className="terms-section">
              <h2>Disclaimer</h2>
              <p>Our website is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis.
                We make no representations or warranties of any kind, express or implied,
                as to the operation of our website or the information, content, materials,
                or products included on our website.</p>
            </section>

            <section className="terms-section">
              <h2>Limitation of Liability</h2>
              <p>We shall not be liable for any indirect, 
                incidental, special, consequential, or punitive damages, 
                or any loss of data, use, goodwill, 
                or other intangible losses resulting from your access 
                to or use of or inability to access or use our website.</p>
            </section>

            <section className="terms-section cdn-terms">
              <h2>Content Delivery Network</h2>
              <h3>By using our Content Delivery Network (CDN), you accept that:</h3>
              <ul>
                <li>Your zip file will be stored as original and can be requested for deletion by you or by other eligible parties</li>
                <li>Your zip file will be publicly available for download</li>
                <li>Song and level files will be extracted for non-vfx conversion</li>
                <li>The level files will be used for analysis and general analytics</li>
              </ul>
              <h3><b><u>By uploading a zip file, you hereby confirm that:</u></b></h3>
              <ul>
                <li>You have read and understood the terms of service of the CDN</li>
                <li>The file is not of malicious nature, does not contain any harmful content or personal data</li>
                <li className="important"><u>All files</u> in the zip are allowed to be distributed by their respective owners</li>
                <li className="important">You are uploading a level that you created yourself or acquired explicit rights to</li>
              </ul>
              <p><b>If you agree to these terms and fail to comply, <u>we will suspend you from further use of the CDN upload feature.</u></b></p>
              <p>If you do not agree to these terms, you must not upload your files to our servers and instead use external file sharing websites.</p>

            </section>

            <section className="terms-section">
              <h2>Changes to Terms</h2>
              <p>We reserve the right to modify or replace 
                these Terms at any time. If a revision is material, 
                we will provide at least 30 days&apos; notice prior to any new 
                terms taking effect. What constitutes a material change 
                will be determined at our sole discretion.</p>
            </section>

            <section className="terms-section">
            <h2>Contact Us</h2>
              <p>If you have any questions about our Terms of Service, please contact managers on our Discord server:</p>

                <p>Discord: <button className="discord-button" onClick={() => window.open("https://discord.gg/MaW353r8xg", "_blank")}>Join</button></p>

            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default TermsOfServicePage; 