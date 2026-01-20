-- =====================================================
-- MonoToDo DB DDL (Sync-first v0.3)
-- Target: Supabase PostgreSQL (auth.users / auth.uid())
-- Date: 2026-01-20
-- =====================================================

-- NOTE:
-- - 本DDLは「新規プロジェクト」向け（既存オブジェクトがあると衝突します）
-- - テーブル直DMLは想定しない（RLSでSELECTのみ許可、更新系はRPCで）
-- - sync_seq は「グローバルシーケンス」（仕様どおり）。運用上の懸念がある場合は per-user 化を別途検討。

create extension if not exists "pgcrypto";
set search_path = public;

-- =====================================================
-- 1) ENUM / SEQUENCE
-- =====================================================

do $$ begin
  create type public.subgoal_completion_mode as enum ('auto', 'manual');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.task_kind as enum ('normal', 'loop_instance');
exception when duplicate_object then null;
end $$;

create sequence if not exists public.monotodo_sync_seq
  increment 1
  minvalue 1
  start 1
  cache 100;

create or replace function public.monotodo_next_sync_seq()
returns bigint
language sql
as $$
  select nextval('public.monotodo_sync_seq');
$$;

-- =====================================================
-- 2) COMMON HELPERS (title length / JST date / touch row)
-- =====================================================

create or replace function public.monotodo_check_title_length()
returns trigger
language plpgsql
as $$
begin
  if new.title is not null and char_length(new.title) > 255 then
    raise exception 'MONOTODO_TITLE_TOO_LONG' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.monotodo_current_jst_date()
returns date
language sql
as $$
  select (now() at time zone 'Asia/Tokyo')::date;
$$;

-- touch_row:
-- - INSERT: created_at/updated_at set, revision=0, sync_seq=next
-- - UPDATE: updated_at set, revision++, sync_seq=next
create or replace function public.monotodo_touch_row()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_at is null then new.created_at := now(); end if;
    if new.updated_at is null then new.updated_at := now(); end if;

    if new.revision is null then new.revision := 0; end if;
    -- INSERT時に外部からrevisionを入れない前提。入ってきても0に丸める。
    new.revision := 0;

    if new.sync_seq is null then
      new.sync_seq := public.monotodo_next_sync_seq();
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.revision := coalesce(old.revision, 0) + 1;
    new.sync_seq := public.monotodo_next_sync_seq();
    return new;
  end if;

  return new;
end;
$$;

-- =====================================================
-- 3) TABLES
-- =====================================================

-- -------------------------------------
-- user_state (同期基盤 & reset伝播)
-- -------------------------------------
create table if not exists public.user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,

  goal_generation bigint not null default 1,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create trigger trg_user_state_touch
before insert or update on public.user_state
for each row execute function public.monotodo_touch_row();

-- -------------------------------------
-- goals (1 user = 1 goal)
-- -------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null default '',

  completed_normal_task_count integer not null default 0,
  total_completed_loop_task_count integer not null default 0,
  current_streak integer not null default 0,
  last_aggregated_date date,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create unique index if not exists goals_user_id_unique
  on public.goals(user_id);

create trigger trg_goals_title_length
before insert or update on public.goals
for each row execute function public.monotodo_check_title_length();

create trigger trg_goals_touch
before insert or update on public.goals
for each row execute function public.monotodo_touch_row();

-- -------------------------------------
-- user_settings (Goal reset対象外)
-- -------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,

  focus_minutes integer not null default 25,
  short_break_minutes integer not null default 5,
  long_break_minutes integer not null default 15,
  long_break_interval integer not null default 4,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create trigger trg_user_settings_touch
before insert or update on public.user_settings
for each row execute function public.monotodo_touch_row();

