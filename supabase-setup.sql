-- Drop & Top Pizza & Fast Foods - Supabase setup
-- Paste ALL of this into Supabase > SQL Editor > New query, then click Run.

drop table if exists order_items, orders, menu_items, admins cascade;

create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table menu_items (
  id serial primary key,
  category text not null,
  name text not null,
  description text default '',
  price int not null,
  price_medium int,
  price_large int,
  price_xl int,
  is_available boolean default true
);

create table orders (
  id serial primary key,
  customer_name text not null,
  phone text not null,
  address text default '',
  order_type text not null default 'Delivery' check (order_type in ('Delivery','Takeaway')),
  notes text default '',
  total int not null,
  status text not null default 'Pending' check (status in ('Pending','Preparing','Ready','Completed','Cancelled')),
  created_at timestamptz default now()
);

create table order_items (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  item_name text not null,
  size text default '',
  price int not null,
  quantity int not null check (quantity > 0)
);

grant select on menu_items to anon, authenticated;
grant insert, update, delete on menu_items to authenticated;
grant usage on sequence menu_items_id_seq to authenticated;
grant select, update on orders, order_items to authenticated;
grant select on admins to authenticated;

alter table admins enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create policy "own admin row" on admins for select to authenticated using (user_id = auth.uid());
create policy "public reads available menu" on menu_items for select using (is_available or is_admin());
create policy "admin adds menu" on menu_items for insert to authenticated with check (is_admin());
create policy "admin edits menu" on menu_items for update to authenticated using (is_admin());
create policy "admin deletes menu" on menu_items for delete to authenticated using (is_admin());
create policy "admin reads orders" on orders for select to authenticated using (is_admin());
create policy "admin updates orders" on orders for update to authenticated using (is_admin());
create policy "admin reads order items" on order_items for select to authenticated using (is_admin());

