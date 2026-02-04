import React, { useState } from 'react';
import { ForumComment } from '@/lib/api';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface RedditStyleCommentProps {
  comment: ForumComment;
  depth: number;
  onReply: (parentId: string) => void;
  onUpvote: (commentId: string, hasUpvoted: boolean) => void;
  isCollapsed?: boolean;
  maxDepth?: number;
}

export function RedditStyleComment({
  comment,
  depth,
  onReply,
  onUpvote,
  isCollapsed: initialCollapsed = false,
  maxDepth = 6,
}: RedditStyleCommentProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [isReplying, setIsReplying] = useState(false);

  const canReply = depth < maxDepth;
  const indentWidth = Math.min(depth * 16, 80); // Max 80px indent

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpvote(comment.id, comment.hasUserUpvoted);
  };

  const handleReply = () => {
    setIsReplying(true);
    onReply(comment.id);
  };

  if (isCollapsed) {
    return (
      <div 
        className="flex items-center gap-2 py-1 text-xs text-slate-500 cursor-pointer hover:text-slate-700"
        style={{ marginLeft: `${indentWidth}px` }}
        onClick={() => setIsCollapsed(false)}
      >
        <ChevronRight className="w-3 h-3" />
        <span className="font-medium">{comment.author.displayName}</span>
        <span>•</span>
        <span>{comment.upvoteCount} {comment.upvoteCount === 1 ? 'point' : 'points'}</span>
        <span>•</span>
        <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Thread line - vertical connector */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-slate-200 hover:bg-slate-300 transition-colors"
          style={{ left: `${indentWidth - 8}px` }}
        />
      )}

      <div 
        className="flex gap-2 py-2"
        style={{ marginLeft: `${indentWidth}px` }}
      >
        {/* Upvote/Downvote sidebar */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={handleUpvote}
            className={cn(
              "p-1 rounded hover:bg-slate-100 transition-colors",
              comment.hasUserUpvoted && "text-emerald-600"
            )}
            title="Upvote"
          >
            <ArrowUp className={cn(
              "w-4 h-4",
              comment.hasUserUpvoted && "fill-current"
            )} />
          </button>
          <span className={cn(
            "text-xs font-semibold min-w-[1.5rem] text-center",
            comment.hasUserUpvoted ? "text-emerald-600" : "text-slate-600"
          )}>
            {comment.upvoteCount}
          </span>
          <button
            className="p-1 rounded hover:bg-slate-100 transition-colors opacity-50"
            title="Downvote (not implemented)"
            disabled
          >
            <ArrowDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          {/* Author and metadata */}
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-1 flex-wrap">
            <span className="font-medium text-slate-900">{comment.author.displayName}</span>
            <span>•</span>
            <span className="text-slate-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.createdAt !== comment.updatedAt && (
              <>
                <span>•</span>
                <span className="text-slate-400 italic">edited</span>
              </>
            )}
          </div>

          {/* Comment text */}
          <div className="text-sm text-slate-700 whitespace-pre-wrap mb-2 leading-relaxed">
            {comment.content}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 text-xs">
            {canReply && (
              <button
                onClick={handleReply}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-medium"
              >
                <MessageSquare className="w-3 h-3" />
                Reply
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-slate-600 hover:text-slate-900"
            >
              Collapse
            </button>
          </div>

          {/* Reply input (if replying) */}
          {isReplying && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Reply functionality will be handled by parent component</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