-- -------------------------------------
-- subgoals
-- -------------------------------------
create table if not exists public.subgoals (
  id uuid primary key default gen_random_uuid(),

  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  sort_key bigint not null,

  completion_mode public.subgoal_completion_mode not null default 'auto',
  manual_completed boolean not null default false,
  completed boolean not null default false,

  deleted_at timestamptz,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create index if not exists subgoals_active_list_idx
  on public.subgoals(user_id, sort_key, id)
  where deleted_at is null;

create trigger trg_subgoals_title_length
before insert or update on public.subgoals
for each row execute function public.monotodo_check_title_length();

create trigger trg_subgoals_touch
before insert or update on public.subgoals
for each row execute function public.monotodo_touch_row();

-- -------------------------------------
-- loop_task_templates
-- -------------------------------------
create table if not exists public.loop_task_templates (
  id uuid primary key default gen_random_uuid(),

  subgoal_id uuid not null references public.subgoals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  sort_key bigint not null,

  is_active boolean not null default true,
  deleted_at timestamptz,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create index if not exists loop_templates_active_idx
  on public.loop_task_templates(user_id, subgoal_id, sort_key, id)
  where deleted_at is null and is_active = true;

create trigger trg_loop_templates_title_length
before insert or update on public.loop_task_templates
for each row execute function public.monotodo_check_title_length();

create trigger trg_loop_templates_touch
before insert or update on public.loop_task_templates
for each row execute function public.monotodo_touch_row();

-- -------------------------------------
-- tasks (normal + loop_instance)
-- -------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),

  subgoal_id uuid not null references public.subgoals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,

  kind public.task_kind not null default 'normal',

  completed boolean not null default false,
  completed_at timestamptz,

  sort_key bigint,

  loop_template_id uuid references public.loop_task_templates(id) on delete set null,
  activity_date date,

  deleted_at timestamptz,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint,

  constraint tasks_completed_consistency
    check (
      (completed = true and completed_at is not null)
      or
      (completed = false and completed_at is null)
    ),

  constraint tasks_loop_instance_require_fields
    check (
      (kind = 'loop_instance' and loop_template_id is not null and activity_date is not null)
      or
      (kind = 'normal' and loop_template_id is null and activity_date is null)
    )
);

create unique index if not exists tasks_loop_instance_unique
  on public.tasks(loop_template_id, activity_date)
  where kind = 'loop_instance' and deleted_at is null;

create index if not exists tasks_active_list_idx
  on public.tasks(user_id, subgoal_id, sort_key, id)
  where deleted_at is null and completed = false;

create index if not exists tasks_done_list_idx
  on public.tasks(user_id, completed_at desc, id)
  where deleted_at is null and completed = true;

create index if not exists tasks_sync_idx
  on public.tasks(user_id, sync_seq, id);

create trigger trg_tasks_title_length
before insert or update on public.tasks
for each row execute function public.monotodo_check_title_length();

create trigger trg_tasks_touch
before insert or update on public.tasks
for each row execute function public.monotodo_touch_row();

-- -------------------------------------
-- task_completion_logs (JST日次ログ)
-- -------------------------------------
create table if not exists public.task_completion_logs (
  id bigserial primary key,

  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,

  activity_date date not null,

  had_any_completion boolean not null default false,
  completed_loop_count integer not null default 0,
  completion_counter integer not null default 0,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create unique index if not exists task_completion_logs_user_goal_date_unique
  on public.task_completion_logs(user_id, goal_id, activity_date);

create index if not exists task_completion_logs_sync_idx
  on public.task_completion_logs(user_id, sync_seq, id);

create trigger trg_task_completion_logs_touch
before insert or update on public.task_completion_logs
for each row execute function public.monotodo_touch_row();

-- -------------------------------------
-- AI logs
-- -------------------------------------
create table if not exists public.ai_suggestion_sessions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,

  prompt text not null,
  model text,
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create trigger trg_ai_sessions_touch
before insert or update on public.ai_suggestion_sessions
for each row execute function public.monotodo_touch_row();

create table if not exists public.ai_suggestion_items (
  id uuid primary key default gen_random_uuid(),

  session_id uuid not null references public.ai_suggestion_sessions(id) on delete cascade,

  adopted_subgoal_id uuid references public.subgoals(id) on delete set null,
  adopted_task_id uuid references public.tasks(id) on delete set null,

  content text not null,
  accepted boolean not null default false,

  created_at timestamptz,
  updated_at timestamptz,

  revision bigint,
  sync_seq bigint
);

create trigger trg_ai_items_touch
before insert or update on public.ai_suggestion_items
for each row execute function public.monotodo_touch_row();

-- =====================================================
-- 4) OWNERSHIP / LIMITS / DEFAULT sort_key (TRIGGERS)
-- =====================================================

