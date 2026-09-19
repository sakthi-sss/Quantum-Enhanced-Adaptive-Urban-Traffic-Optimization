/**
 * Featherless AI Service
 * ======================
 * OpenAI-compatible API client for Featherless.ai
 * Used to power the Q-FLOW AI Traffic Advisor.
 *
 * API: https://api.featherless.ai/v1
 * Compatible with OpenAI chat completion format.
 */

const API_KEY = import.meta.env.VITE_FEATHERLESS_API_KEY as string;
const BASE_URL = (import.meta.env.VITE_FEATHERLESS_BASE_URL as string) || 'https://api.featherless.ai/v1';
const MODEL = (import.meta.env.VITE_FEATHERLESS_MODEL as string) || 'Qwen/Qwen2.5-72B-Instruct';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Q-FLOW's AI Traffic Advisor — an expert in hybrid quantum-classical urban traffic optimization.

You analyze traffic data from a network of 6 interconnected intersections (S1–S6) optimized using:
- SUMO traffic microsimulation (vehicle counts, queue lengths, waiting times)
- QUBO formulation (Quadratic Unconstrained Binary Optimization)
- QAOA (Quantum Approximate Optimization Algorithm) via Qiskit Aer
- Adaptive signal timing based on density and queue length

Your role:
1. Explain current traffic conditions clearly (non-technical language for operators)
2. Justify why the quantum optimizer chose specific signal timings
3. Estimate environmental and efficiency impact of optimizations
4. Advise on emergency corridor decisions
5. Compare quantum-hybrid vs classical fixed-timing approaches

Always be concise (2–5 sentences). Remind users when results are simulation estimates.
Do NOT claim real quantum hardware is used — Qiskit Aer is a classical quantum circuit simulator.`;

/**
 * Send a chat message to Featherless AI.
 * Returns the assistant's response text.
 */
export async function chatWithAdvisor(
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  if (!API_KEY) {
    return '⚠️ Featherless API key not configured. Add VITE_FEATHERLESS_API_KEY to your .env file.';
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 300,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Featherless API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? 'No response from AI advisor.';
  } catch (err: any) {
    console.error('Featherless AI error:', err);
    return `⚠️ AI Advisor unavailable: ${err.message ?? 'network error'}`;
  }
}

/**
 * Stream a chat response from Featherless AI.
 * Calls onChunk(delta) for each streamed token.
 * Calls onDone(fullText) when complete.
 */
export async function streamChatWithAdvisor(
  userMessage: string,
  history: ChatMessage[],
  onChunk: (delta: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void
): Promise<void> {
  if (!API_KEY) {
    onError('Featherless API key not configured.');
    return;
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 350,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      onError(`API error ${response.status}: ${errText}`);
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) {
      onError('No response stream available.');
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6); // Remove "data: "
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }

    onDone(fullText);
  } catch (err: any) {
    onError(err.message ?? 'Stream error');
  }
}

/** Build a context-aware traffic analysis prompt from current state */
export function buildTrafficPrompt(ctx: {
  intersections: Array<{ id: string; density: number; queueLength: number; waitingTime: number; congestionLevel: string; currentSignal: string; pedestrianDemand?: number }>;
  optResult?: { improvements: { waitingTimeReduction: number; fuelReductionPct: number; co2ReductionPct: number }; qaoa: { bestConfig: string; bestCost: number } } | null;
  activeScenario?: string;
  emergencyActive?: boolean;
}): string {
  const critical = ctx.intersections.filter(ix => ix.congestionLevel === 'CRITICAL');
  const avgDensity = Math.round(ctx.intersections.reduce((s, ix) => s + ix.density, 0) / ctx.intersections.length);
  const avgWait = Math.round(ctx.intersections.reduce((s, ix) => s + ix.waitingTime, 0) / ctx.intersections.length);

  let prompt = `Current traffic state: ${ctx.intersections.length} intersections, avg density ${avgDensity}%, avg wait ${avgWait}s.`;

  if (critical.length > 0) {
    prompt += ` CRITICAL congestion at: ${critical.map(ix => `${ix.id} (${ix.density}%)`).join(', ')}.`;
  }

  if (ctx.activeScenario && ctx.activeScenario !== 'NORMAL_TRAFFIC') {
    prompt += ` Active scenario: ${ctx.activeScenario}.`;
  }

  if (ctx.optResult) {
    prompt += ` After Q-FLOW optimization: wait time reduced ${ctx.optResult.improvements.waitingTimeReduction}%, fuel estimate down ${ctx.optResult.improvements.fuelReductionPct}%, CO₂ estimate down ${ctx.optResult.improvements.co2ReductionPct}%. QAOA best config: ${ctx.optResult.qaoa.bestConfig} (cost ${ctx.optResult.qaoa.bestCost.toFixed(2)}).`;
  }

  if (ctx.emergencyActive) {
    prompt += ` Emergency vehicle active — green corridor on S1→S3→S4 route.`;
  }

  prompt += ' Give a brief analysis and recommendation.';
  return prompt;
}
