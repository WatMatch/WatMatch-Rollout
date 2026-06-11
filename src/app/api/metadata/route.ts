import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-errors";
import { requireWaterlooUser } from "@/lib/auth";
import {
  normalizeMetadata,
  type PastCapstoneMetadataResponse,
} from "@/lib/past-capstones";
import { callSupabaseRpc } from "@/lib/supabase-rpc";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireWaterlooUser();

    const rpcPayload = await callSupabaseRpc<unknown>(
      "watmatch_get_past_capstone_metadata",
      {}
    );

    const response: PastCapstoneMetadataResponse = {
      success: true,
      source: "historical",
      data: normalizeMetadata(rpcPayload),
    };

    return NextResponse.json(response, {
      headers: {
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
