import { getSecret } from './gcp-secrets.js';

/**
 * getCrowdAdvice — Calls Gemini Pro to generate a user-facing recommendation.
 * 
 * Supports two modes:
 * 1. Legacy: trafficLevel + userLocation (operator mode)
 * 2. Enhanced: systemContext + userQuery (user companion mode)
 */
export async function getCrowdAdvice(trafficLevel, userLocation, trafficCondition = null, options = {}) {
  const apiKey = await getSecret('GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  let prompt;

  if (options.systemContext && options.userQuery) {
    // Enhanced user-companion mode: inject venue context + user question
    prompt = `${options.systemContext}\n\nUser question: ${options.userQuery}`;
  } else {
    // Legacy mode: simple traffic-level advice
    let trafficContext = '';
    if (trafficCondition?.avgStress > 50) {
      const jammed = (trafficCondition.routes || [])
        .filter(r => r.stressScore > 50)
        .map(r => r.name)
        .join(', ');
      if (jammed) trafficContext = ` Heavy congestion on: ${jammed}.`;
    }
    prompt = `You are SV-Companion, a friendly event assistant. Give a short, practical answer (2-3 sentences) for someone at a live event. Traffic level: ${trafficLevel}.${trafficContext} Their question/location: ${userLocation}. Be direct, friendly, and mention specific actions they can take.`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
        topK: 40,
        topP: 0.95,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${err}`);
  }

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Gemini returned an empty response');
  }

  return data.candidates[0].content.parts[0].text.trim();
}
