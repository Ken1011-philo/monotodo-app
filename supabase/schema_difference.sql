RPC 追加（例：expectedRevision あり/なし両対応）
create or replace function public.monotodo_update_goal_title(
  p_title text,
  p_expected_revision bigint default null
)
returns public.goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.goals%rowtype;
begin
  if v_user_id is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  -- goal を確実に用意
  perform public.monotodo_get_or_create_goal_id();

  select * into v_goal
    from public.goals
   where user_id = v_user_id
   for update;

  if not found then
    raise exception 'MONOTODO_FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_expected_revision is null then
    update public.goals
       set title = p_title
     where id = v_goal.id and user_id = v_user_id
     returning * into v_goal;

    return v_goal;
  end if;

  update public.goals
     set title = p_title
   where id = v_goal.id
     and user_id = v_user_id
     and revision = p_expected_revision
   returning * into v_goal;

  if not found then
    raise exception 'MONOTODO_CONFLICT' using errcode = 'P0001';
  end if;

  return v_goal;
end;
$$;

grant execute on function public.monotodo_update_goal_title(text, bigint) to authenticated;

--RLS は SELECT のみのままでよい（RPC は security definer + 明示チェックで守る）
--revision/sync_seq の更新は monotodo_touch_row() トリガーが担当するので、RPC 側で revision を増やす必要はありません（WHERE で expectedRevision と突き合わせるだけ）

-- 追加: plan作成系 RPC
create or replace function public.monotodo_create_subgoal(
  p_title text,
  p_sort_key bigint
)
returns public.subgoals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subgoals%rowtype;
begin
  if auth.uid() is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  insert into public.subgoals(title, sort_key)
  values (p_title, p_sort_key)
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.monotodo_create_task(
  p_subgoal_id uuid,
  p_title text,
  p_sort_key bigint
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  insert into public.tasks(subgoal_id, title, sort_key, kind)
  values (p_subgoal_id, p_title, p_sort_key, 'normal')
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.monotodo_create_loop_task_template(
  p_subgoal_id uuid,
  p_title text,
  p_sort_key bigint
)
returns public.loop_task_templates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.loop_task_templates%rowtype;
begin
  if auth.uid() is null then
    raise exception 'MONOTODO_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  insert into public.loop_task_templates(subgoal_id, title, sort_key, is_active)
  values (p_subgoal_id, p_title, p_sort_key, true)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.monotodo_create_subgoal(text, bigint) to authenticated;
grant execute on function public.monotodo_create_task(uuid, text, bigint) to authenticated;
grant execute on function public.monotodo_create_loop_task_template(uuid, text, bigint) to authenticated;
grant execute on function public.monotodo_update_task_title(uuid, text, bigint) to authenticated;
grant execute on function public.monotodo_update_loop_task_template_title(uuid, text, bigint) to authenticated;
grant execute on function public.monotodo_delete_task(uuid, bigint) to authenticated;
grant execute on function public.monotodo_delete_loop_task_template(uuid, bigint) to authenticated;
grant execute on function public.monotodo_update_subgoal_title(uuid, text, bigint) to authenticated;
grant execute on function public.monotodo_move_subgoal(uuid, bigint) to authenticated;
grant execute on function public.monotodo_move_task(uuid, bigint) to authenticated;
grant execute on function public.monotodo_move_loop_task_template(uuid, bigint) to authenticated;
grant execute on function public.monotodo_update_task_completed(uuid, boolean, bigint) to authenticated;
grant execute on function public.monotodo_delete_subgoal(uuid, bigint) to authenticated;
