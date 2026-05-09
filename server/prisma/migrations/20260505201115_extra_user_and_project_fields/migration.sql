/*
  Warnings:

  - You are about to drop the column `phase` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "phase",
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "currentPhase" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "designation" TEXT,
ADD COLUMN     "isManager" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joinedDate" TEXT,
ADD COLUMN     "managerId" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
