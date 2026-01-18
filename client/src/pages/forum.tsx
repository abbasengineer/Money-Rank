import React, { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, isFeatureEnabled } from '@/lib/api';
import { PremiumFeature } from '@/components/PremiumFeature';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, MessageSquare, ThumbsUp, Plus, Edit2, Trash2, Crown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Share2, Twitter, Linkedin, Facebook, Link as LinkIcon, Copy, Check, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';

interface ForumPost {
  id: string;
  title: string;
  content: string;
  contentPreview: string | null;
  author: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  postType: 'blog' | 'daily_thread' | 'custom_thread';
  challengeDateKey?: string;
  isPinned: boolean;
  upvoteCount: number;
  commentCount: number;
  hasUserUpvoted: boolean;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
  hasPro: boolean;
}

interface ForumComment {
  id: string;
  content: string;
  author: {
    id: string;
    displayName: string;
    avatar?: string;
  };
  parentId?: string;
  upvoteCount: number;
  hasUserUpvoted: boolean;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

// API functions
async function getForumPosts(type?: string, sortBy?: string) {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (sortBy) params.append('sortBy', sortBy);
  
  const response = await fetch(`/api/forum/posts?${params}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch posts');
  const data = await response.json();
  return data;
}

async function getForumPost(id: string) {
  const response = await fetch(`/api/forum/posts/${id}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch post');
  return await response.json();
}

async function getDailyThread(dateKey: string) {
  const response = await fetch(`/api/forum/posts/daily/${dateKey}`, { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch daily thread');
  return await response.json();
}

async function getComments(postId: string) {
  const response = await fetch(`/api/forum/comments/${postId}`, { credentials: 'include' });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Pro subscription required to view comments');
    }
    throw new Error('Failed to fetch comments');
  }
  return await response.json();
}

async function createPost(data: { title: string; content: string; postType: string; challengeDateKey?: string }) {
  const response = await fetch('/api/forum/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create post');
  }
  return await response.json();
}

async function createComment(postId: string, content: string, parentId?: string) {
  const response = await fetch('/api/forum/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ postId, content, parentId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create comment');
  }
  return await response.json();
}

async function upvotePost(postId: string) {
  const response = await fetch('/api/forum/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ postId }),
  });
  if (!response.ok) throw new Error('Failed to upvote');
  return await response.json();
}

async function removeVote(postId?: string, commentId?: string) {
  const response = await fetch('/api/forum/votes', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ postId, commentId }),
  });
  if (!response.ok) throw new Error('Failed to remove vote');
  return await response.json();
}

