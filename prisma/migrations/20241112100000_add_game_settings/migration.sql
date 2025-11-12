-- CreateTable
CREATE TABLE "game_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "backgroundColor" TEXT NOT NULL DEFAULT '#0f172a',
    "headingText" TEXT NOT NULL DEFAULT 'Tic Tac Toe',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_settings_pkey" PRIMARY KEY ("id")
);

-- Insert default settings
INSERT INTO "game_settings" ("id", "backgroundColor", "headingText", "updatedAt")
VALUES ('default', '#0f172a', 'Tic Tac Toe', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

