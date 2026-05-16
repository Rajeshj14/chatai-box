import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const LOCAL_STORAGE_KEY = "hakaConsultationSubmissions";
const LOGO_SRC = "/gmlogo1.webp";
const CONSULTATION_VIDEO_SRC = "/adss.mov";

type Step =
  | "name"
  | "phone"
  | "email"
  | "location"
  | "instagram"
  | "profession"
  | "brandingGoal"
  | "investment"
  | "decisionMaker"
  | "startTimeline"
  | "cameraComfort"
  | "consultationDate"
  | "services"
  | "summary"
  | "done";

interface FormData {
  name: string;
  phone: string;
  email: string;
  location: string;
  instagram: string;
  profession: string;
  brandingGoal: string;
  investment: string;
  decisionMaker: string;
  startTimeline: string;
  cameraComfort: string;
  consultationDate: string;
  services: string[];
}

interface StoredSubmission extends FormData {
  submittedAt: string;
}

const SERVICES = [
  "Digital Marketing",
  "Website Development",
  "App Development",
  "Photography & Videography",
  "Performance Marketing",
  "Social Media Management",
  "Video Editing",
  "Personal Branding",
];

const TIME_SLOTS = ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"];

const OPTIONS: Partial<Record<Step, string[]>> = {
  profession: ["Doctor", "Clinic Owner", "Healthcare Professional", "Business Owner"],
  brandingGoal: [
    "Get more patient/client enquiries",
    "Build authority and visibility",
    "Generate leads through social media",
    "Improve online presence",
  ],
  investment: [
    "Yes - I'm aligned with the ₹1.5 lac + GST/month investment.",
    "No - I'm okay growing at my current pace.",
  ],
  decisionMaker: ["Yes", "No", "Need to discuss with my team/partner"],
  startTimeline: ["Immediately", "Within 1 month", "Just exploring"],
  cameraComfort: ["Yes", "No", "May be - Will need training."],
};

const PROMPTS: Record<Exclude<Step, "summary" | "done">, string> = {
  name: "May we begin with your full name?",
  phone: "Your phone number, please?",
  email: "And your email address?",
  location: "Where in the world are you based?",
  instagram: "What's your Instagram handle? Please provide the link.",
  profession: "What best describes your profession?",
  brandingGoal: "What is your primary goal with personal branding?",
  investment: "Are you open to investing ₹1.5 lac + GST/month in personal branding?",
  decisionMaker: "Are you the decision-maker for this project?",
  startTimeline: "How soon are you planning to start?",
  cameraComfort: "Are you comfortable facing the camera and speaking?",
  consultationDate: "Please pick your preferred consultation date and time.",
  services: "Which of our ateliers interest you?",
};

const STEP_ORDER: Step[] = [
  "name",
  "phone",
  "email",
  "location",
  "instagram",
  "profession",
  "brandingGoal",
  "investment",
  "decisionMaker",
  "startTimeline",
  "cameraComfort",
  "consultationDate",
  "services",
  "summary",
];

const ATELIER_LEFT = ["Strategy", "Development", "Performance"];
const ATELIER_RIGHT = ["Design", "Cinematography", "Storytelling"];

interface Message {
  id: number;
  type: "bot" | "user";
  text: string;
}

const isValidEmail = (value: string) => /^?[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

function saveSubmissionToLocalStorage(formData: FormData) {
  if (typeof window === "undefined") return;

  try {
    const existing = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    let submissions: StoredSubmission[] = [];

    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        if (Array.isArray(parsed)) submissions = parsed;
      } catch (error) {
        console.error("Unable to parse stored submissions, resetting storage:", error);
        submissions = [];
      }
    }

    submissions.push({
      ...formData,
      submittedAt: new Date().toISOString(),
    });

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(submissions));
    console.info("Saved consultation submission to localStorage.");
  } catch (error) {
    console.error("Failed to save submission to localStorage:", error);
    // localStorage can be blocked, full, or contain invalid data.
  }
}

