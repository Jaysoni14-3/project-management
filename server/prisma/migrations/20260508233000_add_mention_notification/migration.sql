-- Adds 'comment_mention' to the NotificationKind enum so @-mentions can be
-- written to the notifications table alongside the existing kinds.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'comment_mention';
