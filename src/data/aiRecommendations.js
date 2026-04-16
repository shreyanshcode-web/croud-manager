// SmartVenue AI — Intelligent Recommendation Engine
// Analyzes venue state and generates prioritized, actionable recommendations

const PRIORITY = { SAFETY: 0, EXPERIENCE: 1, EFFICIENCY: 2 };
const PRIORITY_LABELS = ["safety", "experience", "efficiency"];

let recommendationId = 0;

function createRec(priority, category, title, message, action) {
  return {
    id: ++recommendationId,
    priority: PRIORITY_LABELS[priority],
    category,
    title,
    message,
    action,
    timestamp: new Date().toISOString(),
    applied: false,
  };
}

export function generateRecommendations(data) {
  const recs = [];

  // --- SAFETY (Priority 0) ---
  const blockedExits = data.emergencyExits.filter(e => e.status === "blocked");
  blockedExits.forEach(exit => {
    recs.push(createRec(
      PRIORITY.SAFETY,
      "Emergency",
      `⚠️ ${exit.name} Blocked`,
      `${exit.name} in the ${exit.zone} zone is currently blocked. Dispatch maintenance crew immediately. Nearest clear alternative: ${
        data.emergencyExits.find(e => e.zone === exit.zone && e.status === "clear")?.name || "None in zone — escalate!"
      }`,
      `Clear ${exit.name}`
    ));
  });

  const criticalSections = data.sections.filter(s => s.status === "critical");
  criticalSections.forEach(section => {
    recs.push(createRec(
      PRIORITY.SAFETY,
      "Overcrowding",
      `🔴 ${section.name} at ${section.density}% capacity`,
      `${section.name} has reached critical density (${section.occupancy}/${section.capacity}). Consider restricting entry and redirecting fans to adjacent sections with lower occupancy.`,
      `Restrict ${section.name}`
    ));
  });

  if (data.stats.safetyScore < 70) {
    recs.push(createRec(
      PRIORITY.SAFETY,
      "Safety Score",
      `🚨 Safety Score Below Threshold: ${data.stats.safetyScore}/100`,
      `Overall venue safety score has dropped below 70. Multiple emergency exits may be compromised, or several sections are critically overcrowded. Initiate safety protocol review.`,
      "Review Safety Protocol"
    ));
  }

  // --- EXPERIENCE (Priority 1) ---
  const restrictedGates = data.gates.filter(g => g.status === "restricted");
  restrictedGates.forEach(gate => {
    const altGate = data.gates.find(g => g.status === "open" && g.id !== gate.id);
    recs.push(createRec(
      PRIORITY.EXPERIENCE,
      "Gate Flow",
      `🚪 ${gate.name} — High Wait Time (${gate.waitMinutes} min)`,
      `${gate.name} is experiencing heavy congestion with ${gate.peopleInQueue} people queued. Redirect attendees to ${altGate?.name || "nearest available gate"} (currently ${altGate?.waitMinutes || "N/A"} min wait).`,
      `Redirect to ${altGate?.name || "alt gate"}`
    ));
  });

  const congestedConcessions = data.concessions.filter(c => c.status === "congested");
  congestedConcessions.forEach(stand => {
    const altStand = data.concessions.find(c => c.status === "normal" && c.section === stand.section);
    const globalAlt = data.concessions.find(c => c.status === "normal");
    const suggestion = altStand || globalAlt;
    recs.push(createRec(
      PRIORITY.EXPERIENCE,
      "Concessions",
      `🍕 ${stand.name} Queue: ${stand.queueLength} people (~${stand.avgWaitMinutes} min)`,
      `${stand.name} in ${stand.section} is congested. Suggest fans visit ${suggestion?.name || "another stand"} (queue: ${suggestion?.queueLength || "?"}, ~${suggestion?.avgWaitMinutes || "?"} min wait).`,
      `Push notification: ${suggestion?.name}`
    ));
  });

  const fullRestrooms = data.restrooms.filter(r => r.status === "full");
  fullRestrooms.forEach(restroom => {
    const alt = data.restrooms.find(r => r.status === "available");
    recs.push(createRec(
      PRIORITY.EXPERIENCE,
      "Restrooms",
      `🚻 ${restroom.location} — Full (${restroom.waitMinutes} min wait)`,
      `${restroom.location} restrooms are at ${restroom.occupancyPercent}% capacity. Direct fans to ${alt?.location || "nearest available"} (${alt?.occupancyPercent || "?"}% occupancy).`,
      `Update signage for ${restroom.location}`
    ));
  });

  // --- EFFICIENCY (Priority 2) ---
  const fillingParking = data.parking.filter(p => p.status === "full");
  fillingParking.forEach(zone => {
    const altZone = data.parking.find(p => p.status === "available");
    recs.push(createRec(
      PRIORITY.EFFICIENCY,
      "Parking",
      `🅿️ ${zone.name} is Full`,
      `${zone.name} has reached capacity (${zone.filledSpots}/${zone.totalSpots} spots). Reroute incoming traffic to ${altZone?.name || "overflow"} (${altZone?.fillPercent || "?"}% full).`,
      `Update parking signage`
    ));
  });

  const understaffed = data.concessions.filter(c => c.status === "congested" && c.staffCount < 4);
  understaffed.forEach(stand => {
    recs.push(createRec(
      PRIORITY.EFFICIENCY,
      "Staffing",
      `👥 ${stand.name} — Understaffed (${stand.staffCount} staff)`,
      `${stand.name} has only ${stand.staffCount} staff members but ${stand.queueLength} people in queue. Deploy ${Math.max(2, 6 - stand.staffCount)} additional staff from low-demand stands.`,
      `Reallocate staff to ${stand.name}`
    ));
  });

  const arrivingSoon = data.transport.filter(t => t.status === "arriving" && t.capacity > 80);
  arrivingSoon.forEach(vehicle => {
    recs.push(createRec(
      PRIORITY.EFFICIENCY,
      "Transport",
      `🚌 ${vehicle.type}: ${vehicle.line} Arriving (${vehicle.eta} min)`,
      `A near-capacity ${vehicle.type.toLowerCase()} is arriving in ${vehicle.eta} min on ${vehicle.line}. Prepare for surge at nearest entry gate. ${vehicle.passengers} passengers expected.`,
      `Alert gate staff`
    ));
  });

  // General positive status
  if (recs.length === 0) {
    recs.push(createRec(
      PRIORITY.EFFICIENCY,
      "Status",
      `✅ All Systems Nominal`,
      `All venue systems are operating within normal parameters. Current attendance: ${data.stats.totalAttendance.toLocaleString()} / ${data.stats.venueCapacity.toLocaleString()}.`,
      null
    ));
  }

  // Sort by priority (safety first)
  recs.sort((a, b) => {
    const pa = PRIORITY_LABELS.indexOf(a.priority);
    const pb = PRIORITY_LABELS.indexOf(b.priority);
    return pa - pb;
  });

  return recs;
}

// Generate recent history of recommendations for the feed
export function generateRecommendationHistory(data, count = 8) {
  const recs = generateRecommendations(data);
  return recs.slice(0, count);
}
