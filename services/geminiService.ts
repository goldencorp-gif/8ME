
import { GoogleGenAI, Type } from "@google/genai";

// Helper to get API Key (User Override > Env Var)
const getApiKey = (): string => {
  try {
    const settings = localStorage.getItem('proptrust_agency_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.aiApiKey) return parsed.aiApiKey;
    }
  } catch (e) {
    // ignore error
  }
  return process.env.API_KEY || '';
};

// Helper to handle API Rate Limits (429) with exponential backoff
const generateContentWithRetry = async (ai: GoogleGenAI, params: any, retries = 3, delay = 1000): Promise<any> => {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    // 1. Normalize the error message
    let msg = error?.message || '';
    
    // Check if error message is actually stringified JSON (common with Google API errors)
    if (typeof msg === 'string' && (msg.trim().startsWith('{') || msg.trim().startsWith('['))) {
        try {
            const parsed = JSON.parse(msg);
            if (parsed.error && parsed.error.message) {
                msg = parsed.error.message;
            } else if (parsed.message) {
                msg = parsed.message;
            }
        } catch (e) {
            // keep original msg
        }
    }

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
const cleanJsonString = (text: string | undefined | null) => {
  if (!text) return '{}';
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find start of JSON (Object or Array)
  const firstCurly = clean.indexOf('{');
  const firstSquare = clean.indexOf('[');
  
  let startIndex = -1;
  let endIndex = -1;

  // Determine if Object or Array starts first to handle mixed content
  if (firstCurly !== -1 && (firstSquare === -1 || firstCurly < firstSquare)) {
      startIndex = firstCurly;
      endIndex = clean.lastIndexOf('}');
  } else if (firstSquare !== -1) {
      startIndex = firstSquare;
      endIndex = clean.lastIndexOf(']');
  }

  if (startIndex !== -1 && endIndex !== -1) {
      clean = clean.substring(startIndex, endIndex + 1);
  }
  
  return clean;
};

// Helper to clean HTML string from Markdown (Robust Version)
const cleanHtmlOutput = (text: string | undefined | null) => {
  if (!text) return '';
  
  // 1. Try to extract from markdown blocks first (greedy match for content inside backticks)
  const markdownMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let content = markdownMatch ? markdownMatch[1] : text;

  // 2. If no markdown, or even after extraction, check for HTML tags to strip conversational text
  // Look for standard HTML starts
  const htmlStart = content.search(/<!DOCTYPE html>|<html/i);
  if (htmlStart !== -1) {
      content = content.substring(htmlStart);
  }
  
  // Look for end tag
  const htmlEnd = content.search(/<\/html>/i);
  if (htmlEnd !== -1) {
      content = content.substring(0, htmlEnd + 7);
  }

  return content.trim();
};

// --- CORE GENERATION FUNCTIONS ---

export const generatePropertyDescription = async (address: string, features: string[]) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");
  
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Generate a compelling property description for ${address}. Features: ${features.join(', ')}.`,
  });
  return response.text;
};

export const generateLeaseAppraisal = async (
  address: string, type: string, beds: string, baths: string, cars: string, features: string[]
) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Generate Lease Appraisal for ${address} (${type}, ${beds}bed, ${baths}bath). Features: ${features.join(', ')}. Include rent range, target tenant, marketing strategy.`,
  });
  return response.text;
};

export const generateSalesAppraisal = async (
  address: string, type: string, beds: string, baths: string, cars: string, features: string[]
) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Generate Sales Appraisal for ${address}.`,
  });
  return response.text;
};

export const generateProspectingMessage = async (area: string, type: string, hook: string) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Write a real estate prospecting ${type} for ${area}. Hook: ${hook}.`,
  });
  return response.text;
};

export const analyzeArrearsMessage = async (
  tenantName: string, amount: number, days: number, address: string, item: string, deadline: string, paymentMethod: string
) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Draft arrears notice for ${tenantName} at ${address}. $${amount} overdue by ${days} days.`,
  });
  return response.text;
};

export const generateQuoteRequestEmail = async (tradesmanName: string, address: string, issue: string) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Write quote request email to ${tradesmanName} for ${issue} at ${address}.`,
  });
  return response.text;
};

export const parseTransactionFromText = async (rawText: string) => {
  const key = getApiKey();
  if (!key) return null;

  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Extract transaction from: "${rawText}". Return JSON: {description, amount, type, account, reference}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text));
  } catch (error) {
    console.error("Parse Tx Error:", error);
    return null;
  }
};

export const parseInvoiceRequest = async (
  text: string, address: string, type: 'Owner' | 'Tenant', date: string, templateBase64?: string
) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  
  let promptText = `Generate a structured invoice JSON for property: ${address}. \nRecipient Type: ${type}. \nInvoice Date: ${date}. \nWork/Details Description: ${text}`;
  
  if (templateBase64) {
      promptText += `\n\nIMPORTANT: A custom invoice template image is provided.
      1. Analyze the visual layout of the template image.
      2. You MUST return a 'customHtml' string field.
      3. This 'customHtml' must be a full HTML document (with <html>, <body>, <style>).
      4. CRITICAL: Use the specific placeholder '{{BG_IMAGE}}' as the background-image URL for the main container. Do NOT use a placeholder image URL.
      5. Example CSS: background-image: url('{{BG_IMAGE}}'); background-size: 100% auto; background-repeat: no-repeat;
      6. Use absolute positioning (CSS) to overlay the invoice details (Number, Date, Items, Total) onto the correct spots on the background image to match the template layout.`;
  }

  const parts: any[] = [{ text: promptText }];
  if (templateBase64) parts.push({ inlineData: { mimeType: "image/png", data: templateBase64 } });

  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: { 
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                invoiceNumber: { type: Type.STRING },
                date: { type: Type.STRING },
                dueDate: { type: Type.STRING },
                totalAmount: { type: Type.NUMBER },
                summary: { type: Type.STRING },
                items: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            amount: { type: Type.NUMBER }
                        }
                    }
                },
                customHtml: { type: Type.STRING, description: "Full HTML string with {{BG_IMAGE}} placeholder if template provided." }
            }
        }
    }
  });
  return JSON.parse(cleanJsonString(response.text));
};

