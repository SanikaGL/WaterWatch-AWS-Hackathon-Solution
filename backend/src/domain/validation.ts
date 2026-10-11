// Report validation. Scope is water-only; every report is tied to a region.
import type { ReportType, RegionRef } from "./types.js";

export interface ReportInput extends RegionRef {
  type: ReportType;
  description: string;
  locationLabel: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_TYPES: ReportType[] = ["POLLUTION", "LEAKAGE", "HAZARD"];

export function validateReport(input: Partial<ReportInput>): ValidationResult {
  const errors: string[] = [];

  if (!input.type || !VALID_TYPES.includes(input.type)) {
    errors.push("type must be one of POLLUTION, LEAKAGE, HAZARD");
  }
  if (!input.stateId) errors.push("stateId is required");
  if (!input.districtId) errors.push("districtId is required");
  if (!input.talukId) errors.push("talukId is required");
  if (!input.description || input.description.trim().length < 3) {
    errors.push("description is required (min 3 chars)");
  }
  if (!input.locationLabel || input.locationLabel.trim().length < 2) {
    errors.push("locationLabel is required");
  }

  return { valid: errors.length === 0, errors };
}
