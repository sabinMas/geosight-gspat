import { GeoSightUiContext } from "@/lib/agents/agent-config";
import type { WorkspaceCardId } from "@/types";

export type GeoUsabilitySeverity = "critical" | "high" | "medium" | "low";
export type GeoUsabilityIssueType =
  | "overflow"
  | "crowding"
  | "unclear hierarchy"
  | "too many simultaneous actions"
  | "copy too dense"
  | "mobile risk";

export interface GeoUsabilityFinding {
  severity: GeoUsabilitySeverity;
  surface: string;
  issueType: GeoUsabilityIssueType;
  recommendation: string;
  revealPolicy?: string;
}

export interface GeoUsabilityAuditResult {
  summary: string;
  findings: GeoUsabilityFinding[];
}

function addFinding(
  findings: GeoUsabilityFinding[],
  finding: GeoUsabilityFinding | null,
) {
  if (finding) {
    findings.push(finding);
  }
}

function getCrowdingThreshold(
  viewportClass: GeoSightUiContext["viewportClass"],
  currentRoute: string,
) {
  if (currentRoute === "/") {
    return viewportClass === "mobile" ? 7 : viewportClass === "tablet" ? 10 : 12;
  }

  return viewportClass === "mobile" ? 8 : viewportClass === "tablet" ? 11 : 14;
}

export function runDeterministicUiAudit(uiContext?: GeoSightUiContext | null): GeoUsabilityAuditResult {
  if (!uiContext) {
    return {
      summary: "No UI context was provided, so the audit could not evaluate GeoSight's visible state.",
      findings: [
        {
          severity: "high",
          surface: "agent context",
          issueType: "unclear hierarchy",
          recommendation: "Send route, viewport, visible cards, and shell state before requesting a UX audit.",
          revealPolicy: "Expose structured UI state to GeoUsability before using it as an audit source.",
        },
      ],
    };
  }

  const findings: GeoUsabilityFinding[] = [];
  const currentRoute = uiContext.currentRoute ?? "/explore";
  const visibleControls = uiContext.visibleControlCount ?? 0;
  const visibleTextBlocks = uiContext.visibleTextBlockCount ?? 0;
  const visibleWorkspaceCards = uiContext.visibleWorkspaceCardIds?.length ?? 0;
  const viewportClass = uiContext.viewportClass ?? "desktop";
  const shellMode = uiContext.shellMode ?? "minimal";
  const crowdingThreshold = getCrowdingThreshold(viewportClass, currentRoute);

  addFinding(
    findings,
    visibleControls > crowdingThreshold
      ? {
          severity: viewportClass === "mobile" ? "high" : "medium",
          surface: currentRoute === "/" ? "landing shell" : "explore shell",
          issueType: "crowding",
          recommendation:
            "Reduce concurrent visible controls and collapse advanced actions behind a single secondary entry point.",
          revealPolicy:
            "Keep one dominant action visible and defer advanced tools until the user selects a place or enters board mode.",
        }
      : null,
  );

  addFinding(
    findings,
    visibleTextBlocks > (viewportClass === "mobile" ? 9 : 12)
      ? {
          severity: "medium",
          surface: currentRoute === "/" ? "hero and mission onboarding" : "explore summary surfaces",
          issueType: "copy too dense",
          recommendation:
            "Shorten descriptive copy, clamp secondary summaries, and hide deeper framing behind toggles.",
          revealPolicy:
            "Show one narrative at a time and convert explanatory blocks into expandable detail.",
        }
      : null,
  );

  addFinding(
    findings,
    currentRoute === "/explore" &&
      !uiContext.locationSelected &&
      ((uiContext.visiblePrimaryCardId ?? "active-location") !== "active-location" ||
        visibleWorkspaceCards > 0)
      ? {
          severity: "high",
          surface: "explore first view",
          issueType: "unclear hierarchy",
          recommendation:
            "Keep the pre-selection state anchored on the location prompt and active-location summary only.",
          revealPolicy:
            "Do not surface supporting cards before a location is selected or a clear user intent exists.",
        }
      : null,
  );

  addFinding(
    findings,
    shellMode !== "board" && visibleWorkspaceCards > 1
      ? {
          severity: "high",
          surface: "supporting card reveal flow",
          issueType: "too many simultaneous actions",
          recommendation:
            "Reveal one supporting card at a time in minimal or guided mode and keep the rest in the Add view tray.",
          revealPolicy:
            "Reserve multi-card canvases for explicit board mode only.",
        }
      : null,
  );

  addFinding(
    findings,
    viewportClass === "mobile" &&
      (visibleWorkspaceCards > 0 || Boolean(uiContext.reportOpen))
      ? {
          severity: visibleWorkspaceCards > 1 ? "high" : "medium",
          surface: "mobile explore flow",
          issueType: "mobile risk",
          recommendation:
            "Collapse side panels into drawers, keep supporting cards off-canvas by default, and avoid stacked dense surfaces on phones.",
          revealPolicy:
            "Treat mobile as a single-surface flow: globe, prompt, primary card, then optional drawer content.",
        }
      : null,
  );

  addFinding(
    findings,
    (["source-awareness", "compare", "factor-breakdown"] as WorkspaceCardId[]).filter((cardId) =>
      uiContext.visibleWorkspaceCardIds?.includes(cardId),
    ).length >= 2
      ? {
          severity: "medium",
          surface: "deep-dive analytical cards",
          issueType: "overflow",
          recommendation:
            "Do not present multiple dense analytical cards together outside board mode; sequence them through suggestions instead.",
          revealPolicy:
            "Make trust, comparison, and factor detail progressive rather than ambient.",
        }
      : null,
  );

  const summary =
    findings.length === 0
      ? "The current UI state looks controlled: one dominant action is visible, supporting views are contained, and no deterministic clutter risks were detected."
      : `GeoUsability found ${findings.length} front-end issue${findings.length === 1 ? "" : "s"} in the current visible state.`;

  return { summary, findings };
}

export function formatUiAuditResult(audit: GeoUsabilityAuditResult) {
  if (!audit.findings.length) {
    return `${audit.summary}\n\n- Severity: low\n- Surface: overall shell\n- Issue type: crowding\n- Recommendation: Keep the current progressive disclosure behavior and continue validating with mobile screenshots.`;
  }

  return [
    audit.summary,
    "",
    ...audit.findings.flatMap((finding, index) => [
      `Finding ${index + 1}`,
      `- Severity: ${finding.severity}`,
      `- Surface: ${finding.surface}`,
      `- Issue type: ${finding.issueType}`,
      `- Recommendation: ${finding.recommendation}`,
      ...(finding.revealPolicy ? [`- Reveal policy: ${finding.revealPolicy}`] : []),
      "",
    ]),
  ]
    .join("\n")
    .trim();
}