export const parseBankStatement = async (imageBase64: string) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        { text: `Extract bank transactions to JSON array.` }
      ]
    },
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonString(response.text));
};

export const prioritizeMaintenance = async (issue: string) => {
  const key = getApiKey();
  if (!key) return 'Medium'; // Silent fallback for simple logic

  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Prioritize maintenance: "${issue}". Return JSON: {priority: Low|Medium|High|Urgent}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text)).priority || 'Medium';
  } catch (error) {
    return 'Medium';
  }
};

export const generateBackgroundCheck = async (name: string, id: string, address: string) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Generate hypothetical background check JSON for ${name}.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonString(response.text));
};

export const generatePrivacyConsent = async (agencyName: string, applicantName: string, propertyAddress: string) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Draft Privacy Consent Form for ${applicantName} applying at ${propertyAddress}.`,
  });
  return response.text;
};

export const generateEntryNotice = async (tenantName: string, address: string, date: string, timeWindow: string = '9:00 AM - 5:00 PM') => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Draft Entry Notice for ${tenantName} at ${address} on ${date}.`,
  });
  return response.text;
};

export const processScheduleTextCommand = async (text: string, contextDate: string, currentSchedule: string = '') => {
  const key = getApiKey();
  if (!key) return { intent: "UNKNOWN", speechResponse: "API Key Missing. Please configure Settings." };

  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Property Schedule Assistant. Date: ${contextDate}. Schedule: ${currentSchedule}. User Input: "${text}". Return JSON action.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text));
  } catch (error: any) {
    return { intent: "UNKNOWN", speechResponse: "AI connection failed. Please check your API key or quota." };
  }
};

export const processScheduleVoiceCommand = async (audioBase64: string, contextDate: string, currentSchedule: string = '') => {
  const key = getApiKey();
  if (!key) return { intent: "UNKNOWN", speechResponse: "API Key Missing." };

  const ai = new GoogleGenAI({ apiKey: key });
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
    return JSON.parse(cleanJsonString(response.text));
  } catch (error: any) {
    return { intent: "UNKNOWN", speechResponse: "Voice processing unavailable (Error or Quota)." };
  }
};

export const optimizeScheduleOrder = async (events: any[]) => {
  const key = getApiKey();
  if (!key) return [];

  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const simpleEvents = events.map(e => ({ id: e.id, title: e.title, time: e.time, address: e.propertyAddress }));
    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Re-order these events for efficiency: ${JSON.stringify(simpleEvents)}. Return JSON array of IDs.`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(cleanJsonString(response.text));
  } catch (error) {
    return []; 
  }
};

export const generateScheduleTips = async (events: any[]) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Review this schedule: ${JSON.stringify(events.map(e => e.title + ' at ' + e.propertyAddress))}. Give one short 15-word Pro Tip for efficiency.`
  });
  return response.text;
};

export const summarizePropertyHistory = async (address: string, events: any[]) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const response = await generateContentWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: `Summarize history for ${address} based on these events: ${JSON.stringify(events)}.`
  });
  return response.text;
};

export const generateTaskSuggestions = async (taskTitle: string, taskType: string, taskDesc: string, taskAddress: string) => {
  const key = getApiKey();
  if (!key) return "API Key required for suggestions.";

  const ai = new GoogleGenAI({ apiKey: key });
  try {
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
    return "Suggestion service unavailable.";
  }
};

export const generateLogbookEntriesFromSchedule = async (events: any[], officeAddress: string = 'Agency Office') => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  const tripPoints = events.filter(e => e.propertyAddress && e.propertyAddress !== 'General / Office');
  if (tripPoints.length === 0) return [];

  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: `Calculate logbook trips for this schedule starting/ending at ${officeAddress}: ${JSON.stringify(tripPoints)}. Return JSON array {vehicle, date, purpose, category, distance}.`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(cleanJsonString(response.text));
};

export const generateOfficialDocument = async (formType: string, contextData: any) => {
  const key = getApiKey();
  if (!key) throw new Error("API Key Missing");

  const ai = new GoogleGenAI({ apiKey: key });
  
  const prompt = `
    You are an expert Real Estate Agency Administrator in Australia.
    Task: Generate a professional, legally-compliant ${formType}.
    
    Context Data:
    ${JSON.stringify(contextData, null, 2)}
    
    Instructions:
    1. Return valid HTML code ONLY. 
    2. Do NOT wrap in markdown code blocks (no \`\`\`html ... \`\`\`).
    3. Do NOT include conversational text before or after the HTML.
    4. Start immediately with <!DOCTYPE html> or <html>.
    5. Include professional CSS styling within a <style> block. The style should be suitable for print/PDF (white background, black text, clear headers).
    6. Pre-fill all fields possible using the Context Data.
    7. Leave placeholders (e.g., [Signature]) for fields that cannot be filled.
    8. The document should look like a standard official real estate form.
    9. Include a section at the bottom for "Agency Use Only" or "Signatures".
  `;

  const response = await generateContentWithRetry(ai, {
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  
  // Use cleanHtmlOutput to properly handle HTML output and strip any markdown that might still be present
  return cleanHtmlOutput(response.text);
};
