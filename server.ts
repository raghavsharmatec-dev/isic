/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize GoogleGenAI lazily and safely
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API endpoint to generate enterprise-grade schemas
app.post('/api/generate-spec', async (req, res) => {
  try {
    const { divisionLabel, classLabel, entityName, groupLabel, sectionLabel } = req.body;
    if (!entityName) {
      return res.status(400).json({ error: 'entityName is a required field' });
    }

    const client = getAIClient();

    const promptText = `You are a Senior Data Architect specializing in the "${divisionLabel}" industry.
Provide a comprehensive technical data schema for the entity: "${entityName}".
Ensure the schema is specific to the ISIC sub-classification "${classLabel}" inside the group "${groupLabel || ''}" (${sectionLabel || ''}).

Define a robust, realistic data model structure that includes 6 to 12 highly standard fields that this entity would actually need in any professional database in this standard industrial environment. Provide industry-standard types (e.g. STRING, INTEGER, FLOAT, BOOLEAN, DATE, TIMESTAMP), a clear description linking why the field is crucial in this specific ISIC context, a realistic example value, and precise constraints.

Also include a "documentationSummary" detailing the Senior Data Architect's conceptual description and design decisions for this specific industry table structure.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        systemInstruction: 'You are an elite enterprise database schema architect. Direct your answers directly into structured JSON and matches the requested schema without any markdown enclosing fences or additional conversational fluff.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['entity', 'division', 'class', 'documentationSummary', 'fields'],
          properties: {
            entity: { type: Type.STRING },
            division: { type: Type.STRING },
            class: { type: Type.STRING },
            documentationSummary: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: ['fieldName', 'dataType', 'description', 'exampleValue', 'constraints'],
                properties: {
                  fieldName: { type: Type.STRING, description: "CamelCase field name, e.g. recordId, waterPhLevel, volumeCubicMeters" },
                  dataType: { type: Type.STRING, description: "Database data type: STRING, INTEGER, DECIMAL, BOOLEAN, DATE, or TIMESTAMP" },
                  description: { type: Type.STRING, description: "Detailed structural explainers in the specific ISIC context" },
                  exampleValue: { type: Type.STRING, description: "Highly realistic, industry-relevant dummy data representation" },
                  constraints: { type: Type.STRING, description: "Validation constraints like Foreign Keys, positive constraints, ISO standards, ranges, etc." }
                }
              }
            }
          }
        }
      }
    });

    const jsonStr = response.text?.trim() || '';
    if (!jsonStr) {
      throw new Error('Gemini API returned an empty text response.');
    }

    const parsedData = JSON.parse(jsonStr);
    res.json(parsedData);
  } catch (error: any) {
    console.error('Error generating schema:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate technical industrial specifications from Gemini.' });
  }
});

// Setup Vite middleware in Dev environment, otherwise static serving in Production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Unified Server initialized successfully on port ${PORT}`);
});
