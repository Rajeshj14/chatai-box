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
    "Yes - I'm aligned with the Rs. 1.5 lac + GST/month investment.",
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
  investment: "Are you open to investing Rs. 1.5 lac + GST/month in personal branding?",
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

const ATELIER_ITEMS = ["Strategy", "Development", "Performance", "Design", "Cinematography", "Storytelling"];

interface Message {
  id: number;
  type: "bot" | "user";
  text: string;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

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
      }
    }

    submissions.push({
      ...formData,
      submittedAt: new Date().toISOString(),
    });

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(submissions));
  } catch (error) {
    console.error("Failed to save submission to localStorage:", error);
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

  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const didInit = useRef(false);

  const pushBot = (text: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      idRef.current++;
      setMessages((current) => [...current, { id: idRef.current, type: "bot", text }]);
    }, 650);
  };

  const pushUser = (text: string) => {
    idRef.current++;
    setMessages((current) => [...current, { id: idRef.current, type: "user", text }]);
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setTimeout(() => pushBot(PROMPTS.name), 350);
  }, []);

  useEffect(() => {
    if (!OPTIONS[step] && step !== "services" && step !== "summary") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  const advance = (value: string) => {
    if (step === "email" && !isValidEmail(value)) {
      pushUser(value);
      setTimeout(
        () => pushBot("That email address looks incorrect. Please provide a valid email like name@example.com."),
        250,
      );
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
      setData((current) => ({ ...current, [step]: value }));
      setStep(nextStep);
      pushBot(PROMPTS[nextStep as Exclude<Step, "summary" | "done">]);
    }
  };

  const confirmServices = () => {
    if (!selected.length) return;
    pushUser(selected.join(" | "));
    setData((current) => ({ ...current, services: selected }));
    setTimeout(() => {
      pushBot("A perfect brief. Allow us to present your summary.");
      setStep("summary");
    }, 300);
  };

  const finish = (finalData: FormData) => {
    setSubmitting(true);
    saveSubmissionToLocalStorage(finalData);

    const firstName = finalData.name.split(" ")[0] || "";
    navigate({ to: "/thank-you", search: { firstName, email: finalData.email } });
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const chapterNum = String(stepIndex + 1).padStart(2, "0");
  const totalNum = String(STEP_ORDER.length).padStart(2, "0");
  const progress = Math.max(0, Math.min(100, ((stepIndex + 1) / STEP_ORDER.length) * 100));
  const latestBotMessage = [...messages].reverse().find((message) => message.type === "bot");
  const userMessages = messages.filter((message) => message.type === "user");
  const answeredCount = userMessages.length;

  const summaryRows = [
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
  ];

  return (
    <main className="consult-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; }

        .consult-page {
          height: 100dvh;
          color: #f7fbfb;
          background:
            linear-gradient(120deg, rgba(7,155,143,0.10), transparent 28%),
            linear-gradient(180deg, #020506 0%, #041012 100%);
          font-family: 'Outfit', sans-serif;
          display: grid;
          grid-template-columns: 38% minmax(0, 1fr);
          overflow: hidden;
        }

        .cinema-panel {
          position: relative;
          height: 100dvh;
          background: #030607;
          overflow: hidden;
          border-right: 1px solid rgba(7,155,143,0.24);
        }

        .cinema-panel video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0.74;
          background: #030607;
        }

        .cinema-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(2,5,6,0.96) 0%, rgba(2,5,6,0.18) 36%, rgba(2,5,6,0.98) 100%),
            linear-gradient(90deg, rgba(2,5,6,0.34), transparent 46%);
          pointer-events: none;
        }

        .brand-mark {
          position: absolute;
          top: 32px;
          left: 34px;
          right: 34px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          z-index: 1;
        }

        .brand-mark img {
          width: min(245px, 64%);
          height: auto;
          display: block;
        }

        .mini-label {
          color: #8fb8c0;
          font-size: 7px;
          letter-spacing: 3.8px;
          line-height: 1.7;
          text-transform: uppercase;
        }

        .accent-label {
          color: #16c6b3;
          font-size: 8px;
          letter-spacing: 4px;
          text-transform: uppercase;
        }

        .chapter-pill {
          border: 1px solid rgba(7,155,143,0.32);
          background: rgba(2,5,6,0.52);
          padding: 12px 14px;
          text-align: right;
          min-width: 104px;
          backdrop-filter: blur(16px);
        }

        .chapter-pill strong {
          display: block;
          margin-top: 4px;
          color: #d8f4f7;font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 300;
          line-height: 1;
        }

        .brand-story {
          position: absolute;
          left: 34px;
          right: 34px;
          bottom: 30px;
          z-index: 1;
          display: grid;
          gap: 22px;
        }

        .brand-story h1 {
          margin: 0;
          color: #f7fbfb;font-family: 'Outfit', sans-serif;
          font-size: clamp(30px, 3.4vw, 54px);
          font-weight: 300;
          line-height: 0.98;
        }

        .brand-story p {
          margin: 0;
          max-width: 410px;
          color: #bdd8dc;font-family: 'Outfit', sans-serif;
          font-size: clamp(17px, 1.25vw, 22px);
          font-style: italic;
          line-height: 1.34;
        }

        .atelier-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid rgba(143,184,192,0.16);
          border-left: 1px solid rgba(143,184,192,0.12);
        }

        .atelier-strip span {
          min-height: 48px;
          display: grid;
          place-items: center;
          border-right: 1px solid rgba(143,184,192,0.12);
          border-bottom: 1px solid rgba(143,184,192,0.12);
          color: #8fb8c0;
          font-size: 7px;
          letter-spacing: 2.4px;
          text-transform: uppercase;
          background: rgba(2,5,6,0.40);
        }

        .intake-stage {
          height: 100dvh;
          padding: clamp(22px, 3vw, 42px);
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 22px;
          overflow: hidden;
        }

        .stage-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 24px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(143,184,192,0.12);
        }

        .stage-top h2 {
          margin: 7px 0 0;
          color: #f6ffff;
         font-family: 'Outfit', sans-serif;
          font-size: clamp(24px, 2.65vw, 42px);
          font-weight: 300;
          line-height: 1;
        }

        .progress-orbit {
          width: 116px;
          aspect-ratio: 1;
          border: 1px solid rgba(7,155,143,0.34);
          border-radius: 50%;
          display: grid;
          place-items: center;
          background:
            conic-gradient(#16c6b3 ${progress}%, rgba(18,48,57,0.75) 0),
            #020506;
          box-shadow: 0 0 48px rgba(7,155,143,0.10);
          position: relative;
        }

        .progress-orbit::after {
          content: "";
          position: absolute;
          inset: 8px;
          border-radius: 50%;
          background: #041012;
          border: 1px solid rgba(143,184,192,0.10);
        }

        .progress-orbit span {
          position: relative;
          z-index: 1;
          color: #d8f4f7;
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          line-height: 1;
        }

        .console-grid {
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(250px, 0.55fr);
          gap: 20px;
        }

        .question-console {
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          border: 1px solid rgba(143,184,192,0.14);
          background:
            linear-gradient(150deg, rgba(7,155,143,0.16), transparent 34%),
            rgba(2,5,6,0.78);
          box-shadow: 0 30px 90px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.035);
          overflow: hidden;
        }

        .prompt-area {
          min-height: 0;
          padding: clamp(24px, 4vw, 56px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
        }

        .prompt-area h3 {
          margin: 0;
          max-width: 780px;
          color: #d8f4f7;
          font-family: 'Outfit', sans-serif;
          font-size: clamp(28px, 3.9vw, 35px);
          font-weight: 300;
          line-height: 1.04;
        }

        .typing-dots {
          display: flex;
          gap: 9px;
          align-items: center;
          min-height: 86px;
        }

        .typing-dots span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #16c6b3;
          animation: pulseDot 1.25s ease-in-out infinite;
        }

        .typing-dots span:nth-child(2) { animation-delay: 0.16s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.32s; }

        @keyframes pulseDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.45); }
        }

        .prompt-footer {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: center;
          color: #8fb8c0;
          font-size: 7px;
          letter-spacing: 3px;
          text-transform: uppercase;
        }

        .response-dock {
          border-top: 1px solid rgba(143,184,192,0.13);
          background: rgba(3,6,7,0.82);
          padding: 18px;
        }

        .input-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
        }

        .input-field {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(143,184,192,0.16);
          background: rgba(2,5,6,0.74);
          color: #ffffff;
          outline: none;
          padding: 14px 16px;
          font-family: 'Outfit', sans-serif;
          font-size: max(16px, 17px);
          font-style: italic;
          font-weight: 300;
        }

        .input-field::placeholder {
          color: #8fb8c0;
        }

        .send-btn,
        .confirm-btn,
        .finish-btn {
          border: 1px solid #16c6b3;
          background: #16c6b3;
          color: #020506;
          padding: 0 20px;
          min-height: 52px;
          font-family: 'Outfit', sans-serif;
          font-size: 7px;
          font-weight: 600;
          letter-spacing: 2.8px;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.2s ease;
          white-space: nowrap;
        }

        .send-btn:hover,
        .confirm-btn:hover:not(:disabled),
        .finish-btn:hover:not(:disabled) {
          opacity: 0.86;
          transform: translateY(-1px);
        }

        .send-btn:disabled,
        .confirm-btn:disabled,
        .finish-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .choice-panel {
          display: grid;
          gap: 12px;
        }

        .choice-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .choice-btn {
          min-height: 54px;
          border: 1px solid rgba(143,184,192,0.16);
          background: rgba(2,5,6,0.74);
          color: #d8f4f7;
          padding: 12px;
          text-align: left;
          font-family: 'Outfit', sans-serif;
          font-size: 7px;
          font-weight: 500;
          letter-spacing: 1.8px;
          line-height: 1.45;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }

        .choice-btn:hover,
        .choice-btn.active {
          border-color: #16c6b3;
          background: rgba(7,155,143,0.16);
          transform: translateY(-1px);
        }

        .time-row {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .time-row .choice-btn {
          min-height: 38px;
          padding: 8px 10px;
          flex: 1;
          text-align: center;
        }

        .side-stack {
          min-height: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 16px;
        }

        .status-card,
        .answers-card {
          border: 1px solid rgba(143,184,192,0.14);
          background: rgba(2,5,6,0.64);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .status-card {
          padding: 20px;
          display: grid;
          gap: 18px;
        }

        .status-number {
          color: #d8f4f7;
          font-family: 'Outfit', sans-serif;
          font-size: 42px;
          font-weight: 300;
          line-height: 0.9;
        }

        .metric-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .metric-box {
          border: 1px solid rgba(143,184,192,0.12);
          padding: 14px;
          background: rgba(3,6,7,0.52);
        }

        .metric-box strong {
          display: block;
          color: #f6ffff;
          font-family: 'Outfit', sans-serif;
          font-size: 21px;
          font-weight: 300;
          line-height: 1;
          margin-bottom: 6px;
        }

        .answers-card {
          min-height: 0;
          padding: 16px;
          overflow: hidden;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 12px;
        }

        .answer-list {
          min-height: 0;
          overflow: hidden;
          display: grid;
          align-content: start;
          gap: 8px;
        }

        .answer-chip {
          border: 1px solid rgba(143,184,192,0.12);
          background: rgba(3,6,7,0.52);
          padding: 11px 12px;
          min-width: 0;
        }

        .answer-chip span {
          display: block;
          color: #8fb8c0;
          font-size: 7px;
          letter-spacing: 2.6px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .answer-chip p {
          margin: 0;
          color: #f6ffff;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-style: italic;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .summary-panel {
          min-height: 0;
          border-top: 1px solid rgba(143,184,192,0.13);
          background: rgba(3,6,7,0.82);
          padding: 18px;
          overflow: hidden;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .summary-item {
          border: 1px solid rgba(143,184,192,0.13);
          background: rgba(2,5,6,0.65);
          padding: 10px;
          min-width: 0;
        }

        .summary-item span {
          display: block;
          color: #16c6b3;
          font-size: 7px;
          letter-spacing: 2.4px;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .summary-item p {
          margin: 0;
          color: #d8f4f7;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .service-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .service-tags span {
          border: 1px solid rgba(7,155,143,0.28);
          color: #c8edf2;
          padding: 6px 10px;
          font-size: 7px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .finish-btn {
          width: 100%;
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 1px solid #123039;
          border-top-color: #030607;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1020px) {
          .consult-page {
            grid-template-columns: 1fr;
            grid-template-rows: 34dvh minmax(0, 1fr);
            overflow: hidden;
          }

          .cinema-panel {
            height: 34dvh;
            min-height: 0;
          }

          .intake-stage {
            height: auto;
            min-height: 0;
            overflow: hidden;
            gap: 14px;
            padding: 18px;
          }

          .console-grid {
            grid-template-columns: 1fr;
            min-height: 0;
          }

          .side-stack {
            display: none;
          }

          .stage-top {
            padding-bottom: 12px;
          }

          .stage-top h2 {
            font-size: clamp(22px, 3.5vw, 32px);
          }

          .progress-orbit {
            width: 86px;
          }

          .prompt-area {
            padding: 22px;
          }

          .prompt-area h3 {
            font-size: clamp(26px, 4.8vw, 40px);
          }
        }

        @media (max-width: 680px) {
          .brand-mark {
            top: 22px;
            left: 22px;
            right: 22px;
          }

          .brand-mark img {
            width: min(172px, 58vw);
          }

          .chapter-pill {
            min-width: 84px;
            padding: 10px;
          }

          .brand-story {
            left: 22px;
            right: 22px;
            bottom: 22px;
            gap: 12px;
          }

          .brand-story h1 {
            font-size: clamp(24px, 6.8vw, 32px);
          }

          .brand-story p,
          .atelier-strip {
            display: none;
          }

          .atelier-strip {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .intake-stage {
            padding: 14px;
            gap: 10px;
          }

          .stage-top {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 12px;
          }

          .progress-orbit {
            width: 68px;
          }

          .progress-orbit span {
            font-size: 18px;
          }

          .prompt-area {
            padding: 16px;
            gap: 14px;
          }

          .prompt-area h3 {
            font-size: clamp(24px, 7vw, 34px);
          }

          .input-form,
          .choice-grid,
          .summary-grid {
            grid-template-columns: 1fr;
          }

          .send-btn,
          .confirm-btn,
          .finish-btn {
            width: 100%;
            padding: 0 14px;
            min-height: 48px;
          }

          .response-dock,
          .summary-panel {
            padding: 12px;
          }

          .choice-btn {
            min-height: 42px;
            padding: 9px;
          }
        }
      `}</style>

      <aside className="cinema-panel">
        <video
          src={CONSULTATION_VIDEO_SRC}
          controls
          autoPlay
          loop
          playsInline
          preload="metadata"
          poster={LOGO_SRC}
        />
        <div className="cinema-shade" />
        <div className="brand-mark">
          <div>
            <div className="accent-label">Personal Branding</div>
            <img src={LOGO_SRC} alt="Grow Medico" />
            {/* <div className="mini-label" style={{ marginTop: 10 }}>
              Fining the Digital Gap
            </div> */}
          </div>
          <div className="chapter-pill">
            <div className="mini-label">Chapter</div>
            <strong>
              {chapterNum}
              <span style={{ color: "#4f858f", fontSize: 15, margin: "0 5px" }}>/</span>
              <span style={{ color: "#4f858f", fontSize: 15 }}>{totalNum}</span>
            </strong>
          </div>
        </div>
        {/* <div className="brand-story">
          <div>
            <div className="accent-label" style={{ marginBottom: 12 }}>
              Private Consultation
            </div>
            <h1>Build a brand patients remember.</h1>
          </div>
          <p>
            "We don't build campaigns.
            <br />
            We compose <span style={{ color: "#16c6b3" }}>legacies.</span>"
          </p>
          <div className="atelier-strip">
            {ATELIER_ITEMS.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div> */}
      </aside>

      <section className="intake-stage">
        <header className="stage-top">
          <div>
            <div className="accent-label">Growmedico Intake Console</div>
            <h2>By invitation. In confidence.</h2>
          </div>
          <div className="progress-orbit" aria-label={`Progress ${Math.round(progress)} percent`}>
            <span>{Math.round(progress)}%</span>
          </div>
        </header>

        <div className="console-grid">
          <section className="question-console">
            <div className="prompt-area">
              <div>
                <div className="mini-label" style={{ marginBottom: 20 }}>
                  Current Question
                </div>
                {latestBotMessage ? (
                  <h3>{latestBotMessage.text}</h3>
                ) : (
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                )}
              </div>
              <div className="prompt-footer">
                <span>Personal Branding Brief</span>
                <span>
                  {chapterNum} / {totalNum}
                </span>
              </div>
            </div>

            {step === "summary" ? (
              <div className="summary-panel">
                <div className="summary-grid">
                  {summaryRows.map(({ label, value }) => (
                    <div key={label} className="summary-item">
                      <span>{label}</span>
                      <p>{value || "-"}</p>
                    </div>
                  ))}
                </div>
                <div className="service-tags">
                  {data.services.map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>
                <button className="finish-btn" onClick={() => finish(data)} disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner" />
                      Sending...
                    </>
                  ) : (
                    "Confirm & Connect"
                  )}
                </button>
              </div>
            ) : OPTIONS[step] ? (
              <div className="response-dock">
                <div className="choice-grid">
                  {OPTIONS[step]?.map((option) => (
                    <button key={option} className="choice-btn" onClick={() => advance(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : step === "services" ? (
              <div className="response-dock">
                <div className="choice-panel">
                  <div className="choice-grid">
                    {SERVICES.map((service) => (
                      <button
                        key={service}
                        className={`choice-btn${selected.includes(service) ? " active" : ""}`}
                        onClick={() =>
                          setSelected((current) =>
                            current.includes(service)
                              ? current.filter((item) => item !== service)
                              : [...current, service],
                          )
                        }
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                  <button className="confirm-btn" onClick={confirmServices} disabled={!selected.length}>
                    Confirm Selection
                  </button>
                </div>
              </div>
            ) : (
              <div className="response-dock">
                <form
                  className="input-form"
                  onSubmit={(event) => {
                    event.preventDefault();
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
                  <input
                    ref={inputRef}
                    type={step === "consultationDate" ? "date" : "text"}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    min={
                      step === "consultationDate"
                        ? new Date().toISOString().split("T")[0]
                        : undefined
                    }
                    placeholder={step === "consultationDate" ? "Select a date" : "Type your answer here..."}
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
                  >
                    {step === "consultationDate" ? "Set Slot" : "Send"}
                  </button>
                  {step === "consultationDate" && (
                    <div className="time-row">
                      {TIME_SLOTS.map((time) => (
                        <button
                          key={time}
                          type="button"
                          className={`choice-btn${selectedTime === time ? " active" : ""}`}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </form>
              </div>
            )}
          </section>

          <aside className="side-stack">
            <section className="status-card">
              <div>
                <div className="mini-label">Brief Completion</div>
                <div className="status-number">{chapterNum}</div>
              </div>
              <div className="metric-row">
                <div className="metric-box">
                  <strong>{answeredCount}</strong>
                  <div className="mini-label">Answered</div>
                </div>
                <div className="metric-box">
                  <strong>{totalNum}</strong>
                  <div className="mini-label">Total</div>
                </div>
              </div>
            </section>

            <section className="answers-card">
              <div className="mini-label">Your Inputs</div>
              <div className="answer-list">
                {userMessages.length ? (
                  userMessages.slice(-8).map((message, index) => (
                    <div key={message.id} className="answer-chip">
                      <span>Answer {String(index + Math.max(1, userMessages.length - 7)).padStart(2, "0")}</span>
                      <p>{message.text}</p>
                    </div>
                  ))
                ) : (
                  <div className="answer-chip">
                    <span>Waiting</span>
                    <p>Your answers will appear here.</p>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
