
import { GoogleGenAI, Type } from "@google/genai";

// ... existing functions (generatePropertyDescription, etc) ...

export const generatePropertyDescription = async (address: string, features: string[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a compelling, high-end property listing description for a rental property at ${address}. 
      
      Context: The property is located in "${address}". Adapt the tone and lifestyle references to match the specific suburb and state vibes (e.g., if in Melbourne, mention coffee culture/trams; if Sydney, mention beaches/harbour).

      Include these features: ${features.join(', ')}. Keep it professional and inviting.`,
      config: {
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating description. Please try again.";
  }
};

export const generateLeaseAppraisal = async (
  address: string, 
  type: string, 
  beds: string, 
  baths: string, 
  cars: string, 
  features: string[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Senior Property Manager. Generate a comprehensive Lease Appraisal / Rental Valuation Report for a prospective landlord.
      
      Property Details:
      - Address: ${address}
      - Property Type: ${type}
      - Configuration: ${beds} Bedrooms, ${baths} Bathrooms, ${cars} Car Spaces
      - Key Features: ${features.join(', ')}
      
      CRITICAL: Analyze the address "${address}" to determine the specific Suburb and State/Territory. Ensure all market insights, legal terminology, and compliance notes are specific to that Australian State (e.g., if VIC, refer to Victorian laws; if NSW, refer to NSW laws).

      The report must include:
      1. **Estimated Weekly Rental Range**: Provide a realistic dollar range (e.g. $500 - $550 per week) based on general market knowledge for this specific suburb.
      2. **Target Tenant Profile**: Describe the ideal demographic (e.g., young professionals, families, students).
      3. **Marketing Strategy**: Suggest how to advertise it (e.g., social media, premium boards, virtual tours).
      4. **Comparable Value Proposition**: A brief paragraph on why this property is desirable in the current ${address} market.
      
      Tone: Professional, persuasive, and data-driven. Use Markdown formatting for headers.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Appraisal Error:", error);
    return "Error generating appraisal. Please try again.";
  }
};

export const generateSalesAppraisal = async (
  address: string,
  type: string,
  beds: string,
  baths: string,
  cars: string,
  features: string[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Top-Tier Real Estate Sales Agent. Generate a comprehensive Sales Appraisal / Market Valuation Report for a prospective vendor.

      Property Details:
      - Address: ${address}
      - Property Type: ${type}
      - Configuration: ${beds} Bedrooms, ${baths} Bathrooms, ${cars} Car Spaces
      - Key Features: ${features.join(', ')}

      CRITICAL: Analyze the address "${address}" to determine the specific Suburb and State/Territory. Use market knowledge specific to this location.

      The report must include:
      1. **Estimated Sale Price Range**: Provide a realistic dollar range (e.g. $1,200,000 - $1,300,000) based on general market knowledge for this type of property location.
      2. **Target Buyer Profile**: Describe the ideal buyer (e.g., upsizers, investors, developers) and why they would want this home.
      3. **Recommended Method of Sale**: Suggest Auction, Private Treaty, or Expression of Interest with strategic reasoning relevant to the local market culture.
      4. **Marketing Strategy**: Suggest a campaign strategy (e.g., digital heavy, print, premier listing, styling).
      5. **Market Sentiment**: A brief paragraph on current market conditions for this area.

      Tone: Professional, persuasive, and authoritative. Use Markdown formatting for headers.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Sales Appraisal Error:", error);
    return "Error generating sales appraisal. Please try again.";
  }
};

export const generateProspectingMessage = async (
  area: string,
  type: string,
  hook: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a top-tier Real Estate Copywriter.
      Write a persuasive "${type}" for a real estate agent targeting homeowners in "${area}".

      The Goal: Generate new property listings (get owners to call for an appraisal or to sell).
      
      Key Selling Point / Hook: "${hook}".

      Instructions:
      1. Tailor the language to the specific demographic of "${area}".
      2. Catchy Headline (if applicable for the format).
      3. Professional yet persuasive body text.
      4. Strong Call to Action (CTA).
      5. Keep it concise and suitable for the chosen medium.`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Prospecting Error:", error);
    return "Error generating prospecting message. Please try again.";
  }
};

