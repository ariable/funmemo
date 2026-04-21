import type { NextApiRequest, NextApiResponse } from "next";
import { getCurrentUserFromRequestHeaders } from "@/lib/server/auth";
import { listJobs } from "@/lib/server/jobs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const items = await listJobs({ userId: currentUser.id });
    return res.status(200).json({ items, total: items.length });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "读取任务列表失败",
    });
  }
}
