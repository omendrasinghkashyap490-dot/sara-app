alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text not null default 'image';
update public.posts set media_url = image_url where media_url is null;
alter table public.posts alter column media_url set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'posts_media_type_check') then
    alter table public.posts add constraint posts_media_type_check check (media_type in ('image', 'video'));
  end if;
end $$;

create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posts', 'posts', true, 104857600, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 104857600,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Post images are publicly readable" on storage.objects;
drop policy if exists "Users upload their own post images" on storage.objects;
drop policy if exists "Users update their own post images" on storage.objects;
drop policy if exists "Users delete their own post images" on storage.objects;
drop policy if exists "Post media is publicly readable" on storage.objects;
drop policy if exists "Users upload their own post media" on storage.objects;
drop policy if exists "Users update their own post media" on storage.objects;
drop policy if exists "Users delete their own post media" on storage.objects;
drop policy if exists "Profile photos are publicly readable" on storage.objects;
drop policy if exists "Users upload their own profile photos" on storage.objects;
drop policy if exists "Users update their own profile photos" on storage.objects;
drop policy if exists "Users delete their own profile photos" on storage.objects;

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