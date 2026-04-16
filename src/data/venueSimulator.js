// SmartVenue AI — Real-time Venue Data Simulator
// Generates realistic sporting venue data with periodic updates

const VENUE_NAME = "Apex Arena";
const EVENT_NAME = "Thunder vs Lightning — Championship Finals";
const VENUE_CAPACITY = 45000;

// --- Utility Helpers ---
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => +(Math.random() * (max - min) + min).toFixed(1);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// --- Gate Data ---
const GATE_NAMES = [
  "North Gate A", "North Gate B", "East Gate A", "East Gate B",
  "South Gate A", "South Gate B", "West Gate A", "West Gate B"
];

function generateGates() {
  return GATE_NAMES.map((name, i) => {
    const capacity = rand(800, 1200);
    const throughput = rand(200, capacity);
    const utilization = +((throughput / capacity) * 100).toFixed(1);
    const waitMinutes = utilization > 85 ? randFloat(8, 20) : utilization > 60 ? randFloat(3, 8) : randFloat(0.5, 3);
    const status = utilization > 90 ? "restricted" : utilization > 70 ? "busy" : "open";
    return {
      id: `gate-${i}`,
      name,
      capacity,
      currentThroughput: throughput,
      utilization,
      waitMinutes,
      status,
      peopleInQueue: status === "restricted" ? rand(80, 200) : status === "busy" ? rand(30, 80) : rand(0, 30),
      direction: i < 4 ? "entry" : "bidirectional",
    };
  });
}

// --- Concession Stands ---
const CONCESSION_NAMES = [
  "Main Grill House", "Pizza Corner", "Taco Stand", "Burger Barn",
  "Noodle Bar", "Ice Cream Parlor", "Craft Beer Hub", "Soda Fountain",
  "Hot Dog Express", "Pretzel Palace", "Coffee Station", "Smoothie Bar"
];

const FOOD_ITEMS = [
  "Classic Burger", "Loaded Nachos", "Pepperoni Pizza", "Fish Tacos",
  "Craft IPA", "Frozen Lemonade", "Hot Dog Combo", "Soft Pretzel",
  "Chicken Wings", "Cappuccino", "Berry Smoothie", "Ice Cream Sundae"
];

function generateConcessions() {
  return CONCESSION_NAMES.map((name, i) => {
    const queueLength = rand(0, 45);
    const avgWait = queueLength > 30 ? randFloat(10, 18) : queueLength > 15 ? randFloat(5, 10) : randFloat(1, 5);
    const status = queueLength > 35 ? "congested" : queueLength > 20 ? "busy" : "normal";
    return {
      id: `conc-${i}`,
      name,
      queueLength,
      avgWaitMinutes: avgWait,
      staffCount: rand(2, 6),
      status,
      popularItem: FOOD_ITEMS[i],
      revenue: rand(2000, 15000),
      section: `Section ${String.fromCharCode(65 + (i % 6))}`,
    };
  });
}

// --- Restrooms ---
const RESTROOM_LOCATIONS = [
  "North Concourse L1", "North Concourse L2", "East Wing",
  "South Concourse L1", "South Concourse L2", "West Wing"
];

function generateRestrooms() {
  return RESTROOM_LOCATIONS.map((location, i) => {
    const occupancy = rand(15, 100);
    const status = occupancy > 90 ? "full" : occupancy > 70 ? "busy" : "available";
    return {
      id: `rest-${i}`,
      location,
      occupancyPercent: occupancy,
      status,
      waitMinutes: occupancy > 80 ? randFloat(3, 8) : randFloat(0, 3),
      cleaningStatus: pick(["clean", "clean", "clean", "needs-attention"]),
      lastCleaned: `${rand(5, 55)} min ago`,
      totalStalls: rand(12, 24),
      availableStalls: occupancy > 80 ? rand(0, 3) : rand(4, 12),
    };
  });
}

// --- Parking Zones ---
const PARKING_ZONES = [
  { name: "Zone A — VIP", totalSpots: 500, color: "#a78bfa" },
  { name: "Zone B — Premium", totalSpots: 1200, color: "#60a5fa" },
  { name: "Zone C — General North", totalSpots: 2500, color: "#34d399" },
  { name: "Zone D — General South", totalSpots: 2500, color: "#fbbf24" },
  { name: "Zone E — Economy East", totalSpots: 3000, color: "#fb923c" },
  { name: "Zone F — Overflow", totalSpots: 4000, color: "#f87171" },
];

function generateParking() {
  return PARKING_ZONES.map((zone, i) => {
    const filled = rand(Math.floor(zone.totalSpots * 0.3), zone.totalSpots);
    const fillPercent = +((filled / zone.totalSpots) * 100).toFixed(1);
    const status = fillPercent > 95 ? "full" : fillPercent > 80 ? "filling" : "available";
    return {
      id: `park-${i}`,
      name: zone.name,
      totalSpots: zone.totalSpots,
      filledSpots: filled,
      fillPercent,
      status,
      entryRate: rand(2, 15),
      exitRate: rand(0, 8),
      estimatedTimeToFull: status === "full" ? "Full" : `${rand(10, 90)} min`,
      color: zone.color,
    };
  });
}