-- Goal / user_state の存在保証
create or replace function public.monotodo_ensure_user_state()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  insert into public.user_state(user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.monotodo_get_or_create_goal_id()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal_id uuid;
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  perform public.monotodo_ensure_user_state();

  select id into v_goal_id
    from public.goals
   where user_id = v_user_id;

  if v_goal_id is not null then
    return v_goal_id;
  end if;

  -- race-safe: unique(user_id) に任せて "作れなかったら再SELECT"
  insert into public.goals(user_id)
  values (v_user_id)
  on conflict (user_id) do nothing
  returning id into v_goal_id;

  if v_goal_id is null then
    select id into v_goal_id
      from public.goals
     where user_id = v_user_id;
  end if;

  return v_goal_id;
end;
$$;

-- subgoals_before_write:
-- - goal_id null なら goal 自動生成
-- - user_id を goal.user_id に強制
-- - active上限30（deleted_at is null）
-- - sort_key null なら末尾(max+1024)
create or replace function public.monotodo_subgoals_before_write()
returns trigger
language plpgsql
as $$
declare
  v_goal public.goals%rowtype;
  v_cnt integer;
  v_max bigint;
begin
  if tg_op = 'UPDATE' and old.goal_id is distinct from new.goal_id then
    raise exception 'MONOTODO_PARENT_IMMUTABLE' using errcode = 'P0001';
  end if;

  if new.goal_id is null then
    new.goal_id := public.monotodo_get_or_create_goal_id();
  end if;

  -- goal row lock for concurrency control (limit)
  select * into v_goal
    from public.goals
   where id = new.goal_id
   for update;

  if not found then
    raise exception 'MONOTODO_FORBIDDEN' using errcode = 'P0001';
  end if;

  new.user_id := v_goal.user_id;

  if tg_op = 'INSERT' then
    select count(*) into v_cnt
      from public.subgoals
     where goal_id = new.goal_id
       and deleted_at is null;

    if v_cnt >= 30 then
      raise exception 'MONOTODO_SUBGOAL_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  if new.sort_key is null then
    select max(sort_key) into v_max
      from public.subgoals
     where goal_id = new.goal_id
       and deleted_at is null;

    new.sort_key := coalesce(v_max, 0) + 1024;
  end if;

  return new;
end;
$$;

create trigger trg_subgoals_before_write
before insert or update on public.subgoals
for each row execute function public.monotodo_subgoals_before_write();

-- loop_templates_before_write:
-- - user_id 強制
-- - plan items上限30（normal tasks + active templates）
-- - sort_key null なら末尾(max+1024)
create or replace function public.monotodo_loop_templates_before_write()
returns trigger
language plpgsql
as $$
declare
  v_subgoal public.subgoals%rowtype;
  v_cnt integer;
  v_max bigint;
begin
  if tg_op = 'UPDATE' and old.subgoal_id is distinct from new.subgoal_id then
    raise exception 'MONOTODO_PARENT_IMMUTABLE' using errcode = 'P0001';
  end if;

  select * into v_subgoal
    from public.subgoals
   where id = new.subgoal_id
   for update;

  if not found then
    raise exception 'MONOTODO_FORBIDDEN' using errcode = 'P0001';
  end if;

  new.user_id := v_subgoal.user_id;

  -- 上限制約は「挿入」または「active化/復活」に影響する更新時のみ厳密チェック
  if tg_op = 'INSERT'
     or (tg_op = 'UPDATE' and (new.deleted_at is distinct from old.deleted_at or new.is_active is distinct from old.is_active)) then

    select
      (
        select count(*) from public.tasks t
         where t.subgoal_id = new.subgoal_id
           and t.deleted_at is null
           and t.kind = 'normal'
      )
      +
      (
        select count(*) from public.loop_task_templates lt
         where lt.subgoal_id = new.subgoal_id
           and lt.deleted_at is null
           and lt.is_active = true
           and (tg_op <> 'UPDATE' or lt.id <> new.id)
      )
    into v_cnt;

    -- new行自身が active扱いになる場合は +1
    if new.deleted_at is null and new.is_active = true then
      v_cnt := v_cnt + 1;
    end if;

    if v_cnt > 30 then
      raise exception 'MONOTODO_TASK_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  if new.sort_key is null then
    select max(sort_key) into v_max
      from public.loop_task_templates
     where subgoal_id = new.subgoal_id
       and deleted_at is null;

    new.sort_key := coalesce(v_max, 0) + 1024;
  end if;

  return new;
end;
$$;

create trigger trg_loop_templates_before_write
before insert or update on public.loop_task_templates
for each row execute function public.monotodo_loop_templates_before_write();

-- tasks_before_write:
-- - user_id 強制
-- - kind=normal のみ plan items上限30 をチェック（normal tasks + active templates）
-- - kind=loop_instance はテンプレactive/サブゴール未完了などをチェック（推奨）
-- - sort_key null なら末尾(max+1024)（active list用）
create or replace function public.monotodo_tasks_before_write()
returns trigger
language plpgsql
as $$
declare
  v_subgoal public.subgoals%rowtype;
  v_template public.loop_task_templates%rowtype;
  v_cnt integer;
  v_max bigint;
begin
  if tg_op = 'UPDATE' and old.subgoal_id is distinct from new.subgoal_id then
    raise exception 'MONOTODO_PARENT_IMMUTABLE' using errcode = 'P0001';
  end if;

  select * into v_subgoal
    from public.subgoals
   where id = new.subgoal_id
   for update;

  if not found then
    raise exception 'MONOTODO_FORBIDDEN' using errcode = 'P0001';
  end if;

  new.user_id := v_subgoal.user_id;

  -- loop_instance の整合チェック（テンプレ必須/active/削除なし/サブゴール未完了）
  if new.kind = 'loop_instance' then
    select * into v_template
      from public.loop_task_templates
     where id = new.loop_template_id;

    if not found then
      raise exception 'MONOTODO_LOOP_TEMPLATE_NOT_FOUND' using errcode = 'P0001';
    end if;

    if v_template.deleted_at is not null or v_template.is_active = false then
      raise exception 'MONOTODO_LOOP_TEMPLATE_INACTIVE' using errcode = 'P0001';
    end if;

    if v_subgoal.completed = true or v_subgoal.deleted_at is not null then
      raise exception 'MONOTODO_SUBGOAL_CLOSED' using errcode = 'P0001';
    end if;
  end if;

  -- 上限制約：kind=normal の INSERT（および復活に影響する更新）だけチェック
  if new.kind = 'normal' then
    if tg_op = 'INSERT'
       or (tg_op = 'UPDATE' and new.deleted_at is distinct from old.deleted_at) then

      select
        (
          select count(*) from public.tasks t
           where t.subgoal_id = new.subgoal_id
             and t.deleted_at is null
             and t.kind = 'normal'
             and (tg_op <> 'UPDATE' or t.id <> new.id)
        )
        +
        (
          select count(*) from public.loop_task_templates lt
           where lt.subgoal_id = new.subgoal_id
             and lt.deleted_at is null
             and lt.is_active = true
        )
      into v_cnt;

      if new.deleted_at is null then
        v_cnt := v_cnt + 1;
      end if;

      if v_cnt > 30 then
        raise exception 'MONOTODO_TASK_LIMIT' using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- active list用 sort_key のデフォルト（未完了 normal/loop_instance どちらも）
  if new.sort_key is null then
    select max(sort_key) into v_max
      from public.tasks
     where subgoal_id = new.subgoal_id
       and deleted_at is null
       and completed = false;

    new.sort_key := coalesce(v_max, 0) + 1024;
  end if;

  return new;
end;
$$;

create trigger trg_tasks_before_write
before insert or update on public.tasks
for each row execute function public.monotodo_tasks_before_write();

-- =====================================================
-- 5) SUBGOAL COMPLETION (auto/manual) + SIDE EFFECTS
-- =====================================================