export const analyzeArrearsMessage = async (
  tenantName: string, 
  amount: number, 
  days: number, 
  address: string, 
  item: string, 
  deadline: string, 
  paymentMethod: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft a formal professional notice of breach/arrears email to a tenant.
      
      Details:
      - Tenant Name: ${tenantName}
      - Property Address: ${address}
      - Item in Arrears: ${item}
      - Amount Outstanding: $${amount}
      - Days Overdue: ${days}
      - Required Deadline: ${deadline}
      - Payment Method: ${paymentMethod}

      CRITICAL LEGAL INSTRUCTION:
      1. Analyze the address "${address}" to determine the Australian State/Territory (e.g., VIC, NSW, QLD, WA).
      2. You MUST cite the specific legislation applicable to that State (e.g., "Residential Tenancies Act 1997" for Victoria, "Residential Tenancies Act 2010" for NSW).
      3. Use the correct legal terminology for that jurisdiction (e.g., "Notice to Vacate", "Termination Notice", "Breach Notice").
      4. Ensure the tone is firm but strictly compliant with the relevant state laws regarding arrears notices.

      Structure:
      1. Subject line referencing property and issue.
      2. Clear statement of debt.
      3. Reference to specific Act/Clause regarding arrears.
      4. Deadline and payment instructions.
      5. Consequence of non-payment (e.g., application to Tribunal/NCAT/VCAT) phrased correctly for the jurisdiction.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating email template.";
  }
};

export const generateQuoteRequestEmail = async (tradesmanName: string, address: string, issue: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a professional email to a tradesperson named "${tradesmanName}" requesting a maintenance quote for a property at "${address}".
      
      Issue details: "${issue}".
      
      The email should:
      1. Clearly state the address and the issue.
      2. Ask for a breakdown of costs (labor/parts).
      3. Ask for their earliest availability to inspect or repair.
      4. Be concise and professional.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating quote request email.";
  }
};

export const parseTransactionFromText = async (rawText: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following financial text and extract transaction details. 
      Text: "${rawText}"
      
      Return ONLY a JSON object (no markdown) with the following shape:
      {
        "description": "Professional description of the transaction",
        "amount": number (positive number),
        "type": "Credit" (if money coming in) or "Debit" (if money going out),
        "account": "Trust" (default) or "General" (only if explicitly mentioning agency fees or admin),
        "reference": "Short 6-char alpha-numeric ref"
      }`,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return null;
  }
};

export const parseInvoiceRequest = async (
  text: string, 
  address: string, 
  type: 'Owner' | 'Tenant', 
  date: string,
  templateBase64?: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const parts: any[] = [];
    
    // If template is provided, add it to prompt
    if (templateBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/png", // Assuming PNG/JPEG, API is flexible
          data: templateBase64
        }
      });
    }

    const promptText = `Generate structured invoice data for a property at ${address}.
      Recipient Type: ${type}
      Invoice Date: ${date}
      Context from User: "${text}"
      
      ${templateBase64 ? `
      You are also provided with an image of a blank invoice form/letterhead.
      Scan the image to understand its layout.
      
      IMPORTANT: In addition to the JSON data, generate a 'customHtml' string.
      This 'customHtml' should contain a complete, standalone HTML document (with embedded CSS) that visually replicates the provided invoice form image as closely as possible, but with the data filled in.
      - Use absolute positioning or Flexbox/Grid to match the layout.
      - Mimic fonts and spacing.
      - If the image has a logo, placeholder it with a text block or generic icon if you can't extract it, but try to position the header correctly.
      ` : ''}

      Return ONLY valid JSON with no markdown formatting:
      {
        "invoiceNumber": "INV-${Math.floor(Math.random() * 10000)}",
        "date": "${date}",
        "dueDate": "YYYY-MM-DD (calculated as 7 days from invoice date)",
        "items": [
          {"description": "Item description", "amount": 0.00}
        ],
        "totalAmount": 0.00,
        "summary": "Short summary (max 50 chars) suitable for a bank statement description",
        "customHtml": ${templateBase64 ? '"<html... full html string ...>"' : 'null'}
      }`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: templateBase64 ? 'gemini-3-flash-preview' : 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Invoice Error:", error);
    return null;
  }
};

export const prioritizeMaintenance = async (issue: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this maintenance issue: "${issue}".
      Determine the priority level based on property management standards (safety risks are Urgent, comfort issues are Medium/High).
      
      Return ONLY a JSON object:
      {
        "priority": "Low" | "Medium" | "High" | "Urgent"
      }`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}').priority || 'Medium';
  } catch (error) {
    return 'Medium';
  }
};

