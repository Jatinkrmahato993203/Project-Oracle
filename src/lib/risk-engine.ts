export function calculateRiskScore({
  timePressure,
  loadConflict,
  personalReliability,
  categoryBaseRate,
}: {
  timePressure: number;
  loadConflict: number;
  personalReliability: number;
  categoryBaseRate: number;
}) {
  // Hackathon default weights
  const w1 = 1.5;
  const w2 = 1.2;
  const w3 = 1.0;
  const w4 = 0.8;
  const bias = 1.0;

  const rawScore =
    w1 * timePressure +
    w2 * loadConflict +
    w3 * (1 - personalReliability) +
    w4 * categoryBaseRate -
    bias;

  // Sigmoid function to map to 0-1
  const score = 1 / (1 + Math.exp(-rawScore));

  return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1 just in case
}

export function computeTimePressure(dueAt: Date, estHours: number) {
  const now = new Date();
  const msRemaining = dueAt.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  if (hoursRemaining <= 0) return 1; // 100% time pressure if overdue

  const pressure = 1 - hoursRemaining / estHours;
  // It's possible for hoursRemaining to be much larger than estHours (low pressure -> negative)
  // We'll let it be negative to reduce risk if there's plenty of time.
  return pressure;
}
