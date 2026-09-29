import { useEffect, useRef, useState } from 'react'
import {
  Bell, Bookmark, Camera, Check, ChevronDown, Compass, Heart, Home, ImagePlus,
  LogOut, MessageCircle, MessageSquare, MoreHorizontal, Music2, Plus, Search,
  Send, Settings2, Share2, Smile, Sparkles, UserRound, Users, Video, X,
} from 'lucide-react'
import { supabase } from './lib/supabase'

const photo = (id, width = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`
const getMediaType = (url = '', file = null) => file?.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url) ? 'video' : 'image'
const people = [
  { id: 'amara', username: 'amaralane', full_name: 'Amara Lane', avatar_url: photo('photo-1534528741775-53994a69daeb', 120), bio: 'Collecting little moments ☀️' },
  { id: 'noah', username: 'noahwest', full_name: 'Noah West', avatar_url: photo('photo-1500648767791-00dcc994a43e', 120), bio: 'Somewhere outside.' },
  { id: 'jules', username: 'julesmakes', full_name: 'Jules Park', avatar_url: photo('photo-1531123897727-8f129e1688ce', 120), bio: 'Making things, slowly.' },
  { id: 'leo', username: 'leofieldnotes', full_name: 'Leo Martin', avatar_url: photo('photo-1506794778202-cad84cf45f1d', 120), bio: 'Field notes from everywhere.' },
  { id: 'sana', username: 'sana.ish', full_name: 'Sana Ishikawa', avatar_url: photo('photo-1524504388940-b1c1722653e1', 120), bio: 'Color, light, and good food.' },
]
const initialpost = [
  { id: 'post-1', user_id: 'amara', image_url: photo('photo-1470770841072-f978cf4d019e'), caption: 'Took the long way home. Always take the long way home. 🌿', created_at: '2026-09-28T15:30:00Z', likes: 1284, liked: false, comments: [{ id: 'c1', username: 'noahwest', body: 'I need this view in my life.' }, { id: 'c2', username: 'julesmakes', body: 'the light!!' }] },
  { id: 'post-2', user_id: 'noah', image_url: photo('photo-1490750967868-88aa4486c946'), caption: 'Sunday flowers from the tiny shop around the corner.', created_at: '2026-09-28T12:10:00Z', likes: 942, liked: true, comments: [{ id: 'c3', username: 'sana.ish', body: 'These colors are unreal 💐' }] },
  { id: 'post-3', user_id: 'sana', image_url: photo('photo-1504674900247-0877df9cc836'), caption: 'Lunch is better when you make it a whole thing.', created_at: '2026-09-27T19:45:00Z', likes: 2106, liked: false, comments: [{ id: 'c4', username: 'amaralane', body: 'Recipe please!' }] },
  { id: 'post-4', user_id: 'jules', image_url: photo('photo-1518005020951-eccb494ad742'), caption: 'Found my new favorite corner of the city.', created_at: '2026-09-27T14:20:00Z', likes: 675, liked: false, comments: [] },
]
const storyColors = ['#f2a45c', '#e6746b', '#a279ce', '#4f9994', '#e5bf65']
const demoReels = [
  { id: 'reel-demo-1', user: people[1], video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', caption: 'A slower kind of morning.', liked: false, likes: 2400, comments: [] },
  { id: 'reel-demo-2', user: people[4], video: 'https://media.w3.org/2010/05/sintel/trailer.mp4', caption: 'A little color for your scroll.', liked: false, likes: 1800, comments: [] },
]

function getStored(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function Avatar({ user, size = 'md', ring = false }) {
  const label = user?.username || user?.full_name?.trim() || 'User'
  const initials = label.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
  let hash = 0
  for (const character of String(user?.username || user?.id || 'user')) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const className = `avatar avatar-${size}${ring ? ' avatar-ring' : ''}`
  return user?.avatar_url
    ? <img className={className} src={user.avatar_url} alt={`${label}'s avatar`} />
    : <span className={`${className} avatar-fallback`} style={{ backgroundColor: `hsl(${hash % 360} 32% 84%)` }} aria-label={`${label}'s avatar`}>{initials}</span>
}

