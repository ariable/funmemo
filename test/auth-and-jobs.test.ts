import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/lib/prisma.ts";
import { resolveCurrentUser } from "../src/lib/server/auth-shared.ts";

test("resolveCurrentUser prefers display name over login name", () => {
  const headerMap = new Map([
    ["x-user-id", "user_123"],
    ["x-user-name", "王小明"],
    ["x-user-login", "wangxm@example.com"],
  ]);
  const user = resolveCurrentUser({
    get(name) {
      return headerMap.get(name) ?? null;
    },
  });

  assert.deepEqual(user, {
    id: "user_123",
    displayName: "王小明",
    loginName: "wangxm@example.com",
  });
});

test("job records can be filtered by userId for isolation", async () => {
  const suffix = Date.now().toString();
  const ownTitle = `own-job-${suffix}`;
  const otherTitle = `other-job-${suffix}`;

  const ownJob = await prisma.job.create({
    data: {
      userId: "user_a",
      userDisplayName: "张三",
      title: ownTitle,
      sourceFilename: `${ownTitle}.wav`,
    },
  });

  const otherJob = await prisma.job.create({
    data: {
      userId: "user_b",
      userDisplayName: "李四",
      title: otherTitle,
      sourceFilename: `${otherTitle}.wav`,
    },
  });

  try {
    const ownJobs = await prisma.job.findMany({
      where: { userId: "user_a" },
    });
    assert.ok(ownJobs.some((job) => job.id === ownJob.id));
    assert.ok(!ownJobs.some((job) => job.id === otherJob.id));

    const visibleOwnJob = await prisma.job.findFirst({
      where: {
        id: ownJob.id,
        userId: "user_a",
      },
    });
    const hiddenOtherJob = await prisma.job.findFirst({
      where: {
        id: otherJob.id,
        userId: "user_a",
      },
    });

    assert.ok(visibleOwnJob);
    assert.equal(hiddenOtherJob, null);
  } finally {
    await prisma.job.deleteMany({
      where: {
        id: {
          in: [ownJob.id, otherJob.id],
        },
      },
    });
  }
});
