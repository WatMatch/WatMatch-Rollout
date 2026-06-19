"use client";

import Image from "next/image";
import { Bookmark, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LogoutButton } from "@/components/logout-button";
import {
  PAGE_SIZE,
  type PastCapstone,
  type PastCapstoneApiResponse,
  type PastCapstoneMetadata,
  type PastCapstoneMetadataResponse,
} from "@/lib/past-capstones";

function buildQuery({
  page,
  search,
  department,
  year,
  bookmarkedOnly,
}: {
  page: number;
  search: string;
  department: string;
  year: string;
  bookmarkedOnly: boolean;
}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
  });

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (department !== "All") {
    params.set("department", department);
  }

  if (year !== "All") {
    params.set("year", year);
  }

  if (bookmarkedOnly) {
    params.set("bookmarked", "true");
  }

  return params.toString();
}

interface BookmarksApiResponse {
  success?: boolean;
  data?: {
    bookmarked_ids?: unknown[];
    past_capstone_id?: unknown;
    bookmarked?: unknown;
  };
  error?: string;
}

function getBookmarkId(capstone: PastCapstone): number | null {
  const id = capstone.past_capstone_id ?? Number(capstone.id);

  return Number.isInteger(id) && id > 0 ? id : null;
}

export function PastCapstonesBrowser() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [year, setYear] = useState("All");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [capstones, setCapstones] = useState<PastCapstone[]>([]);
  const [metadata, setMetadata] = useState<PastCapstoneMetadata>({
    departments: [],
    years: [],
    courses: [],
  });
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(
    () => new Set()
  );
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [bookmarkPendingIds, setBookmarkPendingIds] = useState<Set<number>>(
    () => new Set()
  );
  const [selectedCapstone, setSelectedCapstone] = useState<PastCapstone | null>(
    null
  );

  const query = useMemo(
    () => buildQuery({ page, search, department, year, bookmarkedOnly }),
    [page, search, department, year, bookmarkedOnly]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetadata() {
      setMetadataLoading(true);

      try {
        const response = await fetch("/api/metadata", {
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | PastCapstoneMetadataResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Could not load filter metadata."
          );
        }

        setMetadata((payload as PastCapstoneMetadataResponse).data);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }

        setMetadata({
          departments: [],
          years: [],
          courses: [],
        });
      } finally {
        setMetadataLoading(false);
      }
    }

    loadMetadata();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBookmarks() {
      setBookmarksLoading(true);
      setBookmarkError(null);

      try {
        const response = await fetch("/api/bookmarks", {
          signal: controller.signal,
        });
        const payload = (await response.json()) as BookmarksApiResponse;

        if (!response.ok) {
          throw new Error(
            payload.error || "Could not load your shortlisted capstones."
          );
        }

        const ids = Array.isArray(payload.data?.bookmarked_ids)
          ? payload.data.bookmarked_ids
          : [];
        setBookmarkedIds(
          new Set(
            ids
              .map((entry) => Number(entry))
              .filter((entry) => Number.isInteger(entry) && entry > 0)
          )
        );
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }

        setBookmarkError("Shortlist is temporarily unavailable.");
      } finally {
        setBookmarksLoading(false);
      }
    }

    loadBookmarks();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCapstones() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/capstones?${query}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as
          | PastCapstoneApiResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload && payload.error
              ? payload.error
              : "Could not load past capstones."
          );
        }

        const data = payload as PastCapstoneApiResponse;
        setCapstones(data.data);
        setTotalPages(data.total_pages || 1);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load past capstones."
        );
        setCapstones([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    loadCapstones();

    return () => controller.abort();
  }, [query]);

  async function toggleBookmark(capstone: PastCapstone) {
    const bookmarkId = getBookmarkId(capstone);

    if (!bookmarkId || bookmarkPendingIds.has(bookmarkId)) {
      return;
    }

    const wasBookmarked = bookmarkedIds.has(bookmarkId);
    setBookmarkError(null);
    setBookmarkPendingIds((current) => {
      const next = new Set(current);
      next.add(bookmarkId);
      return next;
    });
    setBookmarkedIds((current) => {
      const next = new Set(current);
      if (wasBookmarked) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }
      return next;
    });

    try {
      const response = await fetch("/api/bookmarks", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          past_capstone_id: bookmarkId,
          bookmarked: !wasBookmarked,
        }),
      });
      const payload = (await response.json()) as BookmarksApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error || "Could not update your shortlisted capstones."
        );
      }

      if (wasBookmarked && bookmarkedOnly) {
        setCapstones((current) =>
          current.filter((item) => getBookmarkId(item) !== bookmarkId)
        );
      }
    } catch {
      setBookmarkError("Could not update shortlist.");
      setBookmarkedIds((current) => {
        const next = new Set(current);
        if (wasBookmarked) {
          next.add(bookmarkId);
        } else {
          next.delete(bookmarkId);
        }
        return next;
      });
    } finally {
      setBookmarkPendingIds((current) => {
        const next = new Set(current);
        next.delete(bookmarkId);
        return next;
      });
    }
  }

  const departmentTags = selectedCapstone?.department ?? [];
  const selectedBookmarkId = selectedCapstone
    ? getBookmarkId(selectedCapstone)
    : null;
  const bookmarkedCount = bookmarkedIds.size;

  return (
    <main className="flex min-h-screen flex-col bg-slate-50 px-4 py-5 sm:px-6 lg:px-8">
      <header className="mx-auto mb-7 w-full max-w-7xl">
        <div className="flex min-h-14 items-start justify-end">
          <LogoutButton className="h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm shadow-slate-200/70 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-60" />
        </div>

        <div className="-mt-5 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo-horizontal.png"
            alt="WatMatch"
            width={260}
            height={72}
            priority
            className="h-12 w-auto"
          />
          <div className="space-y-1">
            <h1 className="text-[1.45rem] font-semibold leading-8 text-slate-950">
              Browse previous capstones for inspiration
            </h1>
            <p className="text-sm leading-5 text-slate-600">
              Creating Canada's Largest Capstone Ecosystem
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto mb-6 grid w-full max-w-7xl grid-cols-1 gap-3 md:grid-cols-[minmax(280px,1fr)_minmax(260px,0.82fr)_180px_160px] md:items-center">
        <input
          placeholder="Search past capstones..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="h-12 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm shadow-slate-200/70 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-400 focus-visible:ring-3 focus-visible:ring-slate-200 md:text-sm"
        />

        <FilterSelect
          label="Department"
          value={department}
          disabled={metadataLoading}
          allLabel="All Departments"
          options={metadata.departments}
          onChange={(value) => {
            setDepartment(value);
            setPage(1);
          }}
        />

        <FilterSelect
          label="Year"
          value={year}
          disabled={metadataLoading}
          allLabel="All Years"
          options={metadata.years}
          onChange={(value) => {
            setYear(value);
            setPage(1);
          }}
        />

        <button
          type="button"
          disabled={bookmarksLoading}
          aria-pressed={bookmarkedOnly}
          onClick={() => {
            setBookmarkedOnly((current) => !current);
            setPage(1);
          }}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium shadow-sm shadow-slate-200/70 transition disabled:cursor-not-allowed disabled:opacity-50 ${
            bookmarkedOnly
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100"
          }`}
          title={
            bookmarkError ??
            (bookmarkedOnly
              ? "Show all past capstones"
              : "Show only shortlisted capstones")
          }
        >
          <Bookmark
            className={`h-4 w-4 ${bookmarkedOnly ? "fill-current" : ""}`}
            aria-hidden="true"
          />
          Shortlisted
          {bookmarkedCount > 0 ? ` (${bookmarkedCount})` : ""}
        </button>
      </div>

      {bookmarkError ? (
        <p className="mx-auto mb-3 w-full max-w-7xl text-xs text-amber-700">
          {bookmarkError}
        </p>
      ) : null}

      <BlurredScrollView className="h-[calc(100vh-252px)] min-h-[380px] flex-1">
        {loading || metadataLoading ? (
          <p className="text-center text-slate-500">
            Loading past capstones...
          </p>
        ) : error ? (
          <p className="text-center text-red-600">{error}</p>
        ) : capstones.length ? (
          capstones.map((capstone) => {
            const bookmarkId = getBookmarkId(capstone);
            const isBookmarked = bookmarkId
              ? bookmarkedIds.has(bookmarkId)
              : false;
            const pending = bookmarkId
              ? bookmarkPendingIds.has(bookmarkId)
              : false;

            return (
              <article
                key={capstone.id}
                className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-0 shadow-sm shadow-slate-200/70 transition hover:border-slate-300 hover:shadow-md hover:shadow-slate-200"
                onClick={() => setSelectedCapstone(capstone)}
              >
                <div className="flex flex-col gap-4 p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <h2 className="min-w-0 pt-1 text-lg font-semibold leading-7 text-slate-950">
                      {capstone.title}
                    </h2>
                    <div className="flex w-fit shrink-0 items-center gap-2">
                      <ShortlistButton
                        active={isBookmarked}
                        pending={pending}
                        disabled={!bookmarkId || bookmarksLoading}
                        onToggle={() => toggleBookmark(capstone)}
                      />
                      <span className="inline-flex h-9 items-center rounded-md border border-emerald-100 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                        {capstone.year}
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-[0.95rem] leading-7 text-slate-700">
                    {capstone.description}
                  </p>

                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {capstone.department.slice(0, 4).map((item) => (
                      <span
                        key={item}
                        className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                      >
                        {item}
                      </span>
                    ))}
                    {capstone.department.length > 4 ? (
                      <span className="rounded-md bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                        +{capstone.department.length - 4} more
                      </span>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-center text-slate-500">No matching projects.</p>
        )}
      </BlurredScrollView>

      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1 || loading}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm shadow-slate-200/70 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
        >
          Previous
        </button>

        <span className="text-sm text-slate-600">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() =>
            setPage((current) => Math.min(totalPages, current + 1))
          }
          disabled={page >= totalPages || loading}
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 shadow-sm shadow-slate-200/70 transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50 sm:w-auto"
        >
          Next
        </button>
      </div>

      <CapstoneModal
        project={selectedCapstone}
        isOpen={!!selectedCapstone}
        onClose={() => setSelectedCapstone(null)}
        additionalMetadata={
          selectedCapstone ? (
            <div className="space-y-4">
              <ShortlistButton
                active={
                  selectedBookmarkId
                    ? bookmarkedIds.has(selectedBookmarkId)
                    : false
                }
                pending={
                  selectedBookmarkId
                    ? bookmarkPendingIds.has(selectedBookmarkId)
                    : false
                }
                disabled={!selectedBookmarkId || bookmarksLoading}
                showLabel
                onToggle={() => toggleBookmark(selectedCapstone)}
              />

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Details
                </h3>
                <div className="flex flex-wrap gap-2">
                  {departmentTags.map((item, index) => (
                    <span
                      key={`department-chip-${index}`}
                      className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      {item}
                    </span>
                  ))}
                  <span className="rounded-md border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    {selectedCapstone.year}
                  </span>
                </div>
              </div>
            </div>
          ) : null
        }
      />

      <FeedbackWidget />
    </main>
  );
}

function ShortlistButton({
  active,
  pending,
  disabled,
  showLabel = false,
  onToggle,
}: {
  active: boolean;
  pending: boolean;
  disabled?: boolean;
  showLabel?: boolean;
  onToggle: () => void;
}) {
  const label = active ? "Saved to shortlist" : "Save to shortlist";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled || pending}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium shadow-sm shadow-slate-200/60 transition disabled:cursor-not-allowed disabled:opacity-50 ${
        showLabel ? "h-10 w-full px-3" : "h-9 w-9"
      } ${
        active
          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      <Bookmark
        className={`h-4 w-4 shrink-0 ${active ? "fill-current" : ""}`}
        aria-hidden="true"
      />
      {showLabel ? <span>{pending ? "Saving..." : label}</span> : null}
    </button>
  );
}

interface FeedbackApiResponse {
  success?: boolean;
  data?: {
    feedback?: string;
    updated_at?: string | null;
  };
  error?: string;
}

function FeedbackWidget() {
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const isDirty = draft !== saved;

  useEffect(() => {
    const controller = new AbortController();

    async function loadFeedback() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/feedback", {
          signal: controller.signal,
        });
        const payload = (await response.json()) as FeedbackApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Could not load feedback.");
        }

        const feedback = payload.data?.feedback ?? "";
        setDraft(feedback);
        setSaved(feedback);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }

        setError("Feedback is temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    }

    loadFeedback();

    return () => controller.abort();
  }, []);

  async function saveFeedback() {
    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          feedback: draft,
        }),
      });
      const payload = (await response.json()) as FeedbackApiResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Could not save feedback.");
      }

      const feedback = payload.data?.feedback ?? "";
      setDraft(feedback);
      setSaved(feedback);
      setStatus("Saved");
    } catch {
      setError("Could not save feedback.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open ? (
        <section className="w-[min(calc(100vw-2.5rem),360px)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/15">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Give us feedback!
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                We're building WatMatch to help Waterloo students browse,
                discover, and form capstone teams.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-sm leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close feedback"
            >
              x
            </button>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-medium text-slate-600">
              Any ideas for features or general feedback?
            </span>
            <textarea
              value={draft}
              maxLength={4000}
              rows={4}
              disabled={loading || saving}
              placeholder={
                loading
                  ? "Loading saved feedback..."
                  : "What would make this more useful?"
              }
              onChange={(event) => {
                setDraft(event.target.value);
                setStatus(null);
              }}
              className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-3 focus-visible:ring-slate-200 disabled:opacity-60"
            />
            <span className="mt-1 block text-[11px] leading-4 text-slate-400">
              Your UWaterloo email will be recorded.
            </span>
          </label>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p
              className={`min-h-5 text-xs ${
                error ? "text-red-600" : "text-slate-500"
              }`}
            >
              {error || status || (isDirty ? "Unsaved changes" : "")}
            </p>
            <button
              type="button"
              disabled={loading || saving || !isDirty}
              onClick={saveFeedback}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-700"
        aria-expanded={open}
      >
        Feedback
      </button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  allLabel,
  options,
  disabled,
  className = "",
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: string[];
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedLabel = value === "All" ? allLabel : value;
  const items = ["All", ...options];

  return (
    <div
      ref={rootRef}
      className={`relative w-full ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 text-left text-sm leading-normal text-slate-900 shadow-sm shadow-slate-200/70 outline-none transition hover:border-slate-300 focus-visible:border-slate-400 focus-visible:ring-3 focus-visible:ring-slate-200 disabled:opacity-50"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+0.4rem)] z-30 max-h-72 w-full overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10"
        >
          <div className="max-h-64 overflow-auto">
            {items.map((item) => {
              const itemLabel = item === "All" ? allLabel : item;
              const selected = item === value;

              return (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className={`flex w-full rounded-md px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {itemLabel}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BlurredScrollView({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-4 w-full bg-gradient-to-b from-slate-50 to-transparent" />
      <div className="h-full overflow-auto py-2">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pr-2">
          {children}
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-4 w-full bg-gradient-to-t from-slate-50 to-transparent" />
    </div>
  );
}

function CapstoneModal({
  project,
  isOpen,
  onClose,
  additionalMetadata,
}: {
  project: PastCapstone | null;
  isOpen: boolean;
  onClose: () => void;
  additionalMetadata?: React.ReactNode;
}) {
  if (!project || !isOpen) {
    return null;
  }

  const departmentDisplay = project.department.join(", ");

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="capstone-modal-title"
      onMouseDown={onClose}
    >
      <div
        className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl sm:max-w-5xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-md px-2 py-1 text-xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close capstone details"
        >
          x
        </button>

        <div className="flex h-full flex-col">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6 pr-12">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="capstone-modal-title"
                  className="text-2xl font-bold leading-tight text-slate-900"
                >
                  {project.title}
                </h2>
                {(departmentDisplay || project.year) && (
                  <div className="mt-1.5 text-sm font-medium text-slate-500">
                    {departmentDisplay}
                    {departmentDisplay && project.year ? " - " : ""}
                    {project.year}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="space-y-6 md:col-span-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-900">
                    About the Project
                  </h3>
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-600">
                    {project.description}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {project.students.length > 0 ? (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Team
                    </h3>
                    <ul className="space-y-2">
                      {project.students.map((student, index) => (
                        <li
                          key={`student-${index}`}
                          className="flex items-center text-sm text-slate-700"
                        >
                          <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">
                            {student.charAt(0).toUpperCase()}
                          </div>
                          {student}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {additionalMetadata}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
