-- CreateTable
CREATE TABLE "DmConversation" (
    "id" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessagePreview" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DmConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DmConversation_user1Id_user2Id_key" ON "DmConversation"("user1Id", "user2Id");

-- CreateIndex
CREATE INDEX "DmConversation_user1Id_lastMessageAt_idx" ON "DmConversation"("user1Id", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "DmConversation_user2Id_lastMessageAt_idx" ON "DmConversation"("user2Id", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "DmMessage_conversationId_createdAt_idx" ON "DmMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DmMessage_receiverId_isRead_idx" ON "DmMessage"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "DmMessage_senderId_createdAt_idx" ON "DmMessage"("senderId", "createdAt");

-- AddForeignKey
ALTER TABLE "DmConversation" ADD CONSTRAINT "DmConversation_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmConversation" ADD CONSTRAINT "DmConversation_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DmConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmMessage" ADD CONSTRAINT "DmMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
