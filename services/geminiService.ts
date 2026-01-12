
import { GoogleGenAI, Type } from "@google/genai";

// Helper to handle API Rate Limits (429) with exponential backoff
const generateContentWithRetry = async (ai: GoogleGenAI, params: any, retries = 3, delay = 1000): Promise<any> => {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    // 1. Normalize the error message
    let msg = error?.message || '';
    if (error?.error?.message) {
        msg = error.error.message;
    } else if (typeof error === 'string') {
        msg = error;
    }

    const msgLower = msg.toLowerCase();
    const isRateLimit = error?.status === 429 || error?.code === 429 || msgLower.includes('429') || msgLower.includes('resource_exhausted');
    const isQuotaHardLimit = msgLower.includes('quota') || msgLower.includes('exceeded');

    // 2. Retry logic (Skip if it's a hard quota limit)
    if (isRateLimit && !isQuotaHardLimit && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateContentWithRetry(ai, params, retries - 1, delay * 2);
    }
    
    // 3. Attach flags for UI handling
    if (typeof error === 'object' && error !== null) {
        error.message = msg; 
        error.isQuotaError = isQuotaHardLimit || isRateLimit;
    } else {
        const wrappedError: any = new Error(msg);
        wrappedError.isQuotaError = isQuotaHardLimit || isRateLimit;
        throw wrappedError;
    }
    
    throw error;
  }
};

// Helper to clean JSON string from Markdown
const cleanJsonString = (text: string) => {
  if (!text) return '[]';
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    clean = clean.substring(firstBracket, lastBracket + 1);
  }
  return clean;
};

export const generatePropertyDescription = async (address: string, features: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a compelling property description for ${address}. Features: ${features.join(', ')}.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating description.";
  }
};

export const generateLeaseAppraisal = async (
  address: string, type: string, beds: string, baths: string, cars: string, features: string[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate Lease Appraisal for ${address} (${type}, ${beds}bed, ${baths}bath). Features: ${features.join(', ')}. Include rent range, target tenant, marketing strategy.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating appraisal.";
  }
};

export const generateSalesAppraisal = async (
  address: string, type: string, beds: string, baths: string, cars: string, features: string[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate Sales Appraisal for ${address}.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating sales appraisal.";
  }
};

export const generateProspectingMessage = async (area: string, type: string, hook: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a real estate prospecting ${type} for ${area}. Hook: ${hook}.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating message.";
  }
};

export const analyzeArrearsMessage = async (
  tenantName: string, amount: number, days: number, address: string, item: string, deadline: string, paymentMethod: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft arrears notice for ${tenantName} at ${address}. $${amount} overdue by ${days} days.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating notice.";
  }
};

export const generateQuoteRequestEmail = async (tradesmanName: string, address: string, issue: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write quote request email to ${tradesmanName} for ${issue} at ${address}.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating email.";
  }
};

export const parseTransactionFromText = async (rawText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract transaction from: "${rawText}". Return JSON: {description, amount, type, account, reference}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (error) {
    return null;
  }
};

export const parseInvoiceRequest = async (
  text: string, address: string, type: 'Owner' | 'Tenant', date: string, templateBase64?: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const parts: any[] = [{ text: `Generate invoice JSON for ${address}. Details: ${text}` }];
    if (templateBase64) parts.push({ inlineData: { mimeType: "image/png", data: templateBase64 } });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (error) {
    return null;
  }
};

export const parseBankStatement = async (imageBase64: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: `Extract bank transactions to JSON array.` }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (error) {
    return [];
  }
};

export const prioritizeMaintenance = async (issue: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Prioritize maintenance: "${issue}". Return JSON: {priority: Low|Medium|High|Urgent}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}')).priority || 'Medium';
  } catch (error) {
    return 'Medium';
  }
};

export const generateBackgroundCheck = async (name: string, id: string, address: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate hypothetical background check JSON for ${name}.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (error) {
    return null;
  }
};

