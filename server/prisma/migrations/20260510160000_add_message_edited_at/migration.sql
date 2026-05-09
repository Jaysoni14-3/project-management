-- Adds an `editedAt` column to Message so the UI can render an
-- "edited" tag on edited messages. Existing messages stay null.
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
