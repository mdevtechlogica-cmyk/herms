import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { isPushSendingConfigured, sendPushToUser } from "@/lib/push.server";
import { getSupabaseAdminIfConfigured } from "@/lib/supabase-admin.server";

const sendPushInput = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1),
  body: z.string().min(1),
  path: z.string().optional(),
  data: z.record(z.string()).optional(),
});

export const sendUserPushNotification = createServerFn({ method: "POST" })
  .validator(sendPushInput)
  .handler(async ({ data }) => {
    if (!isPushSendingConfigured()) {
      return { ok: false as const, reason: "push_not_configured" };
    }

    const admin = getSupabaseAdminIfConfigured();
    if (!admin) {
      return { ok: false as const, reason: "service_role_not_configured" };
    }

    const { data: tokens, error } = await admin
      .from("push_device_tokens")
      .select("token, platform")
      .eq("user_id", data.userId);

    if (error) {
      return { ok: false as const, reason: error.message };
    }

    const result = await sendPushToUser(data.userId, tokens ?? [], {
      title: data.title,
      body: data.body,
      path: data.path,
      data: data.data,
    });

    return { ok: true as const, ...result };
  });
