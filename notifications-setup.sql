-- ===== DROP & TOP : ORDER NOTIFICATIONS =====
-- Run this in Supabase > SQL Editor AFTER supabase-setup.sql and AFTER creating the notify-order function.
-- Before running, replace the TWO values below:
--   YOUR-PROJECT         -> your project id (from your Project URL https://YOUR-PROJECT.supabase.co)
--   YOUR-WEBHOOK-SECRET  -> the same long random password you saved as WEBHOOK_SECRET

create extension if not exists pg_net;

-- Private settings table (no website visitor can read it)
create table if not exists private_settings (key text primary key, value text not null);
alter table private_settings enable row level security;
revoke all on private_settings from anon, authenticated;

insert into private_settings (key, value) values
  ('notify_url',    'https://xksdurtenkhjlgbnicbs.supabase.co'),
  ('notify_secret', 'DropTop_Order_2026_X7p9K2')
on conflict (key) do update set value = excluded.value;

-- Sends the new order number to notify-order (email + WhatsApp).
-- The call goes out after the order is fully saved, so all items are included.
create or replace function notify_new_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_url text; v_secret text;
begin
  select value into v_url    from private_settings where key = 'notify_url';
  select value into v_secret from private_settings where key = 'notify_secret';
  if v_url is not null then
    perform net.http_post(
      url     := v_url,
      headers := jsonb_build_object('Content-Type','application/json','x-webhook-secret', v_secret),
      body    := jsonb_build_object('order_id', new.id)
    );
  end if;
  return new;
end $$;

drop trigger if exists on_new_order on orders;
create trigger on_new_order after insert on orders
  for each row execute function notify_new_order();

-- Live updates for the free browser alert in the owner panel
do $$ begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null; end $$;