export const generatePrivacyConsent = async (agencyName: string, applicantName: string, propertyAddress: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft Privacy Consent Form for ${applicantName} applying at ${propertyAddress}.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating form.";
  }
};

export const generateEntryNotice = async (tenantName: string, address: string, date: string, timeWindow: string = '9:00 AM - 5:00 PM') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft Entry Notice for ${tenantName} at ${address} on ${date}.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating notice.";
  }
};

export const processScheduleTextCommand = async (text: string, contextDate: string, currentSchedule: string = '') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Property Schedule Assistant. Date: ${contextDate}. Schedule: ${currentSchedule}. User Input: "${text}". Return JSON action.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (error: any) {
    if (error?.isQuotaError) return { intent: "UNKNOWN", speechResponse: "⚠️ AI Daily Quota Reached. Please try again tomorrow." };
    return { intent: "UNKNOWN", speechResponse: "Service unavailable." };
  }
};

export const processScheduleVoiceCommand = async (audioBase64: string, contextDate: string, currentSchedule: string = '') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/mp3', data: audioBase64 } },
          { text: `Property Schedule Assistant. Date: ${contextDate}. Schedule: ${currentSchedule}. Return JSON action.` }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '{}'));
  } catch (error: any) {
    if (error?.isQuotaError) return { intent: "UNKNOWN", speechResponse: "⚠️ AI Daily Quota Reached." };
    return { intent: "UNKNOWN", speechResponse: "Service unavailable." };
  }
};

export const optimizeScheduleOrder = async (events: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const simpleEvents = events.map(e => ({ id: e.id, title: e.title, time: e.time, address: e.propertyAddress }));
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Re-order these events for efficiency: ${JSON.stringify(simpleEvents)}. Return JSON array of IDs.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (error) {
    console.warn("Optimization skipped (Quota/Error)");
    return []; 
  }
};

export const generateScheduleTips = async (events: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Review this schedule: ${JSON.stringify(events.map(e => e.title + ' at ' + e.propertyAddress))}. Give one short 15-word Pro Tip for efficiency.`
    });
    return response.text;
  } catch (error) {
    console.warn("Tips skipped (Quota/Error)");
    return "Check your keys and files before heading out!";
  }
};

export const summarizePropertyHistory = async (address: string, events: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await generateContentWithRetry(ai, {
        model: 'gemini-3-flash-preview',
        contents: `Summarize history for ${address} based on these events: ${JSON.stringify(events)}.`
    });
    return response.text;
  } catch (error) {
    return "History unavailable.";
  }
};

export const generateTaskSuggestions = async (taskTitle: string, taskType: string, taskDesc: string, taskAddress: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // UPDATED: Now using Retry Wrapper to handle transient errors
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Context: Property Manager Task Assistant.
      
      Task: ${taskTitle}
      Type: ${taskType}
      Address: ${taskAddress}
      Notes: ${taskDesc}

      CRITICAL: Analyze the address provided (${taskAddress}) to determine the Australian State/Territory jurisdiction.
      Provide 3 concise, actionable suggestions or steps to prepare for or complete this task effectively.`
    });
    return response.text;
  } catch (e: any) {
    // Explicit error message if Quota hit
    if (e.isQuotaError) return "⚠️ AI Quota Reached. Features disabled temporarily.";
    return "Unable to generate suggestions. Please try again.";
  }
};

export const generateLogbookEntriesFromSchedule = async (events: any[], officeAddress: string = 'Agency Office') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const tripPoints = events.filter(e => e.propertyAddress && e.propertyAddress !== 'General / Office');
    if (tripPoints.length === 0) return [];

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Calculate logbook trips for this schedule starting/ending at ${officeAddress}: ${JSON.stringify(tripPoints)}. Return JSON array {vehicle, date, purpose, category, distance}.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || '[]'));
  } catch (error: any) {
    throw error;
  }
};
