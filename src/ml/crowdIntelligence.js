const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const average = (items, selector) => {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + selector(item), 0) / items.length;
};

const normalize = (value, max) => clamp(value / max, 0, 1);

const sigmoid = (value) => 1 / (1 + Math.exp(-value));

const round = (value, decimals = 1) => Number(value.toFixed(decimals));

const bandFromScore = (score) => {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'elevated';
  return 'low';
};

const countByStatus = (items, statuses) =>
  items.filter((item) => statuses.includes(item.status)).length;

const computePositiveDelta = (current, previous) => {
  if (previous == null) return 0;
  if (previous === 0) return current > 0 ? 1 : 0;
  return clamp((current - previous) / Math.abs(previous), 0, 1);
};

const buildFeatureContext = (data, previousData) => {
  const restrictedGates = countByStatus(data.gates, ['restricted']);
  const activeGateAlerts = countByStatus(data.gates, ['busy', 'restricted']);
  const avgGateUtilization = average(data.gates, (gate) => gate.utilization);
  const avgGateQueue = average(data.gates, (gate) => gate.peopleInQueue);

  const highSections = countByStatus(data.sections, ['high', 'critical']);
  const maxSectionDensity = Math.max(...data.sections.map((section) => section.density));

  const avgRestroomOccupancy = average(
    data.restrooms,
    (restroom) => restroom.occupancyPercent,
  );

  const predictedArrivalLoad = data.transport
    .filter((vehicle) => vehicle.eta <= 8)
    .reduce((sum, vehicle) => sum + vehicle.passengers, 0);

  const arrivingVehicleCapacity = data.transport
    .filter((vehicle) => vehicle.eta <= 8)
    .reduce((sum, vehicle) => sum + vehicle.maxPassengers, 0);

  const parkingNetFlow = data.parking.reduce(
    (sum, zone) => sum + Math.max(zone.entryRate - zone.exitRate, 0),
    0,
  );

  const gateWaitDelta = computePositiveDelta(
    data.stats.avgGateWait,
    previousData?.stats.avgGateWait,
  );
  const queueDelta = computePositiveDelta(
    data.gates.reduce((sum, gate) => sum + gate.peopleInQueue, 0),
    previousData?.gates.reduce((sum, gate) => sum + gate.peopleInQueue, 0),
  );
  const attendanceDelta = computePositiveDelta(
    data.stats.totalAttendance,
    previousData?.stats.totalAttendance,
  );
  const sectionDensityDelta = computePositiveDelta(
    average(data.sections, (section) => section.density),
    previousData ? average(previousData.sections, (section) => section.density) : 0,
  );

  const gatePressure = clamp(
    normalize(data.stats.avgGateWait, 15) * 0.35
      + normalize(avgGateUtilization, 100) * 0.25
      + normalize(avgGateQueue, 140) * 0.2
      + normalize(restrictedGates, Math.max(1, data.gates.length / 3)) * 0.2,
    0,
    1,
  );

  const sectionPressure = clamp(
    normalize(highSections, Math.max(1, data.sections.length * 0.4)) * 0.45
      + normalize(maxSectionDensity, 100) * 0.55,
    0,
    1,
  );

  const amenityPressure = clamp(
    normalize(data.stats.avgConcessionWait, 12) * 0.55
      + normalize(avgRestroomOccupancy, 100) * 0.25
      + normalize(
        data.stats.congestedConcessions,
        Math.max(1, data.concessions.length * 0.35),
      ) * 0.2,
    0,
    1,
  );

  const mobilityPressure = clamp(
    normalize(data.stats.parkingUtilization, 100) * 0.5
      + clamp(predictedArrivalLoad / Math.max(arrivingVehicleCapacity, 1), 0, 1) * 0.3
      + normalize(parkingNetFlow, 35) * 0.2,
    0,
    1,
  );

  const safetyPressure = clamp(
    normalize(data.stats.blockedExits, 3) * 0.5
      + normalize(100 - data.stats.safetyScore, 100) * 0.3
      + normalize(data.stats.criticalSections, 4) * 0.2,
    0,
    1,
  );

  const attendancePressure = normalize(data.stats.attendancePercent, 100);

  const trendPressure = clamp(
    gateWaitDelta * 0.35
      + queueDelta * 0.3
      + attendanceDelta * 0.2
      + sectionDensityDelta * 0.15,
    0,
    1,
  );

  return {
    activeGateAlerts,
    attendancePressure,
    avgGateQueue,
    avgGateUtilization,
    avgRestroomOccupancy,
    gatePressure,
    highSections,
    mobilityPressure,
    parkingNetFlow,
    predictedArrivalLoad,
    safetyPressure,
    sectionPressure,
    trendPressure,
    amenityPressure,
  };
};

