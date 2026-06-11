import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-errors";
import { requireWaterlooIdentity } from "@/lib/auth";
import { callSupabaseRpc } from "@/lib/supabase-rpc";

export const dynamic = "force-dynamic";

const MAX_FEEDBACK_LENGTH = 4000;

interface FeedbackRpcResponse {
  success?: boolean;
  data?: {
    feedback?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
  };
}

function normalizeFeedbackPayload(payload: FeedbackRpcResponse) {
  return {
    feedback:
      typeof payload.data?.feedback === "string" ? payload.data.feedback : "",
    created_at:
      typeof payload.data?.created_at === "string"
        ? payload.data.created_at
        : null,
    updated_at:
      typeof payload.data?.updated_at === "string"
        ? payload.data.updated_at
        : null,
  };
}

function readFeedbackValue(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_FEEDBACK_LENGTH);
}

export async function GET() {
  try {
    const { clerkUserId } = await requireWaterlooIdentity();

    const rpcPayload = await callSupabaseRpc<FeedbackRpcResponse>(
      "watmatch_get_past_capstone_feedback",
      {
        p_clerk_user_id: clerkUserId,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: normalizeFeedbackPayload(rpcPayload),
      },
      {
        headers: {
          "cache-control": "private, no-store",
        },
      }
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { clerkUserId, waterlooEmail } = await requireWaterlooIdentity();
    const body = (await request.json().catch(() => ({}))) as {
      feedback?: unknown;
    };
    const feedback = readFeedbackValue(body.feedback);

    const rpcPayload = await callSupabaseRpc<FeedbackRpcResponse>(
      "watmatch_upsert_past_capstone_feedback",
      {
        p_clerk_user_id: clerkUserId,
        p_waterloo_email: waterlooEmail,
        p_feedback_text: feedback,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: normalizeFeedbackPayload(rpcPayload),
      },
      {
        headers: {
          "cache-control": "private, no-store",
        },
      }
    );
  } catch (error) {
    return jsonError(error);
  }
}
