import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api-errors";
import { requireWaterlooUser } from "@/lib/auth";
import {
  MAX_PAGE_SIZE,
  normalizePastCapstone,
  PAGE_SIZE,
  type PastCapstoneApiResponse,
} from "@/lib/past-capstones";
import { callSupabaseRpc } from "@/lib/supabase-rpc";

export const dynamic = "force-dynamic";

interface RpcPastCapstoneResponse {
  success?: boolean;
  data?: unknown[];
  results?: unknown[];
  page?: number;
  page_size?: number;
  total?: number;
  total_pages?: number;
  totalPages?: number;
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function filterValue(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "all") {
    return null;
  }

  return trimmed;
}

export async function GET(request: NextRequest) {
  try {
    await requireWaterlooUser();

    const searchParams = request.nextUrl.searchParams;
    const source = "historical";
    const page = parsePositiveInt(searchParams.get("page"), 1, 100000);
    const pageSize = parsePositiveInt(
      searchParams.get("pageSize") ?? searchParams.get("page_size"),
      PAGE_SIZE,
      MAX_PAGE_SIZE
    );

    const rpcPayload = await callSupabaseRpc<RpcPastCapstoneResponse>(
      "watmatch_get_past_capstones",
      {
        p_page: page,
        p_page_size: pageSize,
        p_search: filterValue(searchParams.get("search")),
        p_department: filterValue(searchParams.get("department")),
        p_year: filterValue(searchParams.get("year")),
      }
    );

    const records = Array.isArray(rpcPayload.data)
      ? rpcPayload.data
      : Array.isArray(rpcPayload.results)
        ? rpcPayload.results
        : [];

    const total = Number(rpcPayload.total ?? records.length);
    const totalPages = Number(
      rpcPayload.total_pages ?? rpcPayload.totalPages ?? 1
    );

    const response: PastCapstoneApiResponse = {
      success: true,
      source,
      data: records.map((record, index) =>
        normalizePastCapstone(record, index, source)
      ),
      page: Number(rpcPayload.page ?? page),
      page_size: Number(rpcPayload.page_size ?? pageSize),
      total: Number.isFinite(total) ? total : records.length,
      total_pages:
        Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
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
