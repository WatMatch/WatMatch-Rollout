import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-errors";
import { requireWaterlooIdentity } from "@/lib/auth";
import { callSupabaseRpc } from "@/lib/supabase-rpc";

export const dynamic = "force-dynamic";

interface BookmarkListRpcResponse {
  success?: boolean;
  data?: {
    bookmarked_ids?: unknown;
  };
}

interface BookmarkMutationRpcResponse {
  success?: boolean;
  data?: {
    past_capstone_id?: unknown;
    bookmarked?: unknown;
  };
}

function normalizeBookmarkedIds(payload: BookmarkListRpcResponse): number[] {
  const rawIds = Array.isArray(payload.data?.bookmarked_ids)
    ? payload.data.bookmarked_ids
    : [];

  return rawIds
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry) && entry > 0);
}

function parsePastCapstoneId(value: unknown): number | null {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function parseBookmarked(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
}

export async function GET() {
  try {
    const { clerkUserId } = await requireWaterlooIdentity();

    const rpcPayload = await callSupabaseRpc<BookmarkListRpcResponse>(
      "watmatch_get_past_capstone_bookmarks",
      {
        p_clerk_user_id: clerkUserId,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          bookmarked_ids: normalizeBookmarkedIds(rpcPayload),
        },
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
      past_capstone_id?: unknown;
      bookmarked?: unknown;
    };
    const pastCapstoneId = parsePastCapstoneId(body.past_capstone_id);

    if (!pastCapstoneId) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid past_capstone_id is required.",
        },
        {
          status: 400,
          headers: {
            "cache-control": "private, no-store",
          },
        }
      );
    }

    const bookmarked = parseBookmarked(body.bookmarked);

    const rpcPayload = await callSupabaseRpc<BookmarkMutationRpcResponse>(
      "watmatch_set_past_capstone_bookmark",
      {
        p_clerk_user_id: clerkUserId,
        p_waterloo_email: waterlooEmail,
        p_past_capstone_id: pastCapstoneId,
        p_bookmarked: bookmarked,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          past_capstone_id:
            Number(rpcPayload.data?.past_capstone_id) || pastCapstoneId,
          bookmarked:
            typeof rpcPayload.data?.bookmarked === "boolean"
              ? rpcPayload.data.bookmarked
              : bookmarked,
        },
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