const buildDrivers = (context, data) => {
  const drivers = [
    {
      key: 'gatePressure',
      label: 'Gate queue pressure',
      weight: 2.15,
      value: context.gatePressure,
      detail: `${data.stats.avgGateWait.toFixed(1)} min average gate wait across ${context.activeGateAlerts} stressed gates.`,
    },
    {
      key: 'sectionPressure',
      label: 'Section density load',
      weight: 1.8,
      value: context.sectionPressure,
      detail: `${context.highSections} sections are already in high or critical density bands.`,
    },
    {
      key: 'safetyPressure',
      label: 'Safety drag',
      weight: 1.7,
      value: context.safetyPressure,
      detail: `${data.stats.blockedExits} exits are impaired and the live safety score is ${data.stats.safetyScore}/100.`,
    },
    {
      key: 'mobilityPressure',
      label: 'Arrival surge pressure',
      weight: 1.1,
      value: context.mobilityPressure,
      detail: `${context.predictedArrivalLoad} inbound passengers are within the next 8-minute window.`,
    },
    {
      key: 'amenityPressure',
      label: 'Amenity congestion',
      weight: 1.15,
      value: context.amenityPressure,
      detail: `${data.stats.congestedConcessions} concession clusters are above the comfort threshold.`,
    },
    {
      key: 'trendPressure',
      label: 'Momentum signal',
      weight: 0.9,
      value: context.trendPressure,
      detail: 'Recent changes in queue growth, attendance, and density indicate whether pressure is accelerating.',
    },
  ];

  const totalImpact = drivers.reduce(
    (sum, driver) => sum + (driver.value * driver.weight),
    0,
  ) || 1;

  return drivers
    .map((driver) => ({
      ...driver,
      score: Math.round(driver.value * 100),
      impactShare: Math.round(((driver.value * driver.weight) / totalImpact) * 100),
    }))
    .sort((left, right) => right.impactShare - left.impactShare);
};

const buildGatePredictions = (data, context) => {
  const lowPressureGates = [...data.gates]
    .filter((gate) => gate.status === 'open')
    .sort((left, right) => left.utilization - right.utilization);

  return [...data.gates]
    .map((gate) => {
      const fallbackGate = lowPressureGates.find((candidate) => candidate.id !== gate.id);
      const pressure = clamp(
        normalize(gate.waitMinutes, 20) * 0.35
          + normalize(gate.utilization, 100) * 0.35
          + normalize(gate.peopleInQueue, 180) * 0.2
          + context.trendPressure * 0.1
          + (gate.status === 'restricted' ? 0.08 : 0),
        0,
        1,
      );

      const predictedWaitMinutes = clamp(
        gate.waitMinutes + pressure * 6 + context.trendPressure * 4,
        0.5,
        28,
      );

      return {
        id: gate.id,
        name: gate.name,
        score: Math.round(pressure * 100),
        band: bandFromScore(Math.round(pressure * 100)),
        confidence: clamp(
          Math.round(62 + pressure * 25 + context.trendPressure * 10),
          55,
          95,
        ),
        predictedWaitMinutes: round(predictedWaitMinutes),
        recommendedGate: fallbackGate?.name || 'nearest available gate',
        action: fallbackGate
          ? `Push a redirect to ${fallbackGate.name} and move 2 scanners.`
          : 'Deploy roaming staff and open a temporary overflow lane.',
        reason: `${gate.utilization}% utilization with ${gate.peopleInQueue} people queued.`,
      };
    })
    .sort((left, right) => right.score - left.score);
};

