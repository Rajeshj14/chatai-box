import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const LOGO_SRC = "/gmlogo1.webp";
const REDIRECT_SECONDS = 12;

export const Route = createFileRoute("/thank-you")({
  component: ThankYouPage,
  head: () => ({
    title: "Thank You - Growth Makers",
    meta: [
      {
        name: "description",
        content: "Thank you for your inquiry. Our team will be in touch shortly.",
      },
    ],
  }),
});

function ThankYouPage() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [visible, setVisible] = useState(false);
  const pixelFired = useRef(false);

  const search = Route.useSearch() as {
    firstName?: string;
    email?: string;
  };

  const firstName = search.firstName || "there";
  const email = search.email || "your inbox";

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (pixelFired.current || typeof window === "undefined" || !window.fbq) return;

    window.fbq("track", "Lead", {
      content_name: "Growth Makers Consultation Form",
      status: "submitted",
    });
    window.fbq("track", "SubmitApplication");
    pixelFired.current = true;
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      navigate({ to: "/" });
      return;
    }

    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <main className={`thank-page${visible ? " is-visible" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Jost:wght@300;400;500&display=swap');

        * { box-sizing: border-box; }

        @keyframes riseIn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes drawRing {
          from { stroke-dashoffset: 210; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes drawTick {
          from { stroke-dashoffset: 54; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes countShrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }

        .thank-page {
          min-height: 100vh;
          width: 100%;
          background:
            linear-gradient(135deg, rgba(7, 155, 143, 0.16), transparent 28%),
            radial-gradient(circle at 78% 18%, rgba(22, 198, 179, 0.08), transparent 34%),
            #030607;
          color: #f7fbfb;
          font-family: 'Jost', sans-serif;
          font-weight: 300;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .thank-page::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(143, 184, 192, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(143, 184, 192, 0.04) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 86%);
          pointer-events: none;
        }

        .top-progress {
          height: 2px;
          background: #071113;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }

        .top-progress span {
          display: block;
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, #079b8f, #c8edf2);
          transform-origin: left;
          animation: countShrink ${REDIRECT_SECONDS}s linear forwards;
        }

        .thank-header {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 28px clamp(24px, 5vw, 64px);
          border-bottom: 1px solid rgba(18, 48, 57, 0.85);
        }

        .brand-block img {
          display: block;
          width: min(170px, 46vw);
          height: auto;
          object-fit: contain;
        }

        .brand-kicker,
        .status-pill,
        .section-kicker,
        .redirect-text,
        .home-button,
        .step-index {
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .brand-kicker {
          color: #8fb8c0;
          margin-top: 6px;
        }

        .status-pill {
          border: 1px solid rgba(7, 155, 143, 0.55);
          color: #c8edf2;
          padding: 10px 14px;
          background: rgba(7, 155, 143, 0.08);
          white-space: nowrap;
        }

        .thank-shell {
          position: relative;
          z-index: 1;
          flex: 1;
          width: min(1120px, calc(100% - 48px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.72fr);
          gap: clamp(28px, 5vw, 70px);
          align-items: center;
          padding: clamp(42px, 7vw, 82px) 0;
        }

        .hero-copy,
        .next-panel {
          opacity: 0;
          animation: riseIn 0.7s ease forwards;
        }

        .thank-page.is-visible .hero-copy { animation-delay: 0.05s; }
        .thank-page.is-visible .next-panel { animation-delay: 0.18s; }

        .section-kicker {
          color: #16c6b3;
          margin-bottom: 18px;
        }

        .success-mark {
          width: 86px;
          height: 86px;
          margin-bottom: 30px;
          filter: drop-shadow(0 0 26px rgba(7, 155, 143, 0.28));
        }

        .success-mark circle,
        .success-mark path {
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .success-mark circle {
          stroke: #079b8f;
          stroke-width: 1.5;
          stroke-dasharray: 210;
          stroke-dashoffset: 210;
          animation: drawRing 0.9s ease forwards 0.2s;
        }

        .success-mark path {
          stroke: #c8edf2;
          stroke-width: 2.3;
          stroke-dasharray: 54;
          stroke-dashoffset: 54;
          animation: drawTick 0.55s ease forwards 0.85s;
        }

        h1 {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(54px, 8vw, 112px);
          font-weight: 300;
          line-height: 0.9;
          letter-spacing: 0;
          color: #f8ffff;
          margin: 0;
          max-width: 760px;
        }

        h1 span {
          color: #16c6b3;
          font-style: italic;
        }

        .lead {
          color: #b7d7dc;
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(22px, 2.4vw, 32px);
          line-height: 1.35;
          margin: 28px 0 0;
          max-width: 640px;
        }

        .email-line {
          margin-top: 26px;
          color: #8fb8c0;
          font-size: 13px;
          line-height: 1.8;
        }

        .email-line strong {
          color: #f7fbfb;
          font-weight: 400;
          word-break: break-word;
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-top: 40px;
        }

        .home-button {
          border: 1px solid #079b8f;
          background: #079b8f;
          color: #030607;
          cursor: pointer;
          padding: 15px 20px;
          font-family: 'Jost', sans-serif;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .home-button:hover {
          opacity: 0.84;
          transform: translateY(-1px);
        }

        .redirect-text {
          color: #8fb8c0;
        }

        .next-panel {
          border: 1px solid rgba(18, 48, 57, 0.95);
          background: rgba(3, 6, 7, 0.72);
          padding: clamp(24px, 4vw, 34px);
          position: relative;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
        }

        .next-panel::before,
        .next-panel::after {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: #079b8f;
          pointer-events: none;
        }

        .next-panel::before {
          top: -1px;
          left: -1px;
          border-top: 1px solid;
          border-left: 1px solid;
        }

        .next-panel::after {
          right: -1px;
          bottom: -1px;
          border-right: 1px solid;
          border-bottom: 1px solid;
        }

        .panel-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 34px;
          font-weight: 300;
          line-height: 1;
          margin: 0 0 28px;
          color: #f8ffff;
        }

        .next-step {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr);
          gap: 16px;
          padding: 18px 0;
          border-top: 1px solid #071113;
        }

        .next-step:last-child {
          border-bottom: 1px solid #071113;
        }

        .step-index {
          color: #16c6b3;
          padding-top: 4px;
        }

        .step-title {
          color: #f7fbfb;
          font-size: 13px;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .step-copy {
          color: #8fb8c0;
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          line-height: 1.45;
        }

        .thank-footer {
          position: relative;
          z-index: 1;
          border-top: 1px solid rgba(18, 48, 57, 0.85);
          padding: 16px clamp(24px, 5vw, 64px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          color: #5f8f98;
          font-size: 10px;
          letter-spacing: 2.5px;
          text-transform: uppercase;
        }

        @media (max-width: 860px) {
          .thank-header {
            align-items: flex-start;
            padding: 22px 24px;
          }

          .status-pill {
            display: none;
          }

          .thank-shell {
            width: min(100% - 40px, 620px);
            grid-template-columns: 1fr;
            align-items: start;
            padding: 34px 0 28px;
          }

          .success-mark {
            width: 72px;
            height: 72px;
            margin-bottom: 24px;
          }

          .lead {
            margin-top: 22px;
          }

          .action-row {
            margin-top: 30px;
          }

          .home-button {
            width: 100%;
          }

          .next-panel {
            padding: 24px 20px;
          }

          .thank-footer {
            flex-direction: column;
            align-items: flex-start;
            padding: 16px 24px 22px;
          }
        }
      `}</style>

      <div className="top-progress" aria-hidden="true">
        <span />
      </div>

      <header className="thank-header">
        <div className="brand-block">
          <img src={LOGO_SRC} alt="Growth Makers" />
          <div className="brand-kicker">Fining the Digital Gap</div>
        </div>
        <div className="status-pill">Submission Received</div>
      </header>

      <section className="thank-shell" aria-label="Consultation submission confirmation">
        <div className="hero-copy">
          <svg className="success-mark" viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="33" />
            <path d="M25 41.5 35.2 51 56 29" />
          </svg>

          <div className="section-kicker">Private Consultation Confirmed</div>
          <h1>
            Thank you,
            <br />
            <span>{firstName}.</span>
          </h1>
          <p className="lead">
            Your brief has been received. Our strategy team will review your goals and reach out
            with the next step shortly.
          </p>
          <div className="email-line">
            Confirmation details are connected to <strong>{email}</strong>
          </div>

          <div className="action-row">
            <button className="home-button" onClick={() => navigate({ to: "/" })}>
              Return Home
            </button>
            <div className="redirect-text">Auto redirect in {countdown}s</div>
          </div>
        </div>

        <aside className="next-panel">
          <div className="section-kicker">What Happens Next</div>
          <h2 className="panel-title">A focused review before we speak.</h2>

          <div className="next-step">
            <div className="step-index">01</div>
            <div>
              <div className="step-title">Brief Review</div>
              <div className="step-copy">
                We study your responses, goals, timeline, and the services you selected.
              </div>
            </div>
          </div>

          <div className="next-step">
            <div className="step-index">02</div>
            <div>
              <div className="step-title">Strategy Fit</div>
              <div className="step-copy">
                Our team maps the strongest direction for visibility, leads, and authority.
              </div>
            </div>
          </div>

          <div className="next-step">
            <div className="step-index">03</div>
            <div>
              <div className="step-title">Personal Follow-Up</div>
              <div className="step-copy">
                You will receive a call or message with the next consultation details.
              </div>
            </div>
          </div>
        </aside>
      </section>

      <footer className="thank-footer">
        <span>Growth Makers consultation desk</span>
        <span>Confidential strategy enquiry</span>
      </footer>
    </main>
  );
}
