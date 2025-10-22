import Groq from 'groq-sdk';

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

if (!groqApiKey || groqApiKey === 'your_groq_api_key_here') {
  console.warn('GROQ API key not configured. AI features will be disabled.');
}

const groq = groqApiKey && groqApiKey !== 'your_groq_api_key_here'
  ? new Groq({ apiKey: groqApiKey, dangerouslyAllowBrowser: true })
  : null;

export interface ProposalData {
  supplierName: string;
  totalAmount: number;
  roundNumber: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export async function compareProposalsWithAI(
  proposals: ProposalData[],
  internalBudget?: number
): Promise<string> {
  if (!groq) {
    return 'AI comparison is not available. Please configure your GROQ API key.';
  }

  try {
    const proposalsSummary = proposals.map(p => ({
      supplier: p.supplierName,
      total: p.totalAmount,
      round: p.roundNumber,
      itemCount: p.items.length,
      items: p.items.map(i => ({
        name: i.name,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        total: i.totalPrice,
      })),
    }));

    const prompt = `You are a procurement analyst. Analyze these supplier proposals and provide insights:

${JSON.stringify(proposalsSummary, null, 2)}

${internalBudget ? `Internal Budget: $${internalBudget.toLocaleString()}` : ''}

Please provide:
1. A brief comparison of the proposals highlighting key differences
2. Value analysis: which offers the best value for money
3. Price comparison: percentage differences between proposals
4. Item-level insights: notable differences in pricing for similar items
5. Recommendation with reasoning

Keep your response concise and in Spanish. Format it clearly with sections.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful procurement analyst assistant. Provide clear, concise analysis in Spanish.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || 'No se pudo generar el análisis.';
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return 'Error al generar el análisis de IA. Por favor intenta nuevamente.';
  }
}

export async function analyzeRoundComparison(
  round1Proposals: ProposalData[],
  round2Proposals: ProposalData[]
): Promise<string> {
  if (!groq) {
    return 'AI comparison is not available. Please configure your GROQ API key.';
  }

  try {
    const prompt = `Compare these procurement proposals across two bidding rounds:

ROUND 1:
${JSON.stringify(round1Proposals, null, 2)}

ROUND 2:
${JSON.stringify(round2Proposals, null, 2)}

Analyze:
1. Price changes between rounds (which suppliers reduced prices, by how much)
2. Item changes (added, removed, modified items)
3. Competitive positioning (who is most competitive now)
4. Value improvements or concerns
5. Strategic insights about supplier behavior

Provide your analysis in Spanish, clearly structured.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a procurement analyst specializing in multi-round bidding analysis. Respond in Spanish.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || 'No se pudo generar el análisis.';
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return 'Error al generar el análisis de rondas. Por favor intenta nuevamente.';
  }
}

export interface BriefValidationResult {
  isComplete: boolean;
  hasEventDate: boolean;
  hasParticipantCount: boolean;
  hasLocation: boolean;
  hasObjectives: boolean;
  hasTargetAudience: boolean;
  hasBudgetInfo: boolean;
  missingFields: string[];
  extractedInfo: {
    eventDate?: string;
    participantCount?: string;
    location?: string;
    objectives?: string;
    targetAudience?: string;
  };
  feedback: string;
}

export async function validateEventBrief(brief: string): Promise<BriefValidationResult> {
  if (!groq) {
    throw new Error('AI validation is not available. Please configure your GROQ API key.');
  }

  if (!brief || brief.trim().length < 50) {
    return {
      isComplete: false,
      hasEventDate: false,
      hasParticipantCount: false,
      hasLocation: false,
      hasObjectives: false,
      hasTargetAudience: false,
      hasBudgetInfo: false,
      missingFields: ['Descripción demasiado corta. Proporciona al menos 50 caracteres con información relevante.'],
      extractedInfo: {},
      feedback: 'La descripción es demasiado corta. Por favor proporciona más detalles sobre el evento.',
    };
  }

  try {
    const prompt = `Analiza el siguiente brief de evento y determina si incluye información esencial para que proveedores puedan cotizar correctamente.

BRIEF:
"""
${brief}
"""

Debes verificar si el brief incluye la siguiente información CRÍTICA:
1. Fecha del evento (fecha específica, mes, o rango de fechas)
2. Número de participantes o asistentes esperados
3. Ubicación o locaciones del evento (ciudad, venue, tipo de espacio)
4. Objetivos del evento
5. Audiencia objetivo o público meta
6. Información presupuestaria o rango de inversión

Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta (sin texto adicional):
{
  "hasEventDate": boolean,
  "hasParticipantCount": boolean,
  "hasLocation": boolean,
  "hasObjectives": boolean,
  "hasTargetAudience": boolean,
  "hasBudgetInfo": boolean,
  "extractedInfo": {
    "eventDate": "fecha encontrada o null",
    "participantCount": "número encontrado o null",
    "location": "ubicación encontrada o null",
    "objectives": "breve resumen de objetivos o null",
    "targetAudience": "audiencia identificada o null"
  },
  "missingFields": ["lista", "de", "campos", "faltantes"],
  "feedback": "feedback específico en español sobre qué falta o confirmación de que está completo"
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an event planning analyst. Respond ONLY with valid JSON, no additional text or markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const cleanedResponse = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(cleanedResponse);

    const isComplete =
      result.hasEventDate &&
      result.hasParticipantCount &&
      result.hasLocation &&
      result.hasObjectives &&
      result.hasTargetAudience;

    return {
      isComplete,
      hasEventDate: result.hasEventDate || false,
      hasParticipantCount: result.hasParticipantCount || false,
      hasLocation: result.hasLocation || false,
      hasObjectives: result.hasObjectives || false,
      hasTargetAudience: result.hasTargetAudience || false,
      hasBudgetInfo: result.hasBudgetInfo || false,
      missingFields: result.missingFields || [],
      extractedInfo: result.extractedInfo || {},
      feedback: result.feedback || '',
    };
  } catch (error) {
    console.error('Error validating brief with AI:', error);
    throw new Error('Error al validar el brief con IA. Por favor intenta nuevamente.');
  }
}
