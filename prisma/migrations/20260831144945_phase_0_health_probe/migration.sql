-- CreateTable
CREATE TABLE "health_probe" (
    "id" UUID NOT NULL,
    "observed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_probe_pkey" PRIMARY KEY ("id")
);
