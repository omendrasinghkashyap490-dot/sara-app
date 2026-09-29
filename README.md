# sara

A responsive social photo-sharing app built with React, Vite, Tailwind CSS, Lucide, and optional Supabase persistence.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Without Supabase settings, sara opens in local demo mode with sample posts and videos. Demo profile edits, likes, comments, follows, messages, and posts are saved in browser storage. Uploaded demo images are limited to 2 MB and persist locally; uploaded video previews are session-only. Configure Supabase for durable video storage.

## Enable Supabase

1. Create a Supabase project and copy `.env.example` to `.env`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` there; never put the service-role key in the Vite env file.
2. For a new database, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. For a project using the previous sara schema, run [`supabase/migrations/202609290001_auth_media.sql`](supabase/migrations/202609290001_auth_media.sql) instead.
3. Deploy the username-login function from the project root with `supabase functions deploy login-by-username`. The function uses Supabase's `SUPABASE_SERVICE_ROLE_KEY` only server-side to resolve a username; it never returns the account email.
4. Restart Vite and register through sara. Email confirmation behavior follows the Supabase Auth project settings.

Registration saves username, full name, and bio to the profile trigger. Profile photos upload to the public `avatars` bucket after a session is created. When email confirmation is enabled, log in after confirming to complete a pending profile-photo upload.

Posts store a public URL in both the legacy `image_url` and `media_url` columns, plus a `media_type` (`image` or `video`) value. Image/video files upload to the public `posts` bucket. Email login uses Supabase Auth directly; username login requires the deployed Edge Function. Messages use Realtime. Add video rows to `public.reels` with a public `video_url` to populate Reels.

## Build

```powershell
npm.cmd run build
```