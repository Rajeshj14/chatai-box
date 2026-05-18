import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const LOCAL_STORAGE_KEY = "hakaConsultationSubmissions";
const LOGO_SRC = "/gmlogo1.webp";

type Step =
  | "name"
  | "email"
  | "phone"
  | "professionalBackground"
  | "digitalExperience"
  | "mainStruggle"
  | "revenueMechanism"
  | "platformPriorities"
  | "ultimateGoal"
  | "investmentMindset"
  | "consultationDate"
  | "summary"
  | "done";

interface FormData {
  name: string;
  email: string;
  phone: string;
  professionalBackground: string;
  digitalExperience: string;
  mainStruggle: string;
  revenueMechanism: string;
  platformPriorities: string;
  ultimateGoal: string;
  investmentMindset: string;
  consultationDate: string;
}

interface StoredSubmission extends FormData {
  submittedAt: string;
}

interface Message {
  id: number;
  type: "bot" | "user" | "notice";
  text: string;
  createdAt: number;
}

const formatRelativeTime = (createdAt: number, now: number) => {
  const seconds = Math.max(0, Math.floor((now - createdAt) / 1000));

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const OPTIONS: Partial<Record<Step, string[]>> = {
  professionalBackground: [
    "I run an established business / agency / clinic (Looking to scale)",
    "I am a freelancer / consultant / coach (Looking to get more clients)",
    "I am an executive / working professional (Looking to build my career profile)",
    "I am a creator / artist / individual looking to start a fresh personal brand",
  ],
  digitalExperience: [
    "I have never tried it before (Starting completely from scratch)",
    "I have tried posting a few times, but couldn't stay consistent",
    "I post regularly, but I'm not getting the business results or views I want",
    "I already have an active brand, but I want an agency to take it to the next level",
  ],
  mainStruggle: [
    "Time Limitations: I am too busy with my daily work to handle scripting, editing, and posting.",
    "Content Strategy: I don't know what to talk about to get business or how to structure videos.",
    "Technical Production: My current content looks amateur; I need professional/premium editing.",
    "Distribution: We make great content, but the algorithms are giving us zero distribution or leads.",
  ],
  revenueMechanism: [
    "High-Ticket Services or Retainers (Charging premium prices per client)",
    "Mid-Tier Products, Courses, Consulting, or One-time Projects",
    "Driving local footfalls / walk-ins to a physical location (Clinic, Office, Store)",
    "I don't have a clear product/service yet; I want to build an audience first",
  ],
  platformPriorities: [
    "Instagram & YouTube Shorts (Visual-heavy, rapid reach, authority scaling)",
    "YouTube Long-Form & Podcasts (Deep education, high-intent trust building)",
    "LinkedIn & X (Corporate decision-makers, high-ticket B2B clients, text-heavy authority)",
    "Omnichannel (I want to test multiple formats across all major platforms)",
  ],
  ultimateGoal: [
    "I want to get more high-paying clients, leads, or sales for my business.",
    "I want to build trust, authority, and become a recognized name in my industry.",
    "I want to overcome my hesitation, launch my profile, and build a base of real followers.",
    "I just want millions of random viral views as quickly as possible.",
  ],
  investmentMindset: [
    "I am ready to invest in a professional agency to get top-tier results.",
    "I have a budget, but I need to start with a smaller trial phase to see how it works first.",
    "I am currently just exploring information and looking for low-cost freelance options.",
  ],
};

const TIME_SLOTS = ["10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"];

const PROMPTS: Record<Exclude<Step, "summary" | "done">, string> = {
  name: "May we begin with your full name?",
  email: "And your email address?",
  phone: "Your phone number, please?",
  professionalBackground: "What is your current professional role or business model?",
  digitalExperience: "What is your current experience level with content creation and personal branding?",
  mainStruggle: "What has been the biggest challenge keeping you from starting or scaling your personal brand?",
  revenueMechanism: "How does your business currently monetize - or intend to monetize - your personal brand's audience?",
  platformPriorities: "Where do you want to dominate and build your primary digital presence?",
  ultimateGoal: "What is the primary result you want to achieve through your personal brand in the next 90 days?",
  investmentMindset:
    "Building a premium personal brand through a dedicated agency requires an investment in strategy and production. What is your approach to this project?",
  consultationDate: "Please pick your preferred consultation date and time.",
};

const STEP_ORDER: Step[] = [
  "name",
  "email",
  "phone",
  "professionalBackground",
  "digitalExperience",
  "mainStruggle",
  "revenueMechanism",
  "platformPriorities",
  "ultimateGoal",
  "investmentMindset",
  "consultationDate",
  "summary",
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const getPhoneDigits = (value: string) => value.replace(/\D/g, "");
const isValidPhone = (value: string) => getPhoneDigits(value).length === 10;

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

    submissions.push({ ...formData, submittedAt: new Date().toISOString() });
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
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [introCreatedAt, setIntroCreatedAt] = useState(() => Date.now());

  const [data, setData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    professionalBackground: "",
    digitalExperience: "",
    mainStruggle: "",
    revenueMechanism: "",
    platformPriorities: "",
    ultimateGoal: "",
    investmentMindset: "",
    consultationDate: "",
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const didInit = useRef(false);

  const pushBot = (text: string) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      idRef.current++;
      setMessages((current) => [...current, { id: idRef.current, type: "bot", text, createdAt: Date.now() }]);
    }, 500);
  };

  const pushUser = (text: string) => {
    idRef.current++;
    setMessages((current) => [...current, { id: idRef.current, type: "user", text, createdAt: Date.now() }]);
  };

  const pushNotice = (text: string) => {
    idRef.current++;
    setMessages((current) => [...current, { id: idRef.current, type: "notice", text, createdAt: Date.now() }]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoading || didInit.current) return;
    didInit.current = true;
    setTimeout(() => pushBot(PROMPTS.name), 350);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, step]);

  useEffect(() => {
    if (isLoading) return;
    if (!OPTIONS[step] && step !== "summary") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, step]);

  const advance = (value: string) => {
    const trimmedValue = value.trim();

    if (!trimmedValue) return;

    if (step === "email" && !isValidEmail(value)) {
      pushUser(value);
      setTimeout(() => pushNotice("That email address looks incorrect. Please provide a valid email like name@example.com."), 250);
      return;
    }

    if (step === "phone" && !isValidPhone(trimmedValue)) {
      pushUser(trimmedValue);
      setTimeout(() => pushNotice("That phone number looks incorrect. Please enter exactly 10 digits."), 250);
      return;
    }

    pushUser(trimmedValue);
    const next: Partial<Record<Step, Step>> = {
      name: "email",
      email: "phone",
      phone: "professionalBackground",
      professionalBackground: "digitalExperience",
      digitalExperience: "mainStruggle",
      mainStruggle: "revenueMechanism",
      revenueMechanism: "platformPriorities",
      platformPriorities: "ultimateGoal",
      ultimateGoal: "investmentMindset",
      investmentMindset: "consultationDate",
      consultationDate: "summary",
    };
    const nextStep = next[step];

    if (nextStep) {
      setData((current) => ({ ...current, [step]: trimmedValue }));
      setStep(nextStep);
      if (nextStep === "summary") {
        pushBot("A perfect brief. Please review your consultation summary.");
      } else {
        pushBot(PROMPTS[nextStep as Exclude<Step, "summary" | "done">]);
      }
    }
  };

  const finish = (finalData: FormData) => {
    setSubmitting(true);
    saveSubmissionToLocalStorage(finalData);

    const firstName = finalData.name.split(" ")[0] || "";
    navigate({ to: "/thank-you", search: { firstName, email: finalData.email } });
  };

  const resetChat = () => {
    setStep("name");
    setMessages([]);
    setInput("");
    setSelectedTime("");
    setSubmitting(false);
    setIntroCreatedAt(Date.now());
    setNow(Date.now());
    setData({
      name: "",
      email: "",
      phone: "",
      professionalBackground: "",
      digitalExperience: "",
      mainStruggle: "",
      revenueMechanism: "",
      platformPriorities: "",
      ultimateGoal: "",
      investmentMindset: "",
      consultationDate: "",
    });
    didInit.current = false;
    setTimeout(() => {
      if (didInit.current) return;
      didInit.current = true;
      pushBot(PROMPTS.name);
    }, 250);
  };

  const stepIndex = STEP_ORDER.indexOf(step);
  const progressWidth = `${Math.max(7, ((stepIndex + 1) / STEP_ORDER.length) * 100)}%`;

  const summaryRows = [
    { label: "Name", value: data.name },
    { label: "Email", value: data.email },
    { label: "Phone", value: data.phone },
    { label: "Professional Background", value: data.professionalBackground },
    { label: "Digital Experience", value: data.digitalExperience },
    { label: "Main Struggle", value: data.mainStruggle },
    { label: "Revenue Mechanism", value: data.revenueMechanism },
    { label: "Platform Priorities", value: data.platformPriorities },
    { label: "Ultimate Goal", value: data.ultimateGoal },
    { label: "Investment Mindset", value: data.investmentMindset },
    { label: "Preferred Slot", value: data.consultationDate },
  ];

  const botAvatar = (
    <div className="avatar">
      <img src={LOGO_SRC} alt="Grow Medico" />
    </div>
  );

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    .gold-page {
      position: fixed;
      inset: 0;
      height: 100dvh;
      width: 100%;
      background:
        radial-gradient(circle at 50% 12%, rgba(22,198,179,0.24), transparent 28%),
        linear-gradient(180deg, #030607 0%, #063634 48%, #e8fbf8 100%);
      color: #050505;
      font-family: 'Jost', Arial, sans-serif;
      display: grid;
      place-items: center;
      padding: 96px 20px 28px;
      overflow: hidden;
    }
    .chat-card {
      width: min(765px, calc(100vw - 34px));
      height: min(746px, calc(100dvh - 124px));
      min-height: 590px;
      background: #f8fffe;
      border-radius: 7px;
      position: relative;
      display: grid;
      grid-template-rows: 166px minmax(0, 1fr) auto;
      box-shadow: 0 24px 72px rgba(0, 54, 50, 0.18);
    }
    .logo-crown {
      position: absolute;
      top: -58px;
      left: 50%;
      width: 282px;
      height: 116px;
      transform: translateX(-50%);
      border-radius: 999px;
      background:
        linear-gradient(135deg, rgba(7,155,143,0.22), rgba(3,6,7,0.96)),
        #030607;
      display: grid;
      place-items: center;
      z-index: 2;
      border: 1px solid rgba(7,155,143,0.38);
    }
    .logo-crown img {
      width: 224px;
      height: auto;
      display: block;
      object-fit: contain;
    }
    .chat-header {
      padding: 78px 32px 0;
      text-align: center;
    }
    .chat-header h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.05;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .chat-header p {
      margin: 6px 0 0;
      color: #000000;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 400;
      text-transform: uppercase;
    }
    .progress-bar {
      width: min(352px, 54%);
      height: 7px;
      margin: 8px 0 0 32px;
      background: transparent;
      position: relative;
    }
    .progress-bar span {
      display: block;
      height: 100%;
      width: var(--progress-width);
      max-width: 100%;
      background: #079b8f;
      transition: width 0.35s ease;
    }
    .chat-body-wrap {
      position: relative;
      min-height: 0;
      padding: 28px 31px 0;
    }
    .refresh-btn {
      position: absolute;
      top: 6px;
      right: 44px;
      width: 39px;
      height: 39px;
      border: none;
      border-radius: 50%;
      background: #079b8f;
      color: #ffffff;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      display: grid;
      place-items: center;
      z-index: 2;
    }
    .chat-body {
      height: 100%;
      overflow-y: auto;
      padding: 38px 0 18px;
      scrollbar-width: auto;
      scrollbar-color: #8c8c8c transparent;
    }
    .chat-body::-webkit-scrollbar { width: 13px; }
    .chat-body::-webkit-scrollbar-thumb {
      background: #8c8c8c;
      border-radius: 999px;
      border: 3px solid #f8fffe;
    }
    .chat-body::-webkit-scrollbar-track { background: transparent; }
    .row {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      margin-bottom: 10px;
      padding-right: 30px;
    }
    .row.user {
      display: flex;
      justify-content: flex-end;
      padding-right: 26px;
      margin: 18px 0 8px;
    }
    .avatar {
      width: 48px;
      height: 34px;
      display: grid;
      place-items: center;
      margin-top: 8px;
      border-radius: 999px;
      background: #030607;
      border: 1px solid rgba(7,155,143,0.26);
    }
    .avatar img {
      width: 39px;
      height: auto;
      object-fit: contain;
      opacity: 0.95;
    }
    .bubble {
      width: fit-content;
      max-width: 570px;
      background: #eef8f7;
      border-radius: 21px;
      color: #173f43;
      padding: 15px 22px;
      font-size: 20px;
      line-height: 1.28;
      font-weight: 300;
    }
    .bubble strong {
      color: #079b8f;
      font-weight: 600;
    }
    .user-bubble {
      max-width: 510px;
      border-radius: 24px;
      background: #079b8f;
      color: #ffffff;
      padding: 13px 22px;
      font-size: 20px;
      line-height: 1.24;
      font-weight: 400;
      text-align: left;
    }
    .time {
      color: #a7b5bf;
      font-size: 15px;
      line-height: 1;
      margin: 8px 0 20px 68px;
      font-weight: 300;
    }
    .user-time {
      color: #a7b5bf;
      font-size: 15px;
      text-align: right;
      padding-right: 26px;
      margin: 0 0 30px;
    }
    .notice-row {
      display: flex;
      justify-content: center;
      margin: 12px 0 18px;
      padding-right: 30px;
    }
    .notice-bubble {
      max-width: 520px;
      border: 1px solid rgba(7, 155, 143, 0.22);
      border-radius: 999px;
      background: #eef8f7;
      color: #173f43;
      padding: 11px 18px;
      font-size: 16px;
      line-height: 1.25;
      text-align: center;
      box-shadow: 0 8px 22px rgba(0, 54, 50, 0.06);
    }
    .option-bubble {
      max-width: 570px;
      background: #eef8f7;
      border-radius: 21px;
      padding: 14px 22px 18px;
      color: #315f63;
    }
    .option-title {
      margin: 0 0 12px;
      font-size: 20px;
      line-height: 1.3;
      font-weight: 300;
    }
    .choice-list {
      display: flex;
      flex-wrap: wrap;
      gap: 11px 12px;
    }
    .choice-btn {
      border: 1px solid #079b8f;
      border-radius: 999px;
      background: #ffffff;
      color: #073b3b;
      min-height: 54px;
      padding: 0 18px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      line-height: 1.1;
      font-family: inherit;
      font-weight: 300;
      cursor: pointer;
      transition: background 0.18s ease, color 0.18s ease;
    }
    .choice-btn::before {
      content: "";
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #cfe9e6;
      flex: 0 0 auto;
    }
    .choice-btn.active,
    .choice-btn:hover {
      background: #079b8f;
      color: #ffffff;
    }
    .choice-btn.active::before,
    .choice-btn:hover::before {
      background: #ffffff;
    }
    .confirm-btn,
    .finish-btn {
      border: 1px solid #079b8f;
      border-radius: 999px;
      background: #079b8f;
      color: #ffffff;
      min-height: 50px;
      padding: 0 22px;
      margin-top: 15px;
      font-family: inherit;
      font-size: 18px;
      cursor: pointer;
    }
    .confirm-btn:disabled,
    .finish-btn:disabled {
      opacity: 0.42;
      cursor: not-allowed;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-top: 8px;
    }
    .summary-item {
      border: 1px solid #d8d8d8;
      border-radius: 14px;
      background: #ffffff;
      padding: 9px 12px;
      min-width: 0;
    }
    .summary-item span {
      display: block;
      color: #7f8d97;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 3px;
    }
    .summary-item p {
      margin: 0;
      color: #1a1a1a;
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .chat-input {
      padding: 0 31px 20px;
      background: #f8fffe;
    }
    .input-line {
      border-top: 1px solid #b7d7d5;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 46px;
      align-items: center;
      gap: 12px;
      min-height: 57px;
    }
    .answer-input {
      width: 100%;
      border: none;
      outline: none;
      color: #073b3b;
      font-family: inherit;
      font-size: 18px;
      font-weight: 300;
      padding: 0 0 0 18px;
      background: transparent;
    }
    .answer-input::placeholder { color: #aebbc4; }
    .send-btn {
      border: none;
      background: transparent;
      color: #079b8f;
      font-size: 34px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }
    .send-btn:disabled {
      cursor: default;
      opacity: 0.4;
    }
    .time-row {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      padding: 10px 0 0 18px;
    }
    .time-row .choice-btn {
      min-height: 40px;
      font-size: 16px;
      padding: 0 14px;
    }
    .loader-card {
      width: min(420px, calc(100vw - 44px));
      border-radius: 7px;
      background: #f8fffe;
      padding: 40px 34px;
      text-align: center;
      box-shadow: 0 24px 72px rgba(0, 54, 50, 0.18);
    }
    .loader-card img {
      width: 230px;
      height: auto;
      margin-bottom: 22px;
      background: #030607;
      border-radius: 999px;
      padding: 18px 22px;
      border: 1px solid rgba(7,155,143,0.28);
    }
    .loader-label {
      font-size: 18px;
      color: #173f43;
      margin-bottom: 18px;
    }
    .loader-line {
      height: 6px;
      background: #f2f2f2;
      overflow: hidden;
      border-radius: 999px;
    }
    .loader-line span {
      display: block;
      height: 100%;
      width: 42%;
      background: #079b8f;
      border-radius: 999px;
      animation: loadSweep 1.15s ease-in-out infinite;
    }
    @keyframes loadSweep {
      from { transform: translateX(-120%); }
      to { transform: translateX(260%); }
    }
    @media (max-width: 760px) {
      .gold-page {
        padding: 78px 10px 14px;
      }
      .chat-card {
        width: 100%;
        height: calc(100dvh - 94px);
        min-height: 0;
        grid-template-rows: 142px minmax(0, 1fr) auto;
      }
      .logo-crown {
        width: 220px;
        height: 92px;
        top: -46px;
      }
      .logo-crown img {
        width: 174px;
      }
      .chat-header {
        padding: 62px 18px 0;
      }
      .chat-header h1 {
        font-size: 24px;
      }
      .chat-header p {
        font-size: 13px;
      }
      .progress-bar {
        margin-left: 18px;
        width: 52%;
      }
      .chat-body-wrap {
        padding: 12px 12px 0;
      }
      .refresh-btn {
        right: 22px;
        top: 2px;
      }
      .row {
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 9px;
        padding-right: 20px;
      }
      .bubble,
      .option-bubble {
        max-width: 100%;
        font-size: 16px;
        padding: 13px 16px;
      }
      .user-bubble,
      .choice-btn {
        font-size: 16px;
      }
      .choice-btn {
        min-height: 45px;
        padding: 0 14px;
      }
      .summary-grid {
        grid-template-columns: 1fr;
      }
      .chat-input {
        padding: 0 12px 12px;
      }
    }
  `;

  const renderOptions = () => {
    if (OPTIONS[step]) {
      return (
        <div className="row">
          {botAvatar}
          <div className="option-bubble">
            <p className="option-title">{PROMPTS[step as Exclude<Step, "summary" | "done">]}</p>
            <div className="choice-list">
              {OPTIONS[step]?.map((option) => (
                <button key={option} className="choice-btn" onClick={() => advance(option)}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderSummary = () => {
    if (step !== "summary") return null;

    return (
      <div className="row">
        {botAvatar}
        <div className="option-bubble">
          <p className="option-title">Please review your consultation summary.</p>
          <div className="summary-grid">
            {summaryRows.map(({ label, value }) => (
              <div key={label} className="summary-item">
                <span>{label}</span>
                <p>{value || "-"}</p>
              </div>
            ))}
          </div>
          <button className="finish-btn" onClick={() => finish(data)} disabled={submitting}>
            {submitting ? "Sending..." : "Confirm & Connect"}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <main className="gold-page">
        <style>{styles}</style>
        <section className="loader-card">
          <img src={LOGO_SRC} alt="Grow Medico" />
          <div className="loader-label">Preparing consultation</div>
          <div className="loader-line">
            <span />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="gold-page">
      <style>{styles}</style>
      <section className="chat-card">
        <div className="logo-crown">
          <img src={LOGO_SRC} alt="Grow Medico" />
        </div>

        <header className="chat-header">
          <h1>GROW MEDICO</h1>
          <p>Personal Branding | Digital Marketing | Growth</p>
          <div className="progress-bar" style={{ "--progress-width": progressWidth } as React.CSSProperties}>
            <span />
          </div>
        </header>

        <div className="chat-body-wrap">
          <button className="refresh-btn" type="button" onClick={resetChat} aria-label="Restart chat">
            ↻
          </button>
          <div ref={chatRef} className="chat-body">
            <div className="row">
              {botAvatar}
              <div className="bubble">
                Hello! Welcome to <strong>Grow Medico</strong>.
                <br />
                We're a personal branding and digital growth team for healthcare professionals.
                <br />
                Please fill the information below to book consultation with our team.
              </div>
            </div>
            <div className="time">{formatRelativeTime(introCreatedAt, now)}</div>

            {messages.map((message) =>
              message.type === "notice" ? (
                <div key={message.id} className="notice-row">
                  <div className="notice-bubble">{message.text}</div>
                </div>
              ) : message.type === "bot" ? (
                <div key={message.id}>
                  <div className="row">
                    {botAvatar}
                    <div className="bubble">{message.text}</div>
                  </div>
                  <div className="time">{formatRelativeTime(message.createdAt, now)}</div>
                </div>
              ) : (
                <div key={message.id}>
                  <div className="row user">
                    <div className="user-bubble">{message.text}</div>
                  </div>
                  <div className="user-time">{formatRelativeTime(message.createdAt, now)}</div>
                </div>
              ),
            )}

            {typing && (
              <div className="row">
                {botAvatar}
                <div className="bubble">Typing...</div>
              </div>
            )}

            {!typing && renderOptions()}
            {!typing && renderSummary()}
          </div>
        </div>

        {!OPTIONS[step] && step !== "summary" && (
          <div className="chat-input">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (step === "consultationDate") {
                  if (!input.trim() || !selectedTime) return;
                  advance(`${input.trim()} at ${selectedTime}`);
                  setInput("");
                  setSelectedTime("");
                  return;
                }
                if (!input.trim()) return;
                advance(input);
                setInput("");
              }}
            >
              <div className="input-line">
                <input
                  ref={inputRef}
                  type={step === "consultationDate" ? "date" : "text"}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  min={
                    step === "consultationDate" ? new Date().toISOString().split("T")[0] : undefined
                  }
                  placeholder={step === "consultationDate" ? "Select a date" : "Type an answer"}
                  className="answer-input"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="send-btn"
                  disabled={step === "consultationDate" ? !input.trim() || !selectedTime : !input.trim()}
                  aria-label="Send answer"
                >
                  ➤
                </button>
              </div>
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
    </main>
  );
}
