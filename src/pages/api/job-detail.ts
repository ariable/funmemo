import type { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUserFromRequestHeaders } from "@/lib/server/auth";
import { getJobDetail } from "@/lib/server/jobs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const jobId = typeof req.query.jobId === "string" ? req.query.jobId.trim() : "";
  if (!jobId) {
    return res.status(400).json({ message: "缺少 jobId" });
  }

  try {
    const currentUser = getCurrentUserFromRequestHeaders({
      get(name) {
        const value = req.headers[name];
        return Array.isArray(value) ? value[0] ?? null : value ?? null;
      },
    });

    if (!currentUser) {
      return res.status(401).json({ message: "未登录，请通过统一登录入口访问。" });
    }

    const job = await getJobDetail(jobId, { userId: currentUser.id });
    if (!job) {
      return res.status(404).json({ message: "任务不存在" });
    }

    return res.status(200).json(job);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "读取任务失败",
    });
  }
}
