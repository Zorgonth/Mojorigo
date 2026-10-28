import { config } from "../config/env.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSinceLastCollection(lastCollectedAt, now = new Date()) {
  if (!lastCollectedAt) return Number.POSITIVE_INFINITY;
  return (now.getTime() - new Date(lastCollectedAt).getTime()) / MS_PER_DAY;
}

export function isStaleCollection(lastCollectedAt, now = new Date()) {
  return daysSinceLastCollection(lastCollectedAt, now) >= config.staleCollectionDays;
}

export function emptyingThreshold(lastCollectedAt, now = new Date()) {
  return isStaleCollection(lastCollectedAt, now) ? config.fillStaleThreshold : config.fillAlertThreshold;
}

export function fillStatus(fillPercent, lastCollectedAt, now = new Date()) {
  const threshold = emptyingThreshold(lastCollectedAt, now);

  if (fillPercent >= config.fillCriticalThreshold) return "critical";
  if (fillPercent >= config.fillAlertThreshold) return "needs_emptying";
  if (fillPercent >= threshold) return "overdue";
  if (fillPercent >= 50) return "medium";
  if (fillPercent >= 25) return "low";
  return "empty";
}

export function needsEmptying(fillPercent, lastCollectedAt, now = new Date()) {
  return fillPercent >= emptyingThreshold(lastCollectedAt, now);
}

export function urgencyMessage(fillPercent, lastCollectedAt, now = new Date()) {
  const stale = isStaleCollection(lastCollectedAt, now);
  const days = daysSinceLastCollection(lastCollectedAt, now);
  const daysLabel = Number.isFinite(days) ? Math.floor(days) : null;

  if (fillPercent >= config.fillCriticalThreshold) {
    return `Critical: ${fillPercent}% full — empty as soon as possible`;
  }
  if (fillPercent >= config.fillAlertThreshold) {
    return `Urgent: ${fillPercent}% full — empty soon (threshold ${config.fillAlertThreshold}%)`;
  }
  if (stale && fillPercent >= config.fillStaleThreshold) {
    return `Overdue: not emptied in ${daysLabel ?? "30+"} days, so threshold dropped to ${config.fillStaleThreshold}% (now ${fillPercent}% full)`;
  }
  return "No emptying needed";
}

export function attachUrgency(bin, lastCollectedAt, now = new Date()) {
  const days = daysSinceLastCollection(lastCollectedAt, now);
  const threshold = emptyingThreshold(lastCollectedAt, now);
  const stale = isStaleCollection(lastCollectedAt, now);

  return Object.assign(bin, {
    lastCollectedAt: lastCollectedAt ?? null,
    daysSinceLastCollection: Number.isFinite(days) ? Number(days.toFixed(1)) : null,
    emptyingThreshold: threshold,
    overdueForCollection: stale,
    needsEmptying: needsEmptying(bin.fillPercent, lastCollectedAt, now),
    status: fillStatus(bin.fillPercent, lastCollectedAt, now),
    urgencyMessage: urgencyMessage(bin.fillPercent, lastCollectedAt, now),
  });
}

export function emptyingRules() {
  return {
    standardThresholdPercent: config.fillAlertThreshold,
    staleThresholdPercent: config.fillStaleThreshold,
    staleAfterDays: config.staleCollectionDays,
    criticalThresholdPercent: config.fillCriticalThreshold,
  };
}
