import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

const LOCAL_STORAGE_KEY = "growMedicoConsultationSubmissions";
const LOGO_SRC = "/gmlogo1.webp";
const POPUP_VIDEO_SRC = "/adss.mov";
const SUBMISSION_ENDPOINT = import.meta.env.VITE_SUBMISSION_API_URL || "/api/submissions";

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
  | "budgetFit"
  | "consultationDate"
  | "summary"
  | "done";

type FieldStep = Exclude<Step, "summary" | "done">;

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
  budgetFit: string;
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
  budgetFit: ["Yes", "No"],
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
  budgetFit: "Does an investment range of ₹80k to ₹1.5L match your budget?",
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
  "budgetFit",
  "consultationDate",
  "summary",
];

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const getPhoneDigits = (value: string) => value.replace(/\D/g, "");
const isValidPhone = (value: string) => getPhoneDigits(value).length === 10;
const createInitialMessages = (): Message[] => [{ id: 1, type: "bot", text: PROMPTS.name, createdAt: Date.now() }];
const shouldAskBudgetFit = (value: string) =>
  value === OPTIONS.investmentMindset?.[0] || value === OPTIONS.investmentMindset?.[1];

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

function buildConcernText(formData: FormData) {
  return [
    `Professional Background: ${formData.professionalBackground}`,
    `Digital Experience: ${formData.digitalExperience}`,
    `Main Struggle: ${formData.mainStruggle}`,
    `Revenue Mechanism: ${formData.revenueMechanism}`,
    `Platform Priorities: ${formData.platformPriorities}`,
    `Ultimate Goal: ${formData.ultimateGoal}`,
    `Investment Mindset: ${formData.investmentMindset}`,
    `Budget Fit: ${formData.budgetFit}`,
  ]
    .filter((line) => !line.endsWith(": "))
    .join("\n");
}

function buildSubmissionPayload(formData: FormData) {
  const pageUrl = typeof window === "undefined" ? "" : window.location.href;

  return {
    source: "Grow Medico Consultation",
    formName: "Grow Medico Consultation",
    name: formData.name,
    phone: formData.phone,
    email: formData.email,
    treatment: "Personal Branding Consultation",
    appointmentDateTime: formData.consultationDate,
    concern: buildConcernText(formData),
    condition: buildConcernText(formData),
    message: buildConcernText(formData),
    pageUrl,
    url: pageUrl,
    consent: true,
    professionalBackground: formData.professionalBackground,
    digitalExperience: formData.digitalExperience,
    mainStruggle: formData.mainStruggle,
    revenueMechanism: formData.revenueMechanism,
    platformPriorities: formData.platformPriorities,
    ultimateGoal: formData.ultimateGoal,
    investmentMindset: formData.investmentMindset,
    budgetFit: formData.budgetFit,
    consultationDate: formData.consultationDate,
  };
}

async function submitConsultation(formData: FormData) {
  const endpoint = SUBMISSION_ENDPOINT.trim();
  if (!endpoint) return;

  const isExternalEndpoint = /^https?:\/\//i.test(endpoint);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": isExternalEndpoint ? "text/plain;charset=utf-8" : "application/json" },
    body: JSON.stringify(buildSubmissionPayload(formData)),
    mode: isExternalEndpoint ? "no-cors" : "cors",
  });

  if (!isExternalEndpoint && !response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Submission failed");
  }
}

