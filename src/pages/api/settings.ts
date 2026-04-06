import type { NextApiRequest, NextApiResponse } from "next";
import { getAppConfig } from "@/lib/server/config";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const config = await getAppConfig();
    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "读取设置失败",
    });
  }
}
