import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layout } from '@/components/layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, isFeatureEnabled } from '@/lib/api';
import { PremiumFeature } from '@/components/PremiumFeature';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, MessageSquare, ThumbsUp, Plus, Edit2, Trash2, Crown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Share2, Twitter, Linkedin, Facebook, Link as LinkIcon, Copy, Check, ArrowRight, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
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
    if (response.status === 401) {
      throw new Error('Authentication required to view comments');
    }
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

async function deleteComment(commentId: string) {
  const response = await fetch(`/api/forum/comments/${commentId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete comment');
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

// Helper function to calculate reading time
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export default function Forum() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  // Removed threads tab - only blog posts now
  const [sortBy, setSortBy] = useState('newest');
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [modalComment, setModalComment] = useState('');
  // Add state to track expanded blog posts (for collapse/expand)
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  // Track which post is fully expanded inline (for reading full article)
  const [inlineExpandedPostId, setInlineExpandedPostId] = useState<string | null>(null);
  // Track the last posts array we initialized for
  const lastInitializedPostsRef = useRef<string>('');
  // Featured post share menu
  const [featuredShareMenuOpen, setFeaturedShareMenuOpen] = useState(false);
  const [featuredCopied, setFeaturedCopied] = useState(false);
  const featuredShareMenuRef = useRef<HTMLDivElement>(null);
  const featuredShareButtonRef = useRef<HTMLButtonElement>(null);
  const [featuredShareMenuPosition, setFeaturedShareMenuPosition] = useState({ top: 0, left: 0 });

  const { data: authData } = useQuery({
    queryKey: ['auth-user'],
    queryFn: getCurrentUser,
  });

  const user = authData?.user;
  const isAuthenticated = authData?.isAuthenticated;
  
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
  });

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['forum-comments', inlineExpandedPostId],
    queryFn: () => inlineExpandedPostId ? getComments(inlineExpandedPostId) : null,
    enabled: !!inlineExpandedPostId && hasProAccess && !!isAuthenticated,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
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

  const posts = blogPostsData?.posts || [];

  // Get featured post (first post) and regular posts
  // If featured post is expanded, include it in regular posts so it can show expanded content
  const featuredPost = posts.length > 0 ? posts[0] : null;
  const isFeaturedExpanded = featuredPost && inlineExpandedPostId === featuredPost.id;
  const regularPosts = posts.length > 0 
    ? (isFeaturedExpanded ? posts : posts.slice(1)) 
    : posts;

  // Initialize expanded posts - expand first blog post by default
  useEffect(() => {
    if (posts.length > 0) {
      // Create a key from the posts array to detect when posts actually change
      const postsKey = posts.map((p: ForumPost) => p.id).join(',');
      
      // Only reset if posts actually changed
      if (lastInitializedPostsRef.current !== postsKey) {
        // Reset and expand only the first post
        setExpandedPostIds(new Set([posts[0].id]));
        lastInitializedPostsRef.current = postsKey;
      }
    }
  }, [posts]);

  // Scroll to featured post when it's expanded
  useEffect(() => {
    if (isFeaturedExpanded && featuredPost) {
      setTimeout(() => {
        const element = document.getElementById(`post-${featuredPost.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    }
  }, [isFeaturedExpanded, featuredPost]);

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
      postType: 'custom_thread',
    });
  };

  const handleCreateComment = (postId: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'Please log in to post comments.',
      });
      setLocation('/?login=true');
      return;
    }
    
    const commentText = newComment[postId] || '';
    if (!commentText.trim()) return;
    createCommentMutation.mutate({ postId, content: commentText });
    setNewComment(prev => ({ ...prev, [postId]: '' }));
  };

  const handleInlineExpand = (post: ForumPost) => {
    if (inlineExpandedPostId === post.id) {
      setInlineExpandedPostId(null);
    } else {
      setInlineExpandedPostId(post.id);
    }
  };

  // Featured post share handler
  const handleFeaturedShare = async (platform: 'twitter' | 'linkedin' | 'facebook' | 'copy') => {
    if (!featuredPost) return;
    
    const postUrl = typeof window !== 'undefined' ? `${window.location.origin}/forum/post/${featuredPost.id}` : '';
    const shareText = `${featuredPost.title} - MoneyRank`;
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
          setFeaturedCopied(true);
          setTimeout(() => setFeaturedCopied(false), 2000);
          toast({ title: 'Link copied!', description: 'Post link copied to clipboard' });
        }
        break;
    }
    setFeaturedShareMenuOpen(false);
  };

  // Calculate and update featured share menu position
  const updateFeaturedShareMenuPosition = () => {
    if (featuredShareButtonRef.current) {
      const buttonRect = featuredShareButtonRef.current.getBoundingClientRect();
      setFeaturedShareMenuPosition({
        top: buttonRect.bottom + window.scrollY + 12, // 12px = mt-3 equivalent
        left: buttonRect.left + window.scrollX, // Align left edge of menu with left edge of button
      });
    }
  };
  
  // Calculate featured share menu position when it opens and on scroll/resize
  useEffect(() => {
    if (featuredShareMenuOpen) {
      updateFeaturedShareMenuPosition();
      
      const handleScroll = () => {
        updateFeaturedShareMenuPosition();
      };
      
      const handleResize = () => {
        updateFeaturedShareMenuPosition();
      };
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [featuredShareMenuOpen]);
  
  // Close featured share menu when clicking outside
  useEffect(() => {
    if (!featuredShareMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        featuredShareMenuRef.current && 
        !featuredShareMenuRef.current.contains(target) &&
        featuredShareButtonRef.current && 
        !featuredShareButtonRef.current.contains(target)
      ) {
        setFeaturedShareMenuOpen(false);
      }
    };

    // Use a small delay to prevent immediate closing when button is clicked
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [featuredShareMenuOpen]);

  return (
    <Layout>
      <SEO
        title="Forum - MoneyRank"
        description="Join the MoneyRank community! Discuss financial challenges, share insights, and learn from others."
        canonical="/forum"
      />
      
      {/* Hero Section - Featured Post - Hide when expanded */}
      {featuredPost && !blogLoading && !isFeaturedExpanded && (
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
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{calculateReadingTime(featuredPost.content)} min read</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => handleInlineExpand(featuredPost)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Read Full Article
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <div className="relative">
                    <Button
                      ref={featuredShareButtonRef}
                      variant="outline"
                      size="lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeaturedShareMenuOpen(!featuredShareMenuOpen);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>Share</span>
                    </Button>
                    
                    {featuredShareMenuOpen && typeof document !== 'undefined' && createPortal(
                      <div 
                        ref={featuredShareMenuRef}
                        className="absolute bg-white border rounded-lg shadow-lg p-3 z-30 flex flex-col gap-2 min-w-[180px]"
                        style={{
                          top: `${featuredShareMenuPosition.top}px`,
                          left: `${featuredShareMenuPosition.left}px`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeaturedShare('twitter');
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                        >
                          <Twitter className="w-5 h-5 text-blue-400" />
                          <span className="font-medium">Twitter</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeaturedShare('linkedin');
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                        >
                          <Linkedin className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">LinkedIn</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeaturedShare('facebook');
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                        >
                          <Facebook className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Facebook</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeaturedShare('copy');
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                        >
                          {featuredCopied ? (
                            <>
                              <Check className="w-5 h-5 text-emerald-600" />
                              <span className="font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <LinkIcon className="w-5 h-5" />
                              <span className="font-medium">Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
                </div>
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
            Financial Insights & Strategies
          </h1>
          <p className="text-lg text-slate-600">
            Explore financial insights, strategies, and expert perspectives
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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
          </div>
        </div>

        <div className="space-y-6">
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
            <div className="space-y-6">
              {regularPosts.map((post: ForumPost, index: number) => (
                <PostCard
                  key={post.id}
                  post={post}
                  hasProAccess={hasProAccess}
                  onUpvote={() => handleUpvote(post)}
                  onInlineExpand={() => {
                    handleInlineExpand(post);
                    // If expanding featured post, scroll to it after a brief delay
                    if (post.id === featuredPost?.id) {
                      setTimeout(() => {
                        const element = document.getElementById(`post-${post.id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                  }}
                  isExpanded={expandedPostIds.has(post.id)}
                  onToggleExpand={() => togglePostExpanded(post.id)}
                  showCollapse={true}
                  isInlineExpanded={inlineExpandedPostId === post.id}
                  comments={inlineExpandedPostId === post.id ? (commentsData?.comments || []) : []}
                  commentsLoading={inlineExpandedPostId === post.id ? commentsLoading : false}
                  newComment={newComment[post.id] || ''}
                  onCommentChange={(value) => setNewComment(prev => ({ ...prev, [post.id]: value }))}
                  onCreateComment={() => handleCreateComment(post.id)}
                  isCreatingComment={createCommentMutation.isPending}
                  isAuthenticated={isAuthenticated}
                  relatedPosts={regularPosts.filter((p: ForumPost, i: number) => i !== index && p.postType === 'blog').slice(0, 3)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Post Detail Modal */}
        {selectedPost && (
          <PostDetailModal
            post={selectedPost}
            comments={commentsData?.comments || []}
            hasProAccess={hasProAccess}
            newComment={modalComment}
            onCommentChange={setModalComment}
            onCreateComment={() => {
              if (selectedPost && modalComment.trim()) {
                createCommentMutation.mutate({ postId: selectedPost.id, content: modalComment });
                setModalComment('');
              }
            }}
            onUpvote={() => handleUpvote(selectedPost)}
            onClose={() => {
              setSelectedPost(null);
              setModalComment('');
            }}
            isLoading={commentsLoading}
            isCreatingComment={createCommentMutation.isPending}
          />
        )}
      </div>
    </Layout>
  );
}

function PostCard({ 
  post, 
  hasProAccess, 
  onUpvote, 
  onInlineExpand, 
  isExpanded, 
  onToggleExpand, 
  showCollapse,
  isInlineExpanded,
  comments,
  commentsLoading,
  newComment,
  onCommentChange,
  onCreateComment,
  isCreatingComment,
  isAuthenticated,
  relatedPosts
}: {
  post: ForumPost;
  hasProAccess: boolean;
  onUpvote: () => void;
  onInlineExpand: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showCollapse: boolean;
  isInlineExpanded?: boolean;
  comments?: ForumComment[];
  commentsLoading?: boolean;
  newComment?: string;
  onCommentChange?: (value: string) => void;
  onCreateComment?: () => void;
  isCreatingComment?: boolean;
  isAuthenticated?: boolean;
  relatedPosts?: ForumPost[];
}) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [shareMenuPosition, setShareMenuPosition] = useState({ top: 0, left: 0 });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Calculate and update share menu position
  const updateShareMenuPosition = () => {
    if (shareButtonRef.current) {
      const buttonRect = shareButtonRef.current.getBoundingClientRect();
      setShareMenuPosition({
        top: buttonRect.bottom + window.scrollY + 12, // 12px = mt-3 equivalent
        left: buttonRect.right + window.scrollX - 180, // Align right edge of menu with right edge of button (180px = min-w-[180px])
      });
    }
  };
  
  // Calculate share menu position when it opens and on scroll/resize
  useEffect(() => {
    if (showShareMenu) {
      updateShareMenuPosition();
      
      const handleScroll = () => {
        updateShareMenuPosition();
      };
      
      const handleResize = () => {
        updateShareMenuPosition();
      };
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showShareMenu]);
  
  // Close share menu when clicking outside
  useEffect(() => {
    if (!showShareMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        shareMenuRef.current && 
        !shareMenuRef.current.contains(target) &&
        shareButtonRef.current && 
        !shareButtonRef.current.contains(target)
      ) {
        setShowShareMenu(false);
      }
    };

    // Use a small delay to prevent immediate closing when button is clicked
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);
  
  const isPreview = !hasProAccess && (post.contentPreview !== null || post.postType === 'daily_thread');
  const displayContent = hasProAccess ? post.content : (post.contentPreview || '');
  const fullContent = hasProAccess ? post.content : '';
  const readingTime = calculateReadingTime(fullContent || displayContent);
  
  // Truncate content when collapsed (show first 200 characters)
  const truncatedContent = displayContent.length > 200 
    ? displayContent.substring(0, 200).trim() + '...' 
    : displayContent;
  const shouldTruncate = showCollapse && !isExpanded && !isInlineExpanded && displayContent.length > 200;

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
    <>
    <Card 
      id={`post-${post.id}`}
      className={`hover:shadow-lg transition-all duration-300 border-2 hover:border-emerald-200 h-full flex flex-col overflow-hidden ${post.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}`}
    >
      <CardHeader className="pb-6 px-8 pt-8">
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
            <CardTitle className="text-2xl md:text-3xl font-display font-bold mb-4 leading-tight line-clamp-2">
              {post.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-base flex-wrap">
              <span className="font-medium">{post.author.displayName}</span>
              <span>•</span>
              <span>{format(new Date(post.createdAt), 'MMM d, yyyy')}</span>
              {post.postType === 'blog' && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>{readingTime} min read</span>
                  </div>
                </>
              )}
            </CardDescription>
          </div>
          {showCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                // If inline expanded, collapse that first; otherwise toggle regular expand
                if (isInlineExpanded) {
                  onInlineExpand();
                } else {
                  onToggleExpand();
                }
              }}
              className="shrink-0"
            >
              {(isExpanded || isInlineExpanded) ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-8 pb-8 min-h-0">
        {/* Original truncated content - hide when inline expanded */}
        {!isInlineExpanded && (
          <div className="flex-1 flex flex-col mb-8 min-h-0">
            {isPreview ? (
              <div className="flex flex-col space-y-6 flex-1 min-h-0">
                <div className={`text-slate-700 whitespace-pre-wrap text-lg leading-relaxed flex-shrink-0 ${shouldTruncate ? 'line-clamp-4' : ''}`}>
                  {shouldTruncate ? truncatedContent : displayContent}
                </div>
                <div className="w-full flex-shrink-0">
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
              <div className={`text-slate-700 whitespace-pre-wrap text-lg leading-relaxed ${shouldTruncate ? 'line-clamp-4' : ''}`}>
                {shouldTruncate ? truncatedContent : displayContent}
              </div>
            )}
          </div>
        )}

        {/* Inline Expanded Full Content */}
        {isInlineExpanded && (
          <div className="space-y-8 mb-8">
            <article className="prose prose-lg prose-slate max-w-none">
              <div className="text-slate-700 whitespace-pre-wrap text-lg leading-relaxed">
                {hasProAccess ? fullContent : (isPreview ? displayContent : fullContent)}
              </div>

              {!hasProAccess && isPreview && (
                <div className="mt-8">
                  <PremiumFeature
                    featureName="Full Post & Comments"
                    description="Upgrade to Pro to read the full post, view all comments, and join the discussion!"
                    tier="pro"
                  >
                    <div />
                  </PremiumFeature>
                </div>
              )}
            </article>

            {/* Comments Section */}
            {hasProAccess && isAuthenticated && (
              <div className="pt-8 border-t border-slate-200">
                <h3 className="text-2xl font-display font-bold mb-6">Comments</h3>
                
                {commentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : comments && comments.length === 0 ? (
                  <p className="text-slate-500 mb-6">No comments yet. Be the first to comment!</p>
                ) : (
                  <div className="space-y-4 mb-6">
                    {comments?.map((comment) => (
                      <div key={comment.id} className="bg-slate-50 rounded-lg p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="font-medium text-slate-900">{comment.author.displayName}</div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-500">
                              {format(new Date(comment.createdAt), 'MMM d, yyyy')}
                            </div>
                            {/* Only show delete button if user owns the comment */}
                            {comment.canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this comment?')) {
                                    try {
                                      await deleteComment(comment.id);
                                      queryClient.invalidateQueries({ queryKey: ['forum-comments', post.id] });
                                      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
                                      toast({ 
                                        title: 'Comment deleted', 
                                        description: 'Your comment has been removed.' 
                                      });
                                    } catch (error: any) {
                                      toast({ 
                                        title: 'Error', 
                                        description: error.message,
                                        variant: 'destructive' 
                                      });
                                    }
                                  }
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-slate-700 whitespace-pre-wrap">{comment.content}</div>
                        <div className="flex items-center gap-2 mt-3">
                          <button className="flex items-center gap-1 text-sm text-slate-600">
                            <ThumbsUp className="w-4 h-4" />
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
                    value={newComment || ''}
                    onChange={(e) => onCommentChange?.(e.target.value)}
                    rows={4}
                    className="mb-4"
                  />
                  <Button
                    onClick={onCreateComment}
                    disabled={!newComment?.trim() || isCreatingComment}
                    className="w-full"
                    size="lg"
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
            )}

            {/* Show login prompt if not authenticated */}
            {hasProAccess && !isAuthenticated && (
              <div className="pt-8 border-t border-slate-200">
                <h3 className="text-2xl font-display font-bold mb-6">Comments</h3>
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-6 text-center">
                    <p className="text-slate-600 mb-4">Please log in to view and post comments.</p>
                    <Button onClick={() => setLocation('/?login=true')}>
                      Log In
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Related Articles */}
            {relatedPosts && relatedPosts.length > 0 && (
              <div className="pt-8 border-t border-slate-200">
                <h3 className="text-2xl font-display font-bold mb-6">Related Articles</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Card 
                      key={relatedPost.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        // Scroll to related post or expand it
                        const element = document.getElementById(`post-${relatedPost.id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <CardHeader>
                        <CardTitle className="text-lg line-clamp-2">{relatedPost.title}</CardTitle>
                        <CardDescription className="text-sm">
                          {format(new Date(relatedPost.createdAt), 'MMM d, yyyy')}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpvote();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                post.hasUserUpvoted
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${post.hasUserUpvoted ? 'fill-current' : ''}`} />
              <span className="font-medium text-base">{post.upvoteCount}</span>
            </button>
            <div className="flex items-center gap-2 text-slate-600">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium text-base">{post.commentCount}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {showCollapse && !isInlineExpanded && (
              <Button
                variant="outline"
                size="default"
                onClick={(e) => {
                  e.stopPropagation();
                  onInlineExpand();
                }}
                className="px-6"
              >
                Read Full Article
              </Button>
            )}
            <div className="relative">
              <Button
                ref={shareButtonRef}
                variant="outline"
                size="default"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                className="flex items-center gap-2 px-6"
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </Button>
              
              {showShareMenu && typeof document !== 'undefined' && createPortal(
                <div 
                  ref={shareMenuRef}
                  className="absolute bg-white border rounded-lg shadow-lg p-3 z-30 flex flex-col gap-2 min-w-[180px]"
                  style={{
                    top: `${shareMenuPosition.top}px`,
                    left: `${shareMenuPosition.left}px`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('twitter');
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">Twitter</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('linkedin');
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    <Linkedin className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">LinkedIn</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('facebook');
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Facebook</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare('copy');
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-100 rounded text-left transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-600" />
                        <span className="font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-5 h-5" />
                        <span className="font-medium">Copy Link</span>
                      </>
                    )}
                  </button>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
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

