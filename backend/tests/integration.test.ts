import request from 'supertest';
import { createApp } from '../src/app';

const { app } = createApp();

describe('API Integration', () => {
  let token: string;
  let organizationId: string;
  let projectId: string;
  let queueId: string;

  it('POST /auth/register - should register a user', async () => {
    const email = `test-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'password123',
        name: 'Test User',
        organizationName: 'Test Org',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    token = res.body.data.token;
    organizationId = res.body.data.organization.id;
  });

  it('GET /auth/profile - should return user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBeDefined();
  });

  it('POST /projects - should create a project', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Integration Test Project',
        organizationId,
      });

    expect(res.status).toBe(201);
    projectId = res.body.data.id;
  });

  it('POST /queues - should create a queue', async () => {
    const res = await request(app)
      .post('/api/v1/queues')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'test-queue',
        projectId,
        concurrency: 3,
      });

    expect(res.status).toBe(201);
    queueId = res.body.data.id;
  });

  it('POST /jobs - should create a job', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        queueId,
        name: 'integration-test-job',
        payload: { test: true },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('QUEUED');
  });

  it('GET /health - should return system health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBeDefined();
  });
});
