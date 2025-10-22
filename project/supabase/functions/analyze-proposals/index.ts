import Groq from 'npm:groq-sdk@0.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const groq = new Groq({
  apiKey: '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',
});

interface ProposalItem {
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  description?: string | null;
}

interface ProposalData {
  supplier: string;
  total: number;
  items: ProposalItem[];
  contextual_info?: string | null;
}

interface RequestBody {
  proposals: ProposalData[];
  internalBudget?: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { proposals, internalBudget }: RequestBody = await req.json();

    if (!proposals || proposals.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No proposals provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const proposalsText = proposals
      .map((p, idx) => {
        const itemsText = p.items
          .map(
            (item) =>
              `  - ${item.item_name}: ${item.quantity} × $${item.unit_price.toFixed(2)} = $${item.total_price.toFixed(2)}${item.description ? ` (${item.description})` : ''}`
          )
          .join('\n');

        return `Propuesta ${idx + 1} - ${p.supplier}:
Total: $${p.total.toFixed(2)}
Ítems:
${itemsText}${p.contextual_info ? `\nInformación adicional: ${p.contextual_info}` : ''}`;
      })
      .join('\n\n');

    const budgetText = internalBudget
      ? `\n\nPresupuesto interno de referencia: $${internalBudget.toFixed(2)}`
      : '';

    const prompt = `Eres un experto en análisis de propuestas de compras para eventos y BTL. Analiza las siguientes propuestas y proporciona un análisis detallado, profesional y objetivo.${budgetText}

${proposalsText}

Proporciona un análisis que incluya:
1. Comparación de precios y valor ofrecido
2. Análisis de los ítems incluidos en cada propuesta
3. Relación calidad-precio
4. Recomendaciones específicas
5. Consideraciones importantes a tener en cuenta

Sé específico, menciona números y proveedores por nombre. Escribe en español de forma clara y profesional.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content:
            'Eres un experto en análisis de propuestas de compras corporativas. Proporciona análisis detallados, objetivos y profesionales.',
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

    const analysis = chatCompletion.choices[0]?.message?.content || 'No se pudo generar el análisis.';

    return new Response(
      JSON.stringify({ analysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error analyzing proposals:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al analizar las propuestas',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});