export default function Forum() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'blog' | 'threads'>('blog');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState('');
  // Add state to track expanded blog posts
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  // Track the last posts array we initialized for
  const lastInitializedPostsRef = useRef<string>('');

  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const user = authData?.user;
  
  // Check feature flag for Pro restrictions
  const { data: proRestrictionsEnabled } = useQuery({
    queryKey: ['feature-flag', 'ENABLE_PRO_RESTRICTIONS'],
    queryFn: () => isFeatureEnabled('ENABLE_PRO_RESTRICTIONS'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const isPro = user?.subscriptionTier === 'pro';
  const subscriptionExpiresAt = user?.subscriptionExpiresAt 
    ? new Date(user.subscriptionExpiresAt) 
    : null;
  // If restrictions disabled, grant access to all; otherwise check subscription
  const hasProAccess = proRestrictionsEnabled === false 
    ? true 
    : (isPro && (subscriptionExpiresAt === null || subscriptionExpiresAt > new Date()));

  const { data: blogPostsData, isLoading: blogLoading } = useQuery({
    queryKey: ['forum-posts', 'blog', sortBy],
    queryFn: () => getForumPosts('blog', sortBy),
    enabled: activeTab === 'blog',
  });

  const { data: threadsData, isLoading: threadsLoading } = useQuery({
    queryKey: ['forum-posts', 'daily_thread', sortBy],
    queryFn: () => getForumPosts('daily_thread', sortBy),
    enabled: activeTab === 'threads',
  });

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['forum-comments', selectedPost?.id],
    queryFn: () => selectedPost ? getComments(selectedPost.id) : null,
    enabled: !!selectedPost && hasProAccess,
  });

  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      setShowCreateDialog(false);
      setNewPostTitle('');
      setNewPostContent('');
      toast({
        title: 'Post created',
        description: 'Your post has been published.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) => createComment(postId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', selectedPost?.id] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      setNewComment('');
      toast({
        title: 'Comment posted',
        description: 'Your comment has been added.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const upvoteMutation = useMutation({
    mutationFn: ({ postId, hasUpvoted }: { postId: string; hasUpvoted: boolean }) => 
      hasUpvoted ? removeVote(postId) : upvotePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      if (selectedPost) {
        queryClient.invalidateQueries({ queryKey: ['forum-posts', selectedPost.id] });
      }
    },
  });

  const posts = activeTab === 'blog' 
    ? (blogPostsData?.posts || [])
    : (threadsData?.posts || []);

  // Get featured post (first post) and regular posts
  const featuredPost = activeTab === 'blog' && posts.length > 0 ? posts[0] : null;
  const regularPosts = activeTab === 'blog' && posts.length > 0 ? posts.slice(1) : posts;

  // Initialize expanded posts - expand first blog post by default
  useEffect(() => {
    if (activeTab === 'blog' && posts.length > 0) {
      // Create a key from the posts array to detect when posts actually change
      const postsKey = posts.map(p => p.id).join(',');
      
      // Only reset if posts actually changed (not just user toggling)
      if (lastInitializedPostsRef.current !== postsKey) {
        // Reset and expand only the first post
        setExpandedPostIds(new Set([posts[0].id]));
        lastInitializedPostsRef.current = postsKey;
      }
    } else if (activeTab !== 'blog') {
      // Clear expanded posts when switching away from blog tab
      setExpandedPostIds(new Set());
      lastInitializedPostsRef.current = '';
    }
  }, [activeTab, posts]);

  const togglePostExpanded = (postId: string) => {
    setExpandedPostIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleUpvote = (post: ForumPost) => {
    if (!hasProAccess) {
      toast({
        title: 'Pro Required',
        description: 'Upgrade to Pro to upvote posts and engage with the community!',
      });
      return;
    }
    upvoteMutation.mutate({ postId: post.id, hasUpvoted: post.hasUserUpvoted });
  };

  const handleCreatePost = () => {
    if (!newPostTitle || !newPostContent) {
      toast({
        title: 'Error',
        description: 'Please fill in both title and content',
        variant: 'destructive',
      });
      return;
    }
    createPostMutation.mutate({
      title: newPostTitle,
      content: newPostContent,
      postType: activeTab === 'threads' ? 'custom_thread' : 'custom_thread',
    });
  };

  const handleCreateComment = () => {
    if (!selectedPost || !newComment.trim()) return;
    createCommentMutation.mutate({ postId: selectedPost.id, content: newComment });
  };

  return (
    <Layout>
      <SEO
        title="Forum - MoneyRank"
        description="Join the MoneyRank community! Discuss financial challenges, share insights, and learn from others."
        canonical="/forum"
      />
      
      {/* Hero Section - Featured Post (Blog Tab Only) */}
      {activeTab === 'blog' && featuredPost && !blogLoading && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-b border-emerald-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-block mb-4">
                  <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">
                    Featured Post
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-slate-900 mb-4 leading-tight">
                  {featuredPost.title}
                </h1>
                <p className="text-lg text-slate-600 mb-6 line-clamp-3">
                  {hasProAccess 
                    ? (featuredPost.content.substring(0, 200) + '...')
                    : (featuredPost.contentPreview || featuredPost.content.substring(0, 200) + '...')
                  }
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-medium">{featuredPost.author.displayName}</span>
                    <span>•</span>
                    <span>{format(new Date(featuredPost.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => setSelectedPost(featuredPost)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Read Full Article
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="bg-white rounded-2xl shadow-xl p-8 border border-emerald-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-600 font-bold text-lg">$</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">MoneyRank</p>
                      <p className="text-sm text-slate-500">Financial Insights</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-600">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{featuredPost.upvoteCount} upvotes</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MessageSquare className="w-4 h-4" />
                      <span>{featuredPost.commentCount} comments</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-3">
            {activeTab === 'blog' ? 'Latest Articles' : 'Community Forum'}
          </h1>
          <p className="text-lg text-slate-600">
            {activeTab === 'blog' 
              ? 'Explore financial insights, strategies, and expert perspectives'
              : 'Discuss financial challenges, share insights, and learn from the community'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'blog' | 'threads')}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="blog" className="flex-1 sm:flex-none">Blog Posts</TabsTrigger>
              <TabsTrigger value="threads" className="flex-1 sm:flex-none">Daily Threads</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="most_upvoted">Most Upvoted</SelectItem>
                  <SelectItem value="most_commented">Most Commented</SelectItem>
                </SelectContent>
              </Select>
              
              {hasProAccess && activeTab === 'threads' && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input
                        placeholder="Post title"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                      />
                      <Textarea
                        placeholder="Post content (markdown supported)"
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        rows={10}
                      />
                      <Button 
                        onClick={handleCreatePost}
                        disabled={createPostMutation.isPending}
                        className="w-full"
                      >
                        {createPostMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Post'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <TabsContent value="blog" className="space-y-6">
            {blogLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : regularPosts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <p>No more blog posts. Check back soon!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-2 gap-8">
                {regularPosts.map((post: ForumPost) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    hasProAccess={hasProAccess}
                    onUpvote={() => handleUpvote(post)}
                    onClick={() => setSelectedPost(post)}
                    isExpanded={expandedPostIds.has(post.id)}
                    onToggleExpand={() => togglePostExpanded(post.id)}
                    showCollapse={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="threads" className="space-y-6">
            {threadsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <p>No discussion threads yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid lg:grid-cols-2 gap-8">
                {posts.map((post: ForumPost) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    hasProAccess={hasProAccess}
                    onUpvote={() => handleUpvote(post)}
                    onClick={() => setSelectedPost(post)}
                    isExpanded={true}
                    onToggleExpand={() => {}}
                    showCollapse={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Post Detail Modal */}
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            comments={commentsData?.comments || []}
            hasProAccess={hasProAccess}
            newComment={newComment}
            onCommentChange={setNewComment}
            onCreateComment={handleCreateComment}
            onUpvote={() => handleUpvote(selectedPost)}
            onClose={() => {
              setSelectedPost(null);
              setNewComment('');
            }}
            isLoading={commentsLoading}
            isCreatingComment={createCommentMutation.isPending}
          />
        )}
      </div>
    </Layout>
  );
}

function PostCard({ post, hasProAccess, onUpvote, onClick, isExpanded, onToggleExpand, showCollapse }: {
  post: ForumPost;
  hasProAccess: boolean;
  onUpvote: () => void;
  onClick: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showCollapse: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  
  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);
  
  const isPreview = !hasProAccess && (post.contentPreview !== null || post.postType === 'daily_thread');
  const displayContent = hasProAccess ? post.content : (post.contentPreview || '');
  
  // Truncate content when collapsed (show first 200 characters)
  const truncatedContent = displayContent.length > 200 
    ? displayContent.substring(0, 200).trim() + '...' 
    : displayContent;
  const shouldTruncate = showCollapse && !isExpanded && displayContent.length > 200;

  const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/forum/post/${post.id}` : '';
  const shareText = `${post.title} - MoneyRank`;

  const handleShare = async (platform: 'twitter' | 'linkedin' | 'facebook' | 'copy') => {
    if (!postUrl) return;
    
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        break;
      case 'copy':
        if (navigator.clipboard) {
          navigator.clipboard.writeText(postUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
        break;
    }
    setShowShareMenu(false);
  };

  return (
    <Card 
      className={`hover:shadow-lg transition-all duration-300 border-2 hover:border-emerald-200 h-full flex flex-col ${post.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}`}
      style={{ minHeight: '400px' }}
    >
      <CardHeader className="pb-6 px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {post.isPinned && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">
                  Pinned
                </span>
              )}
              {post.postType === 'blog' && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-semibold">
                  Article
                </span>
              )}
            </div>
            <CardTitle className="text-xl md:text-2xl font-display font-bold mb-3 leading-tight line-clamp-2">
              {post.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-sm">
              <span className="font-medium">{post.author.displayName}</span>
              <span>•</span>
              <span>{format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
            </CardDescription>
          </div>
          {showCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-6 pb-6">
        <div className="flex-1 mb-6 space-y-4">
          {isPreview ? (
              <div className="space-y-6">
              <div className={`text-slate-700 whitespace-pre-wrap text-base leading-relaxed ${shouldTruncate ? 'line-clamp-4' : ''}`}>
                {shouldTruncate ? truncatedContent : displayContent}
              </div>
              <div className="mt-4">
                <PremiumFeature
                  featureName="Full Post Content"
                  description="Upgrade to Pro to read the full post, view comments, and engage with the community!"
                  tier="pro"
                  showUpgrade={true}
                >
                  <div />
                </PremiumFeature>
              </div>
            </div>
          ) : (
            <div className={`text-slate-700 whitespace-pre-wrap text-base leading-relaxed ${shouldTruncate ? 'line-clamp-4' : ''}`}>
              {shouldTruncate ? truncatedContent : displayContent}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpvote();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                post.hasUserUpvoted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${post.hasUserUpvoted ? 'fill-current' : ''}`} />
              <span className="font-medium">{post.upvoteCount}</span>
            </button>
            <div className="flex items-center gap-2 text-slate-600">
              <MessageSquare className="w-4 h-4" />
              <span className="font-medium">{post.commentCount}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showCollapse && !isExpanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                Read More
              </Button>
            )}
            <div className="relative" ref={shareMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              
              {showShareMenu && (
                <div 
                  className="absolute top-full right-0 mt-2 bg-white border rounded-lg shadow-lg p-2 z-50 flex flex-col gap-1 min-w-[160px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('twitter');
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    <Twitter className="w-4 h-4 text-blue-400" />
                    <span>Twitter</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('linkedin');
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    <Linkedin className="w-4 h-4 text-blue-600" />
                    <span>LinkedIn</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('facebook');
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    <Facebook className="w-4 h-4 text-blue-600" />
                    <span>Facebook</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('copy');
                    }}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PostDetailModal({ 
  post, 
  comments, 
  hasProAccess, 
  newComment, 
  onCommentChange, 
  onCreateComment, 
  onUpvote, 
  onClose,
  isLoading,
  isCreatingComment
}: {
  post: ForumPost;
  comments: ForumComment[];
  hasProAccess: boolean;
  newComment: string;
  onCommentChange: (value: string) => void;
  onCreateComment: () => void;
  onUpvote: () => void;
  onClose: () => void;
  isLoading: boolean;
  isCreatingComment: boolean;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="text-sm text-slate-500">
            by {post.author.displayName} • {format(new Date(post.createdAt), 'MMM d, yyyy')}
          </div>
          
          <div className="text-slate-700 whitespace-pre-wrap">
            {hasProAccess ? post.content : (post.contentPreview || '')}
          </div>

          {!hasProAccess && (
            <PremiumFeature
              featureName="Full Post & Comments"
              description="Upgrade to Pro to read the full post, view all comments, and join the discussion!"
              tier="pro"
            >
              <div />
            </PremiumFeature>
          )}

          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              onClick={onUpvote}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                post.hasUserUpvoted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${post.hasUserUpvoted ? 'fill-current' : ''}`} />
              <span>{post.upvoteCount}</span>
            </button>
            <div className="flex items-center gap-2 text-slate-600">
              <MessageSquare className="w-4 h-4" />
              <span>{post.commentCount} comments</span>
            </div>
          </div>

          {hasProAccess && (
            <>
              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-4">Comments</h3>
                
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-slate-500 text-sm">No comments yet. Be the first to comment!</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-medium text-slate-900">{comment.author.displayName}</div>
                          <div className="text-xs text-slate-500">
                            {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap">{comment.content}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <button className="flex items-center gap-1 text-sm text-slate-600">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{comment.upvoteCount}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => onCommentChange(e.target.value)}
                    rows={3}
                    className="mb-2"
                  />
                  <Button
                    onClick={onCreateComment}
                    disabled={!newComment.trim() || isCreatingComment}
                    className="w-full"
                  >
                    {isCreatingComment ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      'Post Comment'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

