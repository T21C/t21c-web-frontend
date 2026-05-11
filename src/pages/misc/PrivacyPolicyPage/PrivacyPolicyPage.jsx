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
              <p>
                At The Universal Forums (TUF), we take your privacy seriously. This Privacy Policy
                explains how we collect, use, disclose, and safeguard your information when you use
                our website and services.
              </p>
              <p>By using TUF, you agree to the collection and use of information in accordance with this policy.</p>
              <p className="last-updated">
                <strong>Last Updated:</strong> May 12, 2026
              </p>
            </section>

            <section className="privacy-section">
              <h2>1. Information We Collect</h2>
              <p>We collect only the information necessary to operate and maintain our services.</p>
              <div className="data-categories">
                <div className="data-category">
                  <h3>Personal Information</h3>
                  <p>Information you provide directly:</p>
                  <ul>
                    <li>Username and display name.</li>
                    <li>Email address (if applicable).</li>
                    <li>Password (securely hashed; we do not store plaintext passwords).</li>
                    <li>Profile picture.</li>
                    <li>
                      Discord account information (such as username and user ID) obtained through
                      Discord OAuth when you choose to connect your account.
                    </li>
                    <li>
                      Content you submit, such as levels, passes, images, and associated media (e.g.
                      video links).
                    </li>
                  </ul>
                </div>
                <div className="data-category">
                  <h3>Cookies and Storage</h3>
                  <p>We use only essential authentication technologies:</p>
                  <ul>
                    <li>Session cookies (access and refresh tokens).</li>
                    <li>Local storage for preferences and settings.</li>
                  </ul>
                  <p>We do not use cookies for tracking, analytics, or advertising.</p>
                </div>
              </div>
            </section>

            <section className="privacy-section">
              <h2>2. How We Use Your Information</h2>
              <p>We use your information only for the following purposes:</p>
              <ul>
                <li>To provide and maintain our services.</li>
                <li>To authenticate users and manage accounts.</li>
                <li>To store and display user-generated content (such as levels and passes).</li>
                <li>To communicate important service-related notices (e.g. updates, security alerts).</li>
                <li>To provide user support.</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>3. User-Generated Content</h2>
              <p>
                Content you upload (such as levels, passes, images, and related data) may be publicly
                accessible.
              </p>
              <p>
                You retain ownership of your content. By uploading content, you grant TUF a
                non-exclusive license to store, process, and display that content for the purpose of
                operating the platform.
              </p>
            </section>

            <section className="privacy-section">
              <h2>4. Sharing Your Information</h2>
              <p>We do not sell your personal data.</p>
              <p>We may share your information only in the following cases:</p>
              <div className="sharing-partners">
                <div className="partner-card">
                  <h3>Service Providers</h3>
                  <p>
                    We may use trusted third-party services to operate our platform (e.g. hosting,
                    storage, or integrations). These providers only process data as necessary.
                  </p>
                </div>
                <div className="partner-card">
                  <h3>Legal Requirements</h3>
                  <p>We may disclose information if required to do so by applicable law or valid legal requests.</p>
                </div>
              </div>
            </section>

            <section className="privacy-section">
              <h2>5. Payments (if applicable)</h2>
              <p>
                If paid features or subscriptions are introduced, payments are processed by
                third-party providers (e.g. Stripe).
              </p>
              <p>
                We do not store or have access to full payment details (e.g. credit card numbers).
                These providers handle payment data according to their own privacy policies.
              </p>
            </section>

            <section className="privacy-section">
              <h2>6. Data Retention</h2>
              <p>We retain personal data only for as long as necessary to provide our services.</p>
              <p>If you delete your account:</p>
              <ul>
                <li>
                  Personal data (such as email and linked accounts) will be deleted or anonymized
                  within a reasonable period.
                </li>
                <li>
                  User-generated content (such as levels) may be retained for platform integrity but
                  will no longer be associated with your identity.
                </li>
                <li>You may request permanent deletion of your content where applicable.</li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>7. Your Rights</h2>
              <p>Depending on your location, you may have rights including:</p>
              <ul>
                <li>Access to the personal data we hold about you.</li>
                <li>Correction of inaccurate data.</li>
                <li>Deletion of your data.</li>
                <li>Withdrawal of consent.</li>
                <li>Data portability.</li>
                <li>Objection to certain processing.</li>
              </ul>
              <p>To exercise these rights, contact us using the details below.</p>
            </section>

            <section className="privacy-section">
              <h2>8. Data Security</h2>
              <p>
                We implement reasonable technical and organizational safeguards to protect your
                information. However, no system is completely secure, and we cannot guarantee
                absolute security.
              </p>
            </section>

            <section className="privacy-section">
              <h2>9. International Data Transfers</h2>
              <p>Your information may be processed on servers located outside your country of residence.</p>
              <p>By using our services, you consent to such transfers.</p>
            </section>

            <section className="privacy-section">
              <h2>10. Cookies</h2>
              <p>We use only essential cookies required for authentication.</p>
              <p>These cookies:</p>
              <ul>
                <li>Do not track your activity.</li>
                <li>Do not collect analytics or advertising data.</li>
              </ul>
              <p>By using your account, you agree to the use of these necessary cookies.</p>
            </section>

            <section className="privacy-section">
              <h2>11. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Changes will be posted on this
                page with an updated &quot;Last Updated&quot; date.
              </p>
            </section>

            <section className="privacy-section">
              <h2>12. Contact Us</h2>
              <p>
                If you have any questions or requests regarding your data, you may contact us via
                our Discord server:
              </p>
              <p>
                Discord:{" "}
                <button type="button" className="discord-button" onClick={() => window.open("https://discord.gg/MaW353r8xg", "_blank")}>
                  Join
                </button>
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PrivacyPolicyPage;