-- subgoal.completed を再計算（manual優先、autoは normal tasks のみ）
create or replace function public.monotodo_update_subgoal_completed(p_subgoal_id uuid)
returns void
language plpgsql
as $$
declare
  v_mode public.subgoal_completion_mode;
  v_manual boolean;
  v_total integer;
  v_done integer;
  v_completed boolean;
begin
  select completion_mode, manual_completed into v_mode, v_manual
    from public.subgoals
   where id = p_subgoal_id;

  if not found then
    return;
  end if;

  if v_mode = 'manual' then
    v_completed := v_manual;
  else
    select count(*) into v_total
      from public.tasks
     where subgoal_id = p_subgoal_id
       and deleted_at is null
       and kind = 'normal';

    if v_total = 0 then
      v_completed := false;
    else
      select count(*) into v_done
        from public.tasks
       where subgoal_id = p_subgoal_id
         and deleted_at is null
         and kind = 'normal'
         and completed = true;

      v_completed := (v_done = v_total);
    end if;
  end if;

  update public.subgoals
     set completed = v_completed
   where id = p_subgoal_id;
end;
$$;

-- tasks変更で subgoal.completed 再計算（normal/loop_instance いずれの変更でも呼ぶ）
create or replace function public.monotodo_tasks_after_change()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op in ('INSERT','UPDATE') then
    perform public.monotodo_update_subgoal_completed(new.subgoal_id);
  end if;

  if tg_op = 'UPDATE' and old.subgoal_id is distinct from new.subgoal_id then
    perform public.monotodo_update_subgoal_completed(old.subgoal_id);
  end if;

  if tg_op = 'DELETE' then
    perform public.monotodo_update_subgoal_completed(old.subgoal_id);
  end if;

  return null;
