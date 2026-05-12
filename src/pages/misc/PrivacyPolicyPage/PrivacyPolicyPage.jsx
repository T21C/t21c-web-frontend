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
                This Privacy Policy describes how The Universal Forums (&quot;TUF,&quot; &quot;we,&quot;
                &quot;us,&quot; or &quot;our&quot;) collects, uses, discloses, and otherwise processes
                personal information in connection with our website and related services (the
                &quot;Services&quot;). This Privacy Policy applies to personal information we process
                when you access or use the Services, create an account, or otherwise interact with us
                in relation to the Services.
              </p>
              <p>
                By accessing or using the Services, you acknowledge that you have read this Privacy
                Policy. If you do not agree with this Privacy Policy, you must not use the Services.
              </p>
              <p className="last-updated">
                <strong>Effective date / Last updated:</strong> May 12, 2026
              </p>
            </section>

            <section className="privacy-section">
              <h2>1. Definitions</h2>
              <p>For purposes of this Privacy Policy:</p>
              <ul>
                <li>
                  <strong>Personal Information</strong> means information that identifies, relates
                  to, describes, or is reasonably capable of being associated with an identified or
                  identifiable individual, including the categories described in Section 3.
                </li>
                <li>
                  <strong>User Content</strong> means content you submit, upload, or otherwise make
                  available through the Services (for example, levels, passes, images, metadata, and
                  related media such as video links).
                </li>
                <li>
                  <strong>Services</strong> means the TUF website and related features and
                  functionality we make available to users.
                </li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>2. Data Controller</h2>
              <p>
                For purposes of applicable data protection laws, TUF is the operator of the Services
                and determines the purposes and means of processing Personal Information described in
                this Privacy Policy, except where we process Personal Information solely on behalf of
                a third party as a processor or service provider (for example, certain payment
                processing performed by payment vendors).
              </p>
            </section>

            <section className="privacy-section">
              <h2>3. Categories of Personal Information We Collect</h2>
              <p>
                We limit collection to what we reasonably believe is necessary to operate, secure, and
                improve the Services. Depending on how you use the Services, we may collect the
                following categories of Personal Information:
              </p>
              <div className="data-categories">
                <div className="data-category">
                  <h3>Account and profile information</h3>
                  <p>Information you provide when you register or maintain an account, which may include:</p>
                  <ul>
                    <li>Username and display name.</li>
                    <li>Email address (if you provide one or it is required for account functionality).</li>
                    <li>
                      Credentials (passwords are stored using one-way hashing; we do not store
                      plaintext passwords).
                    </li>
                    <li>Miscellaneous information you provide, such as a profile picture, a bio, or a banner image.</li>
                    <li>
                      Billing and purchase metadata when you use paid features (for example, transaction references and
                      entitlement fulfillment records associated with your account).
                    </li>
                  </ul>
                </div>
                <div className="data-category">
                  <h3>OAuth and linked accounts</h3>
                  <p>
                    If you choose to connect a Discord account, we may receive certain identifiers and
                    profile information made available through Discord&apos;s OAuth flow (for example,
                    Discord username and user ID), consistent with the permissions you grant and
                    Discord&apos;s terms and policies.
                  </p>
                </div>
                <div className="data-category">
                  <h3>User Content</h3>
                  <p>
                    User Content you submit may include gameplay-related files, images, text, links,
                    and other materials you choose to upload or associate with your account.
                  </p>
                </div>
                <div className="data-category">
                  <h3>Authentication technologies (cookies and local storage)</h3>
                  <p>
                    We use essential technologies needed to operate authenticated sessions, which may
                    include:
                  </p>
                  <ul>
                    <li>Session cookies used to maintain authentication (including access and refresh tokens).</li>
                    <li>Local storage used to store preferences and settings.</li>
                  </ul>
                  <p>
                    We do not use cookies for cross-site tracking, analytics, or targeted advertising
                    as described in this Privacy Policy.
                  </p>
                </div>
              </div>
            </section>

            <section className="privacy-section">
              <h2>4. Legal Bases for Processing (where applicable)</h2>
              <p>
                If you are located in the European Economic Area, the United Kingdom, or Switzerland,
                we process Personal Information on one or more of the following legal bases, as
                applicable: performance of a contract with you (providing the Services); our
                legitimate interests (for example, securing the Services, preventing abuse, and
                improving functionality), where those interests are not overridden by your rights;
                your consent, where consent is required (for example, certain optional integrations);
                and compliance with legal obligations.
              </p>
            </section>

            <section className="privacy-section">
              <h2>5. Purposes of Processing</h2>
              <p>We process Personal Information for the following purposes:</p>
              <ul>
                <li>Providing, operating, maintaining, and improving the Services.</li>
                <li>Authenticating users, administering accounts, and enforcing our policies.</li>
                <li>Storing, hosting, processing, and displaying User Content as part of the Services.</li>
                <li>
                  Communicating with you about service-related notices (for example, security alerts,
                  technical updates, and support responses).
                </li>
                <li>Detecting, investigating, and helping prevent fraud, abuse, and security incidents.</li>
                <li>
                  Processing optional paid features (for example, TUFStellar access purchases), including creating and
                  maintaining billing records, granting and revoking access entitlements, and reconciling transactions
                  with payment processors.
                </li>
                <li>Complying with applicable law and responding to lawful requests.</li>
              </ul>
              <p>
                We do not use Personal Information for purposes that are materially incompatible with
                the purposes described above without providing additional notice where required by
                applicable law.
              </p>
            </section>

            <section className="privacy-section">
              <h2>6. User Content; Visibility; License</h2>
              <p>
                Certain User Content may be publicly accessible or visible to other users depending on
                Service functionality and your settings (where available).
              </p>
              <p>
                Subject to applicable law and except as otherwise agreed, you retain ownership of User
                Content you submit. To the extent permitted by applicable law, you grant TUF a
                non-exclusive, worldwide, royalty-free license to host, store, process, reproduce,
                display, and distribute User Content solely as reasonably necessary to operate,
                secure, and improve the Services (including making User Content available to other
                users where the Service is designed to do so).
              </p>
            </section>

            <section className="privacy-section">
              <h2>7. Disclosure of Personal Information</h2>
              <p>We do not sell Personal Information.</p>
              <p>We may disclose Personal Information in the following circumstances:</p>
              <div className="sharing-partners">
                <div className="partner-card">
                  <h3>Service providers</h3>
                  <p>
                    We may disclose Personal Information to vendors and service providers that perform
                    services on our behalf (for example, hosting, storage, infrastructure, security,
                    communications, and integrations). We instruct such providers to process Personal
                    Information only for the purposes we specify and consistent with this Privacy
                    Policy, subject to appropriate confidentiality and security obligations where
                    required by applicable law.
                  </p>
                </div>
                <div className="partner-card">
                  <h3>Legal, safety, and compliance</h3>
                  <p>
                    We may disclose Personal Information if we reasonably believe disclosure is
                    required to comply with applicable law, regulation, legal process, or governmental
                    request; to enforce our terms and policies; to protect the security or integrity of
                    the Services; or to protect the rights, property, or safety of TUF, our users, or
                    the public, as permitted by applicable law.
                  </p>
                </div>
              </div>
            </section>

            <section className="privacy-section">
              <h2>8. Payments, TUFStellar, and Payment Processors</h2>
              <p>
                Certain optional features of the Services may be offered for a fee (for example, TUFStellar, which
                provides stacked access time on the platform based on the product configuration available at checkout).
                When you choose to purchase a paid feature, payment information is collected and processed by a
                third-party payment processor. We currently use <strong>Stripe, Inc.</strong> and its affiliates as a
                payment processor for eligible purchases. Stripe processes payments subject to its own terms and
                privacy policy, and you should review those documents before completing a transaction:
              </p>
              <ul>
                <li>
                  Stripe Services Agreement:{" "}
                  <a href="https://stripe.com/legal" className="privacy-inline-link" target="_blank" rel="noopener noreferrer">
                    https://stripe.com/legal
                  </a>
                </li>
                <li>
                  Stripe Privacy Policy:{" "}
                  <a href="https://stripe.com/privacy" className="privacy-inline-link" target="_blank" rel="noopener noreferrer">
                    https://stripe.com/privacy
                  </a>
                </li>
              </ul>
              <p>
                We do not intend to store full payment card numbers on our systems for Stripe Checkout flows configured
                in this manner. We may receive and store limited payment-related records needed to operate the Services,
                which may include:
              </p>
              <ul>
                <li>
                  Transaction metadata (for example, payment intent identifiers, checkout session identifiers, currency,
                  amounts, timestamps, and payment status events).
                </li>
                <li>
                  Internal billing event records (for example, webhook payloads or summaries) used for fulfillment,
                  auditability, customer support, fraud prevention, and dispute handling.
                </li>
                <li>
                  Purchase fulfillment data required to grant and revoke access entitlements (for example, associations
                  between a purchase and the account that received access, including gift recipients where applicable).
                </li>
              </ul>
              <p>
                If you purchase access for another user (&quot;gift&quot;), information necessary to deliver the
                entitlement may be processed and retained (for example, recipient identifiers and purchase metadata).
                Commercial terms for gifts—including that gifts may be non-refundable—are described in our Terms of
                Service.
              </p>
              <p>
                We may share Personal Information with Stripe and other service providers strictly as needed to
                process payments, prevent fraud, and operate paid features, consistent with Section 7.
              </p>
            </section>

            <section className="privacy-section">
              <h2>9. Data Retention</h2>
              <p>
                We retain Personal Information for as long as reasonably necessary to fulfill the
                purposes described in this Privacy Policy, unless a longer retention period is
                required or permitted by law (for example, to resolve disputes, enforce agreements, or
                comply with legal obligations).
              </p>
              <p>If you request deletion of your account:</p>
              <ul>
                <li>
                  We will delete or anonymize certain account-related Personal Information (such as
                  email addresses and linked account identifiers) within a reasonable period, subject
                  to applicable law and legitimate retention needs (for example, security logs where
                  required).
                </li>
                <li>
                  User Content may be retained where reasonably necessary for platform integrity,
                  backups, legal compliance, or dispute resolution; where retained, we will take steps
                  designed to disassociate such content from direct identification with you, except
                  where retention is required by law or where deletion is technically infeasible.
                </li>
                <li>
                  You may request deletion of specific User Content where applicable; we will respond
                  consistent with applicable law and technical constraints.
                </li>
              </ul>
            </section>

            <section className="privacy-section">
              <h2>10. Your Privacy Rights</h2>
              <p>
                Depending on your jurisdiction, you may have rights regarding Personal Information,
                which may include, where applicable:
              </p>
              <ul>
                <li>The right to access Personal Information we hold about you.</li>
                <li>The right to rectify inaccurate or incomplete Personal Information.</li>
                <li>The right to delete Personal Information, subject to exceptions under applicable law.</li>
                <li>The right to restrict or object to certain processing.</li>
                <li>The right to data portability, where applicable.</li>
                <li>The right to withdraw consent, where processing is based on consent.</li>
                <li>
                  The right to lodge a complaint with a competent data protection authority (for
                  example, in your country or region of residence).
                </li>
              </ul>
              <p>
                To exercise these rights, contact us using the contact method in Section 17. We may
                need to verify your identity before fulfilling certain requests. We will respond within
                the timeframe required by applicable law, or if no specific timeframe applies, within a
                reasonable period.
              </p>
              <p>
                If you are a California resident, California law may provide additional rights
                (including rights to know, delete, and correct certain Personal Information, and to
                opt out of certain sharing that may be considered a &quot;sale&quot; or
                &quot;sharing&quot; under California law). We state above that we do not sell Personal
                Information; if our practices change, we will update this Privacy Policy as required
                by applicable law.
              </p>
            </section>

            <section className="privacy-section">
              <h2>11. Security</h2>
              <p>
                We implement reasonable technical and organizational measures designed to protect
                Personal Information against unauthorized access, loss, misuse, or alteration.
                However, no method of transmission over the Internet or electronic storage is completely
                secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="privacy-section">
              <h2>12. International Data Transfers</h2>
              <p>
                We may process and store Personal Information in countries other than the country in
                which you reside. Those countries may have data protection laws that differ from the
                laws of your jurisdiction.
              </p>
              <p>
                Where required by applicable law, we will implement appropriate safeguards for
                cross-border transfers (for example, standard contractual clauses or other lawful
                transfer mechanisms). By using the Services, you understand that your Personal
                Information may be transferred to and processed in countries outside your country of
                residence, consistent with this Privacy Policy and applicable law.
              </p>
            </section>

            <section className="privacy-section">
              <h2>13. Cookies and Similar Technologies</h2>
              <p>
                We use only essential cookies and similar technologies that are strictly necessary to
                enable authentication and core Service functionality.
              </p>
              <p>These technologies are not used for cross-site tracking or for advertising analytics.</p>
              <p>
                Where required by applicable law, we rely on exemptions for strictly necessary cookies
                or equivalent technologies used to provide a service explicitly requested by you (such
                as maintaining a logged-in session).
              </p>
            </section>

            <section className="privacy-section">
              <h2>14. Children&apos;s Privacy</h2>
              <p>
                The Services are not directed to children under 16 years of age (or the age required by
                applicable local law for valid consent to online services, if higher). We do not
                knowingly collect Personal Information from children in a manner prohibited by
                applicable law. If you believe we have collected Personal Information from a child in
                violation of applicable law, please contact us and we will take appropriate steps to
                investigate and, where appropriate, delete such information.
              </p>
            </section>

            <section className="privacy-section">
              <h2>15. Third-Party Websites and Services</h2>
              <p>
                The Services may contain links to third-party websites, applications, or services
                (including Discord). This Privacy Policy does not apply to third-party services. Their
                collection, use, and disclosure of information is governed by their respective privacy
                policies, and we encourage you to read those policies carefully.
              </p>
            </section>

            <section className="privacy-section">
              <h2>16. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. If we make material changes, we
                will take steps to notify you as required by applicable law (which may include
                posting an updated policy on this page and updating the &quot;Last updated&quot; date).
                Your continued use of the Services after the effective date of an update constitutes
                your acknowledgment of the updated Privacy Policy, except where prohibited by applicable
                law or where additional consent is required.
              </p>
            </section>

            <section className="privacy-section">
              <h2>17. Contact</h2>
              <p>
                For questions about this Privacy Policy, or to submit requests regarding Personal
                Information (including privacy rights requests, where applicable), you may contact us
                through our Discord community:
              </p>
              <p>
                Discord:{" "}
                <button type="button" className="discord-button" onClick={() => window.open("https://discord.gg/MaW353r8xg", "_blank")}>
                  Join
                </button>
              </p>
              <p>
                If you contact us through Discord, please provide sufficient detail to allow us to
                evaluate and respond to your request, and allow reasonable time for verification and
                processing.
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