export function GrowMedicoConsultation() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("name");
  const [messages, setMessages] = useState<Message[]>(createInitialMessages);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingStep, setEditingStep] = useState<FieldStep | null>(null);
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
    budgetFit: "",
    consultationDate: "",
  });

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const idRef = useRef(1);

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
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, step]);

  useEffect(() => {
    if (!OPTIONS[step] && step !== "summary") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  const playVideo = () => {
    if (!videoRef.current) return;

    videoRef.current.muted = false;
    videoRef.current.defaultMuted = false;
    videoRef.current.volume = 1;
    videoRef.current.play().catch(() => {
      // Browser autoplay policies can block unmuted playback before user interaction.
    });
  };

  useEffect(() => {
    const playTimer = window.setTimeout(playVideo, 100);
    return () => window.clearTimeout(playTimer);
  }, []);

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

    if (editingStep === step) {
      setData((current) => ({ ...current, [step]: trimmedValue }));
      setEditingStep(null);
      setStep("summary");
      pushBot("Updated. Please review your consultation summary.");
      return;
    }

    if (step === "investmentMindset") {
      setData((current) => ({
        ...current,
        investmentMindset: trimmedValue,
        budgetFit: "",
        consultationDate: shouldAskBudgetFit(trimmedValue) ? current.consultationDate : "",
      }));

      if (shouldAskBudgetFit(trimmedValue)) {
        setStep("budgetFit");
        pushBot(PROMPTS.budgetFit);
      } else {
        setStep("summary");
        pushBot("Thanks for sharing. Please review your consultation summary.");
      }
      return;
    }

    if (step === "budgetFit") {
      const isBudgetMatch = trimmedValue.toLowerCase() === "yes";

      setData((current) => ({
        ...current,
        budgetFit: trimmedValue,
        consultationDate: isBudgetMatch ? current.consultationDate : "",
      }));

      if (isBudgetMatch) {
        setStep("consultationDate");
        pushBot(PROMPTS.consultationDate);
      } else {
        setStep("summary");
        pushBot("Thanks for sharing. Please review your consultation summary.");
      }
      return;
    }

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

  const finish = async (finalData: FormData) => {
    setSubmitting(true);
    saveSubmissionToLocalStorage(finalData);

    try {
      await submitConsultation(finalData);
      const firstName = finalData.name.split(" ")[0] || "";
      navigate({ to: "/thank-you", search: { firstName, email: finalData.email } });
    } catch (error) {
      console.error("Failed to submit consultation:", error);
      pushNotice("We could not submit this right now. Please try again in a moment.");
      setSubmitting(false);
    }
  };

  const resetChat = () => {
    setStep("name");
    setMessages(createInitialMessages());
    idRef.current = 1;
    setInput("");
    setSelectedTime("");
    setSubmitting(false);
    setEditingStep(null);
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
      budgetFit: "",
      consultationDate: "",
    });
  };

  const editField = (field: FieldStep) => {
    const currentValue = data[field];
    setEditingStep(field);
    setStep(field);
    setTyping(false);

    if (field === "consultationDate") {
      const [date = "", time = ""] = currentValue.split(" at ");
      setInput(date);
      setSelectedTime(time);
    } else if (OPTIONS[field]) {
      setInput("");
      setSelectedTime("");
    } else {
      setInput(currentValue);
      setSelectedTime("");
    }

    pushNotice(`Editing ${PROMPTS[field]}`);
  };

  const summaryRows: Array<{ field: FieldStep; label: string; value: string }> = [
    { field: "name", label: "Name", value: data.name },
    { field: "email", label: "Email", value: data.email },
    { field: "phone", label: "Phone", value: data.phone },
    { field: "professionalBackground", label: "Professional Background", value: data.professionalBackground },
    { field: "digitalExperience", label: "Digital Experience", value: data.digitalExperience },
    { field: "mainStruggle", label: "Main Struggle", value: data.mainStruggle },
    { field: "revenueMechanism", label: "Revenue Mechanism", value: data.revenueMechanism },
    { field: "platformPriorities", label: "Platform Priorities", value: data.platformPriorities },
    { field: "ultimateGoal", label: "Ultimate Goal", value: data.ultimateGoal },
    { field: "investmentMindset", label: "Investment Mindset", value: data.investmentMindset },
    { field: "budgetFit", label: "Budget Fit", value: data.budgetFit },
    { field: "consultationDate", label: "Preferred Slot", value: data.consultationDate },
  ];
  const botAvatar = (
    <div className="avatar">
      <img src={LOGO_SRC} alt="Grow Medico" />
    </div>
  );

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; }
    .gold-page input,
    .gold-page button,
    .gold-page textarea,
    .gold-page select {
      font-family: 'Manrope', Arial, sans-serif;
    }
    .gold-page {
      position: fixed;
      inset: 0;
      height: 100dvh;
      width: 100%;
      background:
        radial-gradient(circle at 20% 8%, rgba(22,198,179,0.18), transparent 28%),
        radial-gradient(circle at 78% 0%, rgba(232,251,248,0.22), transparent 28%),
        linear-gradient(135deg, #020504 0%, #062826 46%, #e9f8f6 100%);
      color: #050505;
      font-family: 'Manrope', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 14px;
      padding: 0;
      overflow: hidden;
    }
    .consultation-shell {
      width: 100vw;
      height: 100dvh;
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(260px, 0.62fr) minmax(660px, 1.38fr);
      gap: 0;
      align-items: stretch;
      background: #041413;
    }
    .video-panel {
      position: relative;
      min-height: 0;
      border-radius: 0;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 18%, rgba(22, 198, 179, 0.2), transparent 34%),
        #030607;
      border: none;
    }
    .video-panel::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgba(3, 6, 7, 0.28), transparent 34%, rgba(3, 6, 7, 0.34)),
        linear-gradient(180deg, rgba(3, 6, 7, 0.22), transparent 42%, rgba(3, 6, 7, 0.42));
    }
    .video-panel::after {
      content: "";
      position: absolute;
      inset: 18px;
      z-index: 2;
      pointer-events: none;
      border: 1px solid rgba(232, 251, 248, 0.22);
    }
    .video-panel video {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #030607;
      filter: saturate(1.06) contrast(1.04);
    }
    .chat-card {
      width: 100%;
      height: 100%;
      min-height: 0;
      background:
        radial-gradient(circle at 50% 0%, rgba(22, 198, 179, 0.1), transparent 30%),
        linear-gradient(180deg, #fbfffe 0%, #f5fbfa 48%, #eef8f7 100%);
      border-radius: 0;
      position: relative;
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      border-left: 1px solid rgba(22, 198, 179, 0.28);
      overflow: hidden;
    }
    .chat-card::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 120px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.9), transparent),
        linear-gradient(90deg, transparent, rgba(7, 155, 143, 0.06), transparent);
      pointer-events: none;
    }
    .logo-crown {
      position: absolute;
      top: 18px;
      left: 50%;
      width: 268px;
      height: 66px;
      transform: translateX(-50%);
      border-radius: 999px;
      background:
        linear-gradient(135deg, rgba(22,198,179,0.32), rgba(3,6,7,0.96)),
        #030607;
      display: grid;
      place-items: center;
      z-index: 2;
      border: 1px solid rgba(232, 251, 248, 0.2);
      outline: 1px solid rgba(22,198,179,0.36);
      outline-offset: -5px;
      overflow: hidden;
    }
    .logo-crown img {
      width: 202px;
      height: 52px;
      display: block;
      object-fit: contain;
    }
    .logo-title {
      position: absolute;
      top: 92px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      width: min(520px, calc(100% - 260px));
      margin: 0;
      color: #020b0b;
      font-size: 28px;
      line-height: 1;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0;
    }
    .logo-tagline {
      position: absolute;
      top: 124px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      width: min(520px, calc(100% - 260px));
      margin: 0;
      color: #143838;
      font-size: 15px;
      line-height: 1.2;
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .logo-rule {
      position: absolute;
      top: 151px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
      width: 44px;
      height: 6px;
      border-radius: 999px;
      background: #079b8f;
    }
    .chat-body-wrap {
      position: relative;
      min-height: 0;
      padding: 178px 38px 0;
    }
    .refresh-btn {
      position: absolute;
      top: 26px;
      right: 44px;
      width: 40px;
      height: 40px;
      border: 1px solid rgba(232, 251, 248, 0.22);
      border-radius: 50%;
      background: #079b8f;
      color: #ffffff;
      font-size: 23px;
      line-height: 1;
      cursor: pointer;
      display: grid;
      place-items: center;
      z-index: 2;
      transition: background 0.18s ease, transform 0.18s ease;
    }
    .refresh-btn:hover {
      background: #047f76;
      transform: translateY(-1px);
    }
    .chat-body {
      height: 100%;
      overflow-y: auto;
      padding: 0 0 20px;
      scrollbar-width: auto;
      scrollbar-color: #9fcfca transparent;
    }
    .chat-body::-webkit-scrollbar { width: 13px; }
    .chat-body::-webkit-scrollbar-thumb {
      background: #9fcfca;
      border-radius: 999px;
      border: 3px solid #f8fffe;
    }
    .chat-body::-webkit-scrollbar-track { background: transparent; }
    .row {
      display: grid;
      grid-template-columns: 52px minmax(0, 1fr);
      gap: 18px;
      align-items: start;
      margin-bottom: 10px;
      padding-right: 22px;
    }
    .row.user {
      display: flex;
      justify-content: flex-end;
      padding-right: 26px;
      margin: 18px 0 8px;
    }
    .avatar {
      width: 50px;
      height: 40px;
      display: grid;
      place-items: center;
      margin-top: 8px;
      border-radius: 999px;
      background: #030607;
      border: 1px solid rgba(22,198,179,0.34);
    }
    .avatar img {
      width: 40px;
      height: auto;
      object-fit: contain;
      opacity: 0.95;
    }
    .bubble {
      width: fit-content;
      max-width: 800px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(246, 253, 252, 0.88));
      border: 1px solid rgba(7, 155, 143, 0.14);
      border-radius: 8px 24px 24px 24px;
      color: #173f43;
      padding: 18px 25px;
      font-size: 20px;
      line-height: 1.32;
      font-weight: 500;
    }
    .bubble strong {
      color: #079b8f;
      font-weight: 800;
    }
    .user-bubble {
      max-width: 510px;
      border-radius: 24px 8px 24px 24px;
      background: linear-gradient(135deg, #047f76, #16b9ab);
      color: #ffffff;
      padding: 14px 23px;
      font-size: 20px;
      line-height: 1.28;
      font-weight: 600;
      text-align: left;
    }
    .time {
      color: #88a9a7;
      font-size: 14px;
      line-height: 1;
      margin: 8px 0 20px 68px;
      font-weight: 300;
    }
    .user-time {
      color: #88a9a7;
      font-size: 14px;
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
      background: rgba(238, 248, 247, 0.86);
      color: #173f43;
      padding: 11px 18px;
      font-size: 16px;
      line-height: 1.25;
      text-align: center;
    }
    .option-bubble {
      max-width: 770px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(246, 253, 252, 0.9));
      border: 1px solid rgba(7, 155, 143, 0.14);
      border-radius: 8px 24px 24px 24px;
      padding: 18px 25px 21px;
      color: #315f63;
    }
    .option-title {
      margin: 0 0 12px;
      font-size: 20px;
      line-height: 1.3;
      font-weight: 700;
    }
    .choice-list {
      display: flex;
      flex-wrap: wrap;
      gap: 11px 12px;
    }
    .choice-btn {
      border: 1px solid rgba(7, 155, 143, 0.34);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.86);
      color: #073b3b;
      min-height: 50px;
      padding: 0 17px;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      line-height: 1.1;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
    }
    .choice-btn::before {
      content: "";
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: #cfe9e6;
      flex: 0 0 auto;
    }
    .choice-btn.active,
    .choice-btn:hover {
      background: linear-gradient(135deg, #047f76, #16b9ab);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .choice-btn.active::before,
    .choice-btn:hover::before {
      background: #ffffff;
    }
    .confirm-btn,
    .finish-btn {
      border: 1px solid rgba(7, 155, 143, 0.36);
      border-radius: 999px;
      background: linear-gradient(135deg, #047f76, #16b9ab);
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
      border: 1px solid rgba(7, 155, 143, 0.12);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.88);
      padding: 9px 12px;
      min-width: 0;
    }
    .summary-item-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 3px;
    }
    .summary-item span {
      display: block;
      color: #7f8d97;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .edit-field-btn {
      border: none;
      border-radius: 999px;
      background: #e4f5f3;
      color: #079b8f;
      padding: 4px 9px;
      font-family: inherit;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
    }
    .summary-item p {
      margin: 0;
      color: #1a1a1a;
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .chat-input {
      padding: 0 42px 28px;
      background: transparent;
    }
    .review-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 15px;
    }
    .review-actions .finish-btn {
      margin-top: 0;
    }
    .continue-btn {
      border: 1px solid #b7d7d5;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.86);
      color: #073b3b;
      min-height: 50px;
      padding: 0 22px;
      font-family: inherit;
      font-size: 18px;
      cursor: pointer;
    }
    .input-line {
      border: 1px solid rgba(7, 155, 143, 0.28);
      border-radius: 999px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 253, 252, 0.92));
      display: grid;
      grid-template-columns: minmax(0, 1fr) 50px;
      align-items: center;
      gap: 12px;
      min-height: 66px;
    }
    .answer-input {
      width: 100%;
      border: none;
      outline: none;
      color: #062f2e;
      font-family: 'Manrope', Arial, sans-serif;
      font-size: 18px;
      font-weight: 600;
      padding: 0 0 0 24px;
      background: transparent;
    }
    .answer-input::placeholder {
      color: #aebbc4;
      font-family: 'Manrope', Arial, sans-serif;
      font-weight: 500;
    }
    .send-btn {
      border: none;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #8fd8d1;
      color: #ffffff;
      font-size: 25px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
      display: grid;
      place-items: center;
      transition: background 0.18s ease, transform 0.18s ease;
    }
    .send-btn:not(:disabled) {
      background: linear-gradient(135deg, #047f76, #16b9ab);
    }
    .send-btn:not(:disabled):hover {
      background: #047f76;
      transform: translateX(1px);
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
    @media (max-width: 980px) {
      .gold-page {
        padding: 0;
        overflow-y: auto;
        justify-content: flex-start;
      }
      .consultation-shell {
        width: 100%;
        height: auto;
        min-height: 0;
        grid-template-columns: 1fr;
        gap: 0;
      }
      .video-panel {
        height: 46dvh;
      }
      .chat-card {
        width: 100%;
        height: 54dvh;
        min-height: 0;
        grid-template-rows: minmax(0, 1fr) auto;
        border-left: none;
        border-top: 1px solid rgba(7, 155, 143, 0.22);
      }
      .logo-crown {
        width: 220px;
        height: 56px;
        top: 10px;
      }
      .logo-crown img {
        width: 166px;
        height: 42px;
      }
      .logo-title {
        top: 70px;
        width: min(360px, calc(100% - 160px));
        font-size: 22px;
      }
      .logo-tagline {
        top: 96px;
        width: min(360px, calc(100% - 160px));
        font-size: 11px;
      }
      .logo-rule {
        top: 120px;
        width: 38px;
        height: 5px;
      }
      .chat-body-wrap {
        padding: 148px 12px 0;
      }
      .refresh-btn {
        right: 22px;
        top: 16px;
      }
      .row {
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 9px;
        padding-right: 20px;
      }
      .chat-body {
        padding-top: 0;
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
    @media (max-width: 640px) {
      .gold-page {
        height: 100dvh;
        overflow: hidden;
      }
      .consultation-shell {
        height: 100dvh;
        overflow: hidden;
      }
      .video-panel {
        height: 32dvh;
        min-height: 500px;
      }
      .video-panel::after {
        inset: 10px;
      }
      .chat-card {
        height: 68dvh;
        min-height: 0;
      }
      .logo-crown {
        top: 8px;
        width: 172px;
        height: 44px;
      }
      .logo-crown img {
        width: 132px;
        height: 34px;
      }
      .logo-title {
        top: 56px;
        width: min(280px, calc(100% - 150px));
        font-size: 18px;
      }
      .logo-tagline {
        top: 78px;
        width: min(310px, calc(100% - 48px));
        font-size: 10px;
        line-height: 1.15;
      }
      .logo-rule {
        top: 100px;
        width: 34px;
        height: 4px;
      }
      .refresh-btn {
        top: 10px;
        right: 12px;
        width: 34px;
        height: 34px;
        font-size: 20px;
      }
      .chat-body-wrap {
        padding: 124px 10px 0;
      }
      .chat-body {
        padding-bottom: 12px;
        scrollbar-width: thin;
      }
      .chat-body::-webkit-scrollbar {
        width: 7px;
      }
      .row {
        grid-template-columns: 32px minmax(0, 1fr);
        gap: 8px;
        padding-right: 6px;
        margin-bottom: 8px;
      }
      .row.user {
        padding-right: 6px;
        margin: 12px 0 6px;
      }
      .avatar {
        width: 30px;
        height: 26px;
        margin-top: 6px;
      }
      .avatar img {
        width: 25px;
      }
      .bubble,
      .option-bubble {
        max-width: 100%;
        border-radius: 8px 18px 18px 18px;
        padding: 11px 13px;
        font-size: 14px;
        line-height: 1.35;
      }
      .user-bubble {
        max-width: calc(100vw - 70px);
        border-radius: 18px 8px 18px 18px;
        padding: 10px 13px;
        font-size: 14px;
        line-height: 1.35;
      }
      .time {
        margin: 5px 0 13px 40px;
        font-size: 12px;
      }
      .user-time {
        padding-right: 8px;
        margin-bottom: 16px;
        font-size: 12px;
      }
      .notice-row {
        padding-right: 6px;
      }
      .notice-bubble {
        border-radius: 16px;
        padding: 9px 12px;
        font-size: 13px;
      }
      .option-title {
        font-size: 14px;
        line-height: 1.35;
      }
      .choice-list {
        gap: 8px;
      }
      .choice-btn {
        width: 100%;
        justify-content: flex-start;
        min-height: 42px;
        padding: 8px 12px;
        font-size: 13px;
        line-height: 1.25;
        border-radius: 14px;
      }
      .choice-btn::before {
        width: 10px;
        height: 10px;
      }
      .summary-item p {
        font-size: 13px;
      }
      .chat-input {
        padding: 0 10px 10px;
      }
      .input-line {
        min-height: 52px;
        grid-template-columns: minmax(0, 1fr) 42px;
        gap: 8px;
      }
      .answer-input {
        font-size: 15px;
        padding-left: 16px;
      }
      .send-btn {
        width: 36px;
        height: 36px;
        font-size: 21px;
      }
      .time-row {
        gap: 7px;
        padding: 8px 0 0 8px;
      }
      .time-row .choice-btn {
        width: auto;
        min-height: 36px;
        font-size: 13px;
        border-radius: 999px;
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
            {summaryRows.map(({ field, label, value }) => (
              <div key={label} className="summary-item">
                <div className="summary-item-head">
                  <span>{label}</span>
                  <button className="edit-field-btn" type="button" onClick={() => editField(field)}>
                    Edit
                  </button>
                </div>
                <p>{value || "-"}</p>
              </div>
            ))}
          </div>
          <div className="review-actions">
            <button className="finish-btn" onClick={() => finish(data)} disabled={submitting}>
              {submitting ? "Sending..." : "Confirm & Connect"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="gold-page">
      <style>{styles}</style>
      <div className="consultation-shell">
        <aside className="video-panel" aria-label="Intro video">
          <video
            ref={videoRef}
            src={POPUP_VIDEO_SRC}
            controls
            autoPlay
            loop
            playsInline
            muted={false}
            preload="auto"
            onCanPlay={playVideo}
          />
        </aside>

      <section className="chat-card">
        <div className="logo-crown">
          <img src={LOGO_SRC} alt="Grow Medico" />
        </div>
        <p className="logo-title">GROW MEDICO</p>
        <p className="logo-tagline">Personal Branding | Digital Marketing | Growth</p>
        <span className="logo-rule" aria-hidden="true" />

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
                please fill the form below to book a consultation with our team.
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
      </div>
    </main>
  );
}