export function HakaConsultation() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("name");
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [data, setData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    location: "",
    instagram: "",
    profession: "",
    brandingGoal: "",
    investment: "",
    decisionMaker: "",
    startTimeline: "",
    cameraComfort: "",
    consultationDate: "",
    services: [],
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const didInit = useRef(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const pushBot = (text: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      idRef.current++;
      setMessages((m) => [...m, { id: idRef.current, type: "bot", text }]);
    }, 900);
  };

  const pushUser = (text: string) => {
    idRef.current++;
    setMessages((m) => [...m, { id: idRef.current, type: "user", text }]);
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setTimeout(() => pushBot(PROMPTS.name), 400);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, submitting]);

  useEffect(() => {
    if (!OPTIONS[step] && step !== "services" && step !== "summary") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  const advance = (value: string) => {
    if (step === "email" && !isValidEmail(value)) {
      pushUser(value);
      setTimeout(() => pushBot("That email address looks incorrect. Please provide a valid email like name@example.com."), 400);
      return;
    }

    pushUser(value);
    const next: Partial<Record<Step, Step>> = {
      name: "phone",
      phone: "email",
      email: "location",
      location: "instagram",
      instagram: "profession",
      profession: "brandingGoal",
      brandingGoal: "investment",
      investment: "decisionMaker",
      decisionMaker: "startTimeline",
      startTimeline: "cameraComfort",
      cameraComfort: "consultationDate",
      consultationDate: "services",
    };
    const nextStep = next[step];
    if (nextStep) {
      setData((d) => ({ ...d, [step]: value }));
      setStep(nextStep);
      pushBot(PROMPTS[nextStep as Exclude<Step, "summary" | "done">]);
    }
  };

  const confirmServices = () => {
    if (!selected.length) return;
    pushUser(selected.join(" · "));
    setData((d) => ({ ...d, services: selected }));
    setTimeout(() => {
      pushBot("A perfect brief. Allow us to present your summary.");
      setStep("summary");
    }, 400);
  };

  // ── Save locally, then navigate ──────────────────
  const finish = (finalData: FormData) => {
    setSubmitting(true);
    saveSubmissionToLocalStorage(finalData);

    const firstName = finalData.name.split(" ")[0] || "";
    navigate({ to: "/thank-you", search: { firstName, email: finalData.email } });
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const chapterNum = String(stepIndex + 1).padStart(2, "0");
  const totalNum = String(STEP_ORDER.length).padStart(2, "0");

  const renderConsultationVideo = (className = "") => (
    <div className={`consult-video${className ? ` ${className}` : ""}`}>
      <div className="consult-video-frame">
        <video
          src={CONSULTATION_VIDEO_SRC}
          controls
          autoPlay
          loop
          playsInline
          preload="metadata"
          poster={LOGO_SRC}
        />
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        background: "#030607",
        color: "#FAFAFA",
        fontFamily: "'Jost', sans-serif",
        fontWeight: 300,
        overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Jost:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .no-scroll::-webkit-scrollbar { display: none; }
        .no-scroll { scrollbar-width: none; }

        @keyframes msgRise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-rise { animation: msgRise 0.5s ease forwards; }

        @keyframes dotPulse {
          0%,80%,100% { opacity: 0.25; transform: scale(1); }
          40%          { opacity: 1; transform: scale(1.4); }
        }
        .tdot { animation: dotPulse 1.4s infinite ease-in-out; }
        .tdot:nth-child(2) { animation-delay: 0.2s; }
        .tdot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          width: 12px; height: 12px;
          border: 1px solid #8fb8c0;
          border-top-color: #079b8f;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }

        .svc-btn {
          background: transparent;
          border: 1px solid #123039;
          color: #8fb8c0;
          padding: 8px 12px;
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .svc-btn:hover { border-color: #079b8f; color: #ffffff; }
        .svc-btn.on { border-color: #079b8f; color: #FFFFFF; background: rgba(7,155,143,0.12); }

        .confirm-btn {
          background: none;
          border: none;
          border-bottom: 1px solid #079b8f;
          color: #FFFFFF;
          font-family: 'Jost', sans-serif;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 3px;
          text-transform: uppercase;
          cursor: pointer;
          padding: 3px 0;
          transition: opacity 0.2s;
        }
        .confirm-btn:hover { opacity: 0.65; }
        .confirm-btn:disabled { opacity: 0.18; cursor: default; }

        .finish-btn {
          background: #079b8f;
          border: none;
          color: #030607;
          font-family: 'Jost', sans-serif;
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 4px;
          text-transform: uppercase;
          padding: 14px 0;
          cursor: pointer;
          width: 100%;
          margin-top: 10px;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .finish-btn:hover:not(:disabled) { opacity: 0.82; }
        .finish-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .input-field {
          background: transparent;
          border: none;
          outline: none;
          color: #FAFAFA;
          font-family: 'Cormorant Garamond', serif;
          font-size: max(16px, 18px);
          font-weight: 300;
          font-style: italic;
          letter-spacing: 0.5px;
          flex: 1;
          padding: 0;
          width: 100%;
        }
        .input-field::placeholder { color: #8fb8c0; font-style: italic; }

        .send-btn {
          background: transparent;
          border: none;
          color: #8fb8c0;
          font-family: 'Jost', sans-serif;
          font-size: 9px;
          font-weight: 300;
          letter-spacing: 3.5px;
          text-transform: uppercase;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
          flex-shrink: 0;
        }
        .send-btn:hover { color: #079b8f; }

        .atelier-item {
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #8fb8c0;
          line-height: 2.4;
          transition: color 0.2s;
        }
        .atelier-item:hover { color: #079b8f; }

        .consult-video {
          width: min(100%, 460px);
          margin-top: 24px;
          border: 1px solid #123039;
          background:
            linear-gradient(135deg, rgba(7,155,143,0.13), rgba(3,6,7,0.22) 42%),
            #050a0b;
          position: relative;
          overflow: hidden;
        }

        .consult-video::before,
        .consult-video::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          border-color: #079b8f;
          pointer-events: none;
          z-index: 2;
        }

        .consult-video::before {
          top: -1px;
          left: -1px;
          border-top: 1px solid;
          border-left: 1px solid;
        }

        .consult-video::after {
          right: -1px;
          bottom: -1px;
          border-right: 1px solid;
          border-bottom: 1px solid;
        }

        .consult-video-frame {
          width: 100%;
          height: min(110vh, 1000px);
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
        }

        .consult-video-frame video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          background: #030607;
        }

        .mobile-consult-video {
          width: 100%;
          max-width: 360px;
          margin: 18px auto 0;
        }

        .mobile-consult-video .consult-video-frame {
          height: min(100dvh, 650px);
        }
      `}</style>

      {/* ═══════════════════════════════
          LEFT / MOBILE HEADER
      ═══════════════════════════════ */}
      {isMobile ? (
        <div
          style={{
            borderBottom: "1px solid #123039",
            padding: "20px 24px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <div>
            <img
              src={LOGO_SRC}
              alt="Growth Makers"
              style={{
                display: "block",
                width: "min(150px, 46vw)",
                height: "auto",
                objectFit: "contain",
              }}
            />
            <div
              style={{
                fontSize: "8px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "#8fb8c0",
                marginTop: "4px",
              }}
            >
              Fining the Digital Gap
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "8px",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: "#8fb8c0",
                marginBottom: "3px",
              }}
            >
              Chapter
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "22px",
                fontWeight: 300,
                color: "#c8edf2",
                lineHeight: 1,
              }}
            >
              {chapterNum}
              <span style={{ fontSize: "13px", color: "#4f858f", margin: "0 4px" }}>/</span>
              <span style={{ fontSize: "13px", color: "#4f858f" }}>{totalNum}</span>
            </div>
          </div>
          {renderConsultationVideo("mobile-consult-video")}
        </div>
      ) : (
        <div
          style={{
            width: "38%",
            minHeight: "100vh",
            borderRight: "1px solid #123039",
            display: "flex",
            flexDirection: "column",
            padding: "36px 40px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "#079b8f",
              marginBottom: "10px",
            }}
          >
            Maison
          </div>
          <img
            src={LOGO_SRC}
            alt="Growth Makers"
            style={{
              display: "block",
              width: "min(270px, 100%)",
              height: "auto",
              objectFit: "contain",
            }}
          />
          <div
            style={{ width: "36px", height: "1px", background: "#079b8f", margin: "18px 0 0" }}
          />
          {renderConsultationVideo()}
          <div style={{ marginTop: "auto", paddingBottom: "28px" }}>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(20px, 2vw, 26px)",
                fontWeight: 300,
                fontStyle: "italic",
                color: "#8fb8c0",
                lineHeight: 1.45,
                maxWidth: "300px",
              }}
            >
              "We don't build campaigns.
              <br />
              We compose <span style={{ color: "#079b8f" }}>legacies.</span>"
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "24px" }}>
              <div style={{ width: "40px", height: "1px", background: "#079b8f" }} />
              <span
                style={{
                  fontSize: "8px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "#8fb8c0",
                }}
              >
                The House of Growmedico
              </span>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #123039", paddingTop: "22px" }}>
            <div
              style={{
                fontSize: "8px",
                letterSpacing: "4px",
                textTransform: "uppercase",
                color: "#079b8f",
                marginBottom: "14px",
                textAlign: "center",
              }}
            >
              Atelier
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ flex: 1 }}>
                {ATELIER_LEFT.map((a) => (
                  <div key={a} className="atelier-item">
                    {a}
                  </div>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                {ATELIER_RIGHT.map((a) => (
                  <div key={a} className="atelier-item">
                    {a}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "20px",
              paddingTop: "14px",
              borderTop: "1px solid #123039",
            }}
          >
            <span
              style={{
                fontSize: "8px",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: "#4f858f",
              }}
            >
              Established Excellence
            </span>
            <span style={{ fontSize: "8px", letterSpacing: "2px", color: "#4f858f" }}>MMXXIV</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════
          RIGHT PANEL — conversation
      ═══════════════════════════════ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: isMobile ? 0 : "100vh",
          overflow: isMobile ? "hidden" : undefined,
        }}
      >
        {/* Desktop right header */}
        {!isMobile && (
          <div
            style={{
              borderBottom: "1px solid #123039",
              padding: "36px 48px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "9px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "#079b8f",
                  marginBottom: "6px",
                }}
              >
                Private Consultation
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "#8fb8c0",
                }}
              >
                By invitation · In confidence
              </div>
              <div
                style={{ width: "40px", height: "1px", background: "#123039", marginTop: "14px" }}
              />
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "8px",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  color: "#8fb8c0",
                  marginBottom: "5px",
                }}
              >
                Chapter
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "30px",
                  fontWeight: 300,
                  color: "#c8edf2",
                  lineHeight: 1,
                }}
              >
                {chapterNum}
                <span style={{ fontSize: "16px", color: "#4f858f", margin: "0 6px" }}>/</span>
                <span style={{ fontSize: "16px", color: "#4f858f" }}>{totalNum}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step pips */}
        <div
          style={{
            display: "flex",
            padding: isMobile ? "0 24px" : "0 48px",
            gap: "3px",
            borderBottom: "1px solid #071113",
            flexShrink: 0,
          }}
        >
          {STEP_ORDER.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: "2px",
                background: i < stepIndex ? "#079b8f" : i === stepIndex ? "#16c6b3" : "#123039",
                transition: "background 0.5s ease",
                marginBottom: "-1px",
              }}
            />
          ))}
        </div>

        {/* Chat area */}
        <div
          ref={chatRef}
          className="no-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "28px 24px 16px" : "44px 48px 24px",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "24px" : "32px",
          }}
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className="msg-rise"
              style={{ textAlign: m.type === "user" ? "right" : "left" }}
            >
              {m.type === "bot" ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: "#079b8f",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "8px",
                        letterSpacing: "3.5px",
                        textTransform: "uppercase",
                        color: "#8fb8c0",
                      }}
                    >
                      Growmedico
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: isMobile ? "24px" : "clamp(22px, 2.4vw, 30px)",
                      fontWeight: 300,
                      color: "#16c6b3",
                      textShadow: "0 0 20px rgba(7,155,143,0.22)",
                      lineHeight: 1.35,
                      maxWidth: isMobile ? "100%" : "500px",
                    }}
                  >
                    {m.text}
                  </p>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: "8px",
                      letterSpacing: "3.5px",
                      textTransform: "uppercase",
                      color: "#8fb8c0",
                      marginBottom: "7px",
                    }}
                  >
                    You
                  </div>
                  <p
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "26px",
                      fontStyle: "italic",
                      fontWeight: 300,
                      color: "#ffffff",
                      lineHeight: 1.5,
                    }}
                  >
                    {m.text}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="msg-rise">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}
              >
                <div
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: "#079b8f",
                  }}
                />
                <span
                  style={{
                    fontSize: "8px",
                    letterSpacing: "3.5px",
                    textTransform: "uppercase",
                    color: "#8fb8c0",
                  }}
                >
                  Growmedico
                </span>
              </div>
              <div style={{ display: "flex", gap: "7px", alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="tdot"
                    style={{
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#079b8f",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Single-choice selectors */}
          {OPTIONS[step] && (
            <div
              className="msg-rise"
              style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
            >
              {OPTIONS[step]?.map((option) => (
                <button key={option} className="svc-btn" onClick={() => advance(option)}>
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Service selector */}
          {step === "services" && (
            <div
              className="msg-rise"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {SERVICES.map((s) => (
                  <button
                    key={s}
                    className={`svc-btn${selected.includes(s) ? " on" : ""}`}
                    onClick={() =>
                      setSelected((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                      )
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button
                className="confirm-btn"
                onClick={confirmServices}
                disabled={!selected.length}
                style={{ alignSelf: "flex-start" }}
              >
                Confirm Selection &rarr;
              </button>
            </div>
          )}

          {/* Summary */}
          {step === "summary" && (
            <div
              className="msg-rise"
              style={{
                border: "1px solid #123039",
                padding: isMobile ? "22px 20px" : "28px 32px",
                maxWidth: isMobile ? "100%" : "460px",
                position: "relative",
              }}
            >
              {/* Corner brackets */}
              {(
                [
                  {
                    top: -1,
                    left: -1,
                    borderTop: "1px solid #079b8f",
                    borderLeft: "1px solid #079b8f",
                  },
                  {
                    top: -1,
                    right: -1,
                    borderTop: "1px solid #079b8f",
                    borderRight: "1px solid #079b8f",
                  },
                  {
                    bottom: -1,
                    left: -1,
                    borderBottom: "1px solid #079b8f",
                    borderLeft: "1px solid #079b8f",
                  },
                  {
                    bottom: -1,
                    right: -1,
                    borderBottom: "1px solid #079b8f",
                    borderRight: "1px solid #079b8f",
                  },
                ] as React.CSSProperties[]
              ).map((s, i) => (
                <div key={i} style={{ position: "absolute", width: 14, height: 14, ...s }} />
              ))}

              <div
                style={{
                  fontSize: "8px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "#079b8f",
                  marginBottom: "20px",
                }}
              >
                Enquiry Summary
              </div>

              {[
                { label: "Name", value: data.name },
                { label: "Phone", value: data.phone },
                { label: "Email", value: data.email },
                { label: "Location", value: data.location },
                { label: "Instagram", value: data.instagram },
                { label: "Profession", value: data.profession },
                { label: "Goal", value: data.brandingGoal },
                { label: "Investment", value: data.investment },
                { label: "Decision", value: data.decisionMaker },
                { label: "Start", value: data.startTimeline },
                { label: "Camera", value: data.cameraComfort },
                { label: "Slot", value: data.consultationDate },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "12px",
                    padding: "9px 0",
                    borderBottom: "1px solid #071113",
                  }}
                >
                  <span
                    style={{
                      fontSize: "8px",
                      letterSpacing: "2.5px",
                      textTransform: "uppercase",
                      color: "#079b8f",
                      minWidth: "58px",
                      flexShrink: 0,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "15px",
                      fontWeight: 300,
                      color: "#d8f4f7",
                      wordBreak: "break-all",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}

              <div style={{ padding: "10px 0", borderBottom: "1px solid #071113" }}>
                <div
                  style={{
                    fontSize: "8px",
                    letterSpacing: "2.5px",
                    textTransform: "uppercase",
                    color: "#079b8f",
                    marginBottom: "10px",
                  }}
                >
                  Services
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {data.services.map((s) => (
                    <span
                      key={s}
                      style={{
                        border: "1px solid #123039",
                        color: "#c8edf2",
                        fontSize: "8px",
                        letterSpacing: "2px",
                        textTransform: "uppercase",
                        padding: "4px 10px",
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confirm & Connect button */}
              <button className="finish-btn" onClick={() => finish(data)} disabled={submitting}>
                {submitting ? (
                  <>
                    <span
                      className="spinner"
                      style={{ borderColor: "#123039", borderTopColor: "#030607" }}
                    />
                    Sending...
                  </>
                ) : (
                  "Confirm & Connect"
                )}
              </button>
            </div>
          )}

          <div style={{ height: "8px", flexShrink: 0 }} />
        </div>

        {/* Input bar */}
        {!OPTIONS[step] && step !== "services" && step !== "summary" && (
          <div
            style={{
              borderTop: "1px solid #071113",
              padding: isMobile ? "0 24px" : "0 48px",
              flexShrink: 0,
              background: "#030607",
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === "consultationDate") {
                  if (!input.trim() || !selectedTime) return;
                  advance(`${input} at ${selectedTime}`);
                  setInput("");
                  setSelectedTime("");
                  return;
                }
                if (!input.trim()) return;
                advance(input);
                setInput("");
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "18px 0 16px",
                  borderBottom: "1px solid #123039",
                }}
              >
                <span
                  style={{
                    color: "#079b8f",
                    fontSize: "16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  ›
                </span>
                <input
                  ref={inputRef}
                  type={step === "consultationDate" ? "date" : "text"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  min={
                    step === "consultationDate"
                      ? new Date().toISOString().split("T")[0]
                      : undefined
                  }
                  placeholder={
                    step === "consultationDate" ? "Select a date" : "Compose your reply..."
                  }
                  className="input-field"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={step === "consultationDate" && (!input || !selectedTime)}
                  style={{
                    opacity: step === "consultationDate" && (!input || !selectedTime) ? 0.35 : 1,
                    cursor:
                      step === "consultationDate" && (!input || !selectedTime)
                        ? "default"
                        : "pointer",
                  }}
                >
                  {step === "consultationDate" ? "Set Slot &rarr;" : "Send &rarr;"}
                </button>
              </div>
              {step === "consultationDate" && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    padding: "12px 0 10px",
                    borderBottom: "1px solid #123039",
                  }}
                >
                  {TIME_SLOTS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`svc-btn${selectedTime === time ? " on" : ""}`}
                      onClick={() => setSelectedTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
              {!isMobile && (
                <div style={{ padding: "8px 0 12px" }}>
                  <span
                    style={{
                      fontSize: "8px",
                      letterSpacing: "3px",
                      textTransform: "uppercase",
                      color: "#079b8f",
                    }}
                  >
                    Press Enter to Continue
                  </span>
                </div>
              )}
            </form>
          </div>
        )}

        {isMobile && (
          <div
            style={{
              height: "env(safe-area-inset-bottom, 0px)",
              background: "#030607",
              flexShrink: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}
