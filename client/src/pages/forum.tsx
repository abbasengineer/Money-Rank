import React, { useState } from 'react';
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
import { Loader2, MessageSquare, ThumbsUp, Plus, Edit2, Trash2, Crown, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Initialize expanded posts - expand first blog post by default
  React.useEffect(() => {
    if (activeTab === 'blog' && posts.length > 0 && expandedPostIds.size === 0) {
      setExpandedPostIds(new Set([posts[0].id]));
    }
  }, [activeTab, posts, expandedPostIds.size]);

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Community Forum</h1>
          <p className="text-slate-500">
            Discuss financial challenges, share insights, and learn from the community
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'blog' | 'threads')}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="blog">Blog Posts</TabsTrigger>
              <TabsTrigger value="threads">Daily Threads</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
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

          <TabsContent value="blog" className="space-y-4">
            {blogLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-slate-500">
                  <p>No blog posts yet. Check back soon!</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post: ForumPost) => (
                <PostCard
                  key={post.id}
                  post={post}
                  hasProAccess={hasProAccess}
                  onUpvote={() => handleUpvote(post)}
                  onClick={() => setSelectedPost(post)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="threads" className="space-y-4">
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
              posts.map((post: ForumPost) => (
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
              ))
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
  const isPreview = !hasProAccess && (post.contentPreview !== null || post.postType === 'daily_thread');
  const displayContent = hasProAccess ? post.content : (post.contentPreview || '');
  
  // Truncate content when collapsed (show first 200 characters)
  const truncatedContent = displayContent.length > 200 
    ? displayContent.substring(0, 200) + '...' 
    : displayContent;
  const shouldTruncate = showCollapse && !isExpanded && displayContent.length > 200;

  return (
    <Card 
      className={`hover:shadow-md transition-shadow ${post.isPinned ? 'border-amber-200 bg-amber-50/30' : ''}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.isPinned && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Pinned</span>
              )}
              <CardTitle className="text-lg">{post.title}</CardTitle>
            </div>
            <CardDescription>
              by {post.author.displayName} • {format(new Date(post.createdAt), 'MMM d, yyyy')}
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
              className="ml-2"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isPreview ? (
          <div>
            <div className="text-slate-700 whitespace-pre-wrap mb-4">
              {shouldTruncate ? truncatedContent : displayContent}
            </div>
            <PremiumFeature
              featureName="Full Post Content"
              description="Upgrade to Pro to read the full post, view comments, and engage with the community!"
              tier="pro"
              showUpgrade={true}
            >
              <div />
            </PremiumFeature>
          </div>
        ) : (
          <div className="text-slate-700 whitespace-pre-wrap mb-4">
            {shouldTruncate ? truncatedContent : displayContent}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-4 border-t">
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
              <span>{post.upvoteCount}</span>
            </button>
            <div className="flex items-center gap-2 text-slate-600">
              <MessageSquare className="w-4 h-4" />
              <span>{post.commentCount} comments</span>
            </div>
          </div>
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

