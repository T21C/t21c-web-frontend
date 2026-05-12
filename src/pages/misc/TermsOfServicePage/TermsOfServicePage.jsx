// tuf-search: #TermsOfServicePage #termsOfServicePage #termsOfService
import { Link } from "react-router-dom";
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
        description="Terms of Service for The Universal Forums (TUF), including account rules, content policy, payments, and limitations of liability."
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />

      <div className="terms-of-service">
        <div className="terms-container page-content-70rem">
          <div className="terms-content">
            <section className="terms-section">
              <h1>Terms of Service</h1>
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of the website and related
                services operated by The Universal Forums (&quot;TUF,&quot; &quot;we,&quot; &quot;us,&quot; or
                &quot;our&quot;) (collectively, the &quot;Services&quot;). By accessing or using the Services, you
                agree to be bound by these Terms. If you do not agree, you must not use the Services.
              </p>
              <p className="last-updated">Last updated: May 12, 2026</p>
            </section>

            <section className="terms-section">
              <h2>1. Agreement and updates</h2>
              <p>
                You represent that you have the legal capacity to enter into these Terms. We may modify these Terms from
                time to time. If a change is material, we will provide reasonable advance notice where required by
                applicable law (which may include posting an updated version on this page). Your continued use of the
                Services after the effective date of an update constitutes your acceptance of the revised Terms, except
                where prohibited by law. If you do not agree to the updated Terms, you must stop using the Services.
              </p>
            </section>

            <section className="terms-section">
              <h2>2. Accounts and security</h2>
              <p>
                Certain features require an account. You agree to provide accurate, current, and complete information,
                maintain the confidentiality of your credentials, and promptly notify us of any unauthorized access or
                security incident related to your account. You are responsible for activity that occurs under your
                account, except where caused by our gross negligence or willful misconduct.
              </p>
              <ul>
                <li>We may suspend or terminate accounts that violate these Terms or create risk to the Services or users.</li>
                <li>We may require verification steps to protect account integrity and prevent abuse.</li>
              </ul>
            </section>

            <section className="terms-section">
              <h2>3. Paid features, billing, and TUFStellar</h2>
              <p>
                The Services may include optional paid functionality (for example, TUFStellar access time purchased for
                yourself or gifted to another eligible account). Paid purchases are subject to this Section, our{" "}
                <Link to="/privacy" className="tos-link">
                  Privacy Policy
                </Link>
                , and the terms of our payment processors.
              </p>

              <h3>3.1 Payment processor</h3>
              <p>
                Payments may be processed by third-party payment processors. We currently use Stripe, Inc. and its
                affiliates (&quot;Stripe&quot;) for eligible transactions. Your use of Stripe is subject to Stripe&apos;s
                terms and policies, which you should review before completing a purchase:
              </p>
              <ul>
                <li>
                  <a href="https://stripe.com/legal" className="tos-link" target="_blank" rel="noopener noreferrer">
                    Stripe legal
                    <ExternalLinkIcon size={16} color="currentColor" className="tos-link-icon" aria-hidden />
                  </a>
                </li>
                <li>
                  <a href="https://stripe.com/privacy" className="tos-link" target="_blank" rel="noopener noreferrer">
                    Stripe privacy
                    <ExternalLinkIcon size={16} color="currentColor" className="tos-link-icon" aria-hidden />
                  </a>
                </li>
              </ul>
              <p>
                You authorize us and Stripe to store and continue billing your payment method on file for transactions
                you initiate, consistent with Stripe&apos;s functionality and your account settings. We do not intend
                to store full payment card numbers on our servers for standard Stripe Checkout configurations used by
                the Services.
              </p>

              <h3>3.2 Nature of purchases</h3>
              <p>
                Paid digital access (including TUFStellar entitlements) is provided as a limited, revocable right to use
                the Services in accordance with these Terms. Unless expressly required by applicable law, purchases do
                not confer ownership of software, levels, or other intellectual property beyond the access expressly
                granted.
              </p>

              <h3>3.3 Pricing, taxes, and availability</h3>
              <p>
                Prices, terms, and available purchase options may be displayed at checkout and may change over time.
                Unless otherwise stated, prices are quoted in U.S. dollars. You are responsible for any taxes
                associated with your purchase, except where we are legally required to collect and remit taxes. If a
                purchase cannot be completed due to processor errors, misconfiguration, or eligibility restrictions,
                we may cancel or refuse the transaction and, where payment was captured in error, coordinate a reversal
                consistent with applicable law and processor rules.
              </p>

              <h3>3.4 Fulfillment, records, and entitlements</h3>
              <p>
                We may create and maintain billing records (including internal event logs and webhook-related metadata)
                to evidence purchases, fulfill entitlements, prevent fraud, respond to disputes, and meet legal
                obligations. Access entitlements may be granted, adjusted, or revoked based on payment status, refunds,
                chargebacks, enforcement actions, or technical reconciliation.
              </p>

              <h3>3.5 Refunds (self-purchases)</h3>
              <p>
                Where the Services expose a self-service refund flow for an eligible purchase, refunds are offered only
                in accordance with the rules presented at the time of refund, including eligibility windows imposed by
                payment networks and Stripe (for example, Stripe may prohibit refunds beyond a maximum period after the
                original charge). For purchases that have begun to be consumed, refund amounts may be calculated using a
                published standard monthly rate for consumed time, as described in-product, in order to prevent abusive
                discount arbitrage. Refunds may be partial or full depending on the purchase state and processor rules.
              </p>

              <h3>3.6 Gifts</h3>
              <p>
                <strong>Gifts are not refundable.</strong> When you purchase access for another user, you acknowledge
                that the transaction is final except where a refund is required by applicable law or expressly mandated
                by the payment processor in a manner we can operationalize through the Services. You are responsible
                for selecting the correct recipient.
              </p>

              <h3>3.7 Chargebacks, reversals, and payment disputes</h3>
              <p>
                If a payment is reversed, charged back, or otherwise invalidated, we may revoke associated entitlements
                and take other reasonable actions to protect the integrity of the Services, including restricting
                accounts involved in abuse or non-payment, consistent with applicable law and our policies.
              </p>

              <h3>3.8 No waivers for violations</h3>
              <p>
                These Terms (including enforcement remedies) apply independently of any paid feature. Purchasing access
                does not waive compliance obligations, and we are not obligated to provide refunds as a substitute for
                enforcement where permitted by law.
              </p>
            </section>

            <section className="terms-section">
              <h2>4. User content</h2>
              <p>
                The Services may allow you to submit, upload, link, store, share, or otherwise make available content
                (&quot;User Content&quot;). You are responsible for your User Content and represent that you have the
                rights necessary to submit it.
              </p>
              <div className="content-guidelines">
                <div className="guideline-card">
                  <h3>Prohibited content</h3>
                  <p>
                    You may not post content that is illegal, harmful, threatening, abusive, harassing, defamatory,
                    vulgar, obscene, hateful, or otherwise objectionable, or that infringes third-party rights.
                  </p>
                </div>
                <div className="guideline-card">
                  <h3>License to operate the Services</h3>
                  <p>
                    You retain ownership of your User Content to the extent you own it. You grant TUF a non-exclusive,
                    worldwide, royalty-free license to host, store, reproduce, process, adapt, publish, display, and
                    distribute User Content solely as reasonably necessary to operate, secure, and improve the Services
                    (including making User Content available to other users where the Services are designed to do so).
                  </p>
                </div>
                <div className="guideline-card">
                  <h3>Moderation and removal</h3>
                  <p>
                    We may remove or restrict User Content that violates these Terms or that we reasonably believe creates
                    risk to users, the Services, or third parties, without prior notice where permitted by law.
                  </p>
                </div>
              </div>
            </section>

            <section className="terms-section">
              <h2>5. Intellectual property</h2>
              <p>
                The Services and their content (excluding User Content) are owned by TUF or its licensors and are
                protected by intellectual property laws. The website source code is available under applicable open
                source terms and can be found{" "}
                <a href="https://github.com/orgs/T21C/repositories" className="tos-link" target="_blank" rel="noopener noreferrer">
                  here
                  <ExternalLinkIcon size={16} color="#4a9eff" className="tos-link-icon" aria-hidden />
                </a>
                .
              </p>
            </section>

            <section className="terms-section">
              <h2>6. Termination and suspension</h2>
              <p>
                We may suspend or terminate access to the Services, in whole or in part, if you breach these Terms, create
                security or legal risk, or where we are required to do so by law. You may stop using the Services at any
                time. Provisions that by their nature should survive termination (including intellectual property,
                disclaimers, limitations of liability, and dispute-related terms) will survive.
              </p>
            </section>

            <section className="terms-section">
              <h2>7. Disclaimers</h2>
              <p>
                THE SERVICES ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS, WITHOUT WARRANTIES
                OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
                FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT, TO THE MAXIMUM EXTENT PERMITTED BY
                APPLICABLE LAW.
              </p>
            </section>

            <section className="terms-section">
              <h2>8. Limitation of liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TUF AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
                DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE
                THE SERVICES. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, OUR AGGREGATE LIABILITY FOR ALL CLAIMS
                RELATING TO THE SERVICES WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID TO US FOR THE SERVICES
                IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO LIABILITY, OR (B) FIFTY U.S. DOLLARS (US$50),
                IF YOU HAVE NOT HAD ANY SUCH PAYMENT.
              </p>
            </section>

            <section className="terms-section cdn-terms">
              <h2>9. Content delivery network (CDN)</h2>
              <p>If you use our CDN upload features, the following applies in addition to these Terms:</p>
              <ul>
                <li>Your uploaded archive may be stored and may be requested for deletion by you or other eligible parties as described by Service functionality.</li>
                <li>Your archive may be made publicly available for download where the Service is designed to do so.</li>
                <li>Song and level files may be extracted for processing (including non-VFX conversion workflows).</li>
                <li>Level files may be used for analysis and platform analytics consistent with our Privacy Policy.</li>
              </ul>
              <p>
                <strong>By uploading an archive, you confirm that:</strong> you have read and understood these CDN
                terms; the file is not malicious and does not contain harmful content or unauthorized personal data;
                all files in the archive are permitted to be distributed by their respective rights holders; and you
                are uploading content you created or for which you have explicit rights to distribute.
              </p>
              <p>
                If you violate these CDN terms, we may suspend your ability to upload to our infrastructure. If you do
                not agree, do not upload files to our servers and use external hosting instead.
              </p>
            </section>

            <section className="terms-section">
              <h2>10. Contact</h2>
              <p>For questions about these Terms, contact managers on our Discord server:</p>
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

export default TermsOfServicePage;
