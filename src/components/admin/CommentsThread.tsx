import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as adminApi from '../../services/adminApi';
import type { BookingComment } from '../../types/admin';

interface MentionUser {
  id: string;
  displayName: string;
}

interface CommentsThreadProps {
  bookingId: string;
  token: string;
  userId: string;
  displayName: string;
  approvedUsers?: MentionUser[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatCommentTime(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const now = Date.now();
  const created = new Date(dateStr).getTime();
  const diffMs = now - created;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t('admin.comments.justNow');
  if (diffMin < 60) return t('admin.comments.minutesAgo', { count: diffMin });
  if (diffHr < 24) return t('admin.comments.hoursAgo', { count: diffHr });
  return t('admin.comments.daysAgo', { count: diffDay });
}

const CommentsThread: React.FC<CommentsThreadProps> = ({
  bookingId,
  token,
  userId,
  displayName,
  approvedUsers = [],
}) => {
  const { t } = useTranslation();
  const [comments, setComments] = useState<BookingComment[]>([]);
  const [newContent, setNewContent] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(0); // cursor position of the '@'

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, []);

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null || approvedUsers.length === 0) return [];
    const q = mentionQuery.toLowerCase();
    return approvedUsers
      .filter((u) => u.id !== userId) // exclude self
      .filter((u) => u.displayName.toLowerCase().includes(q))
      .slice(0, 5);
  }, [mentionQuery, approvedUsers, userId]);

  // Fetch comments on mount
  useEffect(() => {
    let cancelled = false;
    adminApi.fetchComments(token, bookingId).then((res) => {
      if (!cancelled && res.success) {
        setComments(res.comments);
        // Scroll after DOM updates
        setTimeout(scrollToBottom, 50);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, bookingId, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const content = newContent.trim();
    if (!content || sending) return;

    // Extract mentioned user IDs from content
    const mentionedIds: string[] = [];
    for (const user of approvedUsers) {
      if (content.includes(`@${user.displayName}`)) {
        mentionedIds.push(user.id);
      }
    }

    setSending(true);
    const res = await adminApi.addComment(
      token,
      bookingId,
      content,
      displayName,
      mentionedIds.length > 0 ? mentionedIds : undefined
    );
    setSending(false);

    if (res.success && res.comment) {
      setComments((prev) => [...prev, res.comment!]);
      setNewContent('');
      setMentionQuery(null);
      setTimeout(scrollToBottom, 50);
    }
  }, [token, bookingId, displayName, newContent, sending, scrollToBottom, approvedUsers]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewContent(val);

    // Detect @ mention
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      // Only trigger if no space in the query (user is still typing the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setMentionStart(atIndex);
        setMentionIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  }, []);

  const insertMention = useCallback(
    (user: MentionUser) => {
      const before = newContent.slice(0, mentionStart);
      const after = newContent.slice(mentionStart + 1 + (mentionQuery?.length || 0));
      const inserted = `${before}@${user.displayName} ${after}`;
      setNewContent(inserted);
      setMentionQuery(null);
      // Focus textarea after insertion
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = mentionStart + user.displayName.length + 2; // +2 for @ and space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [newContent, mentionStart, mentionQuery]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle mention dropdown navigation
      if (mentionQuery !== null && filteredMentions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          insertMention(filteredMentions[mentionIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setMentionQuery(null);
          return;
        }
      }
      // Default: Enter without shift sends
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, mentionQuery, filteredMentions, mentionIndex, insertMention]
  );

  return (
    <div className="comments-thread">
      {comments.length === 0 ? (
        <div className="comments-empty">{t('admin.comments.empty')}</div>
      ) : (
        <div className="comments-list" ref={listRef}>
          {comments.map((c) => (
            <div key={c.id} className={`comment-bubble ${c.userId === userId ? 'own' : ''}`}>
              <div className="comment-avatar">{getInitials(c.displayName)}</div>
              <div className="comment-body">
                <div className="comment-author">{c.displayName}</div>
                <div className="comment-text">{c.content}</div>
                <div className="comment-time">{formatCommentTime(c.createdAt, t)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="comment-input-row" style={{ position: 'relative' }}>
        {/* Mention dropdown */}
        {mentionQuery !== null && filteredMentions.length > 0 && (
          <div className="mention-dropdown">
            {filteredMentions.map((u, i) => (
              <div
                key={u.id}
                className={`mention-item${i === mentionIndex ? ' active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur
                  insertMention(u);
                }}
                onMouseEnter={() => setMentionIndex(i)}
              >
                <span className="mention-item-avatar">{getInitials(u.displayName)}</span>
                <span className="mention-item-name">{u.displayName}</span>
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="comment-input"
          value={newContent}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={t('admin.comments.placeholder')}
          rows={1}
        />
        <button
          className="comment-send-btn"
          onClick={handleSend}
          disabled={!newContent.trim() || sending}
          type="button"
        >
          {t('admin.comments.send')}
        </button>
      </div>
    </div>
  );
};

export default CommentsThread;
