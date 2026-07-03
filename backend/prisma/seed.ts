import {
  PrismaClient,
  JobStatus,
  JobType,
  QueueStatus,
  WorkerStatus,
  ExecutionStatus,
  LogLevel,
  AuditAction,
  AuditResource,
  NotificationType,
  ScheduledJobStatus,
  RetryStrategy,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO = {
  email: 'demo@codity.dev',
  password: 'password123',
  orgSlug: 'codity-demo',
  projectMainId: '00000000-0000-0000-0000-000000000001',
  projectSecondaryId: '00000000-0000-0000-0000-000000000002',
  retryExponentialId: '00000000-0000-0000-0000-000000000011',
  retryFixedId: '00000000-0000-0000-0000-000000000012',
  retryLinearId: '00000000-0000-0000-0000-000000000013',
  queueEmailId: '00000000-0000-0000-0000-000000000101',
  queueDataId: '00000000-0000-0000-0000-000000000102',
  queueWebhooksId: '00000000-0000-0000-0000-000000000103',
  queueReportsId: '00000000-0000-0000-0000-000000000104',
  workerAlphaId: '00000000-0000-0000-0000-000000000201',
  workerBetaId: '00000000-0000-0000-0000-000000000202',
  workerGammaId: '00000000-0000-0000-0000-000000000203',
  workerStaleId: '00000000-0000-0000-0000-000000000204',
  workerOfflineId: '00000000-0000-0000-0000-000000000205',
};

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function minutesAgo(m: number): Date {
  return new Date(Date.now() - m * 60 * 1000);
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

async function cleanupDemoOrg(orgId: string) {
  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length === 0) return;

  await prisma.deadLetterQueue.deleteMany({
    where: { job: { queue: { projectId: { in: projectIds } } } },
  });
  await prisma.jobLog.deleteMany({
    where: { job: { queue: { projectId: { in: projectIds } } } },
  });
  await prisma.jobExecution.deleteMany({
    where: { job: { queue: { projectId: { in: projectIds } } } },
  });
  await prisma.job.deleteMany({
    where: { queue: { projectId: { in: projectIds } } },
  });
  await prisma.scheduledJob.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.workerHeartbeat.deleteMany({
    where: { worker: { projectId: { in: projectIds } } },
  });
  await prisma.worker.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.queue.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.project.deleteMany({
    where: { id: { in: projectIds } },
  });
}

async function seedRetryPolicies() {
  const policies = [
    {
      id: DEMO.retryExponentialId,
      name: 'Exponential Default',
      strategy: RetryStrategy.EXPONENTIAL,
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 300000,
    },
    {
      id: DEMO.retryFixedId,
      name: 'Fixed Delay',
      strategy: RetryStrategy.FIXED,
      maxRetries: 3,
      baseDelay: 5000,
      maxDelay: 5000,
    },
    {
      id: DEMO.retryLinearId,
      name: 'Linear Backoff',
      strategy: RetryStrategy.LINEAR,
      maxRetries: 4,
      baseDelay: 2000,
      maxDelay: 60000,
    },
  ];

  for (const policy of policies) {
    await prisma.retryPolicy.upsert({
      where: { id: policy.id },
      update: policy,
      create: policy,
    });
  }
}

async function seedJobsAndExecutions(
  queueIds: Record<string, string>,
  workerIds: Record<string, string>
) {
  const { email, data, webhooks, reports } = queueIds;
  const { alpha, beta } = workerIds;

  type JobSeed = {
    name: string;
    queueId: string;
    type: JobType;
    status: JobStatus;
    priority?: number;
    attempts?: number;
    maxAttempts?: number;
    scheduledFor?: Date;
    cronExpression?: string;
    batchId?: string;
    claimedBy?: string;
    startedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    durationMs?: number;
    error?: string;
    result?: object;
    logs?: Array<{ level: LogLevel; message: string }>;
    executions?: Array<{
      workerId: string;
      attempt: number;
      status: ExecutionStatus;
      startedAt: Date;
      completedAt?: Date;
      duration?: number;
      error?: string;
    }>;
    dlq?: { reason: string; lastError: string };
  };

  const batchId = '00000000-0000-0000-0000-000000000301';

  const jobSeeds: JobSeed[] = [
    // Active pipeline
    { name: 'send-welcome-email', queueId: email, type: JobType.IMMEDIATE, status: JobStatus.QUEUED, priority: 9 },
    { name: 'send-password-reset', queueId: email, type: JobType.IMMEDIATE, status: JobStatus.QUEUED, priority: 8 },
    { name: 'send-invoice-receipt', queueId: email, type: JobType.DELAYED, status: JobStatus.SCHEDULED, scheduledFor: minutesAgo(-30), priority: 7 },
    { name: 'process-user-signup', queueId: data, type: JobType.IMMEDIATE, status: JobStatus.CLAIMED, claimedBy: alpha, priority: 6 },
    { name: 'sync-crm-contacts', queueId: data, type: JobType.IMMEDIATE, status: JobStatus.RUNNING, claimedBy: alpha, startedAt: minutesAgo(2), priority: 5 },
    { name: 'webhook-stripe-payment', queueId: webhooks, type: JobType.IMMEDIATE, status: JobStatus.RUNNING, claimedBy: beta, startedAt: minutesAgo(1), priority: 10 },
    { name: 'webhook-github-push', queueId: webhooks, type: JobType.DELAYED, status: JobStatus.SCHEDULED, scheduledFor: hoursAgo(-2), priority: 4 },

    // Failures & retries
    {
      name: 'fetch-external-api',
      queueId: data,
      type: JobType.IMMEDIATE,
      status: JobStatus.FAILED,
      attempts: 2,
      maxAttempts: 3,
      failedAt: minutesAgo(15),
      error: 'HTTP 503: upstream unavailable',
      logs: [
        { level: LogLevel.INFO, message: 'Attempt 1 started' },
        { level: LogLevel.ERROR, message: 'HTTP 503: upstream unavailable' },
      ],
      executions: [
        { workerId: beta, attempt: 1, status: ExecutionStatus.FAILED, startedAt: minutesAgo(20), completedAt: minutesAgo(19), duration: 1200, error: 'HTTP 503' },
        { workerId: beta, attempt: 2, status: ExecutionStatus.FAILED, startedAt: minutesAgo(15), completedAt: minutesAgo(14), duration: 980, error: 'HTTP 503' },
      ],
    },
    {
      name: 'validate-payment-payload',
      queueId: webhooks,
      type: JobType.IMMEDIATE,
      status: JobStatus.RETRYING,
      attempts: 1,
      maxAttempts: 5,
      failedAt: minutesAgo(5),
      error: 'Schema validation failed: missing field "amount"',
      logs: [{ level: LogLevel.WARN, message: 'Retry scheduled with exponential backoff' }],
      executions: [
        { workerId: alpha, attempt: 1, status: ExecutionStatus.FAILED, startedAt: minutesAgo(8), completedAt: minutesAgo(7), duration: 45, error: 'Schema validation failed' },
      ],
    },

    // Dead letter queue
    {
      name: 'generate-pdf-report',
      queueId: reports,
      type: JobType.BATCH,
      status: JobStatus.DEAD,
      batchId,
      attempts: 5,
      maxAttempts: 5,
      failedAt: hoursAgo(3),
      error: 'Template engine crash after max retries',
      dlq: { reason: 'Max retries exceeded', lastError: 'Template engine crash: undefined font "Inter-Bold"' },
      logs: [
        { level: LogLevel.ERROR, message: 'Template engine crash' },
        { level: LogLevel.ERROR, message: 'Moved to dead letter queue' },
      ],
      executions: [
        { workerId: beta, attempt: 5, status: ExecutionStatus.FAILED, startedAt: hoursAgo(3), completedAt: hoursAgo(3), duration: 3200, error: 'Template engine crash' },
      ],
    },
    {
      name: 'export-analytics-csv',
      queueId: reports,
      type: JobType.BATCH,
      status: JobStatus.DEAD,
      batchId,
      attempts: 5,
      maxAttempts: 5,
      failedAt: hoursAgo(6),
      error: 'Disk quota exceeded',
      dlq: { reason: 'Max retries exceeded', lastError: 'Disk quota exceeded on /tmp/exports' },
      executions: [
        { workerId: alpha, attempt: 5, status: ExecutionStatus.FAILED, startedAt: hoursAgo(6), completedAt: hoursAgo(6), duration: 1500, error: 'Disk quota exceeded' },
      ],
    },

    // Cron-style
    {
      name: 'nightly-db-backup',
      queueId: data,
      type: JobType.RECURRING,
      status: JobStatus.SCHEDULED,
      cronExpression: '0 2 * * *',
      scheduledFor: hoursAgo(-4),
    },
    {
      name: 'hourly-metrics-rollup',
      queueId: data,
      type: JobType.RECURRING,
      status: JobStatus.QUEUED,
      cronExpression: '0 * * * *',
    },
  ];

  // Completed jobs spread across last 24h for throughput charts
  const completedNames = [
    'send-order-confirmation',
    'process-webhook-delivery',
    'index-search-document',
    'resize-product-image',
    'purge-expired-sessions',
    'sync-inventory-count',
    'deliver-push-notification',
    'compute-usage-metrics',
    'refresh-oauth-token',
    'cleanup-temp-files',
    'aggregate-daily-stats',
    'send-digest-email',
    'reconcile-billing',
    'import-csv-batch',
    'export-user-data',
    'validate-email-domain',
    'rotate-api-keys',
    'compress-log-archive',
    'warm-cache-layer',
    'dispatch-slack-alert',
  ];

  for (let i = 0; i < completedNames.length; i++) {
    const hoursBack = (i / completedNames.length) * 23 + 0.5;
    const started = hoursAgo(hoursBack);
    const duration = 120 + Math.floor(Math.random() * 2800);
    const completed = new Date(started.getTime() + duration);
    const queueId = [email, data, webhooks, reports][i % 4];
    const workerId = i % 2 === 0 ? alpha : beta;

    jobSeeds.push({
      name: completedNames[i]!,
      queueId,
      type: JobType.IMMEDIATE,
      status: JobStatus.COMPLETED,
      startedAt: started,
      completedAt: completed,
      durationMs: duration,
      result: { ok: true, processedAt: completed.toISOString() },
      logs: [
        { level: LogLevel.INFO, message: 'Job started' },
        { level: LogLevel.INFO, message: 'Job completed successfully' },
      ],
      executions: [
        {
          workerId,
          attempt: 1,
          status: ExecutionStatus.COMPLETED,
          startedAt: started,
          completedAt: completed,
          duration,
        },
      ],
    });
  }

  // Extra queued jobs for backlog / filters
  for (let i = 1; i <= 12; i++) {
    jobSeeds.push({
      name: `batch-import-chunk-${i}`,
      queueId: data,
      type: JobType.BATCH,
      status: JobStatus.QUEUED,
      batchId,
      priority: i % 5,
    });
  }

  for (const seed of jobSeeds) {
    const job = await prisma.job.create({
      data: {
        queueId: seed.queueId,
        name: seed.name,
        type: seed.type,
        status: seed.status,
        priority: seed.priority ?? 0,
        attempts: seed.attempts ?? (seed.status === JobStatus.COMPLETED ? 1 : 0),
        maxAttempts: seed.maxAttempts ?? 3,
        scheduledFor: seed.scheduledFor,
        cronExpression: seed.cronExpression,
        batchId: seed.batchId,
        claimedBy: seed.claimedBy,
        startedAt: seed.startedAt,
        completedAt: seed.completedAt,
        failedAt: seed.failedAt,
        durationMs: seed.durationMs,
        error: seed.error,
        result: seed.result,
        createdAt: seed.completedAt ?? seed.failedAt ?? seed.startedAt ?? minutesAgo(Math.floor(Math.random() * 120)),
      },
    });

    if (seed.logs) {
      await prisma.jobLog.createMany({
        data: seed.logs.map((log) => ({
          jobId: job.id,
          level: log.level,
          message: log.message,
        })),
      });
    }

    if (seed.executions) {
      for (const exec of seed.executions) {
        await prisma.jobExecution.create({
          data: {
            jobId: job.id,
            workerId: exec.workerId,
            attempt: exec.attempt,
            status: exec.status,
            startedAt: exec.startedAt,
            completedAt: exec.completedAt,
            duration: exec.duration,
            error: exec.error,
            result: exec.status === ExecutionStatus.COMPLETED ? { ok: true } : undefined,
          },
        });
      }
    }

    if (seed.dlq) {
      await prisma.deadLetterQueue.create({
        data: {
          jobId: job.id,
          reason: seed.dlq.reason,
          attempts: seed.attempts ?? 5,
          lastError: seed.dlq.lastError,
          failedAt: seed.failedAt ?? hoursAgo(1),
        },
      });
    }
  }
}

async function seedWorkers(projectId: string) {
  const workers = [
    {
      id: DEMO.workerAlphaId,
      name: 'worker-alpha-01',
      status: WorkerStatus.BUSY,
      hostname: 'worker-node-a.local',
      pid: 42001,
      concurrency: 5,
      currentLoad: 3,
      totalProcessed: 1842,
      totalFailed: 23,
      lastHeartbeat: minutesAgo(0.2),
    },
    {
      id: DEMO.workerBetaId,
      name: 'worker-beta-01',
      status: WorkerStatus.ONLINE,
      hostname: 'worker-node-b.local',
      pid: 42002,
      concurrency: 8,
      currentLoad: 1,
      totalProcessed: 956,
      totalFailed: 11,
      lastHeartbeat: minutesAgo(0.5),
    },
    {
      id: DEMO.workerGammaId,
      name: 'worker-gamma-01',
      status: WorkerStatus.IDLE,
      hostname: 'worker-node-c.local',
      pid: 42003,
      concurrency: 4,
      currentLoad: 0,
      totalProcessed: 412,
      totalFailed: 4,
      lastHeartbeat: minutesAgo(1),
    },
    {
      id: DEMO.workerStaleId,
      name: 'worker-stale-01',
      status: WorkerStatus.STALE,
      hostname: 'worker-node-d.local',
      pid: 42004,
      concurrency: 5,
      currentLoad: 0,
      totalProcessed: 88,
      totalFailed: 2,
      lastHeartbeat: minutesAgo(45),
    },
    {
      id: DEMO.workerOfflineId,
      name: 'worker-offline-01',
      status: WorkerStatus.OFFLINE,
      hostname: 'worker-node-e.local',
      pid: 42005,
      concurrency: 5,
      currentLoad: 0,
      totalProcessed: 210,
      totalFailed: 8,
      lastHeartbeat: daysAgo(2),
      stoppedAt: daysAgo(2),
    },
  ];

  for (const w of workers) {
    await prisma.worker.create({
      data: {
        id: w.id,
        projectId,
        name: w.name,
        status: w.status,
        hostname: w.hostname,
        pid: w.pid,
        concurrency: w.concurrency,
        currentLoad: w.currentLoad,
        totalProcessed: w.totalProcessed,
        totalFailed: w.totalFailed,
        lastHeartbeat: w.lastHeartbeat,
        stoppedAt: w.stoppedAt,
        heartbeats: {
          create: Array.from({ length: 5 }, (_, i) => ({
            timestamp: minutesAgo(i * 3 + 1),
            load: w.currentLoad,
            memory: 256 + Math.random() * 512,
            cpu: 10 + Math.random() * 40,
          })),
        },
      },
    });
  }

  return { alpha: DEMO.workerAlphaId, beta: DEMO.workerBetaId };
}

async function seedAuditLogs(userId: string, resourceIds: Record<string, string>) {
  const entries: Array<{
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    metadata?: object;
    createdAt: Date;
  }> = [
    { action: AuditAction.LOGIN, resource: AuditResource.USER, resourceId: userId, createdAt: minutesAgo(30) },
    { action: AuditAction.CREATE, resource: AuditResource.PROJECT, resourceId: resourceIds.project, metadata: { name: 'Production Platform' }, createdAt: daysAgo(7) },
    { action: AuditAction.CREATE, resource: AuditResource.QUEUE, resourceId: resourceIds.queueEmail, metadata: { name: 'email-notifications' }, createdAt: daysAgo(6) },
    { action: AuditAction.CREATE, resource: AuditResource.QUEUE, resourceId: resourceIds.queueData, metadata: { name: 'data-processing' }, createdAt: daysAgo(6) },
    { action: AuditAction.PAUSE, resource: AuditResource.QUEUE, resourceId: resourceIds.queueReports, metadata: { reason: 'Maintenance window' }, createdAt: hoursAgo(2) },
    { action: AuditAction.RESUME, resource: AuditResource.QUEUE, resourceId: resourceIds.queueWebhooks, createdAt: hoursAgo(5) },
    { action: AuditAction.RETRY, resource: AuditResource.JOB, metadata: { jobName: 'fetch-external-api' }, createdAt: hoursAgo(1) },
    { action: AuditAction.WORKER_START, resource: AuditResource.WORKER, resourceId: resourceIds.workerAlpha, createdAt: daysAgo(3) },
    { action: AuditAction.WORKER_STOP, resource: AuditResource.WORKER, resourceId: resourceIds.workerOffline, createdAt: daysAgo(2) },
    { action: AuditAction.CREATE, resource: AuditResource.SCHEDULED_JOB, resourceId: resourceIds.scheduledJob, metadata: { cron: '*/15 * * * *' }, createdAt: daysAgo(4) },
  ];

  await prisma.auditLog.deleteMany({ where: { userId } });

  await prisma.auditLog.createMany({
    data: entries.map((e) => ({
      userId,
      action: e.action,
      resource: e.resource,
      resourceId: e.resourceId,
      metadata: e.metadata,
      createdAt: e.createdAt,
      ipAddress: '127.0.0.1',
      userAgent: 'Codity-Seed/1.0',
    })),
  });
}

async function seedNotifications(userId: string) {
  await prisma.notification.deleteMany({ where: { userId } });

  await prisma.notification.createMany({
    data: [
      {
        userId,
        type: NotificationType.JOB_FAILED,
        title: 'Job failed: fetch-external-api',
        message: 'HTTP 503: upstream unavailable after 2 attempts',
        read: false,
        metadata: { jobName: 'fetch-external-api' },
        createdAt: minutesAgo(15),
      },
      {
        userId,
        type: NotificationType.DLQ_ENTRY,
        title: 'Job moved to DLQ',
        message: 'generate-pdf-report exceeded max retries',
        read: false,
        metadata: { jobName: 'generate-pdf-report' },
        createdAt: hoursAgo(3),
      },
      {
        userId,
        type: NotificationType.QUEUE_PAUSED,
        title: 'Queue paused',
        message: 'report-generation queue paused for maintenance',
        read: true,
        createdAt: hoursAgo(2),
      },
      {
        userId,
        type: NotificationType.JOB_COMPLETED,
        title: 'Batch import complete',
        message: '20 jobs completed in the last hour',
        read: true,
        createdAt: hoursAgo(1),
      },
      {
        userId,
        type: NotificationType.WORKER_OFFLINE,
        title: 'Worker offline',
        message: 'worker-offline-01 has not sent a heartbeat in 48h',
        read: false,
        createdAt: daysAgo(1),
      },
      {
        userId,
        type: NotificationType.SYSTEM,
        title: 'Platform healthy',
        message: 'All systems operational. 3 workers online.',
        read: true,
        createdAt: minutesAgo(10),
      },
    ],
  });
}

async function main() {
  console.log('Seeding Codity demo database...\n');

  const password = await bcrypt.hash(DEMO.password, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO.email },
    update: { password, name: 'Demo User' },
    create: {
      email: DEMO.email,
      password,
      name: 'Demo User',
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: DEMO.orgSlug },
    update: { name: 'Codity Demo Org' },
    create: {
      name: 'Codity Demo Org',
      slug: DEMO.orgSlug,
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: user.id },
    },
    update: { role: 'OWNER' },
    create: { organizationId: org.id, userId: user.id, role: 'OWNER' },
  });

  await cleanupDemoOrg(org.id);
  await seedRetryPolicies();

  const mainProject = await prisma.project.create({
    data: {
      id: DEMO.projectMainId,
      name: 'Production Platform',
      description: 'Primary job scheduling environment with full demo data',
      organizationId: org.id,
    },
  });

  await prisma.project.create({
    data: {
      id: DEMO.projectSecondaryId,
      name: 'Staging Sandbox',
      description: 'Secondary project for testing queue configurations',
      organizationId: org.id,
      queues: {
        create: {
          name: 'staging-default',
          priority: 1,
          concurrency: 2,
          retryPolicyId: DEMO.retryFixedId,
        },
      },
    },
  });

  const queues = await Promise.all([
    prisma.queue.create({
      data: {
        id: DEMO.queueEmailId,
        name: 'email-notifications',
        projectId: mainProject.id,
        priority: 9,
        concurrency: 10,
        status: QueueStatus.ACTIVE,
        description: 'Transactional and marketing email delivery',
        retryPolicyId: DEMO.retryExponentialId,
      },
    }),
    prisma.queue.create({
      data: {
        id: DEMO.queueDataId,
        name: 'data-processing',
        projectId: mainProject.id,
        priority: 7,
        concurrency: 5,
        status: QueueStatus.ACTIVE,
        description: 'ETL, sync, and batch data pipelines',
        retryPolicyId: DEMO.retryLinearId,
      },
    }),
    prisma.queue.create({
      data: {
        id: DEMO.queueWebhooksId,
        name: 'webhook-delivery',
        projectId: mainProject.id,
        priority: 10,
        concurrency: 15,
        status: QueueStatus.ACTIVE,
        description: 'Outbound webhook dispatch with retry',
        retryPolicyId: DEMO.retryExponentialId,
      },
    }),
    prisma.queue.create({
      data: {
        id: DEMO.queueReportsId,
        name: 'report-generation',
        projectId: mainProject.id,
        priority: 3,
        concurrency: 2,
        status: QueueStatus.PAUSED,
        description: 'PDF/CSV report generation (paused for maintenance)',
        retryPolicyId: DEMO.retryFixedId,
      },
    }),
  ]);

  const scheduledJob = await prisma.scheduledJob.create({
    data: {
      projectId: mainProject.id,
      queueId: DEMO.queueDataId,
      name: 'sync-crm-every-15min',
      cronExpression: '*/15 * * * *',
      payload: { source: 'salesforce', target: 'warehouse' },
      timezone: 'UTC',
      status: ScheduledJobStatus.ACTIVE,
      lastRunAt: minutesAgo(14),
      nextRunAt: minutesAgo(-1),
      runCount: 128,
    },
  });

  await prisma.scheduledJob.create({
    data: {
      projectId: mainProject.id,
      queueId: DEMO.queueEmailId,
      name: 'weekly-digest-email',
      cronExpression: '0 9 * * 1',
      payload: { template: 'weekly-digest' },
      status: ScheduledJobStatus.ACTIVE,
      nextRunAt: hoursAgo(-24),
      runCount: 12,
    },
  });

  const workerIds = await seedWorkers(mainProject.id);

  await seedJobsAndExecutions(
    {
      email: DEMO.queueEmailId,
      data: DEMO.queueDataId,
      webhooks: DEMO.queueWebhooksId,
      reports: DEMO.queueReportsId,
    },
    workerIds
  );

  await seedAuditLogs(user.id, {
    project: mainProject.id,
    queueEmail: DEMO.queueEmailId,
    queueData: DEMO.queueDataId,
    queueReports: DEMO.queueReportsId,
    queueWebhooks: DEMO.queueWebhooksId,
    workerAlpha: DEMO.workerAlphaId,
    workerOffline: DEMO.workerOfflineId,
    scheduledJob: scheduledJob.id,
  });

  await seedNotifications(user.id);

  const stats = await prisma.job.groupBy({
    by: ['status'],
    where: { queue: { projectId: mainProject.id } },
    _count: { status: true },
  });

  console.log('Seed complete!\n');
  console.log('Login credentials:');
  console.log(`  Email:    ${DEMO.email}`);
  console.log(`  Password: ${DEMO.password}`);
  console.log('\nWorkspace:');
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Project ID:   ${mainProject.id}`);
  console.log('\nDemo data summary:');
  console.log(`  Projects:       2`);
  console.log(`  Queues:         ${queues.length} (1 paused)`);
  console.log(`  Workers:        5 (online, busy, idle, stale, offline)`);
  console.log(`  Scheduled jobs: 2`);
  console.log(`  Jobs by status: ${stats.map((s) => `${s.status}=${s._count.status}`).join(', ')}`);
  console.log('\nRun: cd backend && npm run prisma:seed');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
