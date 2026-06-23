import type {
  CalculationCard,
  PolicyFact,
  SourceComparison,
  UserStatement,
} from "@/types";

export type PolicyWorkspaceSource = "sample" | "uploaded" | "sample-fallback";

export type PolicyWorkspace = {
  facts: PolicyFact[];
  source: PolicyWorkspaceSource;
  savedAt: string;
};

export type CheckWorkspace = {
  statements: UserStatement[];
  comparisons: SourceComparison[];
  calculations: CalculationCard[];
  savedAt: string;
};

const POLICY_KEY = "coverpilot_policy_workspace";
const CHECK_KEY = "coverpilot_check_workspace";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function savePolicyWorkspace(
  facts: PolicyFact[],
  source: PolicyWorkspaceSource
) {
  if (!canUseSessionStorage()) return;
  const payload: PolicyWorkspace = {
    facts,
    source,
    savedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(POLICY_KEY, JSON.stringify(payload));
  window.sessionStorage.removeItem(CHECK_KEY);
}

export function loadPolicyWorkspace(): PolicyWorkspace | null {
  if (!canUseSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(POLICY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PolicyWorkspace;
    if (!Array.isArray(parsed.facts) || !parsed.source) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPolicyWorkspace() {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(POLICY_KEY);
  window.sessionStorage.removeItem(CHECK_KEY);
}

export function saveCheckWorkspace(
  statements: UserStatement[],
  comparisons: SourceComparison[],
  calculations: CalculationCard[]
) {
  if (!canUseSessionStorage()) return;
  const payload: CheckWorkspace = {
    statements,
    comparisons,
    calculations,
    savedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(CHECK_KEY, JSON.stringify(payload));
}

export function loadCheckWorkspace(): CheckWorkspace | null {
  if (!canUseSessionStorage()) return null;
  const raw = window.sessionStorage.getItem(CHECK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CheckWorkspace;
    if (
      !Array.isArray(parsed.statements) ||
      !Array.isArray(parsed.comparisons) ||
      !Array.isArray(parsed.calculations)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
