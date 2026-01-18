
-- Reset (Optional: Uncomment these lines if you want to wipe existing tables and start fresh)
-- DROP TABLE IF EXISTS public.orders;
-- DROP TABLE IF EXISTS public.products;
-- DROP TABLE IF EXISTS public.customers;
-- DROP TABLE IF EXISTS public.settings;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Products Table
create table if not exists public.products (
  id text primary key,
  name text not null,
  price numeric not null,
  stock numeric not null default 0,
  category text not null,
  description text,
  image text, -- Stores Base64 or URL
  "taxRate" numeric default 0,
  "minStockLevel" numeric default 5,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Orders Table
create table if not exists public.orders (
  id text primary key,
  date timestamp with time zone not null,
  items jsonb not null, -- Stores the array of cart items
  total numeric not null,
  "taxTotal" numeric not null,
  customer jsonb, -- Stores customer snapshot {name, phone, place}
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Customers Table
create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text,
  place text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Settings Table
create table if not exists public.settings (
  id text primary key, -- Usually 'main_details'
  name text,
  address text,
  phone text,
  email text,
  "footerMessage" text,
  logo text,
  "paymentQrCode" text,
  "taxEnabled" boolean default true,
  "defaultTaxRate" numeric default 5,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.customers enable row level security;
alter table public.settings enable row level security;

-- Create policies to allow public read/write (Simplest for this demo, assumes API Key protection)
create policy "Allow public access products" on public.products for all using (true) with check (true);
create policy "Allow public access orders" on public.orders for all using (true) with check (true);
create policy "Allow public access customers" on public.customers for all using (true) with check (true);
create policy "Allow public access settings" on public.settings for all using (true) with check (true);
