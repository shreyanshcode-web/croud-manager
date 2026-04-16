import assert from 'node:assert/strict';

import { buildCrowdIntelligenceSnapshot } from './crowdIntelligence.js';

const createFixture = (overrides = {}) => ({
  venue: {
    name: 'Apex Arena',
    capacity: 45000,
    event: 'Championship Finals',
    eventTime: '7:30 PM',
  },
  gates: [
    {
      id: 'gate-1',
      name: 'North Gate A',
      capacity: 1000,
      currentThroughput: 520,
      utilization: 52,
      waitMinutes: 3.2,
      status: 'open',
      peopleInQueue: 22,
    },
    {
      id: 'gate-2',
      name: 'East Gate A',
      capacity: 1000,
      currentThroughput: 910,
      utilization: 91,
      waitMinutes: 14.4,
      status: 'restricted',
      peopleInQueue: 170,
    },
    {
      id: 'gate-3',
      name: 'West Gate A',
      capacity: 1000,
      currentThroughput: 430,
      utilization: 43,
      waitMinutes: 2.1,
      status: 'open',
      peopleInQueue: 14,
    },
  ],
  concessions: [
    {
      id: 'conc-1',
      name: 'Main Grill House',
      queueLength: 28,
      avgWaitMinutes: 7.8,
      staffCount: 3,
      status: 'busy',
      section: 'Section A',
      popularItem: 'Classic Burger',
    },
    {
      id: 'conc-2',
      name: 'Pizza Corner',
      queueLength: 41,
      avgWaitMinutes: 12.5,
      staffCount: 2,
      status: 'congested',
      section: 'Section B',
      popularItem: 'Pepperoni Pizza',
    },
  ],
  restrooms: [
    {
      id: 'rest-1',
      occupancyPercent: 68,
      status: 'busy',
      waitMinutes: 2,
    },
    {
      id: 'rest-2',
      occupancyPercent: 92,
      status: 'full',
      waitMinutes: 5,
    },
  ],
  parking: [
    {
      id: 'park-1',
      name: 'Zone C',
      fillPercent: 72,
      status: 'available',
      entryRate: 11,
      exitRate: 3,
    },
    {
      id: 'park-2',
      name: 'Zone D',
      fillPercent: 88,
      status: 'filling',
      entryRate: 15,
      exitRate: 2,
    },
  ],
  emergencyExits: [
    { id: 'exit-1', status: 'clear' },
    { id: 'exit-2', status: 'blocked' },
  ],
  transport: [
    {
      id: 'transport-1',
      type: 'Metro',
      line: 'Blue Line',
      eta: 3,
      capacity: 76,
      passengers: 260,
      maxPassengers: 400,
      status: 'arriving',
    },
    {
      id: 'transport-2',
      type: 'Shuttle',
      line: 'Hotel District',
      eta: 6,
      capacity: 60,
      passengers: 24,
      maxPassengers: 35,
      status: 'approaching',
    },
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Lower East A',
      density: 96,
      status: 'critical',
    },
    {
      id: 'section-2',
      name: 'Lower West A',
      density: 74,
      status: 'moderate',
    },
    {
      id: 'section-3',
      name: 'Upper North',
      density: 84,
      status: 'high',
    },
  ],
  stats: {
    totalAttendance: 37500,
    venueCapacity: 45000,
    attendancePercent: 83.3,
    avgGateWait: 8.8,
    avgConcessionWait: 9.4,
    parkingUtilization: 80,
    totalRevenue: 42000,
    activeAlerts: 4,
    blockedExits: 1,
    criticalSections: 1,
    congestedConcessions: 1,
    safetyScore: 76,
  },
  ...overrides,
});

const runTest = (name, callback) => {
  try {
    callback();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
};

runTest('returns bounded scores and sorted predictions', () => {
  const snapshot = buildCrowdIntelligenceSnapshot(createFixture());

  assert.ok(snapshot.venueScore.score >= 0 && snapshot.venueScore.score <= 100);
  assert.ok(snapshot.venueScore.confidence >= 60 && snapshot.venueScore.confidence <= 96);
  assert.equal(snapshot.gatePredictions[0].score >= snapshot.gatePredictions[1].score, true);
  assert.equal(snapshot.sectionPredictions[0].score >= snapshot.sectionPredictions[1].score, true);
  assert.equal(snapshot.drivers[0].impactShare >= snapshot.drivers[1].impactShare, true);
});

runTest('higher stress inputs produce a higher venue risk score', () => {
  const base = createFixture({
    stats: {
      totalAttendance: 25000,
      venueCapacity: 45000,
      attendancePercent: 55.5,
      avgGateWait: 3.8,
      avgConcessionWait: 4.2,
      parkingUtilization: 48,
      totalRevenue: 24000,
      activeAlerts: 1,
      blockedExits: 0,
      criticalSections: 0,
      congestedConcessions: 0,
      safetyScore: 94,
    },
  });

  const stressed = createFixture();

  const baseRisk = buildCrowdIntelligenceSnapshot(base).venueScore.score;
  const stressedRisk = buildCrowdIntelligenceSnapshot(stressed).venueScore.score;

  assert.ok(stressedRisk > baseRisk);
});

runTest('arrival planner prefers transit under heavy mobility pressure', () => {
  const snapshot = buildCrowdIntelligenceSnapshot(createFixture());
  assert.equal(snapshot.arrivalPlan.mode, 'transit');
  assert.match(snapshot.arrivalPlan.recommendation, /Use|Metro|Shuttle|Bus/);
});
