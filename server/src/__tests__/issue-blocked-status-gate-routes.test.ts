import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIssueService = vi.hoisted(() => ({
  getAncestors: vi.fn(),
  getById: vi.fn(),
  getByIdentifier: vi.fn(async () => null),
  getComment: vi.fn(),
  getCommentCursor: vi.fn(),
  getRelationSummaries: vi.fn(),
  update: vi.fn(),
  addComment: vi.fn(async () => ({ id: "comment-1", issueId: "issue-1", body: "ok" })),
  setBlockers: vi.fn(async () => undefined),
  listWakeableBlockedDependents: vi.fn(async () => []),
  getWakeableParentAfterChildCompletion: vi.fn(async () => null),
  findMentionedAgents: vi.fn(async () => []),
}));

vi.mock("../services/index.js", () => ({
  accessService: () => ({ canUser: vi.fn(), hasPermission: vi.fn() }),
  agentService: () => ({ getById: vi.fn() }),
  documentService: () => ({ getIssueDocumentPayload: vi.fn(async () => ({})) }),
  executionWorkspaceService: () => ({ getById: vi.fn() }),
  feedbackService: () => ({}),
  goalService: () => ({ getById: vi.fn(), getDefaultCompanyGoal: vi.fn() }),
  heartbeatService: () => ({
    wakeup: vi.fn(async () => undefined),
    reportRunActivity: vi.fn(async () => undefined),
  }),
  instanceSettingsService: () => ({ get: vi.fn(), listCompanyIds: vi.fn() }),
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  logActivity: vi.fn(async () => undefined),
  projectService: () => ({ getById: vi.fn(), listByIds: vi.fn(async () => []) }),
  routineService: () => ({ syncRunStatusForIssue: vi.fn(async () => undefined) }),
  workProductService: () => ({ listForIssue: vi.fn(async () => []) }),
}));

async function createApp() {
  const [{ issueRoutes }, { errorHandler }] = await Promise.all([
    vi.importActual<typeof import("../routes/issues.js")>("../routes/issues.js"),
    vi.importActual<typeof import("../middleware/index.js")>("../middleware/index.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "local-board",
      companyIds: ["company-1"],
      source: "local_implicit",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

function makeExisting(overrides: Record<string, unknown> = {}) {
  return {
    id: "issue-1",
    companyId: "company-1",
    identifier: "PAP-500",
    title: "Ticket",
    description: null,
    status: "in_progress",
    priority: "medium",
    parentId: null,
    assigneeAgentId: "agent-1",
    assigneeUserId: null,
    createdByAgentId: null,
    createdByUserId: null,
    executionWorkspaceId: null,
    labels: [],
    labelIds: [],
    ...overrides,
  };
}

describe("PATCH /issues/:id blocked-status gate wiring (NODA-163)", { timeout: 30_000 }, () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("../routes/issues.js");
    vi.doUnmock("../routes/authz.js");
    vi.doUnmock("../middleware/index.js");
    for (const fn of Object.values(mockIssueService)) {
      if (typeof fn === "function" && "mockReset" in fn) (fn as any).mockReset();
    }
    mockIssueService.getAncestors.mockResolvedValue([]);
    mockIssueService.getComment.mockResolvedValue(null);
    mockIssueService.getCommentCursor.mockResolvedValue({
      totalComments: 0,
      latestCommentId: null,
      latestCommentAt: null,
    });
    mockIssueService.getRelationSummaries.mockResolvedValue({ blockedBy: [], blocks: [] });
    mockIssueService.getByIdentifier.mockResolvedValue(null);
    mockIssueService.addComment.mockResolvedValue({
      id: "comment-1",
      issueId: "issue-1",
      body: "ok",
    });
    mockIssueService.update.mockResolvedValue(makeExisting());
    mockIssueService.listWakeableBlockedDependents.mockResolvedValue([]);
    mockIssueService.getWakeableParentAfterChildCompletion.mockResolvedValue(null);
    mockIssueService.findMentionedAgents.mockResolvedValue([]);
    mockIssueService.setBlockers.mockResolvedValue(undefined);
  });

  it("does not query the blocker gate when status is not blocked", async () => {
    mockIssueService.getById.mockResolvedValue(makeExisting());
    mockIssueService.update.mockResolvedValue(makeExisting({ status: "in_progress" }));

    const res = await request(await createApp())
      .patch("/api/issues/issue-1")
      .send({ status: "in_progress", comment: "resuming" });

    expect(res.status).toBe(200);
    // getRelationSummaries is only fetched when blockedByIssueIds is sent OR we hit
    // the blocked-gate path. Neither applies here.
    expect(mockIssueService.getRelationSummaries).not.toHaveBeenCalled();
  });

  it("does not query the blocker gate when transitioning out of blocked", async () => {
    mockIssueService.getById.mockResolvedValue(makeExisting({ status: "blocked" }));
    mockIssueService.update.mockResolvedValue(makeExisting({ status: "done" }));

    const res = await request(await createApp())
      .patch("/api/issues/issue-1")
      .send({ status: "done", comment: "resolved" });

    expect(res.status).toBe(200);
    expect(mockIssueService.getRelationSummaries).not.toHaveBeenCalled();
  });

  it("fetches existing blockers to feed the gate when status=blocked and request omits blockedByIssueIds", async () => {
    mockIssueService.getById.mockResolvedValue(makeExisting());
    mockIssueService.getRelationSummaries.mockResolvedValue({
      blockedBy: [{ id: "issue-99", identifier: "PAP-99", title: "Upstream", status: "todo" }],
      blocks: [],
    });
    mockIssueService.update.mockResolvedValue(makeExisting({ status: "blocked" }));

    // We don't test the gate's verdict here (see blocker-gate.test.ts for that) —
    // only that the route feeds existing blockers into the gate by calling
    // getRelationSummaries when blockedByIssueIds is omitted.
    await request(await createApp())
      .patch("/api/issues/issue-1")
      .send({ status: "blocked", comment: "BLOCKER: vendor outage" });

    expect(mockIssueService.getRelationSummaries).toHaveBeenCalledWith("issue-1");
  });
});
