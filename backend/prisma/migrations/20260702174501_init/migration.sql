-- CreateEnum
CREATE TYPE "RetryStrategy" AS ENUM ('FIXED', 'LINEAR', 'EXPONENTIAL');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DRAINING');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'SCHEDULED', 'CLAIMED', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'DEAD');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ONLINE', 'BUSY', 'IDLE', 'STALE', 'OFFLINE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retry_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "strategy" "RetryStrategy" NOT NULL DEFAULT 'EXPONENTIAL',
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "base_delay" INTEGER NOT NULL DEFAULT 1000,
    "max_delay" INTEGER NOT NULL DEFAULT 300000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retry_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "retry_policy_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "status" "QueueStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobType" NOT NULL DEFAULT 'IMMEDIATE',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_for" TIMESTAMP(3),
    "cron_expression" TEXT,
    "batch_id" TEXT,
    "idempotency_key" TEXT,
    "claimed_by" TEXT,
    "locked_until" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_executions" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'STARTED',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "error" TEXT,
    "result" JSONB,

    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_logs" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ONLINE',
    "hostname" TEXT,
    "pid" INTEGER,
    "concurrency" INTEGER NOT NULL DEFAULT 5,
    "current_load" INTEGER NOT NULL DEFAULT 0,
    "total_processed" INTEGER NOT NULL DEFAULT 0,
    "total_failed" INTEGER NOT NULL DEFAULT 0,
    "last_heartbeat" TIMESTAMP(3),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" TIMESTAMP(3),

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_heartbeats" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "load" INTEGER NOT NULL DEFAULT 0,
    "memory" DOUBLE PRECISION,
    "cpu" DOUBLE PRECISION,

    CONSTRAINT "worker_heartbeats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_queue" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "failed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL,
    "last_error" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,

    CONSTRAINT "dead_letter_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE INDEX "queues_project_id_status_idx" ON "queues"("project_id", "status");

-- CreateIndex
CREATE INDEX "queues_priority_idx" ON "queues"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "queues_project_id_name_key" ON "queues"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_idempotency_key_key" ON "jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "jobs_queue_id_status_priority_scheduled_for_idx" ON "jobs"("queue_id", "status", "priority", "scheduled_for");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_batch_id_idx" ON "jobs"("batch_id");

-- CreateIndex
CREATE INDEX "jobs_claimed_by_idx" ON "jobs"("claimed_by");

-- CreateIndex
CREATE INDEX "jobs_scheduled_for_idx" ON "jobs"("scheduled_for");

-- CreateIndex
CREATE INDEX "jobs_type_status_idx" ON "jobs"("type", "status");

-- CreateIndex
CREATE INDEX "job_executions_job_id_attempt_idx" ON "job_executions"("job_id", "attempt");

-- CreateIndex
CREATE INDEX "job_executions_worker_id_idx" ON "job_executions"("worker_id");

-- CreateIndex
CREATE INDEX "job_executions_started_at_idx" ON "job_executions"("started_at");

-- CreateIndex
CREATE INDEX "job_logs_job_id_timestamp_idx" ON "job_logs"("job_id", "timestamp");

-- CreateIndex
CREATE INDEX "job_logs_level_idx" ON "job_logs"("level");

-- CreateIndex
CREATE INDEX "workers_project_id_status_idx" ON "workers"("project_id", "status");

-- CreateIndex
CREATE INDEX "workers_last_heartbeat_idx" ON "workers"("last_heartbeat");

-- CreateIndex
CREATE INDEX "worker_heartbeats_worker_id_timestamp_idx" ON "worker_heartbeats"("worker_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "dead_letter_queue_job_id_key" ON "dead_letter_queue"("job_id");

-- CreateIndex
CREATE INDEX "dead_letter_queue_failed_at_idx" ON "dead_letter_queue"("failed_at");

-- CreateIndex
CREATE INDEX "dead_letter_queue_resolved_at_idx" ON "dead_letter_queue"("resolved_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_retry_policy_id_fkey" FOREIGN KEY ("retry_policy_id") REFERENCES "retry_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workers" ADD CONSTRAINT "workers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_heartbeats" ADD CONSTRAINT "worker_heartbeats_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_queue" ADD CONSTRAINT "dead_letter_queue_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
