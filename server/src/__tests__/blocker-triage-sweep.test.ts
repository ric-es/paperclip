import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  activityLog,
  agents,
  agentRuntimeState,
  agentWakeupRequests,
  companySkills,
  companies,
  createDb,
  heartbeatRunEvents,
  heartbeatRuns,
  issueComments,
  issueLabels,
  issues,
  labels,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";

const mockTelemetryClient = vi.hoisted(() => ({ track: vi.fn() }));
const mockTrackAgentFirstHeartbeat = vi.hoisted(() => vi.fn());

vi.mock("../telemetry.ts", () => ({
  getTelemetryClient: () => mockTelemetryClient,
}));

vi.mock("@paperclipai/shared/telemetry", async () => {
  const actual = await vi.importActual<typeof import("@paperclipai/shared/telemetry")>(
    "@paperclipai/shared/telemetry",
  );
  return {
    ...actual,
    trackAgentFirstHeartbeat: mockTrackAgentFirstHeartbeat,
  };
});

vi.mock("../adapters/index.ts", async () => {
  const actual = await vi.importActual<typeof import("../adapters/index.ts")>("../adapters/index.ts");
  return {
    ...actual,
    getServerAdapter: vi.fn(() => ({
      supportsLocalAgentJwt: false,
      execute: vi.fn(async () => ({
        exitCode: 0,
        signal: null,
        timedOut: false,
        errorMessage: null,
        provider: "test",
        model: "test-model",
      })),
    })),
  };
});

