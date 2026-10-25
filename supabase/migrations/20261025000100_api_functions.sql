-- API helpers: the FastAPI backend calls Supabase with the signed-in user's JWT,
-- so every statement below runs as that user and RLS still applies (security invoker).

-- Default goals for every new user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone, email, full_name)
  values (new.id, new.phone, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into finance_profiles (user_id) values (new.id);
  insert into gamification_state (user_id) values (new.id);
  insert into goals (user_id, kind, vehicle, vehicle_price, dp_percent, monthly_contribution)
    values (new.id, 'down_payment', 'mobil', 160000000, 25, 1500000);
  insert into goals (user_id, kind, months_cover, monthly_contribution)
    values (new.id, 'emergency', 3, 500000);
  insert into consents (user_id, type, granted) values (new.id, 'terms', true);
  insert into reminder_settings (user_id, kind, enabled, schedule) values
    (new.id, 'deposit', true, 'Setiap hari, pukul 19.00'),
    (new.id, 'budget_review', true, 'Setiap Minggu malam'),
    (new.id, 'data_update', false, 'Setelah gajian');
  insert into notifications (user_id, kind, title, body, deep_link) values
    (new.id, 'welcome', 'Selamat datang di OTO CUAN', 'Isi kondisi keuanganmu untuk melihat sisa aman sampai gajian.', 'setup');
  return new;
end $$;

-- Add an income/expense transaction and update this month's totals atomically
create or replace function public.add_transaction(p_type tx_type, p_amount bigint, p_category text, p_note text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  insert into transactions (user_id, type, category_code, amount, note)
  values (auth.uid(), p_type, case when p_type = 'out' then p_category end, p_amount, p_note);
  if p_type = 'out' then
    insert into category_budgets (user_id, category_code, monthly_amount) values (auth.uid(), p_category, p_amount)
    on conflict (user_id, category_code) do update set monthly_amount = category_budgets.monthly_amount + excluded.monthly_amount;
  elsif p_type = 'in' then
    update finance_profiles set net_income = net_income + p_amount, updated_at = now() where user_id = auth.uid();
  end if;
end $$;

-- Record a goal deposit; when made through Nabung Yuk also store the new latte/streak state
create or replace function public.save_deposit(
  p_kind goal_kind, p_amount bigint, p_note text, p_via_nabung boolean,
  p_latte_total int default null, p_current_streak int default null, p_longest_streak int default null,
  p_last_saving_date date default null, p_rewards text[] default '{}')
returns void language plpgsql security invoker set search_path = public as $$
declare g uuid;
begin
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  update goals set saved_amount = saved_amount + p_amount, updated_at = now()
   where user_id = auth.uid() and kind = p_kind returning id into g;
  if g is null then raise exception 'goal not found'; end if;
  insert into transactions (user_id, type, goal_id, amount, note, via_nabung_yuk)
  values (auth.uid(), 'goal', g, p_amount, p_note, p_via_nabung);
  if p_via_nabung then
    update gamification_state set latte_total = p_latte_total, current_streak = p_current_streak,
      longest_streak = p_longest_streak, last_saving_date = p_last_saving_date, updated_at = now()
     where user_id = auth.uid();
    insert into user_rewards (user_id, reward_code) select auth.uid(), unnest(p_rewards) on conflict do nothing;
    insert into notifications (user_id, kind, title, body, deep_link)
      select auth.uid(), 'reward', 'Hadiah terbuka: ' || r.title, 'Latte kamu sudah cukup. Cek di Progress & Reward.', 'gami_progress'
      from rewards r where r.code = any (p_rewards);
  end if;
end $$;

revoke execute on function public.add_transaction(tx_type, bigint, text, text) from public, anon;
revoke execute on function public.save_deposit(goal_kind, bigint, text, boolean, int, int, int, date, text[]) from public, anon;
grant execute on function public.add_transaction(tx_type, bigint, text, text) to authenticated;
grant execute on function public.save_deposit(goal_kind, bigint, text, boolean, int, int, int, date, text[]) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
