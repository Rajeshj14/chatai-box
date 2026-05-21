// app/api/leads/route.ts
import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * ✅ Prisma singleton (prevents "too many connections" in Next.js dev)
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

interface LeadData {
  name: string;
  phone: string;
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
  
  // Smile Baby specific fields
  whatsappNumber?: string;
  womansAgeBracket?: string;
  tryingDuration?: string;
  isWhatsapp?: string;
  whatsapp?: string;

  // Grow Medico consultation specific fields
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
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function logEnvironmentStatus() {
  console.log("🔍 Environment Check:", {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? "***SET***" : "❌ NOT SET",
    TELECRM_API_URL: process.env.TELECRM_API_URL ? "***SET***" : "❌ NOT SET",
    TELECRM_API_KEY: process.env.TELECRM_API_KEY ? "***SET***" : "❌ NOT SET",
  });
}

/**
 * ✅ Normalize phone for TeleCRM
 * - If 10 digits → assume India and prefix 91
 * - If already starts with 91 and 12 digits → keep
 */
function normalizePhoneForTeleCRM(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * ✅ Decide if TeleCRM truly created/updated a lead
 */
function isTelecrmConfirmed(data: any) {
  if (!data) return false;

  if (Array.isArray(data.modifiedLeadIds) && data.modifiedLeadIds.length > 0) return true;
  if (Array.isArray(data.leadIds) && data.leadIds.length > 0) return true;
  if (data.leadId || data.id || data.LeadID) return true;

  const status = String(data.status || "").toLowerCase();
  if (status === "created" || status === "updated" || status === "success") return true;

  if (String(data.result || "").toLowerCase() === "accepted") return false;

  return false;
}

/**
 * ✅ Save lead to database
 */
async function saveLeadToDatabase(leadData: LeadData, telecrmResult?: any) {
  console.log("💾 Saving lead to database:", {
    name: leadData.name,
    phone: leadData.phone,
    email: leadData.email,
    formName: leadData.formName,
  });

  // Determine treatment based on form type
  let treatment = leadData.treatment || leadData.test;
  if (leadData.formName?.toLowerCase() === 'smile baby evaluation') {
    treatment = 'SB Evaluation Consultation';
  }

  if (leadData.formName?.toLowerCase() === 'grow medico consultation') {
    treatment = treatment || 'Personal Branding Consultation';
  }

  const message = leadData.message || leadData.concern || leadData.condition || null;
  const appointmentDateTime = leadData.appointmentDateTime || leadData.consultationDate || null;

  const lead = await prisma.lead.create({
    data: {
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email || null,
      treatment: treatment || null,
      procedure: leadData.procedure || leadData.test || null,
      message,
      city: leadData.city || null,
      age: leadData.age || leadData.womansAgeBracket || null,
      pincode: leadData.pincode || null,
      consent: !!leadData.consent,
      source: leadData.source || null,
      formName: leadData.formName || "Website Leads",
      status: leadData.status || "new",
      
      // Smile Baby specific fields
      whatsappNumber: leadData.whatsappNumber || leadData.whatsapp || null,
      womansAgeBracket: leadData.womansAgeBracket || null,
      tryingDuration: leadData.tryingDuration || null,
      isWhatsapp: leadData.isWhatsapp || null,

      appointmentDateTime,
      professionalBackground: leadData.professionalBackground || null,
      digitalExperience: leadData.digitalExperience || null,
      mainStruggle: leadData.mainStruggle || null,
      revenueMechanism: leadData.revenueMechanism || null,
      platformPriorities: leadData.platformPriorities || null,
      ultimateGoal: leadData.ultimateGoal || null,
      investmentMindset: leadData.investmentMindset || null,
      pageUrl: leadData.pageUrl || leadData.url || null,

      telecrmSynced: !!telecrmResult?.synced,
      telecrmId: telecrmResult?.leadId || telecrmResult?.id || telecrmResult?.LeadID || null,
    },
  });

  console.log("✅ Lead saved to database:", { 
    id: lead.id, 
    name: lead.name, 
    phone: lead.phone,
    formName: lead.formName 
  });
  
  return lead;
}

/**
 * ✅ Send to TeleCRM
 */
async function sendToTeleCRM(leadData: LeadData) {
  if (!process.env.TELECRM_API_URL || !process.env.TELECRM_API_KEY) {
    console.log("ℹ️ TeleCRM not configured, skipping external sync");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  const phone = normalizePhoneForTeleCRM(leadData.phone);
  
  // Prepare notes based on form type
  const notes = [
    { type: "SYSTEM_NOTE", text: `Form Name: ${leadData.formName || "Website Leads"}` },
    { type: "SYSTEM_NOTE", text: `Source: ${leadData.source || "Website"}` },
    { type: "SYSTEM_NOTE", text: `Consent Given: ${leadData.consent ? "Yes" : "No"}` },
  ];

  // Add Smile Baby specific notes
  if (leadData.formName?.toLowerCase() === 'smile baby evaluation') {
    notes.push(
      { type: "SYSTEM_NOTE", text: `Service: Evaluation Consultation - Smile Baby Evaluation` },
      { type: "SYSTEM_NOTE", text: `Woman's Age Bracket: ${leadData.womansAgeBracket || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Trying Duration: ${leadData.tryingDuration || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `WhatsApp: ${leadData.isWhatsapp || leadData.whatsapp || "Not specified"}` }
    );
  } else if (leadData.formName?.toLowerCase() === 'grow medico consultation') {
    notes.push(
      { type: "SYSTEM_NOTE", text: `Service: Personal Branding Consultation` },
      { type: "SYSTEM_NOTE", text: `Appointment DateTime: ${leadData.appointmentDateTime || leadData.consultationDate || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Professional Background: ${leadData.professionalBackground || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Digital Experience: ${leadData.digitalExperience || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Main Struggle: ${leadData.mainStruggle || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Revenue Mechanism: ${leadData.revenueMechanism || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Platform Priorities: ${leadData.platformPriorities || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Ultimate Goal: ${leadData.ultimateGoal || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Investment Mindset: ${leadData.investmentMindset || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `URL: ${leadData.pageUrl || leadData.url || "Not specified"}` }
    );
  } else {
    // Add other form specific notes
    notes.push(
      { type: "SYSTEM_NOTE", text: `Test/Treatment Requested: ${leadData.test || leadData.treatment || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Pincode: ${leadData.pincode || "Not specified"}` },
      { type: "SYSTEM_NOTE", text: `Message: ${leadData.message || "Not specified"}` }
    );
  }

  const telecrmPayload = {
    fields: {
      phone,
      name: leadData.name,
      email: leadData.email || "",
    },
    actions: notes,
  };

  console.log("📤 Sending to TeleCRM:", {
    endpoint: process.env.TELECRM_API_URL,
    formName: leadData.formName,
    payloadPreview: { 
      ...telecrmPayload, 
      fields: { ...telecrmPayload.fields, phone: "***REDACTED***" } 
    },
  });

  try {
    const res = await fetch(process.env.TELECRM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TELECRM_API_KEY}`,
        Accept: "application/json",
        "X-Client-ID": "nextjs-website-integration",
      },
      body: JSON.stringify(telecrmPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (res.status === 204) {
      console.log("✅ TeleCRM: 204 No Content");
      return {
        synced: false,
        statusCode: 204,
        result: "NoContent",
        note: "TeleCRM returned 204, no body. Cannot confirm lead creation.",
      };
    }

    const text = await res.text();

    if (!text.trim()) {
      console.warn("⚠️ TeleCRM empty response body");
      return { synced: false, statusCode: res.status, note: "Empty response from TeleCRM" };
    }

    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      console.warn("⚠️ TeleCRM returned HTML (likely error page)");
      return {
        synced: false,
        statusCode: res.status,
        note: "TeleCRM returned HTML error page",
        preview: text.substring(0, 250),
      };
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("⚠️ TeleCRM returned non-JSON response:", text.substring(0, 300));
      return {
        synced: false,
        statusCode: res.status,
        note: "Non-JSON response from TeleCRM",
        preview: text.substring(0, 300),
      };
    }

    const confirmed = res.ok && isTelecrmConfirmed(data);

    console.log("📊 TeleCRM response parsed:", {
      status: res.status,
      ok: res.ok,
      confirmed,
    });

    return {
      ...data,
      synced: confirmed,
      statusCode: res.status,
      leadId: data?.leadId || data?.id || data?.LeadID || null,
      note: confirmed
        ? "TeleCRM lead confirmed"
        : "TeleCRM accepted request but did not confirm lead creation.",
    };
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn("⚠️ TeleCRM submission failed:", { message: err?.message || String(err) });
    return { synced: false, note: "TeleCRM fetch failed", error: err?.message || String(err) };
  }
}

/**
 * ✅ POST /api/leads
 */
export async function POST(request: NextRequest) {
  logEnvironmentStatus();

  let data: Partial<LeadData> = {};

  try {
    data = await request.json();

    data.formName = text(data.formName) || (text(data.source) === "Grow Medico Consultation" ? "Grow Medico Consultation" : data.formName);
    data.message = text(data.message) || text(data.concern) || text(data.condition) || data.message;
    data.treatment = text(data.treatment) || (data.formName === "Grow Medico Consultation" ? "Personal Branding Consultation" : data.treatment);
    data.consent = data.consent ?? (data.formName === "Grow Medico Consultation");

    console.log("📨 Received lead submission:", {
      name: data.name,
      phoneMasked: data.phone ? data.phone.substring(0, 3) + "****" + data.phone.substring(Math.max(0, data.phone.length - 3)) : "N/A",
      formName: data.formName,
    });

    if (!data.name || !data.phone) {
      return NextResponse.json(
        { success: false, error: "Missing required fields", details: "Please provide name and phone number" },
        { status: 400 }
      );
    }

    const validatedData = data as LeadData;

    // ✅ TeleCRM sync
    let telecrmResponse: any = null;
    if (process.env.TELECRM_API_URL && process.env.TELECRM_API_KEY) {
      console.log("🚀 Attempting TeleCRM sync...");
      telecrmResponse = await sendToTeleCRM(validatedData);
    } else {
      console.log("⏭️ TeleCRM not configured, skipping sync");
    }

    // ✅ Save to DB
    const dbLead = await saveLeadToDatabase(validatedData, telecrmResponse);

    const responseData = {
      success: true,
      leadId: dbLead.id,
      databaseSaved: true,
      telecrmSynced: !!telecrmResponse?.synced,
      telecrmResponse,
      timestamp: new Date().toISOString(),
      formName: validatedData.formName || "Website Leads",
      message: "Thank you! We have received your request and will contact you soon.",
    };

    console.log("✅ Final response:", {
      leadId: dbLead.id,
      formName: dbLead.formName,
      telecrmSynced: !!telecrmResponse?.synced,
      telecrmId: telecrmResponse?.leadId || telecrmResponse?.id || null,
    });

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("❌ Lead submission error:", { message: error?.message || String(error) });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process your request",
        details: "Please try again or contact support",
        referenceId: `ERR-${Date.now()}`,
        formName: data?.formName || "Website Leads",
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ GET /api/leads
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const formName = searchParams.get("formName");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { treatment: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { pincode: { contains: search, mode: "insensitive" } },
        { womansAgeBracket: { contains: search, mode: "insensitive" } },
        { tryingDuration: { contains: search, mode: "insensitive" } },
        { professionalBackground: { contains: search, mode: "insensitive" } },
        { digitalExperience: { contains: search, mode: "insensitive" } },
        { mainStruggle: { contains: search, mode: "insensitive" } },
        { revenueMechanism: { contains: search, mode: "insensitive" } },
        { platformPriorities: { contains: search, mode: "insensitive" } },
        { ultimateGoal: { contains: search, mode: "insensitive" } },
        { investmentMindset: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") where.status = status;
    if (formName && formName !== "all") where.formName = formName;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({ 
        where, 
        orderBy: { createdAt: "desc" }, 
        skip, 
        take: limit 
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        leads: leads.map((lead: any) => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          treatment: lead.treatment,
          procedure: lead.procedure,
          message: lead.message,
          city: lead.city,
          age: lead.age,
          pincode: lead.pincode,
          consent: lead.consent,
          source: lead.source,
          formName: lead.formName,
          status: lead.status,
          telecrmSynced: lead.telecrmSynced,
          telecrmId: lead.telecrmId,
          
          // Smile Baby specific fields
          whatsappNumber: lead.whatsappNumber,
          womansAgeBracket: lead.womansAgeBracket,
          tryingDuration: lead.tryingDuration,
          isWhatsapp: lead.isWhatsapp,

          // Grow Medico consultation specific fields
          appointmentDateTime: lead.appointmentDateTime,
          professionalBackground: lead.professionalBackground,
          digitalExperience: lead.digitalExperience,
          mainStruggle: lead.mainStruggle,
          revenueMechanism: lead.revenueMechanism,
          platformPriorities: lead.platformPriorities,
          ultimateGoal: lead.ultimateGoal,
          investmentMindset: lead.investmentMindset,
          pageUrl: lead.pageUrl,
          
          createdAt: lead.createdAt.toISOString(),
          updatedAt: lead.updatedAt.toISOString(),
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leads", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
