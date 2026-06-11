import { NextResponse } from "next/server";
import { AccessError } from "@/lib/auth";

export function jsonError(error: unknown): NextResponse {
  if (error instanceof AccessError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: error.status,
        headers: {
          "cache-control": "private, no-store",
        },
      }
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected server error.";

  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status: 500,
      headers: {
        "cache-control": "private, no-store",
      },
    }
  );
}