end;
$$;

create trigger trg_tasks_after_change
after insert or update or delete on public.tasks
for each row execute function public.monotodo_tasks_after_change();

-- subgoal completed 遷移時（false->true）の副作用
-- - loop templates 停止
-- - 配下 tasks を全完了（completed_at補完）
create or replace function public.monotodo_on_subgoal_completed()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op = 'UPDATE' and old.completed = false and new.completed = true then
    update public.loop_task_templates
       set is_active = false
     where subgoal_id = new.id
       and deleted_at is null
       and is_active = true;

    update public.tasks
       set completed = true,
           completed_at = coalesce(completed_at, now())
     where subgoal_id = new.id
       and deleted_at is null
       and completed = false;
  end if;

  return null;
end;
$$;

create trigger trg_subgoals_on_completed
after update on public.subgoals
for each row execute function public.monotodo_on_subgoal_completed();

-- loop_template 更新時：未完了 loop_instance へ title/sort_key を反映
create or replace function public.monotodo_on_loop_template_update()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if tg_op = 'UPDATE' and (new.title is distinct from old.title or new.sort_key is distinct from old.sort_key) then
    update public.tasks
       set title = new.title,
           sort_key = new.sort_key
     where kind = 'loop_instance'
       and loop_template_id = new.id
       and deleted_at is null
       and completed = false;
  end if;

  return null;
end;
$$;

create trigger trg_loop_templates_after_update
after update on public.loop_task_templates
for each row execute function public.monotodo_on_loop_template_update();

-- =====================================================
-- 6) RPC (core set)
-- =====================================================

