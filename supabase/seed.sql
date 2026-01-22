-- =====================================================
-- MonoToDo seed data (demo fixtures)
-- Usage: Run in Supabase SQL Editor (service role) after applying schema.sql.
-- Notes:
--   - Replace the placeholder UUIDs below with real auth.users IDs for your project.
--   - Script truncates MonoToDo tables to make the seed repeatable.
-- =====================================================

-- Replace these with actual auth.users IDs if different
-- (You can copy from the Dashboard > Authentication > Users)
do $$
declare
  v_user_id uuid := '6a8df646-1316-4db2-b74e-49e72e901391';
  v_goal_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_subgoal_plan uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_subgoal_learn uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_loop_tpl uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_task_normal uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_task_done uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_task_loop_instance uuid := 'abababab-abab-abab-abab-abababababab';
begin
  -- Clean existing data (order matters because of FK)
  truncate table public.ai_suggestion_items restart identity cascade;
  truncate table public.ai_suggestion_sessions restart identity cascade;
  truncate table public.task_completion_logs restart identity cascade;
  truncate table public.tasks restart identity cascade;
  truncate table public.loop_task_templates restart identity cascade;
  truncate table public.subgoals restart identity cascade;
  truncate table public.user_settings restart identity cascade;
  truncate table public.goals restart identity cascade;
  truncate table public.user_state restart identity cascade;

  -- Ensure user_state exists
  insert into public.user_state (user_id, goal_generation)
  values (v_user_id, 1)
  on conflict (user_id) do update set goal_generation = excluded.goal_generation;

  -- Goal
  insert into public.goals (
    id, user_id, title,
    completed_normal_task_count, total_completed_loop_task_count,
    current_streak, last_aggregated_date
  )
  values (
    v_goal_id, v_user_id, 'MonoToDo Demo Goal',
    1, 2,
    5, public.monotodo_current_jst_date() - interval '1 day'
  );

  -- User settings (Pomodoro)
  insert into public.user_settings (
    user_id, focus_minutes, short_break_minutes, long_break_minutes, long_break_interval
  )
  values (v_user_id, 25, 5, 15, 4);

  -- Subgoals
  insert into public.subgoals (id, goal_id, user_id, title, sort_key, completion_mode, manual_completed)
  values
    (v_subgoal_plan, v_goal_id, v_user_id, 'Planning / Backlog', 1024, 'auto', false),
    (v_subgoal_learn, v_goal_id, v_user_id, 'Learning / Research', 2048, 'manual', false);

  -- Loop task template (daily habit under Planning)
  insert into public.loop_task_templates (id, subgoal_id, user_id, title, sort_key, is_active)
  values (v_loop_tpl, v_subgoal_plan, v_user_id, 'Daily review + plan', 1024, true);

  -- Tasks (normal + loop instance)
  insert into public.tasks (
    id, subgoal_id, user_id, title, kind, completed, sort_key, completed_at
  )
  values
    (v_task_normal, v_subgoal_plan, v_user_id, 'Write weekly goal outline', 'normal', false, 2048, null),
    (v_task_done, v_subgoal_plan, v_user_id, 'Refine top 3 tasks', 'normal', true, 3072, now());

  -- Loop instance for today from the template
  insert into public.tasks (
    id, subgoal_id, user_id, title, kind, completed, completed_at, sort_key,
    loop_template_id, activity_date
  )
  values (
    v_task_loop_instance, v_subgoal_plan, v_user_id, 'Daily review + plan', 'loop_instance',
    true, now(), 1536,
    v_loop_tpl, public.monotodo_current_jst_date()
  );

  -- Mark manual-complete subgoal example (Learning stays manual=false to show toggle)
  update public.subgoals
     set manual_completed = true, completion_mode = 'manual'
   where id = v_subgoal_learn;
end $$;
