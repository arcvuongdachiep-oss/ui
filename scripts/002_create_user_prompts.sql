-- Create user_prompts table for storing prompt history
create table if not exists public.user_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  base_images text[] not null,
  ref_image text not null,
  prompt_en text not null,
  prompt_vi text,
  created_at timestamp with time zone default now()
);

-- Create index for faster queries by user
create index if not exists idx_user_prompts_user_id on public.user_prompts(user_id);
create index if not exists idx_user_prompts_created_at on public.user_prompts(created_at desc);

-- Enable Row Level Security
alter table public.user_prompts enable row level security;

-- RLS Policies: Users can only access their own prompts
create policy "user_prompts_select_own" on public.user_prompts 
  for select using (auth.uid() = user_id);

create policy "user_prompts_insert_own" on public.user_prompts 
  for insert with check (auth.uid() = user_id);

create policy "user_prompts_delete_own" on public.user_prompts 
  for delete using (auth.uid() = user_id);