export const generateBackgroundCheck = async (name: string, id: string, address: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Act as a Rental Applicant Screening System.
      Generate a realistic, HYPOTHETICAL background check report for an applicant named "${name}" (ID: ${id}) living at "${address}".
      
      Randomize the result slightly to be realistic (mostly good, sometimes minor issues), but make it look like a formal database search result.
      
      Return ONLY JSON (no markdown):
      {
        "creditScore": number (between 300-850),
        "creditRating": "Excellent" | "Good" | "Fair" | "Poor",
        "databases": {
          "tenancyDatabase": "Clear" | "Listed",
          "bankruptcy": "Clear" | "Declared",
          "courtRecords": "Clear" | "Found"
        },
        "riskLevel": "Low" | "Medium" | "High",
        "summary": "Professional summary of the applicant's suitability (max 2 sentences)."
      }`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Check Error:", error);
    return null;
  }
};

export const generatePrivacyConsent = async (agencyName: string, applicantName: string, propertyAddress: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft a formal Privacy Statement & Consent Form for a rental tenancy application.
      
      Parties:
      - Agency: ${agencyName}
      - Applicant: ${applicantName}
      - Property: ${propertyAddress}
      
      CRITICAL INSTRUCTION:
      Identify the Australian State/Territory from the address "${propertyAddress}".
      Ensure the consent form explicitly references the correct State Tenancy Acts regarding database checks (e.g. Residential Tenancies Act 1997 (Vic) S439C) AND the Federal Privacy Act 1988.

      Requirements:
      1. Explicitly request consent to access National Tenancy Databases (e.g., TICA, NTD, Equifax) and perform credit checks.
      2. Include a 'Permissible Purpose' clause stating information is collected solely for assessing risk and suitability for the lease.
      3. Include an 'Adverse Action' clause: If the application is declined based on this data, the agency will notify the applicant of the source (database/bureau) used.
      
      Format: Professional legal document style, plain text.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating consent form.";
  }
};

export const generateEntryNotice = async (tenantName: string, address: string, date: string, timeWindow: string = '9:00 AM - 5:00 PM') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Draft a formal "Notice of Entry" email for a rental routine inspection.
      
      Details:
      - Tenant: ${tenantName}
      - Property: ${address}
      - Entry Date: ${date}
      - Time Window: ${timeWindow}
      
      CRITICAL LEGAL INSTRUCTION:
      1. Analyze the address "${address}" to determine the specific State/Territory (e.g., VIC, NSW, QLD).
      2. You MUST cite the correct section of that State's Residential Tenancies Act regarding right of entry (e.g., Section 85 for Vic, Section 55 for NSW - verifying these against your knowledge base).
      3. Ensure the notice period mentioned complies with that specific State's law.
      
      Requirements:
      1. State clearly that the agent will use their master key if the tenant is not home.
      2. Be professional, polite, but firm regarding the statutory notice provided.
      3. Include COVID-safe or safety protocols if relevant.`,
    });
    return response.text;
  } catch (error) {
    return "Error generating entry notice.";
  }
};

// --- SCHEDULE AI ASSISTANT FUNCTIONS ---

