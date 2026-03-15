import type { NextApiRequest, NextApiResponse } from "next";
import { listJobs } from "@/lib/server/jobs";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const items = await listJobs();
    return res.status(200).json({ items, total: items.length });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "读取任务列表失败",
    });
  }
}
