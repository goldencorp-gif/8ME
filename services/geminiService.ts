import { GoogleGenAI } from "@google/genai";
import { CalendarEvent, Property } from "../types";

// Helper: Get Key
const getApiKey = (): string | undefined => {
  // Prioritize environment variable as per secure coding guidelines
  if (process.env.API_KEY && process.env.API_KEY.length > 0) {
      return process.env.API_KEY;
  }
  // Fallback to local storage for user-configured keys (BYOK support)
  try {
    const settings = localStorage.getItem('proptrust_agency_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.aiApiKey) return parsed.aiApiKey;
    }
  } catch (e) {}
  return undefined;
};

const getAI = () => {
    const key = getApiKey();
    if (!key) throw new Error("API Key Missing. Please configure it in Settings.");
    return new GoogleGenAI({ apiKey: key });
};

// Helper: Clean JSON output from AI models which might wrap content in markdown code blocks
export const cleanJsonString = (text: string) => {
  if (!text) return "{}";
  let clean = text.replace(/```json\n?|```/g, "").trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  
  // Determine if object or array comes first
  if (firstBrace >= 0 && (firstBracket === -1 || firstBrace < firstBracket)) {
      if (lastBrace > firstBrace) clean = clean.substring(firstBrace, lastBrace + 1);
  } else if (firstBracket >= 0) {
      if (lastBracket > firstBracket) clean = clean.substring(firstBracket, lastBracket + 1);
  }
  
  return clean;
};

// Wrapper for direct calls if needed elsewhere
export const generateContentWithRetry = async (ai: GoogleGenAI, params: any) => {
    return await ai.models.generateContent(params);
};

// 1. Background Check
export const generateBackgroundCheck = async (name: string, id: string, address: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a hypothetical rental applicant screening report for:
    Name: ${name}
    ID/License: ${id}
    Current Address: ${address}
    
    Return a JSON object with exactly these fields:
    - riskLevel: "Low", "Medium", or "High"
    - score: A number between 300-850 representing estimated creditworthiness
    - summary: A professional 2-3 sentence assessment of their suitability as a tenant.
    - flags: An array of strings listing potential warning signs (e.g. "Frequent address changes", "ID mismatch risk"). If none, return empty array.`,
    config: { 
        responseMimeType: "application/json"
    }
  });
  return JSON.parse(cleanJsonString(response.text || "{}"));
};

// 2. Property Description
export const generatePropertyDescription = async (property: Property) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a high-end real estate listing description for: ${property.address}. 
        Type: ${property.propertyType}. Beds: ${property.beds}, Baths: ${property.baths}, Parking: ${property.parking}.
        Rent: $${property.rentAmount} ${property.rentFrequency}.
        Tone: Professional, alluring, and persuasive.`
    });
    return response.text;
};

// 3. Arrears Message
export const analyzeArrearsMessage = async (tenantName: string, daysOverdue: number, amount: number) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Draft a polite but firm rent arrears notice (SMS or Email) for tenant ${tenantName}.
        Overdue: ${daysOverdue} days. Amount: $${amount}.
        Reference local tenancy laws implicitly (fair usage).`
    });
    return response.text;
};

// 4. Invoice Parsing (Stub for advanced usage)
export const parseInvoiceRequest = async (text: string) => {
    return parseTransactionFromText(text); 
};

// 5. Quote Request
export const generateQuoteRequestEmail = async (task: string, address: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Draft a maintenance quote request email to a tradesperson for:
        Issue: ${task}
        Address: ${address}
        Ask for availability and estimated cost.`
    });
    return response.text;
};

// 6. Official Document (HTML Generation)
export const generateOfficialDocument = async (formType: string, context: any) => {
    const ai = getAI();
    const prompt = `Generate a valid HTML document (styled with simple CSS) for a "${formType}".
    Context Data:
    ${JSON.stringify(context)}
    
    The document should look professional (like a legal form). 
    Include place holders for signatures if needed.
    Do NOT include markdown backticks. Just raw HTML code.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt
    });
    let html = response.text || "";
    return html.replace(/```html|```/g, "");
};

// 7. Prospecting Message
export const generateProspectingMessage = async (address: string, ownerName: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a cold outreach letter to ${ownerName}, owner of ${address}, offering property management services. Keep it short and professional.`
    });
    return response.text;
};