// Text Command Processor
export const processScheduleTextCommand = async (text: string, contextDate: string, currentSchedule: string = '') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a Property Management Schedule Assistant.
      Current Date Context: ${contextDate}.
      
      Existing Schedule: 
      ${currentSchedule}
      
      User Input: "${text}"
      
      Identify the user's intent. They might want to:
      1. ADD an event (Inspection, Viewing, Maintenance, Meeting).
      2. SORT/OPTIMIZE the schedule.
      3. ASK about history of a property.
      4. LIST/SHOW the schedule (e.g. "What's on today?").

      Return a JSON object (NO MARKDOWN) with the following structure:
      {
        "intent": "ADD_EVENT" | "OPTIMIZE" | "HISTORY" | "LIST_SCHEDULES" | "UNKNOWN",
        "eventData": { // Only if ADD_EVENT
           "title": "Short title",
           "date": "YYYY-MM-DD",
           "time": "HH:MM", 
           "type": "Inspection" | "Viewing" | "Maintenance" | "Other",
           "address": "Full address mentioned or 'General'",
           "description": "Any extra notes"
        },
        "propertyKeywords": "String", // Only if HISTORY, e.g. "123 Ocean"
        "speechResponse": "String" // A short conversational response to the user's command
      }`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Text Command Error:", error);
    return { intent: "UNKNOWN", speechResponse: "Sorry, I had trouble processing that request." };
  }
};

export const processScheduleVoiceCommand = async (audioBase64: string, contextDate: string, currentSchedule: string = '') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Updated to supported multimodal model
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/mp3',
              data: audioBase64
            }
          },
          {
            text: `You are a Property Management Schedule Assistant. Listen to the command.
            Current Date Context: ${contextDate}.
            
            Existing Schedule: 
            ${currentSchedule}
            
            Identify the user's intent. They might want to:
            1. ADD an event (Inspection, Viewing, Maintenance, Meeting).
            2. SORT/OPTIMIZE the schedule.
            3. ASK about history of a property.
            4. LIST/SHOW the schedule (e.g. "What's on today?").

            Return a JSON object (NO MARKDOWN) with the following structure:
            {
              "intent": "ADD_EVENT" | "OPTIMIZE" | "HISTORY" | "LIST_SCHEDULES" | "UNKNOWN",
              "eventData": { // Only if ADD_EVENT
                 "title": "Short title",
                 "date": "YYYY-MM-DD",
                 "time": "HH:MM", 
                 "type": "Inspection" | "Viewing" | "Maintenance" | "Other",
                 "address": "Full address mentioned or 'General'",
                 "description": "Any extra notes"
              },
              "propertyKeywords": "String", // Only if HISTORY, e.g. "123 Ocean"
              "speechResponse": "String" // A short conversational response to the user's command
            }`
          }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Voice Command Error:", error);
    return { intent: "UNKNOWN", speechResponse: "Sorry, I had trouble processing that audio." };
  }
};

export const optimizeScheduleOrder = async (events: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `I have a list of property management events for today.
      Please re-order them to be most efficient.
      
      Logic:
      1. Group geographically close suburbs if possible (guess based on address).
      2. Prioritize 'Inspection' and 'Leasing' events during business hours (9-5).
      3. Put 'Maintenance' checks in between.
      
      Events List: ${JSON.stringify(events.map(e => ({ id: e.id, title: e.title, time: e.time, address: e.propertyAddress })))}
      
      Return ONLY a JSON array of event IDs in the optimized order:
      ["id_1", "id_2", ...]`,
      config: {
        responseMimeType: "application/json"
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Optimization Error:", error);
    return [];
  }
};

export const generateScheduleTips = async (events: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Look at this schedule for a property manager: ${JSON.stringify(events.map(e => e.title + ' at ' + e.propertyAddress))}.
      
      Give me one short, actionable "Pro Tip" (max 20 words) to help them manage this specific day better. 
      E.g., "Group your Bondi inspections to save travel time" or "Check keys for 123 Smith St before leaving office".`
    });
    return response.text;
  } catch (error) {
    return "Review your keys and files before heading out!";
  }
};

export const summarizePropertyHistory = async (address: string, events: any[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Filter events relevant to this address
    const relevantEvents = events.filter(e => 
      (e.propertyAddress && e.propertyAddress.toLowerCase().includes(address.toLowerCase())) ||
      (e.description && e.description.toLowerCase().includes(address.toLowerCase()))
    );

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the history of activities for the property at "${address}".
      Here is the raw event log: ${JSON.stringify(relevantEvents)}.
      
      Create a bulleted summary of key actions (Inspections, Maintenance, Leases) in chronological order.
      If no events found, say "No recent history recorded."`
    });
    return response.text;
  } catch (error) {
    return "Error generating summary.";
  }
};

export const generateTaskSuggestions = async (taskTitle: string, taskType: string, taskDesc: string, taskAddress: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: Property Manager Task Assistant.
      
      Task: ${taskTitle}
      Type: ${taskType}
      Address: ${taskAddress}
      Notes: ${taskDesc}

      CRITICAL: Analyze the address provided (${taskAddress}) to determine the Australian State/Territory jurisdiction (e.g. VIC, NSW, QLD).
      
      Provide 3 concise, actionable suggestions or steps to prepare for or complete this task effectively. 
      
      IMPORTANT: Ensure any advice regarding notices, entry rights, or timeframes complies with the relevant Residential Tenancies Act for that specific location.
      For example, if in Victoria, ensure inspection notices align with Victorian law.
      
      Focus on practical actions (e.g., specific keys, required forms/notices, safety checks).`
    });
    return response.text;
  } catch (e) {
    return "Unable to generate suggestions at this time.";
  }
};
