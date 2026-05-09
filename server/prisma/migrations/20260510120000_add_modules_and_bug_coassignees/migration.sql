-- Adds the Module + ModuleHistory tables, multi-assignee support on Bug,
-- 'tester' to ProjectMemberRole, and 'module_assigned' / 'module_completed'
-- notification kinds. Existing Bug.assigneeId stays as the primary assignee;
-- BugAssignee layers additional co-assignees on top.

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- AlterEnum
ALTER TYPE "ProjectMemberRole" ADD VALUE IF NOT EXISTS 'tester';

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'module_assigned';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'module_completed';

-- AlterTable
ALTER TABLE "Bug" ADD COLUMN "moduleId" TEXT;

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ModuleStatus" NOT NULL DEFAULT 'not_started',
    "assigneeId" TEXT,
    "createdById" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleHistory" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "changedById" TEXT,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BugAssignee" (
    "bugId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BugAssignee_pkey" PRIMARY KEY ("bugId", "userId")
);

-- CreateIndex
CREATE INDEX "Module_projectId_idx" ON "Module"("projectId");
CREATE INDEX "Module_assigneeId_idx" ON "Module"("assigneeId");
CREATE INDEX "Module_status_idx" ON "Module"("status");

-- CreateIndex
CREATE INDEX "ModuleHistory_moduleId_changedAt_idx" ON "ModuleHistory"("moduleId", "changedAt");

-- CreateIndex
CREATE INDEX "BugAssignee_userId_idx" ON "BugAssignee"("userId");

-- CreateIndex
CREATE INDEX "Bug_moduleId_idx" ON "Bug"("moduleId");

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleHistory" ADD CONSTRAINT "ModuleHistory_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleHistory" ADD CONSTRAINT "ModuleHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugAssignee" ADD CONSTRAINT "BugAssignee_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BugAssignee" ADD CONSTRAINT "BugAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
