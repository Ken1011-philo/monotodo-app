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