-- Customers place orders only through this function.
-- It checks every field and takes prices from the menu table (never from the browser).
create or replace function place_order(
  p_name text, p_phone text, p_address text, p_type text, p_notes text, p_items jsonb
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_order int; v_total int := 0; it jsonb; m menu_items; v_price int; v_qty int; v_size text;
begin
  p_name := trim(coalesce(p_name,'')); p_phone := trim(coalesce(p_phone,''));
  p_address := trim(coalesce(p_address,'')); p_notes := trim(coalesce(p_notes,''));
  if length(p_name) < 2 or length(p_name) > 100 then raise exception 'Please enter your name.'; end if;
  if p_phone !~ '^[0-9+\- ]{10,15}$' then raise exception 'Please enter a valid phone number.'; end if;
  if p_type not in ('Delivery','Takeaway') then raise exception 'Invalid order type.'; end if;
  if p_type = 'Delivery' and length(p_address) < 5 then raise exception 'Please enter your delivery address.'; end if;
  if length(p_address) > 255 or length(p_notes) > 255 then raise exception 'Address or notes too long.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then raise exception 'Your cart is empty.'; end if;

  insert into orders (customer_name, phone, address, order_type, notes, total)
  values (p_name, p_phone, case when p_type='Delivery' then p_address else '' end, p_type, p_notes, 0)
  returning id into v_order;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into m from menu_items where id = (it->>'id')::int and is_available;
    if not found then raise exception 'An item in your cart is no longer available.'; end if;
    v_qty := (it->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'Invalid quantity.'; end if;
    v_size := coalesce(it->>'size','');
    if m.price_medium is null then v_size := ''; v_price := m.price;
    else v_price := case v_size when 'Small' then m.price when 'Medium' then m.price_medium
                    when 'Large' then m.price_large when 'X-Large' then m.price_xl end;
      if v_price is null then raise exception 'Please choose a pizza size.'; end if;
    end if;
    insert into order_items (order_id, item_name, size, price, quantity) values (v_order, m.name, v_size, v_price, v_qty);
    v_total := v_total + v_price * v_qty;
  end loop;

  update orders set total = v_total where id = v_order;
  return v_order;
end $$;
revoke all on function place_order from public;
grant execute on function place_order to anon, authenticated;

-- ===== MENU =====
INSERT INTO menu_items (category, name, description, price, price_medium, price_large, price_xl) VALUES
('Pizza','Chicken Tikka','',550,950,1200,1800),
('Pizza','Chicken Fajita','',550,950,1200,1800),
('Pizza','Chicken Tandoori','',550,950,1200,1800),
('Pizza','Chicken Supreme','',550,950,1200,1800),
('Pizza','Chicken Achari','',550,950,1200,1800),
('Pizza','Chicken Lover','',550,850,1200,1800),
('Pizza','Hot-N-Spicy','',550,950,1200,1800),
('Pizza','Margherita','',600,1150,1300,2200),
('Pizza','Seekh Special','',700,1200,1500,2200),
('Pizza','Malai Boti Pizza','',650,1100,1400,2200),
('Pizza','Zinger Pizza','',700,1150,1400,2200),
('Pizza','Mix Grill','',650,1050,1400,2200),
('Special Pizza','Double Cheese','',700,1200,1500,2200),
('Special Pizza','Four Season','',700,1200,1500,2200),
('Special Pizza','Drop & Top Special Pizza','',700,1200,1500,2200),
('Special Pizza','Extra Topping','Add to any pizza',150,200,250,300);

INSERT INTO menu_items (category, name, price) VALUES
('Burgers','Zinger Burger',300),
('Burgers','Chicken Burger',300),
('Burgers','Egg Chicken Burger',250),
('Burgers','Beef Burger',350),
('Burgers','Grill Burger',350);

INSERT INTO menu_items (category, name, price) VALUES
('Shawarma & Paratha','Small Shawarma',150),
('Shawarma & Paratha','Large Shawarma',200),
('Shawarma & Paratha','Zinger Shawarma',300),
('Shawarma & Paratha','Zinger Paratha',300),
('Shawarma & Paratha','Kabab Paratha',300),
('Shawarma & Paratha','Tikka Paratha',300);

INSERT INTO menu_items (category, name, price) VALUES
('Sides & Snacks','Small Fries',250),
('Sides & Snacks','Large Fries',500),
('Sides & Snacks','10 Nuggets',500),
('Sides & Snacks','10 Hot Wings',500),
('Sides & Snacks','10 Hot Shots',500),
('Sides & Snacks','Chicken Chips',500),
('Sides & Snacks','Loaded Fries',500),
('Sides & Snacks','Pizza Fries',600);

INSERT INTO menu_items (category, name, description, price) VALUES
('Pizza Deals','2 Small Pizza Deal','2 Small Pizzas',1000),
('Pizza Deals','3 Small Pizza Deal','3 Small Pizzas + 1 Litre Drink',1600),
('Pizza Deals','6 Small Pizza Deal','6 Small Pizzas + 2 x 1 Litre Drinks',3200),
('Pizza Deals','2 Medium Pizza Deal','2 Medium Pizzas',1700),
('Pizza Deals','3 Medium Pizza Deal','3 Medium Pizzas + 1 Litre Drink',2600),
('Pizza Deals','6 Medium Pizza Deal','6 Medium Pizzas + 2 x 1 Litre Drinks',4800),
('Pizza Deals','2 Large Pizza Deal','2 Large Pizzas',2200),
('Pizza Deals','3 Large Pizza Deal','3 Large Pizzas + 1 Litre Drink',3200),
('Pizza Deals','6 Large Pizza Deal','6 Large Pizzas + 3 x 1 Litre Drinks',6000);

INSERT INTO menu_items (category, name, description, price) VALUES
('Family Deals','Family Deal 1','2 Small Pizza, 3 Zinger Burger, 1 Large Fries, 1.5 Litre Drink Free',2400),
('Family Deals','Family Deal 2','2 Zinger Burger, 3 Large Fries, 10 Hot Wings, 1.5 Litre Drink Free',2500),
('Family Deals','Family Deal 3','2 Medium Pizza, 2 Zinger Burger, 1 Regular Fries, 1.5 Litre Drink Free',2700),
('Family Deals','Family Deal 4','1 Large Pizza, 3 Zinger Burger, 1 Large Fries, 5 Hot Wings, 1.5 Litre Drink Free',2700),
('Family Deals','Family Deal 5','10 Zinger Burger, 1.5 Litre Drink Free',3200),
('Family Deals','Family Deal 6','2 Medium Pizza, 2 Zinger Burger, 3 Large Fries, 5 Hot Wings, 5 Nuggets, 1.5 Litre Drink Free',3500);

INSERT INTO menu_items (category, name, description, price) VALUES
('Regular Deals','Deal 1','1 Chicken Burger, 1 Regular Fries, 1 Regular Drink',600),
('Regular Deals','Deal 2','1 Zinger Burger, 1 Fries, 1 Cold Drink',600),
('Regular Deals','Deal 3','1 Grill Burger, 1 Regular Fries, 1 Regular Drink',600),
('Regular Deals','Deal 4','1 Beef Burger, 1 Regular Fries, 1 Regular Drink',650),
('Regular Deals','Deal 5','1 Double Chicken Cheese Burger, 1 Regular Drink',700),
('Regular Deals','Deal 6','1 Double Grill Cheese Burger, 1 Regular Drink',800),
('Regular Deals','Deal 7','1 Zinger Burger, 1 Chicken Piece, 1 Regular Fries, 1 Regular Drink',850),
('Regular Deals','Deal 8','1 Zinger Burger, 1 Patty Burger, 1 Regular Fries, 2 Regular Drinks',950),
('Regular Deals','Deal 9','1 Small Pizza, 1 Zinger Burger, 5 Nuggets, 1 Regular Drink',1250),
('Regular Deals','Deal 10','1 Pizza Fries, 1 Chicken Fries, 1 Litre Drink',1250),
('Regular Deals','Deal 11','1 Small Pizza, 1 Zinger Burger, 10 Hot Wings, 1 Regular Drink',1450),
('Regular Deals','Deal 12','5 Zinger Shawarma, 1 Litre Drink',1550),
('Regular Deals','Deal 13','1 Medium Pizza, 1 Zinger Burger, 5 Nuggets, 1 Litre Drink',1650),
('Regular Deals','Deal 14','1 Large Pizza, 1 Regular Fries, 1 Litre Drink',1700),
('Regular Deals','Deal 15','5 Zinger Burger, 1 Litre Drink',1800),
('Regular Deals','Deal 16','4 Zinger Burger, 4 Regular Fries, 1.5 Litre Drink Free',1900),
('Regular Deals','Deal 17','1 Medium Pizza, 2 Zinger Burger, 5 Hot Wings, 1 Litre Drink Free',2000),
('Regular Deals','Deal 18','2 Small Pizza, 2 Zinger Burger, 2 Regular Fries, 1 Litre Drink Free',2100),
('Regular Deals','Deal 19','1 Large Pizza, 1 Zinger Burger, 5 Nuggets, 5 Hot Wings, 1 Regular Fries, 1.5 Litre Drink Free',2200),
('Regular Deals','Deal 20','10 Hot Shots, 10 Hot Wings, 10 Nuggets, 1 Large Fries, 1.5 Litre Drink Free',2400);

-- ===== MAKE YOURSELF THE OWNER =====
-- 1) Supabase > Authentication > Users > Add user (your email + a strong password).
-- 2) Then run this line with YOUR email:
-- insert into admins (user_id) select id from auth.users where email = 'owner@example.com';
