import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

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

  const org = await prisma.organization.upsert({
    where: { slug: 'codity-demo' },
    update: {},
    create: {
      name: 'Codity Demo Org',
      slug: 'codity-demo',
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
  });

  const project = await prisma.project.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Project',
      description: 'Production demo environment',
      organizationId: org.id,
    },
  });

  const exponentialPolicy = await prisma.retryPolicy.create({
    data: {
      name: 'Exponential Default',
      strategy: 'EXPONENTIAL',
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 300000,
    },
  });

  const emailQueue = await prisma.queue.create({
    data: {
      name: 'email-notifications',
      projectId: project.id,
      priority: 8,
      concurrency: 10,
      retryPolicyId: exponentialPolicy.id,
    },
  });

  const dataQueue = await prisma.queue.create({
    data: {
      name: 'data-processing',
      projectId: project.id,
      priority: 5,
      concurrency: 5,
      retryPolicyId: exponentialPolicy.id,
    },
  });

  for (let i = 0; i < 30; i++) {
    await prisma.job.create({
      data: {
        queueId: i % 2 === 0 ? emailQueue.id : dataQueue.id,
        name: `job-${i + 1}`,
        type: 'IMMEDIATE',
        payload: { index: i },
        priority: Math.floor(Math.random() * 10),
        status: 'QUEUED',
      },
    });
  }

  console.log('Seed complete');
  console.log('Login: demo@codity.dev / password123');
  console.log('Organization ID:', org.id);
  console.log('Project ID:', project.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
