import { prisma } from "./prisma";

export type LeadPayload = {
  name?: string;
  phone?: string;
  email?: string;
  treatment?: string;
  procedure?: string;
  message?: string;
  city?: string;
  age?: string;
  pincode?: string;
  test?: string;
  source?: string;
  formName?: string;
  consent?: boolean;
  status?: string;
  whatsappNumber?: string;
  womansAgeBracket?: string;
  tryingDuration?: string;
  isWhatsapp?: string;
  whatsapp?: string;
  appointmentDateTime?: string;
  consultationDate?: string;
  concern?: string;
  condition?: string;
  professionalBackground?: string;
  digitalExperience?: string;
  mainStruggle?: string;
  revenueMechanism?: string;
  platformPriorities?: string;
  ultimateGoal?: string;
  investmentMindset?: string;
  pageUrl?: string;
  url?: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLeadPayload(payload: LeadPayload) {
  const source = text(payload.source) || "Website";
  const formName =
    text(payload.formName) ||
    (source === "Grow Medico Consultation" ? "Grow Medico Consultation" : "Website Leads");
  const isGrowMedico = formName.toLowerCase() === "grow medico consultation";
  const treatment =
    text(payload.treatment) ||
    text(payload.test) ||
    (isGrowMedico ? "Personal Branding Consultation" : "");
  const message = text(payload.message) || text(payload.concern) || text(payload.condition);

  return {
    ...payload,
    source,
    formName,
    treatment,
    message,
    consent: payload.consent ?? isGrowMedico,
    appointmentDateTime: text(payload.appointmentDateTime) || text(payload.consultationDate),
    pageUrl: text(payload.pageUrl) || text(payload.url),
  };
}

export async function createLead(payload: LeadPayload) {
  const leadData = normalizeLeadPayload(payload);

  if (!text(leadData.name) || !text(leadData.phone)) {
    throw new Error("Name and phone are required");
  }

  return prisma.lead.create({
    data: {
      name: text(leadData.name),
      phone: text(leadData.phone),
      email: text(leadData.email) || null,
      treatment: text(leadData.treatment) || null,
      procedure: text(leadData.procedure) || text(leadData.test) || null,
      message: text(leadData.message) || null,
      city: text(leadData.city) || null,
      age: text(leadData.age) || text(leadData.womansAgeBracket) || null,
      pincode: text(leadData.pincode) || null,
      consent: Boolean(leadData.consent),
      source: text(leadData.source) || null,
      formName: text(leadData.formName) || "Website Leads",
      status: text(leadData.status) || "new",
      whatsappNumber: text(leadData.whatsappNumber) || text(leadData.whatsapp) || null,
      womansAgeBracket: text(leadData.womansAgeBracket) || null,
      tryingDuration: text(leadData.tryingDuration) || null,
      isWhatsapp: text(leadData.isWhatsapp) || null,
      appointmentDateTime: text(leadData.appointmentDateTime) || null,
      professionalBackground: text(leadData.professionalBackground) || null,
      digitalExperience: text(leadData.digitalExperience) || null,
      mainStruggle: text(leadData.mainStruggle) || null,
      revenueMechanism: text(leadData.revenueMechanism) || null,
      platformPriorities: text(leadData.platformPriorities) || null,
      ultimateGoal: text(leadData.ultimateGoal) || null,
      investmentMindset: text(leadData.investmentMindset) || null,
      pageUrl: text(leadData.pageUrl) || null,
    },
  });
}

export async function listLeads() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return leads.map((lead) => ({
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  }));
}