import { heartbeatService } from "../services/heartbeat.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping blocker triage sweep tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("heartbeat blocker-triage sweep", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-blocker-triage-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    vi.clearAllMocks();
    await db.delete(activityLog);
    await db.delete(agentRuntimeState);
    await db.delete(companySkills);
    await db.delete(issueComments);
    await db.delete(issueLabels);
    await db.delete(labels);
    await db.delete(issues);
    await db.delete(heartbeatRunEvents);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedBlockedIssueFixture(input: {
    blockedSinceDaysAgo: number;
    withCeo?: boolean;
    withManager?: boolean;
    persistentLabel?: string;
    nonAssigneeCommentDaysAgo?: number;
  }) {
    const companyId = randomUUID();
    const ceoId = input.withCeo ? randomUUID() : null;
    const managerId = input.withManager ? randomUUID() : null;
    const agentId = randomUUID();
    const issueId = randomUUID();
    const otherAgentId = randomUUID();
    const issuePrefix = `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

    const now = new Date("2026-04-17T15:00:00.000Z");
    const blockedSince = new Date(now.getTime() - input.blockedSinceDaysAgo * 24 * 60 * 60 * 1000);

    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix,
      requireBoardApprovalForNewAgents: false,
    });

    if (ceoId) {
      await db.insert(agents).values({
        id: ceoId,
        companyId,
        name: "CeoAgent",
        role: "ceo",
        status: "idle",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
        reportsTo: null,
      });
    }

    if (managerId) {
      await db.insert(agents).values({
        id: managerId,
        companyId,
        name: "EngManager",
        role: "engineering_manager",
        status: "idle",
        adapterType: "codex_local",
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
        reportsTo: ceoId,
      });
    }

    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "CodexCoder",
      role: "engineer",
      status: "idle",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
      reportsTo: managerId ?? ceoId ?? null,
    });

    // Foreign-key target for any non-assignee comments we attribute to a different agent.
    await db.insert(agents).values({
      id: otherAgentId,
      companyId,
      name: "PeerAgent",
      role: "engineer",
      status: "idle",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
      reportsTo: managerId ?? ceoId ?? null,
    });

    await db.insert(issues).values({
      id: issueId,
      companyId,
      title: "Stale blocked issue",
      status: "blocked",
      priority: "medium",
      assigneeAgentId: agentId,
      issueNumber: 1,
      identifier: `${issuePrefix}-1`,
      startedAt: blockedSince,
      createdAt: blockedSince,
      updatedAt: blockedSince,
    });

    if (input.persistentLabel) {
      const labelId = randomUUID();
      await db.insert(labels).values({
        id: labelId,
        companyId,
        name: input.persistentLabel,
        color: "#1f2937",
      });
      await db.insert(issueLabels).values({ companyId, issueId, labelId });
    }

    if (input.nonAssigneeCommentDaysAgo !== undefined) {
      const commentAt = new Date(now.getTime() - input.nonAssigneeCommentDaysAgo * 24 * 60 * 60 * 1000);
      await db.insert(issueComments).values({
        id: randomUUID(),
        companyId,
        issueId,
        authorAgentId: otherAgentId,
        body: "Following up here",
        createdAt: commentAt,
        updatedAt: commentAt,
      });
    }

    return { companyId, ceoId, managerId, agentId, otherAgentId, issueId, now };
  }

  it("escalates a blocked issue with no recent non-assignee comments past the 5-day threshold", async () => {
    const { issueId, agentId, ceoId, now } = await seedBlockedIssueFixture({
      blockedSinceDaysAgo: 6,
      withCeo: true,
    });
    const heartbeat = heartbeatService(db);

    const result = await heartbeat.runBlockerTriageSweep(now);

    expect(result.checked).toBe(1);
    expect(result.escalated).toBe(1);
    expect(result.escalatedIssueIds).toEqual([issueId]);

    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).then((rows) => rows[0] ?? null);
    expect(issue?.status).toBe("blocked");
    expect(issue?.assigneeAgentId).toBe(ceoId);
    expect(issue?.assigneeAgentId).not.toBe(agentId);

    const comments = await db.select().from(issueComments).where(eq(issueComments.issueId, issueId));
    expect(comments).toHaveLength(1);
    expect(comments[0]?.body).toContain("**Paperclip blocker triage: stale blocked issue auto-escalated**");
    expect(comments[0]?.body).toContain("Status remains `blocked`");
    expect(comments[0]?.body).toContain("CEO fallback");
  });

  it("does not escalate when a non-assignee comment landed within the threshold", async () => {
    const { issueId, agentId, now } = await seedBlockedIssueFixture({
      blockedSinceDaysAgo: 7,
      withCeo: true,
      nonAssigneeCommentDaysAgo: 2,
    });
    const heartbeat = heartbeatService(db);

    const result = await heartbeat.runBlockerTriageSweep(now);

    expect(result.escalated).toBe(0);
    expect(result.escalatedIssueIds).toEqual([]);
    expect(result.checked).toBe(1);

    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).then((rows) => rows[0] ?? null);
    expect(issue?.assigneeAgentId).toBe(agentId);
  });

  it("does not escalate when blocked for less than the threshold", async () => {
    const { issueId, agentId, now } = await seedBlockedIssueFixture({
      blockedSinceDaysAgo: 4,
      withCeo: true,
    });
    const heartbeat = heartbeatService(db);

    const result = await heartbeat.runBlockerTriageSweep(now);

    expect(result.escalated).toBe(0);
    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).then((rows) => rows[0] ?? null);
    expect(issue?.assigneeAgentId).toBe(agentId);
  });

  it("skips persistent-* labelled issues entirely", async () => {
    const { issueId, agentId, now } = await seedBlockedIssueFixture({
      blockedSinceDaysAgo: 30,
      withCeo: true,
      persistentLabel: "persistent-channel",
    });
    const heartbeat = heartbeatService(db);

    const result = await heartbeat.runBlockerTriageSweep(now);

    expect(result.persistentChannelSkipped).toBe(1);
    expect(result.escalated).toBe(0);
    expect(result.checked).toBe(1);
    expect(result.digestsByAgentId).toEqual({});

    const issue = await db.select().from(issues).where(eq(issues.id, issueId)).then((rows) => rows[0] ?? null);
    expect(issue?.assigneeAgentId).toBe(agentId);

    const comments = await db.select().from(issueComments).where(eq(issueComments.issueId, issueId));
    expect(comments).toHaveLength(0);
  });

  it("skips persistent-* prefix labels (e.g. persistent-ops) too", async () => {
    const { issueId, now } = await seedBlockedIssueFixture({
      blockedSinceDaysAgo: 30,
      withCeo: true,
      persistentLabel: "persistent-ops",
    });
    const heartbeat = heartbeatService(db);

    const result = await heartbeat.runBlockerTriageSweep(now);

    expect(result.persistentChannelSkipped).toBe(1);
    expect(result.escalated).toBe(0);

    const comments = await db.select().from(issueComments).where(eq(issueComments.issueId, issueId));
    expect(comments).toHaveLength(0);
  });

  it("collects digest entries per assignee for visible blocked work", async () => {
    const { agentId, issueId, now } = await seedBlockedIssueFixture({
      blockedSinceDaysAgo: 2,
      withCeo: true,
    });
    const heartbeat = heartbeatService(db);

    const result = await heartbeat.runBlockerTriageSweep(now);

    expect(result.checked).toBe(1);
    expect(result.escalated).toBe(0);
    expect(result.digestsByAgentId[agentId]).toBeTruthy();
    expect(result.digestsByAgentId[agentId]?.issueIds).toEqual([issueId]);
    expect(result.digestsByAgentId[agentId]?.oldestStaleDays).toBeGreaterThanOrEqual(2);
  });
});
