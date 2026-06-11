-- WatMatch Past Capstones feedback setup.
-- Run this once in the Supabase SQL editor for the database used by this app.

create table if not exists public.past_capstone_feedback (
  feedback_id bigint generated always as identity primary key,
  clerk_user_id text not null,
  waterloo_email text not null,
  feedback_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint past_capstone_feedback_clerk_user_unique unique (clerk_user_id),
  constraint past_capstone_feedback_text_length check (char_length(feedback_text) <= 4000),
  constraint past_capstone_feedback_waterloo_email_check check (lower(waterloo_email) like '%@uwaterloo.ca')
);

create index if not exists idx_past_capstone_feedback_updated_at
  on public.past_capstone_feedback (updated_at desc);

create or replace function public.watmatch_touch_past_capstone_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_past_capstone_feedback_updated_at on public.past_capstone_feedback;

create trigger trg_past_capstone_feedback_updated_at
before update on public.past_capstone_feedback
for each row
execute function public.watmatch_touch_past_capstone_feedback_updated_at();

alter table public.past_capstone_feedback enable row level security;

revoke all on table public.past_capstone_feedback from anon, authenticated;

create or replace function public.watmatch_get_past_capstone_feedback(
  p_clerk_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback public.past_capstone_feedback%rowtype;
begin
  if nullif(btrim(coalesce(p_clerk_user_id, '')), '') is null then
    raise exception 'clerk_user_id is required';
  end if;

  select *
    into v_feedback
  from public.past_capstone_feedback
  where clerk_user_id = p_clerk_user_id
  limit 1;

  if not found then
    return jsonb_build_object(
      'success', true,
      'data', jsonb_build_object(
        'feedback', '',
        'created_at', null,
        'updated_at', null
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'feedback_id', v_feedback.feedback_id,
      'feedback', v_feedback.feedback_text,
      'waterloo_email', v_feedback.waterloo_email,
      'created_at', v_feedback.created_at,
      'updated_at', v_feedback.updated_at
    )
  );
end;
$$;

revoke execute on function public.watmatch_get_past_capstone_feedback(text) from public, anon, authenticated;
grant execute on function public.watmatch_get_past_capstone_feedback(text) to service_role;

create or replace function public.watmatch_upsert_past_capstone_feedback(
  p_clerk_user_id text,
  p_waterloo_email text,
  p_feedback_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clerk_user_id text := nullif(btrim(coalesce(p_clerk_user_id, '')), '');
  v_waterloo_email text := lower(nullif(btrim(coalesce(p_waterloo_email, '')), ''));
  v_feedback_text text := coalesce(p_feedback_text, '');
  v_feedback public.past_capstone_feedback%rowtype;
begin
  if v_clerk_user_id is null then
    raise exception 'clerk_user_id is required';
  end if;

  if v_waterloo_email is null or v_waterloo_email not like '%@uwaterloo.ca' then
    raise exception 'A Waterloo email is required';
  end if;

  if char_length(v_feedback_text) > 4000 then
    raise exception 'Feedback must be 4000 characters or fewer';
  end if;

  insert into public.past_capstone_feedback (
    clerk_user_id,
    waterloo_email,
    feedback_text
  )
  values (
    v_clerk_user_id,
    v_waterloo_email,
    v_feedback_text
  )
  on conflict (clerk_user_id) do update
    set waterloo_email = excluded.waterloo_email,
        feedback_text = excluded.feedback_text
  returning *
  into v_feedback;

  return jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'feedback_id', v_feedback.feedback_id,
      'feedback', v_feedback.feedback_text,
      'waterloo_email', v_feedback.waterloo_email,
      'created_at', v_feedback.created_at,
      'updated_at', v_feedback.updated_at
    )
  );
end;
$$;

revoke execute on function public.watmatch_upsert_past_capstone_feedback(text, text, text) from public, anon, authenticated;
grant execute on function public.watmatch_upsert_past_capstone_feedback(text, text, text) to service_role;