function App() {
  const [user, setUser] = useState(() => supabase ? null : getStored('SARA-user', null))
  const [profiles, setProfiles] = useState(supabase ? [] : people)
  const [post, setpost] = useState(() => supabase ? [] : getStored('SARA-post', initialpost))
  const [reels, setReels] = useState(supabase ? [] : demoReels)
  const [follows, setFollows] = useState(() => getStored('SARA-follows', ['noah']))
  const [activeView, setActiveView] = useState('Home')
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [modal, setModal] = useState('')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedLoading, setFeedLoading] = useState(!!supabase)
  const [profileStats, setProfileStats] = useState({})
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [chatUser, setChatUser] = useState(people[1])
  const [messages, setMessages] = useState(() => getStored('SARA-messages', {}))
  const [commentDraft, setCommentDraft] = useState({})
  const [expandedComments, setExpandedComments] = useState({})
  const [editProfile, setEditProfile] = useState({})
  const [profileAvatarFile, setProfileAvatarFile] = useState(null)
  const [profileAvatarPreview, setProfileAvatarPreview] = useState('')
  const [createForm, setCreateForm] = useState({ image_url: '', caption: '' })
  const [imagePreview, setImagePreview] = useState('')
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaType, setMediaType] = useState('image')
  const [authForm, setAuthForm] = useState({ identifier: '', email: '', password: '', username: '', full_name: '', bio: '' })
  const [authAvatarFile, setAuthAvatarFile] = useState(null)
  const [authAvatarPreview, setAuthAvatarPreview] = useState('')
  const [reelIndex, setReelIndex] = useState(0)
  const fileInput = useRef(null)
  const authAvatarInput = useRef(null)
  const profileAvatarInput = useRef(null)
  const objectUrls = useRef([])

  const currentUser = user || { id: 'you', username: 'you', full_name: 'Your name', avatar_url: '', bio: 'Making a little room for wonder.' }
  const allPeople = profiles.some((profile) => profile.id === currentUser.id) ? profiles : [currentUser, ...profiles]
  const discoveryPeople = supabase ? allPeople.filter((profile) => profile.id !== currentUser.id) : people
  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()
  const profileFor = (id) => allPeople.find((profile) => profile.id === id) || people.find((profile) => profile.username === id) || people[0]
  const notify = (message) => { setNotice(message); window.setTimeout(() => setNotice(''), 2600) }

  useEffect(() => {
    localStorage.setItem('SARA-post', JSON.stringify(post.filter((p) => !String(p.media_url || p.image_url || '').startsWith('blob:'))))
  }, [post])
  useEffect(() => { localStorage.setItem('SARA-follows', JSON.stringify(follows)) }, [follows])
  useEffect(() => { localStorage.setItem('SARA-messages', JSON.stringify(messages)) }, [messages])
  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])

  useEffect(() => {
    if (!supabase) return undefined
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive && data.session) syncUser(data.session.user) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) window.setTimeout(() => syncUser(session.user), 0)
      else { setUser(null); localStorage.removeItem('SARA-user') }
    })
    loadRemoteProfiles()
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!supabase) return
    loadRemotepost()
    loadRemoteReels()
    if (user) {
      supabase.from('follows').select('following_id').eq('follower_id', user.id)
        .then(({ data, error }) => { if (!error) setFollows((data || []).map((row) => row.following_id)) })
    }
  }, [user?.id])

  useEffect(() => {
    if (!supabase || !selectedProfile) return
    const profileId = selectedProfile.id
    Promise.all([
      supabase.from('post').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', profileId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', profileId),
    ]).then(([postResult, followerResult, followingResult]) => {
      if (!postResult.error && !followerResult.error && !followingResult.error) {
        setProfileStats((current) => ({ ...current, [profileId]: { post: postResult.count || 0, followers: followerResult.count || 0, following: followingResult.count || 0 } }))
      }
    })
  }, [selectedProfile?.id])

  useEffect(() => {
    if (supabase && profiles.length && (!chatUser || !profiles.some((profile) => profile.id === chatUser.id))) {
      setChatUser(profiles.find((profile) => profile.id !== user?.id) || null)
    }
  }, [profiles, user?.id])

  useEffect(() => {
    if (!supabase || !user || !chatUser) return undefined
    loadConversation(chatUser)
    const channel = supabase.channel(`messages-${user.id}-${chatUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const message = payload.new
        if ([message.sender_id, message.recipient_id].includes(chatUser.id) && [message.sender_id, message.recipient_id].includes(user.id)) {
          setMessages((current) => ({ ...current, [chatUser.id]: current[chatUser.id]?.some((item) => item.id === message.id) ? current[chatUser.id] : [...(current[chatUser.id] || []), message] }))
        }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, chatUser?.id])

  async function syncUser(authUser) {
    const { data } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
    let profile = data || { id: authUser.id, username: authUser.user_metadata?.username || authUser.email?.split('@')[0], full_name: authUser.user_metadata?.full_name || '', avatar_url: authUser.user_metadata?.avatar_url || '', bio: authUser.user_metadata?.bio || '' }
    if (profile.avatar_url?.startsWith('data:')) {
      try {
        profile = await saveAvatar(profile, profile.avatar_url)
      } catch (e) {}
    }
    setUser(profile)
    localStorage.setItem('SARA-user', JSON.stringify(profile))
    setProfiles((current) => [profile, ...current.filter((item) => item.id !== profile.id)])
    return profile
  }

  async function loadRemoteProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(80)
    if (!error) setProfiles((current) => [...(data || []), ...current.filter((profile) => profile.id !== 'you' && !(data || []).some((remote) => remote.id === profile.id))])
  }

  async function loadRemotepost() {
    const { data, error } = await supabase.from('post').select('*').order('created_at', { ascending: false }).limit(40)
    if (error) { setFeedLoading(false); notify('Could not load online post.'); return }
    setpost((data || []).map((p) => {
      const url = p.media_url || p.image_url || ''
      return {
        ...p,
        media_url: url,
        image_url: url,
        media_type: getMediaType(url),
        author: currentUser,
        likes: 0,
        liked: false,
        comments: []
      }
    }))
    setFeedLoading(false)
  }

  async function loadRemoteReels() {
    const { data, error } = await supabase.from('reels').select('*, profiles:user_id(id,username,full_name,avatar_url), reel_likes(user_id), reel_comments(id,user_id,body,created_at,profiles:user_id(username))').order('created_at', { ascending: false }).limit(30)
    if (error) { notify('Could not load Reels.'); return }
    setReels((data || []).map((reel) => ({ id: reel.id, user: reel.profiles, video: reel.video_url, caption: reel.caption, likes: reel.reel_likes?.length || 0, liked: !!user && reel.reel_likes?.some((like) => like.user_id === user.id), comments: (reel.reel_comments || []).map((comment) => ({ ...comment, username: comment.profiles?.username })) })))
  }

  async function loadConversation(otherUser) {
    const { data, error } = await supabase.from('messages').select('*').or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},recipient_id.eq.${user.id})`).order('created_at')
    if (!error) setMessages((current) => ({ ...current, [otherUser.id]: data || [] }))
  }

  async function saveAvatar(profile, source) {
    const file = typeof source === 'string' ? await fetch(source).then((response) => response.blob()) : source
    const extension = file.type.split('/')[1]?.replace('jpeg', 'jpg').replace('quicktime', 'mov') || 'jpg'
    const path = `${profile.id}/avatar-${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: true })
    if (error) throw error
    const avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    const updated = { ...profile, avatar_url: avatarUrl }
    const { error: profileError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
    if (profileError) throw profileError
    setUser(updated)
    localStorage.setItem('SARA-user', JSON.stringify(updated))
    setProfiles((current) => current.map((item) => item.id === updated.id ? updated : item))
    return updated
  }

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setAuthError('')
    try {
      if (!supabase) {
        const username = authMode === 'signup' ? authForm.username.trim().toLowerCase() : authForm.identifier.trim().replace(/^@/, '')
        const demo = { id: 'you', username: username || 'you', full_name: authMode === 'signup' ? authForm.full_name.trim() : 'Your name', avatar_url: authAvatarPreview || '', bio: authMode === 'signup' ? authForm.bio.trim() : '' }
        setUser(demo); setProfiles((current) => [demo, ...current.filter((profile) => profile.id !== demo.id)])
        localStorage.setItem('SARA-user', JSON.stringify(demo)); setModal(''); return
      }

      if (authMode === 'signup') {
        const result = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password,
          options: { data: { username: authForm.username.trim().toLowerCase(), full_name: authForm.full_name.trim(), bio: authForm.bio.trim() } },
        })
        if (result.error) throw result.error
        if (!result.data.session) {
          setAuthError('Check your email to confirm your account. Then log in.')
          return
        }
        let profile = { id: result.data.user.id, username: authForm.username.trim().toLowerCase(), full_name: authForm.full_name.trim(), bio: authForm.bio.trim(), avatar_url: '' }
        await syncUser(result.data.user)
        if (authAvatarFile) {
          try { profile = await saveAvatar(profile, authAvatarFile) } catch (error) {}
        }
        setAuthAvatarFile(null); setAuthAvatarPreview(''); setModal(''); return
      }

      const identifier = authForm.identifier.trim()
      let signedInUser
      if (identifier.includes('@')) {
        const result = await supabase.auth.signInWithPassword({ email: identifier, password: authForm.password })
        if (result.error) throw result.error
        signedInUser = result.data.user
      } else {
        const { data, error } = await supabase.functions.invoke('login-by-username', { body: { username: identifier.replace(/^@/, '').toLowerCase(), password: authForm.password } })
        if (error) throw error
        if (!data?.session?.access_token) throw new Error(data?.error || 'Incorrect username or password.')
        const { error: sessionError } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
        if (sessionError) throw sessionError
        signedInUser = data.session.user
      }
      const profile = signedInUser ? await syncUser(signedInUser) : null
      if (profile && authAvatarFile) {
        try { await saveAvatar(profile, authAvatarFile) } catch (error) {}
      }
      setAuthAvatarFile(null); setAuthAvatarPreview(''); setModal('')
    } catch (error) {
      setAuthError(error.message || 'Unable to authenticate. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setUser(null); localStorage.removeItem('SARA-user'); setActiveView('Home'); notify('You have signed out.')
  }

  async function toggleLike(targetPost) {
    const wasLiked = !!targetPost.liked
    setpost((current) => current.map((item) => item.id === targetPost.id ? { ...item, liked: !wasLiked, likes: Math.max(0, Number(item.likes || 0) + (wasLiked ? -1 : 1)) } : item))
  }

  async function addComment(targetPost) {
    const body = (commentDraft[targetPost.id] || '').trim()
    if (!body) return
    const comment = { id: crypto.randomUUID(), user_id: currentUser.id, username: currentUser.username, body, created_at: new Date().toISOString() }
    setpost((current) => current.map((item) => item.id === targetPost.id ? { ...item, comments: [...(item.comments || []), comment] } : item))
    setCommentDraft((current) => ({ ...current, [targetPost.id]: '' }))
    setExpandedComments((current) => ({ ...current, [targetPost.id]: true }))
  }

  async function publishPost(event) {
    event.preventDefault(); setBusy(true)
    try {
      if (supabase && !user) throw new Error('Log in before sharing a moment.')
      let mediaUrl = createForm.image_url.trim() || imagePreview
      const type = getMediaType(mediaUrl, mediaFile)
      if (supabase && user && mediaFile) {
        const safeName = mediaFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')
        const path = `${user.id}/${Date.now()}-${safeName}`
        const { error: uploadError } = await supabase.storage.from('post').upload(path, mediaFile, { contentType: mediaFile.type, upsert: true })
        if (uploadError) throw new Error(`Media upload failed: ${uploadError.message}`)
        mediaUrl = supabase.storage.from('post').getPublicUrl(path).data.publicUrl
      }
      if (!mediaUrl) throw new Error('Choose an image or video, or paste a media URL.')
      
      if (supabase && user) {
        const { data, error } = await supabase.from('post').insert({ user_id: user.id, media_url: mediaUrl, caption: createForm.caption }).select().single()
        if (error) throw error
        setpost((current) => [{ ...data, author: currentUser, media_url: mediaUrl, image_url: mediaUrl, media_type: type, likes: 0, liked: false, comments: [] }, ...current])
      } else {
        setpost((current) => [{ id: `post-${crypto.randomUUID()}`, user_id: currentUser.id, image_url: mediaUrl, media_url: mediaUrl, media_type: type, caption: createForm.caption, created_at: new Date().toISOString(), likes: 0, liked: false, comments: [] }, ...current])
      }
      setCreateForm({ image_url: '', caption: '' }); setImagePreview(''); setMediaFile(null); setMediaType('image'); setModal(''); setActiveView('Home'); notify('Your moment is out in the world.')
    } catch (error) {
      notify(error.message || 'Could not publish your moment.')
    } finally {
      setBusy(false)
    }
  }

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true)
    try {
      let updated = { ...currentUser, ...editProfile, username: editProfile.username || currentUser.username }
      if (profileAvatarFile) {
        updated = supabase && user
          ? await saveAvatar(updated, profileAvatarFile)
          : { ...updated, avatar_url: profileAvatarPreview }
      }
      if (supabase && user) {
        const { error } = await supabase.from('profiles').update({ username: updated.username, full_name: updated.full_name, bio: updated.bio, avatar_url: updated.avatar_url }).eq('id', user.id)
        if (error) throw error
      }
      setUser(updated); setSelectedProfile(updated); localStorage.setItem('SARA-user', JSON.stringify(updated)); setProfiles((current) => current.map((profile) => profile.id === updated.id ? updated : profile)); setModal(''); notify('Profile updated.')
    } catch (error) {
      notify(`Could not update profile: ${error.message || 'Please try again.'}`)
    } finally {
      setProfileAvatarFile(null); setProfileAvatarPreview(''); setBusy(false)
    }
  }

  async function toggleFollow(profile) {
    const following = follows.includes(profile.id)
    setFollows((current) => following ? current.filter((id) => id !== profile.id) : [...current, profile.id])
  }

  async function toggleReelLike(reel) {
    const wasLiked = !!reel.liked
    setReels((current) => current.map((item) => item.id === reel.id ? { ...item, liked: !wasLiked, likes: Math.max(0, item.likes + (wasLiked ? -1 : 1)) } : item))
  }

  async function addReelComment(reel, body) {
    const comment = { id: crypto.randomUUID(), user_id: currentUser.id, username: currentUser.username, body, created_at: new Date().toISOString() }
    setReels((current) => current.map((item) => item.id === reel.id ? { ...item, comments: [...item.comments, comment] } : item))
  }

  async function sendMessage(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget); const body = String(form.get('message') || '').trim()
    if (!body) return
    const message = { id: crypto.randomUUID(), sender_id: currentUser.id, recipient_id: chatUser.id, body, created_at: new Date().toISOString() }
    setMessages((current) => ({ ...current, [chatUser.id]: [...(current[chatUser.id] || []), message] }))
    event.currentTarget.reset()
  }

  async function sharePost(targetPost) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/?post=${targetPost.id}`)
      notify('Link copied to clipboard.')
    } catch { notify('Sharing is not available.') }
  }

  function goTo(view) {
    if (view === 'Profile' && !user) { setAuthMode('login'); setModal('auth'); return }
    setActiveView(view); setSelectedProfile(view === 'Profile' ? currentUser : null); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function openProfile(profile) {
    if (!user) { setAuthMode('login'); setModal('auth'); return }
    setSelectedProfile(profile); setActiveView('Profile')
  }
  function openCreate() { setCreateForm({ image_url: '', caption: '' }); setImagePreview(''); setMediaFile(null); setMediaType('image'); setModal('create') }

  const navItems = [
    { label: 'Home', icon: Home }, { label: 'Search', icon: Search }, { label: 'Explore', icon: Compass },
    { label: 'Reels', icon: Video }, { label: 'Messages', icon: MessageCircle }, { label: 'Notifications', icon: Heart },
    { label: 'Create', icon: Plus }, { label: 'Profile', icon: UserRound },
  ]

  function navigate(label) {
    if (label === 'Create') { openCreate(); return }
    if (label === 'Notifications') { notify('You are all caught up.'); return }
    if (label === 'Search') { setActiveView('Explore'); setTimeout(() => document.querySelector('.search-input')?.focus(), 0); return }
    goTo(label)
  }

  const matchingProfiles = allPeople.filter((profile) => `${profile.username} ${profile.full_name}`.toLowerCase().includes(search.toLowerCase()))
  const feedpost = post.filter((p) => !search || `${p.caption} ${profileFor(p.user_id).username}`.toLowerCase().includes(search.toLowerCase()))
  const reelItems = reels

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => goTo('Home')}><span className="brand-mark"><Sparkles size={20} /></span><span>SARA</span></button>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeView === label || (label === 'Search' && activeView === 'Explore') ? 'active' : ''}`} onClick={() => navigate(label)}>
            <Icon size={21} strokeWidth={activeView === label ? 2.4 : 1.8} /><span>{label}</span>{label === 'Messages' && <i className="nav-dot" />}
          </button>)}
        </nav>
        <button className="nav-item more-button" onClick={() => notify('Settings are coming soon.')}><Settings2 size={21} /><span>More</span></button>
        <div className="sidebar-user" onClick={() => user ? goTo('Profile') : setModal('auth')} role="button" tabIndex={0}>
          <Avatar user={currentUser} size="sm" /><span><b>{currentUser.username}</b><small>{user ? 'Your profile' : 'Log in or sign up'}</small></span><ChevronDown size={16} />
        </div>
      </aside>

      <main className="main-area">
        <header className="mobile-header"><button className="brand" onClick={() => goTo('Home')}><span className="brand-mark"><Sparkles size={18} /></span><span>SARA</span></button><div className="mobile-header-actions">{!user && <button className="login-link" onClick={() => setModal('auth')}>Log in</button>}<button className="icon-button" onClick={() => navigate('Notifications')} aria-label="Notifications"><Heart size={22} /></button></div></header>
        {activeView === 'Home' && <div className="home-layout">
          <section className="feed-column">
            <div className="stories-strip">
              <button className="story-item" onClick={openCreate}><span className="story-ring add-story"><Avatar user={currentUser} size="story" /><i><Plus size={13} /></i></span><span>Your story</span></button>
              {discoveryPeople.map((person, index) => <button className="story-item" key={person.id} onClick={() => openProfile(person)}><span className="story-ring" style={{ '--story-color': storyColors[index % storyColors.length] }}><Avatar user={person} size="story" /></span><span>{person.username}</span></button>)}
            </div>
            <div className="feed-topline"><div><p className="eyebrow">{todayLabel}</p><h1>Good things, lately<span className="accent-dot">.</span></h1></div><button className="filter-button" onClick={() => notify('You are viewing all recent post.')}><Sparkles size={15} /> For you <ChevronDown size={14} /></button></div>
            {feedLoading && <div className="post-skeletons" aria-label="Loading post">{[0, 1].map((item) => <div className="post-skeleton" key={item}><span /><div /><span /></div>)}</div>}
            {!feedLoading && !post.length && <div className="empty-state"><ImagePlus size={28} /><h3>Your feed is a blank canvas.</h3><p>Follow people or share your first moment.</p><button className="primary-button" onClick={openCreate}>Share a moment</button></div>}
            {feedpost.map((p, index) => <PostCard key={p.id} post={p} author={p.author || profileFor(p.user_id)} index={index} currentUser={currentUser} commentDraft={commentDraft} setCommentDraft={setCommentDraft} expandedComments={expandedComments} setExpandedComments={setExpandedComments} onLike={toggleLike} onComment={addComment} onShare={sharePost} onProfile={openProfile} notify={notify} />)}
          </section>
          <aside className="right-rail">
            <div className="welcome-note"><div className="note-top"><span className="note-icon"><Sparkles size={17} /></span><span>YOUR DAILY PAUSE</span><MoreHorizontal size={18} /></div><p>Good things happen when you pay attention.</p><span className="note-signature">Make room for the little things.</span></div>
            <div className="suggestion-heading"><div><h3>People to know</h3><span>A few lovely corners of SARA</span></div><button onClick={() => goTo('Explore')}>See all</button></div>
            {discoveryPeople.slice(0, 4).map((person, index) => <div className="suggestion-row" key={person.id}><button className="person-link" onClick={() => openProfile(person)}><Avatar user={person} size="sm" /><span><b>{person.username}</b><small>{index % 2 ? 'Suggested for you' : 'A good corner to visit'}</small></span></button><button className={`follow-button ${follows.includes(person.id) ? 'following' : ''}`} onClick={() => toggleFollow(person)}>{follows.includes(person.id) ? 'Following' : 'Follow'}</button></div>)}
            <footer className="rail-footer"><button onClick={() => setModal('auth')}>About</button><span>·</span><button onClick={() => notify('Community guidelines.')}>Guidelines</button><span>·</span><button onClick={() => setModal('auth')}>Privacy</button><p>© 2026 SARA</p></footer>
          </aside>
        </div>}

        {activeView === 'Explore' && <section className="page-content explore-page">
          <div className="page-heading"><div><p className="eyebrow">FIND YOUR PEOPLE</p><h1>Explore<span className="accent-dot">.</span></h1></div><span className="explore-counter">{post.length} moments in the mix</span></div>
          <label className="search-box"><Search size={19} /><input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, places, little things..." /><kbd>⌘ K</kbd></label>
          {search && <div className="search-results"><div className="result-label">PEOPLE <span>{matchingProfiles.length}</span></div>{matchingProfiles.slice(0, 5).map((profile) => <button className="search-person" key={profile.id} onClick={() => openProfile(profile)}><Avatar user={profile} size="sm" /><span><b>{profile.username}</b><small>{profile.full_name}</small></span><ChevronDown size={16} /></button>)}{!matchingProfiles.length && <p className="no-results">No people found.</p>}</div>}
          <div className="explore-grid">{feedpost.map((p, index) => <button className={`explore-tile tile-${index % 7 === 0 ? 'large' : 'normal'}`} key={p.id} onClick={() => { setActiveView('Home'); setSearch('') }}><PostThumbnail post={p} alt={p.caption || 'Community post'} /><span><Heart size={17} fill="currentColor" /> {p.likes || 0} <MessageCircle size={17} fill="currentColor" /> {p.comments?.length || 0}</span></button>)}</div>
        </section>}

        {activeView === 'Profile' && user && <section className="page-content profile-page">
          {(() => {
            const profile = selectedProfile || currentUser
            const ownProfile = profile.id === currentUser.id
            const profilepost = post.filter((p) => p.user_id === profile.id || p.author?.id === profile.id)
            const stats = profileStats[profile.id]
            return <>
              <div className="profile-header"><Avatar user={profile} size="profile" /><div className="profile-details"><div className="profile-title"><h1>{profile.username}</h1>{ownProfile ? <button className="soft-button" onClick={() => { setEditProfile(profile); setProfileAvatarFile(null); setProfileAvatarPreview(''); setModal('edit') }}>Edit profile</button> : <button className={`primary-button ${follows.includes(profile.id) ? 'outline-button' : ''}`} onClick={() => toggleFollow(profile)}>{follows.includes(profile.id) ? 'Following' : 'Follow'}</button>}<button className="icon-button small" onClick={() => { setChatUser(profile); setActiveView('Messages') }} aria-label="Message"><MessageCircle size={19} /></button></div>
                <div className="profile-stats"><span><b>{stats?.post ?? profilepost.length}</b> post</span><span><b>{stats?.followers ?? 84}</b> followers</span><span><b>{stats?.following ?? follows.length}</b> following</span></div>
                <div className="profile-bio"><b>{profile.full_name}</b><p>{profile.bio || 'A little collection of everyday things.'}</p></div>
              </div></div>
              <div className="profile-tabs"><span><ImagePlus size={16} /> post</span></div>
              <div className="profile-grid">{profilepost.map((p) => <button key={p.id} onClick={() => { setActiveView('Home'); setSearch('') }}><PostThumbnail post={p} alt={p.caption || 'Profile post'} /><span><Heart size={18} fill="currentColor" /> {p.likes || 0}</span></button>)}</div>
            </>
          })()}
        </section>}

        {activeView === 'Messages' && <section className="page-content messages-page"><div className="messages-window"><div className="chat-sidebar"><div className="chat-sidebar-head"><div><h2>Messages</h2><span>{currentUser.username}</span></div><button className="icon-button small" onClick={() => notify('Start conversation')} aria-label="New message"><MessageSquare size={19} /></button></div><label className="chat-search"><Search size={16} /><input placeholder="Search messages" /></label><p className="chat-section-label">MESSAGES</p>{discoveryPeople.map((person) => <button key={person.id} className={`chat-person ${chatUser?.id === person.id ? 'selected' : ''}`} onClick={() => setChatUser(person)}><span className="chat-avatar-wrap"><Avatar user={person} size="md" /><i /></span><span><b>{person.username}</b><small>{messages[person.id]?.at(-1)?.body || 'Say hello'}</small></span></button>)}</div>
            <div className="chat-panel">{chatUser ? <><div className="chat-head"><button className="person-link" onClick={() => openProfile(chatUser)}><Avatar user={chatUser} size="sm" /><span><b>{chatUser.username}</b><small>Active now</small></span></button></div><div className="chat-thread"><div className="chat-intro"><Avatar user={chatUser} size="chat-large" /><h3>{chatUser.full_name}</h3><span>@{chatUser.username}</span><button className="soft-button" onClick={() => openProfile(chatUser)}>View profile</button></div>{(messages[chatUser.id] || []).map((message) => <div key={message.id} className={`message-bubble ${message.sender_id === currentUser.id ? 'mine' : ''}`}>{message.body}</div>)}</div><form className="message-compose" onSubmit={sendMessage}><button type="button" className="icon-button small" aria-label="Emoji"><Smile size={20} /></button><input name="message" placeholder="Write a message..." autoComplete="off" /><button className="send-button" type="submit" aria-label="Send message"><Send size={18} /></button></form></> : <div className="chat-empty"><MessageCircle size={40} /><h3>Your messages</h3></div>}</div></div></section>}

        {activeView === 'Reels' && <section className="reels-page"><div className="reels-heading"><div><p className="eyebrow">INSPIRATION</p><h1>Reels<span className="accent-dot">.</span></h1></div></div>{reelItems.length ? <><div className="reels-stage" onScroll={(event) => setReelIndex(Math.min(reelItems.length - 1, Math.round(event.currentTarget.scrollTop / event.currentTarget.clientHeight)))}>{reelItems.map((reel) => <div className="reel-slide" key={reel.id}><ReelCard reel={reel} currentUser={currentUser} notify={notify} onFollow={toggleFollow} following={follows.includes(reel.user.id)} onLike={toggleReelLike} onComment={addReelComment} /></div>)}</div></> : <div className="empty-state"><Video size={28} /><h3>No reels yet.</h3></div>}</section>}
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">{[{ label: 'Home', icon: Home }, { label: 'Explore', icon: Compass }, { label: 'Create', icon: Plus }, { label: 'Reels', icon: Video }, { label: 'Profile', icon: UserRound }].map(({ label, icon: Icon }) => <button key={label} className={activeView === label ? 'active' : ''} onClick={() => navigate(label)} aria-label={label}><Icon size={22} /></button>)}</nav>

      {modal === 'create' && <Modal title="Create a moment" onClose={() => setModal('')}>
        <form className="create-form" onSubmit={publishPost}>
          <div className={`image-drop ${imagePreview ? 'has-image' : ''}`} style={imagePreview && mediaType === 'image' ? { backgroundImage: `url(${imagePreview})` } : {}}>
            <input ref={fileInput} type="file" accept="image/*,video/*" onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const nextType = getMediaType('', file)
              setMediaFile(file); setMediaType(nextType); setCreateForm((current) => ({ ...current, image_url: '' }))
              if (nextType === 'video') {
                const objectUrl = URL.createObjectURL(file)
                objectUrls.current.push(objectUrl)
                setImagePreview(objectUrl)
              } else {
                const reader = new FileReader()
                reader.onload = () => setImagePreview(String(reader.result))
                reader.readAsDataURL(file)
              }
            }} />
            {imagePreview && mediaType === 'video' && <video className="upload-preview" src={imagePreview} muted playsInline controls />}
            <div className="drop-copy"><span className="drop-icon">{mediaType === 'video' ? <Video size={25} /> : <ImagePlus size={25} />}</span><b>{imagePreview ? 'Media selected' : 'Choose photo or video'}</b><button type="button" className="soft-button" onClick={() => fileInput.current?.click()}>Select from device</button></div>
          </div>
          <div className="url-input-wrap"><span>OR ADD URL</span><input value={createForm.image_url} onChange={(event) => { const url = event.target.value; setCreateForm((current) => ({ ...current, image_url: url })); setMediaType(getMediaType(url)); setMediaFile(null); setImagePreview('') }} placeholder="Paste image or video URL" /></div>
          <textarea value={createForm.caption} onChange={(event) => setCreateForm((current) => ({ ...current, caption: event.target.value }))} placeholder="Write a caption..." rows="3" maxLength={2200} />
          <button className="primary-button publish-button" disabled={busy}>{busy ? 'Sharing...' : 'Share moment'} <Send size={16} /></button>
        </form>
      </Modal>}

      {modal === 'edit' && <Modal title="Edit profile" onClose={() => setModal('')}>
        <form className="edit-form" onSubmit={saveProfile}>
          <label>Username<input value={editProfile.username || ''} onChange={(event) => setEditProfile((current) => ({ ...current, username: event.target.value }))} required /></label>
          <label>Name<input value={editProfile.full_name || ''} onChange={(event) => setEditProfile((current) => ({ ...current, full_name: event.target.value }))} /></label>
          <label>Bio<textarea value={editProfile.bio || ''} onChange={(event) => setEditProfile((current) => ({ ...current, bio: event.target.value }))} maxLength={150} rows={3} /></label>
          <div className="profile-avatar-editor">
            <input ref={profileAvatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              if (file.size > 5 * 1024 * 1024) { notify('Profile photos must be 5 MB or smaller.'); return }
              setProfileAvatarFile(file)
              const reader = new FileReader()
              reader.onload = () => setProfileAvatarPreview(String(reader.result))
              reader.readAsDataURL(file)
            }} />
            <Avatar user={{ ...editProfile, avatar_url: profileAvatarPreview || editProfile.avatar_url }} size="md" />
            <button type="button" className="soft-button" onClick={() => profileAvatarInput.current?.click()}>{profileAvatarFile ? 'Choose another photo' : 'Choose profile photo'}</button>
          </div>
          <button className="primary-button publish-button" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
        </form>
      </Modal>}

      {modal === 'auth' && <Modal title={authMode === 'login' ? 'Welcome back' : 'Join SARA'} onClose={() => setModal('')}>
        <form className="auth-form" onSubmit={submitAuth}>
          <div className="auth-mark"><Sparkles size={20} /></div>
          {authMode === 'signup' ? <>
            <label>Username<input value={authForm.username} onChange={(event) => setAuthForm((current) => ({ ...current, username: event.target.value.toLowerCase() }))} placeholder="yourname" required /></label>
            <label>Full name<input value={authForm.full_name} onChange={(event) => setAuthForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Your full name" required /></label>
            <label>Email address<input type="email" value={authForm.email} onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} placeholder="you@example.com" required /></label>
          </> : <label>Username or email<input value={authForm.identifier} onChange={(event) => setAuthForm((current) => ({ ...current, identifier: event.target.value }))} placeholder="username or email" required /></label>}
          <label>Password<input type="password" value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} placeholder="Password" required /></label>
          {authError && <p className="form-error">{authError}</p>}
          <button className="primary-button publish-button" disabled={busy}>{busy ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}</button>
          <button type="button" className="auth-switch" onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError('') }}>{authMode === 'login' ? 'Create an account' : 'Log in'}</button>
        </form>
      </Modal>}
      {user && <button className="logout-button" onClick={signOut}><LogOut size={16} /> Sign out</button>}
      {notice && <div className="toast"><Check size={16} />{notice}</div>}
    </div>
  )
}

function PostThumbnail({ post, alt }) {
  const mediaUrl = post.media_url || post.image_url
  return getMediaType(mediaUrl, post.media_type === 'video' ? { type: 'video/mp4' } : null) === 'video'
    ? <video className="media-thumbnail" src={mediaUrl} muted playsInline preload="metadata" aria-label={alt} />
    : <img className="media-thumbnail" src={mediaUrl} alt={alt} loading="lazy" />
}

function PostMedia({ post, index }) {
  const mediaUrl = post.media_url || post.image_url
  const isVideo = getMediaType(mediaUrl, post.media_type === 'video' ? { type: 'video/mp4' } : null) === 'video'
  return isVideo
    ? <video className="post-image" src={mediaUrl} controls playsInline preload="metadata" aria-label={post.caption || 'Video'} />
    : <img className="post-image" src={mediaUrl} alt={post.caption || 'Photo'} loading={index > 1 ? 'lazy' : 'eager'} />
}

function PostCard({ post, author, index, currentUser, commentDraft, setCommentDraft, expandedComments, setExpandedComments, onLike, onComment, onShare, onProfile, notify }) {
  return <article className="post-card" style={{ '--post-delay': `${Math.min(index, 3) * 70}ms` }}>
    <header className="post-header"><button className="post-author" onClick={() => onProfile(author)}><Avatar user={author} size="sm" ring /><span><b>{author?.username || 'SARA_user'}</b><small>Just now</small></span></button><button className="icon-button small" aria-label="More" onClick={() => notify('Options')}><MoreHorizontal size={21} /></button></header>
    <div className="post-image-wrap"><PostMedia post={post} index={index} /></div>
    <div className="post-actions"><div className="action-group"><button className={`action-icon like-icon ${post.liked ? 'liked' : ''}`} onClick={() => onLike(post)}><Heart size={23} fill={post.liked ? 'currentColor' : 'none'} /></button><button className="action-icon" onClick={() => setExpandedComments((current) => ({ ...current, [post.id]: !current[post.id] }))}><MessageCircle size={22} /></button><button className="action-icon" onClick={() => onShare(post)}><Send size={21} /></button></div><button className="action-icon save-icon" onClick={() => notify('Saved.')}><Bookmark size={21} /></button></div>
    <div className="post-body"><button className="likes-count" onClick={() => notify(`${post.likes || 0} appreciations`)}>{Number(post.likes || 0).toLocaleString()} appreciations</button><p className="post-caption"><b>{author?.username || 'SARA_user'}</b> {post.caption}</p>{post.comments?.length > 0 && <button className="view-comments" onClick={() => setExpandedComments((current) => ({ ...current, [post.id]: !current[post.id] }))}>{expandedComments[post.id] ? 'Hide comments' : `View all ${post.comments.length} comments`}</button>}{expandedComments[post.id] && <div className="comment-list">{post.comments.map((comment) => <p key={comment.id}><b>{comment.username || currentUser.username}</b> {comment.body}</p>)}</div>}<span className="post-time">RECENT</span></div>
    <form className="comment-form" onSubmit={(event) => { event.preventDefault(); onComment(post) }}><input value={commentDraft[post.id] || ''} onChange={(event) => setCommentDraft((current) => ({ ...current, [post.id]: event.target.value }))} placeholder="Leave a kind note..." /><button type="submit" disabled={!(commentDraft[post.id] || '').trim()}>Post</button></form>
  </article>
}

function ReelCard({ reel, currentUser, notify, onFollow, following, onLike, onComment }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comment, setComment] = useState('')
  return <div className="reel-card"><video src={reel.video} autoPlay muted loop playsInline controls={false} poster={photo('photo-1500530855697-b586d89ba3ee', 700)} /><div className="reel-shade" /><div className="reel-video-label"><Music2 size={14} /> ORIGINAL AUDIO</div><div className="reel-caption"><button className="reel-user" onClick={() => onFollow(reel.user)}><Avatar user={reel.user} size="sm" /><b>{reel.user.username}</b></button><p>{reel.caption}</p></div><div className="reel-actions"><button className={reel.liked ? 'liked' : ''} onClick={() => onLike(reel)}><Heart size={25} fill={reel.liked ? 'currentColor' : 'none'} /><small>{Number(reel.likes || 0).toLocaleString()}</small></button><button onClick={() => setCommentsOpen((open) => !open)}><MessageCircle size={24} /><small>{reel.comments?.length || 0}</small></button></div>{commentsOpen && <div className="reel-comments"><div className="reel-comments-head"><b>Comments</b><button onClick={() => setCommentsOpen(false)}><X size={16} /></button></div><div className="reel-comments-list">{reel.comments?.length ? reel.comments.map((item) => <p key={item.id}><b>{item.username || currentUser.username}</b> {item.body}</p>) : <span>No comments yet.</span>}</div><form onSubmit={(event) => { event.preventDefault(); if (comment.trim()) { onComment(reel, comment.trim()); setComment('') } }}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add comment..." /><button disabled={!comment.trim()}>Post</button></form></div>}</div>
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-panel" role="dialog" aria-modal="true" aria-label={title}><header className="modal-header"><h2>{title}</h2><button className="icon-button small" onClick={onClose} aria-label="Close"><X size={20} /></button></header>{children}</section></div>
}

export default App