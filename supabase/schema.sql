create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default '',
  avatar_url text,
  bio text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  media_url text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  caption text not null default '',
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text not null default 'image';
update public.posts set media_url = image_url where media_url is null;
alter table public.posts alter column media_url set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'posts_media_type_check') then
    alter table public.posts add constraint posts_media_type_check check (media_type in ('image', 'video'));
  end if;
end $$;

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2200),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_url text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.reel_likes (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reel_id, user_id)
);

create table if not exists public.reel_comments (
  id uuid primary key default gen_random_uuid(),
  reel_id uuid not null references public.reels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2200),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_user_id_idx on public.posts (user_id, created_at desc);
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));
create index if not exists comments_post_id_idx on public.comments (post_id, created_at);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);

create or replace function public.create_profile_for_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, bio)
  values (
    new.id,
    lower(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), 'user_' || substr(new.id::text, 1, 8))),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'bio', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.messages enable row level security;
alter table public.reels enable row level security;
alter table public.reel_likes enable row level security;
alter table public.reel_comments enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select using (true);
create policy "Users update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users insert their own profile" on public.profiles for insert with check (auth.uid() = id);

create policy "Posts are publicly readable" on public.posts for select using (true);
create policy "Users create their own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users update their own posts" on public.posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their own posts" on public.posts for delete using (auth.uid() = user_id);

create policy "Likes are publicly readable" on public.likes for select using (true);
create policy "Users manage their own likes" on public.likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Comments are publicly readable" on public.comments for select using (true);
create policy "Users manage their own comments" on public.comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Follows are publicly readable" on public.follows for select using (true);
create policy "Users manage their own follows" on public.follows for all using (auth.uid() = follower_id) with check (auth.uid() = follower_id);
create policy "Messages are visible to participants" on public.messages for select using (auth.uid() in (sender_id, recipient_id));
create policy "Senders create messages" on public.messages for insert with check (auth.uid() = sender_id);
create policy "Reels are publicly readable" on public.reels for select using (true);
create policy "Users manage their own reels" on public.reels for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Reel likes are publicly readable" on public.reel_likes for select using (true);
create policy "Users manage their own reel likes" on public.reel_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Reel comments are publicly readable" on public.reel_comments for select using (true);
create policy "Users manage their own reel comments" on public.reel_comments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 104857600,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Post media is publicly readable" on storage.objects
for select using (bucket_id = 'posts');
create policy "Users upload their own post media" on storage.objects
for insert with check (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update their own post media" on storage.objects
for update using (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete their own post media" on storage.objects
for delete using (bucket_id = 'posts' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Profile photos are publicly readable" on storage.objects
for select using (bucket_id = 'avatars');
create policy "Users upload their own profile photos" on storage.objects
for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update their own profile photos" on storage.objects
for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete their own profile photos" on storage.objects
for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

alter publication supabase_realtime add table public.messages;