// --- Emergency Exits ---
const EXIT_NAMES = [
  "Exit N1", "Exit N2", "Exit E1", "Exit E2", "Exit E3",
  "Exit S1", "Exit S2", "Exit W1", "Exit W2", "Exit W3"
];

function generateEmergencyExits() {
  return EXIT_NAMES.map((name, i) => {
    const statusPool = ["clear", "clear", "clear", "clear", "clear", "clear", "clear", "clear", "blocked", "maintenance"];
    const status = pick(statusPool);
    return {
      id: `exit-${i}`,
      name,
      status,
      lastChecked: `${rand(1, 30)} min ago`,
      capacity: rand(200, 500),
      currentFlow: status === "clear" ? rand(0, 50) : 0,
      zone: name.startsWith("Exit N") ? "North" : name.startsWith("Exit E") ? "East" : name.startsWith("Exit S") ? "South" : "West",
      evacuationRoute: `Route ${String.fromCharCode(65 + i)}`,
    };
  });
}

// --- Public Transport ---
function generateTransport() {
  const types = ["Bus", "Metro", "Shuttle"];
  const routes = [
    { type: "Metro", line: "Blue Line — Central Station", eta: rand(2, 12), capacity: rand(60, 95), passengers: rand(100, 400), maxPassengers: 450 },
    { type: "Metro", line: "Red Line — North Terminal", eta: rand(5, 18), capacity: rand(40, 90), passengers: rand(80, 350), maxPassengers: 400 },
    { type: "Bus", line: "Route 42 — Downtown Loop", eta: rand(3, 15), capacity: rand(50, 100), passengers: rand(20, 55), maxPassengers: 60 },
    { type: "Bus", line: "Route 17 — Eastside Express", eta: rand(4, 20), capacity: rand(30, 85), passengers: rand(15, 50), maxPassengers: 60 },
    { type: "Bus", line: "Route 88 — Airport Connector", eta: rand(8, 25), capacity: rand(20, 70), passengers: rand(10, 45), maxPassengers: 55 },
    { type: "Shuttle", line: "Venue Shuttle A — Parking Lot F", eta: rand(1, 8), capacity: rand(60, 100), passengers: rand(10, 30), maxPassengers: 35 },
    { type: "Shuttle", line: "Venue Shuttle B — Hotel District", eta: rand(3, 12), capacity: rand(40, 90), passengers: rand(8, 28), maxPassengers: 30 },
    { type: "Shuttle", line: "Venue Shuttle C — Train Station", eta: rand(2, 10), capacity: rand(50, 95), passengers: rand(12, 32), maxPassengers: 35 },
  ];
  return routes.map((r, i) => ({
    id: `transport-${i}`,
    ...r,
    status: r.eta <= 3 ? "arriving" : r.eta <= 8 ? "approaching" : "en-route",
  }));
}

// --- Stadium Sections (for heatmap) ---
const SECTION_NAMES = [
  "Lower North A", "Lower North B", "Lower East A", "Lower East B",
  "Lower South A", "Lower South B", "Lower West A", "Lower West B",
  "Upper North", "Upper East", "Upper South", "Upper West",
  "VIP Suites North", "VIP Suites South", "Club Level",  "Field Level"
];

function generateSections() {
  return SECTION_NAMES.map((name, i) => {
    const capacity = name.includes("VIP") ? rand(200, 500) : name.includes("Club") ? rand(800, 1200) : name.includes("Field") ? rand(1000, 1500) : name.includes("Upper") ? rand(2000, 3500) : rand(1500, 2800);
    const occupancy = rand(Math.floor(capacity * 0.4), capacity);
    const density = +((occupancy / capacity) * 100).toFixed(1);
    return {
      id: `section-${i}`,
      name,
      capacity,
      occupancy,
      density,
      status: density > 95 ? "critical" : density > 80 ? "high" : density > 50 ? "moderate" : "low",
    };
  });
}

// --- Aggregate Stats ---
function computeAggregateStats(data) {
  const totalAttendance = data.sections.reduce((sum, s) => sum + s.occupancy, 0);
  const avgGateWait = +(data.gates.reduce((sum, g) => sum + g.waitMinutes, 0) / data.gates.length).toFixed(1);
  const avgConcessionWait = +(data.concessions.reduce((sum, c) => sum + c.avgWaitMinutes, 0) / data.concessions.length).toFixed(1);
  const parkingUtilization = +(data.parking.reduce((sum, p) => sum + p.fillPercent, 0) / data.parking.length).toFixed(1);
  const totalRevenue = data.concessions.reduce((sum, c) => sum + c.revenue, 0);
  const blockedExits = data.emergencyExits.filter(e => e.status !== "clear").length;
  const criticalSections = data.sections.filter(s => s.status === "critical").length;
  const congestedConcessions = data.concessions.filter(c => c.status === "congested").length;
  const activeAlerts = blockedExits + criticalSections + congestedConcessions;

  return {
    totalAttendance,
    venueCapacity: VENUE_CAPACITY,
    attendancePercent: +((totalAttendance / VENUE_CAPACITY) * 100).toFixed(1),
    avgGateWait,
    avgConcessionWait,
    parkingUtilization,
    totalRevenue,
    activeAlerts,
    blockedExits,
    criticalSections,
    congestedConcessions,
    safetyScore: clamp(100 - (blockedExits * 15) - (criticalSections * 5), 0, 100),
  };
}

