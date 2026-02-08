'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { setAuthToken, getCommunityFeed, createCommunityPost, addPostComment, togglePostLike } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PostUser {
  id: string | null;
  name: string;
  avatar_url: string | null;
}

interface PostPlace {
  id: string;
  name: string;
  place_type: string;
}

interface PostHike {
  id: string;
  distance_miles: number | null;
  duration_minutes: number | null;
  elevation_gain_feet: number | null;
  status: string;
}

interface PostComment {
  id: string;
  content: string;
  created_at: string;
  user: PostUser;
}

interface SocialPost {
  id: string;
  post_type: string;
  content: string;
  media_urls: string[];
  location: any;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  user: PostUser;
  place: PostPlace | null;
  hike: PostHike | null;
  comments?: PostComment[];
}

const POST_TYPE_ICONS: Record<string, string> = {
  experience: '🥾',
  discovery: '🔍',
  plan: '📋',
  tip: '💡',
  photo: '📸',
};

const POST_TYPE_LABELS: Record<string, string> = {
  experience: 'Experience',
  discovery: 'Discovery',
  plan: 'Plan',
  tip: 'Tip',
  photo: 'Photo',
};

export default function CommunityPage() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Compose state
  const [composeContent, setComposeContent] = useState('');
  const [composeType, setComposeType] = useState('experience');
  const [composeTags, setComposeTags] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }
    if (user && token) {
      setAuthToken(token);
      loadFeed();
    }
  }, [user, isLoading, token]);

  const loadFeed = async (filter?: string | null) => {
    try {
      setLoading(true);
      const response = await getCommunityFeed(30, 0, filter || undefined);
      setPosts(response.data?.posts || []);
    } catch (err) {
      console.error('Failed to load community feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: string | null) => {
    setActiveFilter(filter);
    loadFeed(filter);
  };

  const handleCreatePost = async () => {
    if (!composeContent.trim()) return;
    setCreating(true);
    try {
      const tags = composeTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await createCommunityPost({
        content: composeContent,
        post_type: composeType,
        tags: tags.length > 0 ? tags : undefined,
      });
      setComposeContent('');
      setComposeTags('');
      setShowCompose(false);
      loadFeed(activeFilter);
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('Failed to create post. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await togglePostLike(postId);
      const liked = res.data?.liked;
      const newCount = res.data?.likes_count;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes_count: newCount ?? p.likes_count } : p
        )
      );
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    try {
      await addPostComment(postId, text);
      setCommentTexts((prev) => ({ ...prev, [postId]: '' }));
      // Reload that post's comments count
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
        )
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F6F8F7' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#0F3D2E' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F6F8F7' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text">Community</h1>
              <p className="text-sm text-textSecondary">Share your trail stories</p>
            </div>
            <button
              onClick={() => setShowCompose(!showCompose)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: '#4F8A6B',
                backgroundImage: 'linear-gradient(to bottom, #4F8A6B, #0F3D2E)',
              }}
            >
              ✏️ New Post
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <button
              onClick={() => handleFilterChange(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === null
                  ? 'bg-pineGreen text-white'
                  : 'bg-gray-100 text-textSecondary hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.entries(POST_TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleFilterChange(key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === key
                    ? 'bg-pineGreen text-white'
                    : 'bg-gray-100 text-textSecondary hover:bg-gray-200'
                }`}
              >
                {POST_TYPE_ICONS[key]} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Compose Box */}
        {showCompose && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: '#4F8A6B' }}
              >
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="font-medium text-text">{user.name || 'Hiker'}</div>
                <div className="text-xs text-textSecondary">Sharing with the community</div>
              </div>
            </div>

            {/* Post Type Selector */}
            <div className="flex gap-2 mb-3">
              {Object.entries(POST_TYPE_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setComposeType(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    composeType === key
                      ? 'bg-pineGreen/10 text-pineGreen border border-pineGreen/30'
                      : 'bg-gray-50 text-textSecondary border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {POST_TYPE_ICONS[key]} {label}
                </button>
              ))}
            </div>

            <textarea
              value={composeContent}
              onChange={(e) => setComposeContent(e.target.value)}
              placeholder={
                composeType === 'experience'
                  ? "Share your hiking experience..."
                  : composeType === 'discovery'
                  ? "What did you discover on the trail?"
                  : composeType === 'plan'
                  ? "Share your upcoming hike plans..."
                  : composeType === 'tip'
                  ? "Share a helpful trail tip..."
                  : "Describe your photo..."
              }
              className="w-full p-3 rounded-xl border border-gray-200 text-text bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pineGreen/30 resize-none"
              rows={4}
            />

            <div className="mt-3">
              <input
                type="text"
                value={composeTags}
                onChange={(e) => setComposeTags(e.target.value)}
                placeholder="Tags (comma separated): sunset, wildlife, waterfall"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-text bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pineGreen/30"
              />
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-textSecondary hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!composeContent.trim() || creating}
                className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: '#4F8A6B' }}
              >
                {creating ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3" style={{ borderColor: '#4F8A6B' }}></div>
              <p className="text-sm text-textSecondary">Loading community feed...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏔️</div>
            <h3 className="text-lg font-semibold text-text mb-2">No posts yet</h3>
            <p className="text-textSecondary mb-6">Be the first to share your trail experience!</p>
            <button
              onClick={() => setShowCompose(true)}
              className="px-6 py-3 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
              style={{ backgroundColor: '#4F8A6B' }}
            >
              ✏️ Create First Post
            </button>
          </div>
        )}

        {/* Posts Feed */}
        {!loading &&
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Post Header */}
              <div className="p-4 pb-2">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: '#4F8A6B' }}
                  >
                    {post.user?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text truncate">{post.user?.name || 'Hiker'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-textSecondary flex-shrink-0">
                        {POST_TYPE_ICONS[post.post_type]} {POST_TYPE_LABELS[post.post_type] || post.post_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-textSecondary mt-0.5">
                      <span>{timeAgo(post.created_at)}</span>
                      {post.place && (
                        <>
                          <span>·</span>
                          <Link href={`/places/${post.place.id}`} className="hover:text-pineGreen transition-colors">
                            📍 {post.place.name}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-3">
                <p className="text-text whitespace-pre-wrap leading-relaxed">{post.content}</p>

                {/* Hike Stats */}
                {post.hike && (
                  <div className="mt-3 p-3 rounded-xl bg-gray-50 flex items-center gap-4 text-sm">
                    <span className="text-pineGreen font-medium">🥾 Hike Stats</span>
                    {post.hike.distance_miles && <span>{post.hike.distance_miles.toFixed(1)} mi</span>}
                    {post.hike.elevation_gain_feet && <span>⛰️ {Math.round(post.hike.elevation_gain_feet)} ft</span>}
                    {post.hike.duration_minutes && <span>⏱ {Math.round(post.hike.duration_minutes)} min</span>}
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {post.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: '#4F8A6B15', color: '#4F8A6B' }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Media */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {post.media_urls.slice(0, 4).map((url, i) => (
                      <div key={i} className="rounded-xl overflow-hidden bg-gray-100 aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Bar */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-6">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-1.5 text-sm transition-colors hover:text-red-500"
                  style={{ color: likedPosts.has(post.id) ? '#EF4444' : '#8A9490' }}
                >
                  <span className="text-lg">{likedPosts.has(post.id) ? '❤️' : '🤍'}</span>
                  <span className="font-medium">{post.likes_count}</span>
                </button>

                <button
                  onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 text-sm text-textSecondary transition-colors hover:text-pineGreen"
                >
                  <span className="text-lg">💬</span>
                  <span className="font-medium">{post.comments_count}</span>
                </button>
              </div>

              {/* Comments Section */}
              {expandedPost === post.id && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  {/* Comment Input */}
                  <div className="flex gap-2 pt-3">
                    <input
                      type="text"
                      value={commentTexts[post.id] || ''}
                      onChange={(e) =>
                        setCommentTexts((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleComment(post.id);
                      }}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pineGreen/30"
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      disabled={!commentTexts[post.id]?.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all"
                      style={{ backgroundColor: '#4F8A6B' }}
                    >
                      Post
                    </button>
                  </div>

                  {/* Existing Comments */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: '#8A9490' }}
                          >
                            {comment.user?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="bg-white rounded-xl px-3 py-2 text-sm flex-1 border border-gray-100">
                            <span className="font-medium text-text">{comment.user?.name || 'Hiker'}</span>
                            <span className="text-textSecondary ml-2">{comment.content}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
