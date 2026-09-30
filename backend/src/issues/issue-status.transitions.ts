import { IssueStatus } from '../common/enums';

/**
 * Allowed forward transitions reachable through the officer-facing
 * PATCH /issues/:id/status endpoint.
 *
 * CLOSED and REOPENED are deliberately absent as reachable *targets* here
 * — those only happen through the citizen verification endpoints
 * (POST /issues/:id/confirm-fix, /reject-fix) added in Phase 7, which is
 * how "SUBMITTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED ->
 * VERIFICATION_PENDING -> CLOSED" ends up fully wired end to end without
 * letting an officer unilaterally close their own ticket.
 *
 * VERIFICATION_PENDING is also not a directly-requestable target: marking
 * an issue RESOLVED automatically cascades it there in the same request
 * (see IssuesService.updateStatus), matching the spec's "When issue
 * status is changed to RESOLVED, require citizen verification."
 */
export const ISSUE_STATUS_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  [IssueStatus.SUBMITTED]: [
    IssueStatus.VALIDATING,
    IssueStatus.TRIAGED,
    IssueStatus.INVALID,
    IssueStatus.ASSIGNED,
  ],
  [IssueStatus.VALIDATING]: [IssueStatus.VALID, IssueStatus.INVALID],
  [IssueStatus.VALID]: [IssueStatus.TRIAGED, IssueStatus.ASSIGNED],
  [IssueStatus.TRIAGED]: [IssueStatus.ASSIGNED],
  [IssueStatus.ASSIGNED]: [IssueStatus.IN_PROGRESS],
  [IssueStatus.IN_PROGRESS]: [IssueStatus.RESOLVED],
  [IssueStatus.RESOLVED]: [], // auto-cascades to VERIFICATION_PENDING
  [IssueStatus.VERIFICATION_PENDING]: [], // reached only via cascade
  [IssueStatus.CLOSED]: [], // terminal
  [IssueStatus.INVALID]: [], // terminal
  [IssueStatus.REOPENED]: [IssueStatus.ASSIGNED],
};

export function isTransitionAllowed(
  from: IssueStatus,
  to: IssueStatus,
): boolean {
  return ISSUE_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
