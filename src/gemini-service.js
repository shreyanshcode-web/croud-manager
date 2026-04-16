import { getSecret } from './gcp-secrets.js';

export async function getCrowdAdvice(trafficLevel, userLocation) {
  const apiKey = await getSecret('GEMINI_API_KEY');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Provide short safety advice (1-2 lines) for a user navigating a crowd. Traffic level: ${trafficLevel}. User is currently at: ${userLocation}. Keep it short and actionable.`
        }]
      }]
    })
  });

  if (!response.ok) throw new Error('Failed to fetch from Gemini');
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