// --- Full Venue Snapshot ---
export function generateVenueSnapshot() {
  const gates = generateGates();
  const concessions = generateConcessions();
  const restrooms = generateRestrooms();
  const parking = generateParking();
  const emergencyExits = generateEmergencyExits();
  const transport = generateTransport();
  const sections = generateSections();

  const data = { gates, concessions, restrooms, parking, emergencyExits, transport, sections };
  const stats = computeAggregateStats(data);

  return {
    ...data,
    stats,
    venue: {
      name: VENUE_NAME,
      event: EVENT_NAME,
      capacity: VENUE_CAPACITY,
      eventTime: "7:30 PM",
      eventDate: "April 16, 2026",
    },
    timestamp: new Date().toISOString(),
  };
}

// --- Incremental Update (smoother transitions) ---
export function updateVenueData(prev) {
  const nudge = (val, min, max, delta) => clamp(val + rand(-delta, delta), min, max);

  const gates = prev.gates.map(g => {
    const throughput = nudge(g.currentThroughput, 100, g.capacity, 40);
    const utilization = +((throughput / g.capacity) * 100).toFixed(1);
    const waitMinutes = utilization > 85 ? randFloat(8, 20) : utilization > 60 ? randFloat(3, 8) : randFloat(0.5, 3);
    const status = utilization > 90 ? "restricted" : utilization > 70 ? "busy" : "open";
    return { ...g, currentThroughput: throughput, utilization, waitMinutes, status, peopleInQueue: nudge(g.peopleInQueue, 0, 200, 15) };
  });

  const concessions = prev.concessions.map(c => {
    const queueLength = nudge(c.queueLength, 0, 50, 5);
    const avgWait = queueLength > 30 ? randFloat(10, 18) : queueLength > 15 ? randFloat(5, 10) : randFloat(1, 5);
    const status = queueLength > 35 ? "congested" : queueLength > 20 ? "busy" : "normal";
    return { ...c, queueLength, avgWaitMinutes: avgWait, status, revenue: c.revenue + rand(50, 300) };
  });

  const restrooms = prev.restrooms.map(r => {
    const occupancy = nudge(r.occupancyPercent, 10, 100, 8);
    const status = occupancy > 90 ? "full" : occupancy > 70 ? "busy" : "available";
    return { ...r, occupancyPercent: occupancy, status, waitMinutes: occupancy > 80 ? randFloat(3, 8) : randFloat(0, 3), availableStalls: occupancy > 80 ? rand(0, 3) : rand(4, 12) };
  });

  const parking = prev.parking.map(p => {
    const filled = nudge(p.filledSpots, Math.floor(p.totalSpots * 0.2), p.totalSpots, 20);
    const fillPercent = +((filled / p.totalSpots) * 100).toFixed(1);
    const status = fillPercent > 95 ? "full" : fillPercent > 80 ? "filling" : "available";
    return { ...p, filledSpots: filled, fillPercent, status, entryRate: rand(2, 15), exitRate: rand(0, 8), estimatedTimeToFull: status === "full" ? "Full" : `${rand(10, 90)} min` };
  });

  const emergencyExits = prev.emergencyExits.map(e => {
    // Exits rarely change status
    if (Math.random() < 0.05) {
      const status = pick(["clear", "clear", "clear", "clear", "blocked", "maintenance"]);
      return { ...e, status, lastChecked: `${rand(1, 5)} min ago`, currentFlow: status === "clear" ? rand(0, 50) : 0 };
    }
    return { ...e, lastChecked: `${parseInt(e.lastChecked) + 1} min ago`, currentFlow: e.status === "clear" ? rand(0, 50) : 0 };
  });

  const transport = prev.transport.map(t => {
    let eta = t.eta - 1;
    if (eta <= 0) {
      eta = rand(5, 25);
    }
    return { ...t, eta, capacity: nudge(t.capacity, 20, 100, 5), status: eta <= 3 ? "arriving" : eta <= 8 ? "approaching" : "en-route" };
  });

  const sections = prev.sections.map(s => {
    const occupancy = nudge(s.occupancy, Math.floor(s.capacity * 0.3), s.capacity, 50);
    const density = +((occupancy / s.capacity) * 100).toFixed(1);
    return { ...s, occupancy, density, status: density > 95 ? "critical" : density > 80 ? "high" : density > 50 ? "moderate" : "low" };
  });

  const data = { gates, concessions, restrooms, parking, emergencyExits, transport, sections };
  const stats = computeAggregateStats(data);

  return {
    ...data,
    stats,
    venue: prev.venue,
    timestamp: new Date().toISOString(),
  };
}
