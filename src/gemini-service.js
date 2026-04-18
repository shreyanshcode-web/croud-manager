import { getSecret } from './gcp-secrets.js';

export async function getCrowdAdvice(trafficLevel, userLocation, trafficCondition = null) {
  const apiKey = await getSecret('GEMINI_API_KEY');
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  
  // Enrich prompt with real-time congestion data if available
  let trafficContext = '';
  if (trafficCondition && trafficCondition.avgStress > 50) {
    const jammed = trafficCondition.routes.filter(r => r.stressScore > 50).map(r => r.name).join(', ');
    trafficContext = ` Real-time Google Maps reports heavy congestion coming from: ${jammed}.`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Provide short safety and navigation advice (max 2 lines) for a venue operator or attendee. Traffic level: ${trafficLevel}.${trafficContext} User location/context: ${userLocation}. Keep it professional, crisp and actionable. Focus on flow optimization.`
        }]
      }]
    })
  });

  if (!response.ok) throw new Error('Failed to fetch from Gemini');
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