const buildSectionPredictions = (data, context) =>
  [...data.sections]
    .map((section) => {
      const pressure = clamp(
        normalize(section.density, 100) * 0.7
          + context.sectionPressure * 0.2
          + context.attendancePressure * 0.1
          + (section.status === 'critical' ? 0.08 : 0),
        0,
        1,
      );

      return {
        id: section.id,
        name: section.name,
        score: Math.round(pressure * 100),
        band: bandFromScore(Math.round(pressure * 100)),
        predictedDensity: round(
          clamp(section.density + context.trendPressure * 8 + pressure * 4, 0, 100),
        ),
        action: section.status === 'critical'
          ? 'Freeze additional entry and fan out to adjacent sections.'
          : 'Prime stewards and wayfinding to absorb a short-term surge.',
      };
    })
    .sort((left, right) => right.score - left.score);

const buildArrivalPlan = (data, gatePredictions, context) => {
  const bestTransit = [...data.transport]
    .sort(
      (left, right) =>
        (left.eta + Math.max(left.capacity - 70, 0) / 10)
        - (right.eta + Math.max(right.capacity - 70, 0) / 10),
    )[0];

  const bestParking = [...data.parking]
    .filter((zone) => zone.status !== 'full')
    .sort((left, right) => left.fillPercent - right.fillPercent)[0];

  const calmGate = [...gatePredictions].sort((left, right) => left.score - right.score)[0];
  const useTransit = context.mobilityPressure > 0.52 || data.stats.parkingUtilization > 78;

  return {
    mode: useTransit ? 'transit' : 'parking',
    recommendation: useTransit && bestTransit
      ? `Use ${bestTransit.type} via ${bestTransit.line}.`
      : `Route vehicles to ${bestParking?.name || 'the lowest-fill parking zone'}.`,
    targetGate: calmGate?.name || 'the lowest-pressure gate',
    arrivalWindow: useTransit ? 'Arrive 45 minutes before start.' : 'Arrive 35 minutes before start.',
    confidence: clamp(
      Math.round(65 + context.mobilityPressure * 18 + context.gatePressure * 8),
      60,
      94,
    ),
    tip: useTransit
      ? 'Send a mobile ticket reminder and direct fans straight to the calmest entry corridor.'
      : 'Activate dynamic parking signage before the net inflow crosses the next threshold.',
  };
};

export function buildCrowdIntelligenceSnapshot(data, previousData = null) {
  const context = buildFeatureContext(data, previousData);

  const linearScore = -2.35
    + (context.gatePressure * 2.15)
    + (context.sectionPressure * 1.8)
    + (context.amenityPressure * 1.15)
    + (context.mobilityPressure * 1.1)
    + (context.safetyPressure * 1.7)
    + (context.trendPressure * 0.9)
    + (context.attendancePressure * 0.55);

  const riskScore = Math.round(sigmoid(linearScore) * 100);
  const riskBand = bandFromScore(riskScore);

  const predictedAttendance = Math.min(
    data.venue.capacity,
    Math.round(
      data.stats.totalAttendance
        + (context.predictedArrivalLoad * 0.28)
        + (context.parkingNetFlow * 12),
    ),
  );

  const predictedGateWait = round(
    clamp(
      data.stats.avgGateWait + (context.gatePressure * 5) + (context.trendPressure * 4),
      0.5,
      25,
    ),
  );

  const incidentProbability = clamp(
    Math.round(
      (riskScore * 0.62)
        + (data.stats.blockedExits * 10)
        + (data.stats.criticalSections * 4),
    ),
    5,
    99,
  );

  const confidence = clamp(
    Math.round(
      68 + (Math.abs(linearScore) * 7) + (previousData ? 8 : 0) + (context.trendPressure * 10),
    ),
    60,
    96,
  );

  const drivers = buildDrivers(context, data);
  const gatePredictions = buildGatePredictions(data, context);
  const sectionPredictions = buildSectionPredictions(data, context);
  const arrivalPlan = buildArrivalPlan(data, gatePredictions, context);

  return {
    venueScore: {
      score: riskScore,
      band: riskBand,
      confidence,
      predictedAttendance,
      predictedGateWait,
      incidentProbability,
      summary: `${riskBand.toUpperCase()} crowd pressure forecast for the next 15 minutes.`,
    },
    drivers,
    gatePredictions,
    sectionPredictions,
    arrivalPlan,
  };
}

export { bandFromScore };