-- (A) 次タスク（Doページ）
create or replace function public.monotodo_select_next_task()
returns table(
  task_id uuid,
  task_title text,
  task_kind public.task_kind,
  subgoal_id uuid,
  subgoal_title text,
  subgoal_sort_key bigint,
  task_sort_key bigint,
  subgoal_progress_percent integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal_id uuid;
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  select id into v_goal_id from public.goals where user_id = v_user_id;
  if v_goal_id is null then
    -- Goalがまだ無いなら空
    return;
  end if;

  return query
  with sg as (
    select s.*
      from public.subgoals s
     where s.user_id = v_user_id
       and s.goal_id = v_goal_id
       and s.deleted_at is null
  ),
  candidate as (
    select
      t.id as task_id,
      t.title as task_title,
      t.kind as task_kind,
      t.sort_key as task_sort_key,
      t.created_at as task_created_at,

      s.id as subgoal_id,
      s.title as subgoal_title,
      s.sort_key as subgoal_sort_key
    from public.tasks t
    join sg s on s.id = t.subgoal_id
    where t.deleted_at is null
      and t.completed = false
  ),
  with_progress as (
    select
      c.*,
      (
        select
          case
            when count(*) filter (where t2.kind = 'normal') = 0 then 0
            else floor(
              100.0
              * count(*) filter (where t2.kind = 'normal' and t2.completed = true)
              / nullif(count(*) filter (where t2.kind = 'normal'), 0)
            )::int
          end
        from public.tasks t2
        where t2.subgoal_id = c.subgoal_id
          and t2.deleted_at is null
      ) as subgoal_progress_percent
    from candidate c
  )
  select
    task_id,
    task_title,
    task_kind,
    subgoal_id,
    subgoal_title,
    subgoal_sort_key,
    task_sort_key,
    coalesce(subgoal_progress_percent, 0)
  from with_progress
  order by subgoal_sort_key asc,
           task_sort_key asc,
           task_created_at asc,
           task_id asc
  limit 1;
end;
$$;

-- (B) タスク完了/解除（optimistic lock: expected_revision）
create or replace function public.monotodo_complete_task(
  p_task_id uuid,
  p_completed boolean,
  p_expected_revision bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_goal_id uuid;
  v_today date := public.monotodo_current_jst_date();
  v_log public.task_completion_logs%rowtype;
  v_delta int;
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  select * into v_task
    from public.tasks
   where id = p_task_id;

  if not found or v_task.user_id <> v_user_id or v_task.deleted_at is not null then
    raise exception 'MONOTODO_FORBIDDEN' using errcode = 'P0001';
  end if;

  -- Goal特定（task -> subgoal -> goal）
  select s.goal_id into v_goal_id
    from public.subgoals s
   where s.id = v_task.subgoal_id;

  if v_goal_id is null then
    raise exception 'MONOTODO_FORBIDDEN' using errcode = 'P0001';
  end if;

  -- 状態変化なしなら何もしない（冪等）
  if v_task.completed = p_completed then
    return;
  end if;

  -- optimistic lock update
  update public.tasks
     set completed = p_completed,
         completed_at = case when p_completed then now() else null end
   where id = p_task_id
     and revision = p_expected_revision;

  if not found then
    raise exception 'MONOTODO_CONFLICT' using errcode = 'P0001';
  end if;

  -- delta
  v_delta := case when p_completed then 1 else -1 end;

  -- normal: goals.completed_normal_task_count を増減（下限0）
  if v_task.kind = 'normal' then
    update public.goals
       set completed_normal_task_count =
         greatest(0, completed_normal_task_count + v_delta)
     where id = v_goal_id
       and user_id = v_user_id;
  end if;

  -- loop_instance: 日次ログに反映（仕様 v0.3 どおり「完了操作日のJST」で更新）
  if v_task.kind = 'loop_instance' then
    insert into public.task_completion_logs(user_id, goal_id, activity_date)
    values (v_user_id, v_goal_id, v_today)
    on conflict (user_id, goal_id, activity_date) do nothing;

    select * into v_log
      from public.task_completion_logs
     where user_id = v_user_id
       and goal_id = v_goal_id
       and activity_date = v_today
     for update;

    v_log.completion_counter := greatest(0, v_log.completion_counter + v_delta);
    v_log.completed_loop_count := greatest(0, v_log.completed_loop_count + v_delta);
    v_log.had_any_completion := (v_log.completion_counter > 0);

    update public.task_completion_logs
       set completion_counter = v_log.completion_counter,
           completed_loop_count = v_log.completed_loop_count,
           had_any_completion = v_log.had_any_completion
     where id = v_log.id;
  end if;

  -- subgoal.completed 再計算（manual優先/autoはnormalのみ）
  perform public.monotodo_update_subgoal_completed(v_task.subgoal_id);
end;
$$;

-- (C) 未集計日を集計（streak / loop累積）
create or replace function public.monotodo_aggregate_missing_days()
returns table(
  streak_changed boolean,
  metrics_changed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.goals%rowtype;
  v_today date := public.monotodo_current_jst_date();
  v_target_end_date date;
  v_from_date date;
  v_d date;
  v_log record;
  v_streak_before integer;
  v_loop_before integer;
  v_streak_after integer;
  v_loop_after integer;
  v_streak_changed boolean := false;
  v_any_changed boolean := false;
begin
  if v_user_id is null then
    streak_changed := false;
    metrics_changed := false;
    return;
  end if;

  select * into v_goal
    from public.goals
   where user_id = v_user_id;

  if not found then
    streak_changed := false;
    metrics_changed := false;
    return;
  end if;

  -- 今日分は確定しない：昨日まで
  v_target_end_date := v_today - 1;

  if v_target_end_date <= coalesce(v_goal.last_aggregated_date, date '0001-01-01') then
    streak_changed := false;
    metrics_changed := false;
    return;
  end if;

  if v_goal.last_aggregated_date is null then
    select min(activity_date)
      into v_from_date
      from public.task_completion_logs
     where user_id = v_user_id
       and goal_id = v_goal.id
       and activity_date <= v_target_end_date;

    if v_from_date is null then
      update public.goals
         set last_aggregated_date = v_target_end_date
       where id = v_goal.id;

      streak_changed := false;
      metrics_changed := false;
      return;
    end if;
  else
    v_from_date := v_goal.last_aggregated_date + 1;
  end if;

  if v_from_date > v_target_end_date then
    streak_changed := false;
    metrics_changed := false;
    return;
  end if;

  v_streak_before := v_goal.current_streak;
  v_loop_before   := v_goal.total_completed_loop_task_count;

  v_streak_after := v_goal.current_streak;
  v_loop_after   := v_goal.total_completed_loop_task_count;

  v_d := v_from_date;
  while v_d <= v_target_end_date loop
    select had_any_completion, completed_loop_count
      into v_log
      from public.task_completion_logs
     where user_id = v_user_id
       and goal_id = v_goal.id
       and activity_date = v_d;

    if not found then
      v_streak_after := 0;
    else
      if v_log.had_any_completion then
        v_streak_after := v_streak_after + 1;
      else
        v_streak_after := 0;
      end if;

      v_loop_after := v_loop_after + coalesce(v_log.completed_loop_count, 0);
    end if;

    v_d := v_d + 1;
  end loop;

  update public.goals
     set current_streak = v_streak_after,
         total_completed_loop_task_count = v_loop_after,
         last_aggregated_date = v_target_end_date
   where id = v_goal.id;

  v_streak_changed := (v_streak_before <> v_streak_after);
  v_any_changed := v_streak_changed or (v_loop_before <> v_loop_after);

  streak_changed := v_streak_changed;
  metrics_changed := v_any_changed;
  return;
end;
$$;

-- (D) ループ日次実体の生成（冪等：UNIQUE(loop_template_id, activity_date)）
create or replace function public.monotodo_rollover_loop_tasks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := public.monotodo_current_jst_date();
  r record;
  v_has_open boolean;
  v_last record;
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  for r in
    select lt.id as template_id,
           lt.subgoal_id,
           lt.title,
           lt.sort_key
      from public.loop_task_templates lt
      join public.subgoals s on s.id = lt.subgoal_id
     where lt.user_id = v_user_id
       and lt.deleted_at is null
       and lt.is_active = true
       and s.deleted_at is null
       and s.completed = false
  loop
    -- 未完了が既にあれば生成しない（持ち越し）
    select exists (
      select 1
        from public.tasks t
       where t.kind = 'loop_instance'
         and t.loop_template_id = r.template_id
         and t.deleted_at is null
         and t.completed = false
    ) into v_has_open;

    if v_has_open then
      continue;
    end if;

    -- 直近実体
    select t.activity_date, t.completed
      into v_last
      from public.tasks t
     where t.kind = 'loop_instance'
       and t.loop_template_id = r.template_id
       and t.deleted_at is null
     order by t.activity_date desc nulls last, t.id desc
     limit 1;

    -- 仕様に合わせつつ実用性のため、初回（実体なし）も今日分を生成する
    if not found then
      insert into public.tasks(
        subgoal_id, user_id, title, kind, completed, completed_at,
        sort_key, loop_template_id, activity_date
      ) values (
        r.subgoal_id, v_user_id, r.title, 'loop_instance', false, null,
        r.sort_key, r.template_id, v_today
      )
      on conflict do nothing;

      continue;
    end if;

    if v_last.completed = true and v_last.activity_date < v_today then
      insert into public.tasks(
        subgoal_id, user_id, title, kind, completed, completed_at,
        sort_key, loop_template_id, activity_date
      ) values (
        r.subgoal_id, v_user_id, r.title, 'loop_instance', false, null,
        r.sort_key, r.template_id, v_today
      )
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- (E) 差分同期
create or replace function public.monotodo_sync(p_after_seq bigint default 0)
returns table(
  sync_seq bigint,
  entity text,
  data jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  return query
  with all_changes as (
    select g.sync_seq, 'goals'::text as entity, to_jsonb(g.*) as data
      from public.goals g
     where g.user_id = v_user_id
       and g.sync_seq > p_after_seq

    union all
    select us.sync_seq, 'user_state', to_jsonb(us.*)
      from public.user_state us
     where us.user_id = v_user_id
       and us.sync_seq > p_after_seq

    union all
    select st.sync_seq, 'user_settings', to_jsonb(st.*)
      from public.user_settings st
     where st.user_id = v_user_id
       and st.sync_seq > p_after_seq

    union all
    select s.sync_seq, 'subgoals', to_jsonb(s.*)
      from public.subgoals s
     where s.user_id = v_user_id
       and s.sync_seq > p_after_seq

    union all
    select lt.sync_seq, 'loop_task_templates', to_jsonb(lt.*)
      from public.loop_task_templates lt
     where lt.user_id = v_user_id
       and lt.sync_seq > p_after_seq

    union all
    select t.sync_seq, 'tasks', to_jsonb(t.*)
      from public.tasks t
     where t.user_id = v_user_id
       and t.sync_seq > p_after_seq

    union all
    select l.sync_seq, 'task_completion_logs', to_jsonb(l.*)
      from public.task_completion_logs l
     where l.user_id = v_user_id
       and l.sync_seq > p_after_seq

    union all
    select ss.sync_seq, 'ai_suggestion_sessions', to_jsonb(ss.*)
      from public.ai_suggestion_sessions ss
     where ss.user_id = v_user_id
       and ss.sync_seq > p_after_seq

    union all
    select si.sync_seq, 'ai_suggestion_items', to_jsonb(si.*)
      from public.ai_suggestion_items si
     where exists (
       select 1
         from public.ai_suggestion_sessions s2
        where s2.id = si.session_id
          and s2.user_id = v_user_id
     )
       and si.sync_seq > p_after_seq
  )
  select ac.sync_seq, ac.entity, ac.data
    from all_changes ac
   order by ac.sync_seq asc, ac.entity asc;
end;
$$;

-- (F) reset_goal: goal_generation++ → goals物理削除（cascade） / user_settings保持
create or replace function public.monotodo_reset_goal()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  perform public.monotodo_ensure_user_state();

  update public.user_state
     set goal_generation = goal_generation + 1
   where user_id = v_user_id;

  delete from public.goals
   where user_id = v_user_id;
end;
$$;

-- =====================================================
-- 7) RLS (SELECTのみ / 書き込みはRPC前提)
-- =====================================================

alter table public.user_state enable row level security;
alter table public.goals enable row level security;
alter table public.user_settings enable row level security;
alter table public.subgoals enable row level security;
alter table public.loop_task_templates enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completion_logs enable row level security;
alter table public.ai_suggestion_sessions enable row level security;
alter table public.ai_suggestion_items enable row level security;

-- base SELECT policies
create policy user_state_select_own on public.user_state
for select using (auth.uid() = user_id);

create policy goals_select_own on public.goals
for select using (auth.uid() = user_id);

create policy user_settings_select_own on public.user_settings
for select using (auth.uid() = user_id);

create policy subgoals_select_own on public.subgoals
for select using (auth.uid() = user_id);

create policy loop_templates_select_own on public.loop_task_templates
for select using (auth.uid() = user_id);

create policy tasks_select_own on public.tasks
for select using (auth.uid() = user_id);

create policy logs_select_own on public.task_completion_logs
for select using (auth.uid() = user_id);

create policy ai_sessions_select_own on public.ai_suggestion_sessions
for select using (auth.uid() = user_id);

create policy ai_items_select_own on public.ai_suggestion_items
for select using (
  exists (
    select 1
      from public.ai_suggestion_sessions s
     where s.id = session_id
       and s.user_id = auth.uid()
  )
);

-- =====================================================
-- 8) GRANTS (authenticated: SELECT + RPC execute)
-- =====================================================

revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke all on all functions in schema public from public;

grant usage on schema public to authenticated;

grant select on public.user_state to authenticated;
grant select on public.goals to authenticated;
grant select on public.user_settings to authenticated;
grant select on public.subgoals to authenticated;
grant select on public.loop_task_templates to authenticated;
grant select on public.tasks to authenticated;
grant select on public.task_completion_logs to authenticated;
grant select on public.ai_suggestion_sessions to authenticated;
grant select on public.ai_suggestion_items to authenticated;

grant usage, select on sequence public.monotodo_sync_seq to authenticated;

grant execute on function public.monotodo_current_jst_date() to authenticated;
grant execute on function public.monotodo_get_or_create_goal_id() to authenticated;
grant execute on function public.monotodo_select_next_task() to authenticated;
grant execute on function public.monotodo_complete_task(uuid, boolean, bigint) to authenticated;
grant execute on function public.monotodo_aggregate_missing_days() to authenticated;
grant execute on function public.monotodo_rollover_loop_tasks() to authenticated;
grant execute on function public.monotodo_sync(bigint) to authenticated;
grant execute on function public.monotodo_reset_goal() to authenticated;

-- =====================================================
-- END
-- =====================================================
