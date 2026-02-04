import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ForumComment, 
  getForumComments, 
  createForumComment, 
  upvoteForumComment, 
  removeForumVote 
} from '@/lib/api';
import { RedditStyleComment } from './RedditStyleComment';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PremiumFeature } from '@/components/PremiumFeature';

interface RedditStyleCommentThreadProps {
  postId: string;
  hasProAccess: boolean;
}

interface CommentNode extends ForumComment {
  replies: CommentNode[];
}

function buildCommentTree(comments: ForumComment[]): CommentNode[] {
  const commentMap = new Map<string, CommentNode>();
  const rootComments: CommentNode[] = [];

  // First pass: create all nodes
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build tree structure
  comments.forEach(comment => {
    const node = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(node);
      } else {
        // Parent not found, treat as root
        rootComments.push(node);
      }
    } else {
      rootComments.push(node);
    }
  });

  // Sort: by upvotes (descending), then by date (newest first)
  const sortComments = (nodes: CommentNode[]): CommentNode[] => {
    return nodes
      .sort((a, b) => {
        if (b.upvoteCount !== a.upvoteCount) {
          return b.upvoteCount - a.upvoteCount;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .map(node => ({
        ...node,
        replies: sortComments(node.replies),
      }));
  };

  return sortComments(rootComments);
}

export function RedditStyleCommentThread({ postId, hasProAccess }: RedditStyleCommentThreadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['forum-comments', postId],
    queryFn: () => getForumComments(postId),
    enabled: hasProAccess && !!postId,
  });

  const commentTree = useMemo(() => {
    if (!commentsData?.comments) return [];
    return buildCommentTree(commentsData.comments);
  }, [commentsData]);

  const createCommentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      createForumComment(postId, content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      setNewComment('');
      setReplyingTo(null);
      setReplyContent('');
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
    mutationFn: ({ commentId, hasUpvoted }: { commentId: string; hasUpvoted: boolean }) =>
      hasUpvoted ? removeForumVote(commentId) : upvoteForumComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-comments', postId] });
    },
  });

  const handleReply = (parentId: string) => {
    setReplyingTo(parentId);
  };

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({ content: replyContent, parentId: replyingTo || undefined });
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({ content: newComment });
  };

  const handleUpvote = (commentId: string, hasUpvoted: boolean) => {
    if (!hasProAccess) {
      toast({
        title: 'Pro Required',
        description: 'Upgrade to Pro to upvote comments!',
      });
      return;
    }
    upvoteMutation.mutate({ commentId, hasUpvoted });
  };

  const renderComment = (comment: CommentNode, depth: number = 0): React.ReactNode => {
    return (
      <div key={comment.id}>
        <RedditStyleComment
          comment={comment}
          depth={depth}
          onReply={handleReply}
          onUpvote={handleUpvote}
          maxDepth={6}
        />
        {replyingTo === comment.id && (
          <div className="ml-8 mt-2 mb-4">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || createCommentMutation.isPending}
              >
                {createCommentMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Reply'
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {comment.replies.length > 0 && (
          <div>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!hasProAccess) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <PremiumFeature
          featureName="Discussion"
          description="Upgrade to Pro to view and participate in discussions!"
          tier="pro"
        >
          <div />
        </PremiumFeature>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      ) : commentTree.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {commentTree.map(comment => renderComment(comment))}
        </div>
      )}

      {/* New comment input */}
      <div className="pt-4 border-t border-slate-200">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={4}
          className="mb-3"
        />
        <Button
          onClick={handleSubmitComment}
          disabled={!newComment.trim() || createCommentMutation.isPending}
          className="w-full"
        >
          {createCommentMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              Post Comment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

