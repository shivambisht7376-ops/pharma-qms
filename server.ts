import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Initialize Gemini Client server-side
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Endpoint: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Pharma QMS AI Engine" });
});

// API Endpoint: AI Co-Pilot Process
app.post("/api/copilot/process", async (req, res) => {
  try {
    const { prompt, currentComplaint, currentRisk, file, userRole } = req.body;

    const ai = getGeminiClient();

    const systemInstruction = `
You are the AI Co-Pilot Assistant for a Pharmaceutical Quality Management System (QMS) manufacturing API (Active Pharmaceutical Ingredients) and FDF (Finished Dosage Forms). You comply with FDA 21 CFR Part 211 / 211.198 (Complaint Files), EU GMP Chapter 8 / Annex 16, and ICH Q9 Quality Risk Management.

YOUR TASK:
Analyze the user's input (and any attached document like PDF, Email, or image scan), extract structured complaint data, calculate a pharma risk assessment, and formulate a clear conversational explanation.

CRITICAL INSTRUCTIONS:
1. CONTINUOUS SYNCHRONIZATION & FIELD PRESERVATION:
   - If 'currentComplaint' is provided and the user is editing (e.g. "Change batch number to BMX24602 and quantity to 48 capsules"):
     * PRESERVE ALL EXISTING FIELDS from currentComplaint that were not explicitly changed.
     * UPDATE ONLY the specified fields.
     * Record the updated field keys in the 'updatedFields' array (e.g. ["batchLotNumber", "affectedQuantity"]).
   - If the user is logging a brand new complaint or extracting from a document:
     * Fill all extracted fields. Set 'actionPerformed' to "LOG_NEW" or "EXTRACT_DOCUMENT".

2. PHARMACEUTICAL RISK ASSESSMENT (ICH Q9 / FDA Guidelines):
   - Severity options: "Minor", "Major", "Critical"
     * Critical: Sterility breaches, active drug sub-potent/toxic impurity, mix-ups, adverse events, severe health risk.
     * Major: Dissolution failure, OOS assay, packaging integrity failure, illegible batch/exp date, structural tablet/capsule defects.
     * Minor: Cosmetic outer carton scuffs, minor non-critical documentation typo without safety impact.
   - Risk Level options: "Low", "Medium", "High", "Critical"
   - Suggested Routing options: "QA Investigation", "QC Lab Testing", "Regulatory Affairs", "Production Review", "Customer Relations"
   - Recommended Actions: Array of 2-4 concrete GMP investigation steps (e.g., "Retain sample testing", "Check batch manufacturing records", "Issue FAR to FDA if critical", "Notify QP").

3. RETURN FORMAT:
   Return a single JSON object matching the requested schema.
`;

    // Construct contents with prompt and optional file parts
    const parts: any[] = [];

    if (file && file.base64Data && file.mimeType) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64Data,
        },
      });
    }

    const contextContextStr = `
CURRENT COMPLAINT STATE IN FORM:
${currentComplaint ? JSON.stringify(currentComplaint, null, 2) : "None (Form is empty)"}

CURRENT RISK ASSESSMENT:
${currentRisk ? JSON.stringify(currentRisk, null, 2) : "None"}

USER ROLE: ${userRole || "QA Manager"}

USER REQUEST / COMPLAINT TEXT:
"${prompt || "Extract and summarize complaint details from attached document"}"
`;

    parts.push({ text: contextContextStr });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assistantReply: {
              type: Type.STRING,
              description: "Conversational, clear response summarizing what was extracted, modified, or evaluated.",
            },
            actionPerformed: {
              type: Type.STRING,
              description: "LOG_NEW, EDIT_FIELDS, EXTRACT_DOCUMENT, or GENERAL_QUERY",
            },
            updatedFields: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of field keys that were created or updated in this turn",
            },
            complaint: {
              type: Type.OBJECT,
              properties: {
                customerName: { type: Type.STRING },
                customerType: { type: Type.STRING },
                productName: { type: Type.STRING },
                productType: { type: Type.STRING }, // "API" or "FDF"
                productStrengthGrade: { type: Type.STRING },
                batchLotNumber: { type: Type.STRING },
                mfgDate: { type: Type.STRING },
                expDate: { type: Type.STRING },
                affectedQuantity: { type: Type.STRING },
                complaintDescription: { type: Type.STRING },
                defectCategory: { type: Type.STRING },
                packagingCondition: { type: Type.STRING },
                reporterContact: { type: Type.STRING },
                storageCondition: { type: Type.STRING },
                adverseEvent: { type: Type.BOOLEAN },
                adverseEventDetails: { type: Type.STRING },
              },
            },
            riskAssessment: {
              type: Type.OBJECT,
              properties: {
                severity: { type: Type.STRING }, // Minor, Major, Critical
                riskLevel: { type: Type.STRING }, // Low, Medium, High, Critical
                recommendedActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                suggestedRouting: { type: Type.STRING },
                rootCauseHypothesis: { type: Type.STRING },
                capaRequired: { type: Type.BOOLEAN },
                rationale: { type: Type.STRING },
              },
            },
          },
          required: ["assistantReply", "actionPerformed", "complaint", "riskAssessment"],
        },
      },
    });

    const responseText = response.text || "{}";
    const parsedData = JSON.parse(responseText);

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Error in AI Copilot process:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process complaint request",
    });
  }
});

// Setup Vite Dev Server / Static Serve
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
