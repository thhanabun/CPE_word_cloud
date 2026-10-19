-- Run once in the Supabase SQL Editor. This intentionally stores aggregate
-- phrase counts only; no submission or student identity log is created.

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 1 and 240),
  duty_name text not null default '',
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  is_active boolean not null default true
);

-- Single announcement shown as a popup on the cloud screen; null = none.
alter table public.boards add column if not exists announcement text
  check (char_length(announcement) between 1 and 500);

create unique index if not exists boards_one_active_idx
  on public.boards (is_active) where is_active = true;

create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  normalized_text text not null check (char_length(normalized_text) between 1 and 1024),
  display_text text not null check (char_length(display_text) between 1 and 1024),
  count integer not null default 1 check (count > 0),
  updated_at timestamptz not null default now(),
  unique (board_id, normalized_text)
);

alter table public.boards enable row level security;
alter table public.words enable row level security;

drop policy if exists "public can read active board" on public.boards;
create policy "public can read active board" on public.boards
  for select to anon, authenticated using (is_active = true);

drop policy if exists "public can read words on active board" on public.words;
create policy "public can read words on active board" on public.words
  for select to anon, authenticated using (
    exists (select 1 from public.boards where boards.id = words.board_id and boards.is_active = true)
  );

grant select on public.boards, public.words to anon, authenticated;
revoke insert, update, delete on public.boards, public.words from anon, authenticated;

create or replace function public.submit_word(p_text text, p_normalized text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_id uuid;
begin
  if p_text is null or p_normalized is null
     or char_length(p_text) < 1 or char_length(p_text) > 1024
     or char_length(p_normalized) < 1 or char_length(p_normalized) > 1024 then
    raise exception 'invalid word';
  end if;

  perform pg_advisory_xact_lock(hashtext('word-cloud-active-board'));
  select id into active_id from public.boards where is_active = true for update;
  if active_id is null then raise exception 'no active board'; end if;

  insert into public.words (board_id, display_text, normalized_text, count, updated_at)
  values (active_id, p_text, p_normalized, 1, now())
  on conflict (board_id, normalized_text)
  do update set count = words.count + 1, updated_at = now();
end;
$$;

create or replace function public.reset_board()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_board public.boards%rowtype;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('word-cloud-active-board'));
  select * into current_board from public.boards where is_active = true for update;
  if not found then raise exception 'no active board'; end if;

  update public.boards set is_active = false, archived_at = now() where id = current_board.id;
  insert into public.boards (question, duty_name, is_active)
  values (current_board.question, current_board.duty_name, true)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_word(text, text) from public, anon, authenticated;
revoke all on function public.reset_board() from public, anon, authenticated;
grant execute on function public.submit_word(text, text) to service_role;
grant execute on function public.reset_board() to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'boards'
  ) then
    alter publication supabase_realtime add table public.boards;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'words'
  ) then
    alter publication supabase_realtime add table public.words;
  end if;
end $$;

insert into public.boards (question, duty_name, is_active)
select 'วันนี้มีคำไหนที่อยากแบ่งปันกับเพื่อน ๆ ในห้องอ่านหนังสือ?', 'ผู้ดูแลห้องอ่านหนังสือ', true
where not exists (select 1 from public.boards where is_active = true);