// 8. Parse Transaction (Smart Ledger)
export const parseTransactionFromText = async (input: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract transaction details from this text: "${input}"
        Return JSON with fields:
        - description: string
        - amount: number
        - type: "Credit" or "Debit"
        - account: "Trust" or "General"
        - reference: string (infer or generate generic)
        `,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || "{}"));
};

// 9. Parse Bank Statement (Image/Multimodal)
export const parseBankStatement = async (base64Image: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: `Analyze this bank statement image. Extract all transactions into a JSON array.
              Each item should have:
              - date: "YYYY-MM-DD"
              - description: string
              - amount: number
              - type: "Credit" or "Debit"` 
            }
        ],
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
};

// 10. Prioritize Maintenance
export const prioritizeMaintenance = async (issue: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Classify this maintenance issue priority as "Low", "Medium", "High", or "Urgent": "${issue}". Return only the word.`
    });
    return response.text?.trim() || "Medium";
};

// 11. Entry Notice
export const generateEntryNotice = async (tenant: string, address: string, date: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a formal Notice of Entry for property inspection.
        Tenant: ${tenant}
        Address: ${address}
        Date of Entry: ${date}
        Time: Between 9am and 5pm.
        Cite standard lease terms regarding entry.`
    });
    return response.text;
};

// 12. Logbook Generation
export const generateLogbookEntriesFromSchedule = async (events: CalendarEvent[], startAddress: string) => {
    const ai = getAI();
    const eventsContext = events.map(e => `${e.time}: ${e.title} at ${e.propertyAddress}`).join('\n');
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Given these appointments and a start location of "${startAddress}", calculate a logical Logbook trip list.
        Assume driving between each location.
        Appointments:
        ${eventsContext}
        
        Return JSON array of trip objects:
        - purpose: string (e.g. "Travel to [Address]")
        - distance: number (estimated km between previous loc and this loc)
        `,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
};

// 13. Voice Command (Schedule)
export const processScheduleVoiceCommand = async (base64Audio: string, date: string, currentSchedule: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
            { inlineData: { mimeType: 'audio/mp3', data: base64Audio } },
            { text: `The user is managing a property schedule for ${date}. 
              Current Schedule: ${currentSchedule}
              
              Listen to the request and output JSON:
              - intent: "ADD_EVENT", "LIST_SCHEDULES", "OPTIMIZE", or "HISTORY"
              - eventData: (if adding) { title, time, address, type, description }
              - propertyKeywords: (if history lookup) string
              - speechResponse: A short conversational confirmation text to speak back.` 
            }
        ],
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || "{}"));
};

// 14. Text Command (Schedule)
export const processScheduleTextCommand = async (text: string, date: string, currentSchedule: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `The user is managing a property schedule for ${date}.
        Request: "${text}"
        Current Schedule: ${currentSchedule}
        
        Output JSON:
        - intent: "ADD_EVENT", "LIST_SCHEDULES", "OPTIMIZE", or "HISTORY"
        - eventData: (if adding) { title, time, address, type, description }
        - propertyKeywords: (if history lookup) string
        - speechResponse: A short conversational confirmation text.`
        ,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || "{}"));
};

// 15. Optimize Schedule
export const optimizeScheduleOrder = async (events: CalendarEvent[]) => {
    const ai = getAI();
    const eventList = events.map(e => ({ id: e.id, address: e.propertyAddress, time: e.time }));
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Optimize the route for these real estate appointments to minimize travel time. Start at 9am.
        Events: ${JSON.stringify(eventList)}
        
        Return JSON array of strings (the event IDs in optimized order).`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text || "[]"));
};

// 16. Schedule Tips
export const generateScheduleTips = async (events: CalendarEvent[]) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Review this daily schedule for a property manager and give 1 brief efficiency tip (under 20 words).
        Events: ${JSON.stringify(events.map(e => e.title + ' at ' + e.time))}`
    });
    return response.text;
};

// 17. History Summary
export const summarizePropertyHistory = async (query: string, history: any[]) => {
    const ai = getAI();
    const relevant = history.filter(h => JSON.stringify(h).toLowerCase().includes(query.toLowerCase())).slice(0, 20);
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the key history for "${query}" based on these records:
        ${JSON.stringify(relevant)}
        
        Keep it concise.`
    });
    return response.text;
};

// 18. Task Suggestions
export const generateTaskSuggestions = async (title: string, type: string, description: string, address: string) => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I have a task: ${title} (${type}) at ${address}. Details: ${description}.
        Suggest 3 preparation steps or things to check before attending. Bullet points.`
    });
    return response.text;
};
