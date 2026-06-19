-- WatMatch Past Capstones shortlist setup.
-- Run this once in the Supabase SQL editor for the database used by this app.

create table if not exists public.past_capstone_bookmarks (
  bookmark_id bigint generated always as identity primary key,
  clerk_user_id text not null,
  waterloo_email text not null,
  past_capstone_fk bigint not null references public.past_capstones(past_capstone_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint past_capstone_bookmarks_user_capstone_unique unique (clerk_user_id, past_capstone_fk),
  constraint past_capstone_bookmarks_waterloo_email_check check (lower(waterloo_email) like '%@uwaterloo.ca')
);

create index if not exists idx_past_capstone_bookmarks_user_created_at
  on public.past_capstone_bookmarks (clerk_user_id, created_at desc);

create index if not exists idx_past_capstone_bookmarks_capstone_fk
  on public.past_capstone_bookmarks (past_capstone_fk);

alter table public.past_capstone_bookmarks enable row level security;

revoke all on table public.past_capstone_bookmarks from anon, authenticated;

create or replace function public.watmatch_get_past_capstone_bookmarks(
  p_clerk_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clerk_user_id text := nullif(btrim(coalesce(p_clerk_user_id, '')), '');
  v_bookmarked_ids jsonb := '[]'::jsonb;
begin
  if v_clerk_user_id is null then
    raise exception 'clerk_user_id is required';
  end if;

  select coalesce(jsonb_agg(b.past_capstone_fk order by b.created_at desc), '[]'::jsonb)
    into v_bookmarked_ids
  from public.past_capstone_bookmarks b
  where b.clerk_user_id = v_clerk_user_id;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'bookmarked_ids', v_bookmarked_ids
    )
  );
end;
$$;

revoke execute on function public.watmatch_get_past_capstone_bookmarks(text) from public, anon, authenticated;
grant execute on function public.watmatch_get_past_capstone_bookmarks(text) to service_role;

create or replace function public.watmatch_set_past_capstone_bookmark(
  p_clerk_user_id text,
  p_waterloo_email text,
  p_past_capstone_id bigint,
  p_bookmarked boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clerk_user_id text := nullif(btrim(coalesce(p_clerk_user_id, '')), '');
  v_waterloo_email text := lower(nullif(btrim(coalesce(p_waterloo_email, '')), ''));
  v_past_capstone_id bigint := p_past_capstone_id;
  v_bookmarked boolean := coalesce(p_bookmarked, false);
begin
  if v_clerk_user_id is null then
    raise exception 'clerk_user_id is required';
  end if;

  if v_waterloo_email is null or v_waterloo_email not like '%@uwaterloo.ca' then
    raise exception 'A Waterloo email is required';
  end if;

  if v_past_capstone_id is null or v_past_capstone_id < 1 then
    raise exception 'past_capstone_id is required';
  end if;

  if not exists (
    select 1
    from public.past_capstones p
    where p.past_capstone_id = v_past_capstone_id
  ) then
    raise exception 'Past capstone does not exist';
  end if;

  if v_bookmarked then
    insert into public.past_capstone_bookmarks (
      clerk_user_id,
      waterloo_email,
      past_capstone_fk
    )
    values (
      v_clerk_user_id,
      v_waterloo_email,
      v_past_capstone_id
    )
    on conflict (clerk_user_id, past_capstone_fk) do update
      set waterloo_email = excluded.waterloo_email;
  else
    delete from public.past_capstone_bookmarks
    where clerk_user_id = v_clerk_user_id
      and past_capstone_fk = v_past_capstone_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'past_capstone_id', v_past_capstone_id,
      'bookmarked', v_bookmarked
    )
  );
end;
$$;

revoke execute on function public.watmatch_set_past_capstone_bookmark(text, text, bigint, boolean) from public, anon, authenticated;
grant execute on function public.watmatch_set_past_capstone_bookmark(text, text, bigint, boolean) to service_role;

create or replace function public.watmatch_get_bookmarked_past_capstones(
  p_clerk_user_id text,
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default null,
  p_department text default null,
  p_year text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clerk_user_id text := nullif(btrim(coalesce(p_clerk_user_id, '')), '');
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_search_pattern text;
  v_department text := nullif(lower(btrim(coalesce(p_department, ''))), '');
  v_year text := nullif(btrim(coalesce(p_year, '')), '');
  v_offset integer := (v_page - 1) * v_page_size;
  v_total integer := 0;
  v_data jsonb := '[]'::jsonb;
begin
  if v_clerk_user_id is null then
    raise exception 'clerk_user_id is required';
  end if;

  if v_department = 'all' then
    v_department := null;
  end if;

  if lower(coalesce(v_year, '')) = 'all' then
    v_year := null;
  end if;

  if v_search is not null then
    v_search_pattern := '%' || replace(replace(replace(v_search, '!', '!!'), '%', '!%'), '_', '!_') || '%';
  end if;

  with filtered as (
    select p.*, b.created_at as bookmarked_at
    from public.past_capstone_bookmarks b
    join public.past_capstones p
      on p.past_capstone_id = b.past_capstone_fk
    where b.clerk_user_id = v_clerk_user_id
      and (
        v_year is null
        or p.year = v_year
      )
      and (
        v_search is null
        or p.title ilike v_search_pattern escape '!'
        or p.description ilike v_search_pattern escape '!'
      )
      and (
        v_department is null
        or exists (
          select 1
          from unnest(coalesce(p.department, '{}'::text[])) as department(value)
          where lower(btrim(department.value)) = v_department
        )
      )
  ),
  counted as (
    select count(*)::integer as total from filtered
  ),
  paged as (
    select past_capstone_id, title, description, department, year, students, source_fk, created_at
    from filtered
    order by bookmarked_at desc, year desc, created_at desc, past_capstone_id desc
    offset v_offset
    limit v_page_size
  )
  select
    coalesce((select total from counted), 0),
    coalesce((select jsonb_agg(to_jsonb(paged)) from paged), '[]'::jsonb)
  into v_total, v_data;

  return jsonb_build_object(
    'success', true,
    'data', v_data,
    'total', v_total,
    'page', v_page,
    'page_size', v_page_size,
    'total_pages', case when v_page_size > 0 then ceil(v_total::numeric / v_page_size)::integer else 1 end
  );
end;
$$;

revoke execute on function public.watmatch_get_bookmarked_past_capstones(text, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.watmatch_get_bookmarked_past_capstones(text, integer, integer, text, text, text) to service_role;
