import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const password = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@codity.dev' },
    update: {},
    create: {
      email: 'demo@codity.dev',
      password,
      name: 'Demo User',
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create demo project
  const project = await prisma.project.create({
    data: {
      name: 'Demo Project',
      description: 'A demonstration project for the job scheduler',
      userId: user.id,
    },
  });

  console.log(`Created project: ${project.name}`);

  // Create retry policies
  const exponentialPolicy = await prisma.retryPolicy.create({
    data: {
      name: 'Exponential Default',
      strategy: 'EXPONENTIAL',
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 300000,
    },
  });

  const fixedPolicy = await prisma.retryPolicy.create({
    data: {
      name: 'Fixed 5s',
      strategy: 'FIXED',
      maxRetries: 3,
      baseDelay: 5000,
      maxDelay: 5000,
    },
  });

  console.log('Created retry policies');

  // Create queues
  const emailQueue = await prisma.queue.create({
    data: {
      name: 'email-notifications',
      projectId: project.id,
      priority: 5,
      concurrency: 10,
      retryPolicyId: exponentialPolicy.id,
      description: 'Email sending jobs',
    },
  });

  const dataQueue = await prisma.queue.create({
    data: {
      name: 'data-processing',
      projectId: project.id,
      priority: 3,
      concurrency: 5,
      retryPolicyId: fixedPolicy.id,
      description: 'Heavy data processing jobs',
    },
  });

  const webhookQueue = await prisma.queue.create({
    data: {
      name: 'webhooks',
      projectId: project.id,
      priority: 8,
      concurrency: 20,
      retryPolicyId: exponentialPolicy.id,
      description: 'Outgoing webhook deliveries',
    },
  });

  console.log('Created queues');

  // Create sample jobs
  const jobNames = [
    'send-welcome-email',
    'send-password-reset',
    'process-csv-upload',
    'generate-report',
    'deliver-webhook',
    'sync-user-data',
    'cleanup-expired-sessions',
    'send-newsletter',
  ];

  for (let i = 0; i < 20; i++) {
    const queue = [emailQueue, dataQueue, webhookQueue][i % 3];
    await prisma.job.create({
      data: {
        queueId: queue.id,
        name: jobNames[i % jobNames.length],
        type: 'IMMEDIATE',
        payload: { userId: `user-${i}`, timestamp: new Date().toISOString() },
        priority: Math.floor(Math.random() * 10),
        maxAttempts: 3,
        status: 'QUEUED',
      },
    });
  }

  console.log('Created 20 sample jobs');
  console.log('\nSeed complete!');
  console.log(`\nLogin credentials:\n  Email: demo@codity.dev\n  Password: password123`);
  console.log(`\nProject ID: ${project.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
