const request = require('supertest');

const app = require('../src/app');
const ConversationHistory = require('../src/models/ConversationHistory');
const Module = require('../src/models/Module');
const UserState = require('../src/models/UserState');

async function seedModules() {
  await Module.create([
    {
      _id: 'mod-a',
      name: 'Module A',
      entryQuestionId: 'a1',
      questions: [
        {
          id: 'a1',
          text: 'Question A1',
          isCheckpoint: false,
          options: [
            { id: 'a1-opt1', text: 'Go to A2', nextQuestionId: 'a2' },
            {
              id: 'a1-opt2',
              text: 'Switch to B',
              nextModuleId: 'mod-b',
              nextModuleEntryQuestionId: 'b1',
            },
          ],
        },
        {
          id: 'a2',
          text: 'Question A2 (checkpoint)',
          isCheckpoint: true,
          options: [{ id: 'a2-opt1', text: 'Go to A3', nextQuestionId: 'a3' }],
        },
        {
          id: 'a3',
          text: 'Question A3',
          isCheckpoint: false,
          options: [{ id: 'a3-opt1', text: 'Finish', nextQuestionId: null }],
        },
      ],
    },
    {
      _id: 'mod-b',
      name: 'Module B',
      entryQuestionId: 'b1',
      questions: [
        {
          id: 'b1',
          text: 'Question B1',
          isCheckpoint: false,
          options: [
            { id: 'b1-opt1', text: 'Go to B2', nextQuestionId: 'b2' },
            {
              id: 'b1-opt2',
              text: 'Back to A',
              nextModuleId: 'mod-a',
              nextModuleEntryQuestionId: 'a3',
            },
          ],
        },
        {
          id: 'b2',
          text: 'Question B2',
          isCheckpoint: false,
          options: [{ id: 'b2-opt1', text: 'Finish', nextQuestionId: null }],
        },
      ],
    },
  ]);
}

describe('Module seeding', () => {
  it('POST /api/modules creates a module', async () => {
    const response = await request(app).post('/api/modules').send({
      _id: 'test-mod',
      name: 'Test',
      entryQuestionId: 'q1',
      questions: [
        {
          id: 'q1',
          text: 'Hello?',
          options: [{ id: 'o1', text: 'Yes', nextQuestionId: null }],
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.module._id).toBe('test-mod');
  });
});

describe('Starting a module', () => {
  beforeEach(seedModules);

  it('returns entry question when user starts fresh', async () => {
    const response = await request(app).get('/api/modules/mod-a/start?userId=user1');

    expect(response.status).toBe(200);
    expect(response.body.question.id).toBe('a1');
  });

  it('returns current question when user returns mid-flow', async () => {
    await UserState.create({
      userId: 'user2',
      moduleId: 'mod-a',
      currentQuestionId: 'a2',
      checkpointQuestionId: null,
      questionStack: ['a1'],
    });

    const response = await request(app).get('/api/modules/mod-a/start?userId=user2');

    expect(response.status).toBe(200);
    expect(response.body.question.id).toBe('a2');
  });

  it('returns 400 if userId is missing', async () => {
    const response = await request(app).get('/api/modules/mod-a/start');
    expect(response.status).toBe(400);
  });

  it('falls back to the entry question when saved state points to a missing question', async () => {
    await UserState.create({
      userId: 'user3',
      moduleId: 'mod-a',
      currentQuestionId: 'deleted-question',
      checkpointQuestionId: null,
      questionStack: [],
    });

    const response = await request(app).get('/api/modules/mod-a/start?userId=user3');
    const refreshedState = await UserState.findOne({ userId: 'user3', moduleId: 'mod-a' });

    expect(response.status).toBe(200);
    expect(response.body.question.id).toBe('a1');
    expect(refreshedState.currentQuestionId).toBe('a1');
  });
});

describe('Answering questions', () => {
  beforeEach(seedModules);

  it('advances to the next question', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');

    const response = await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });

    expect(response.status).toBe(200);
    expect(response.body.question.id).toBe('a2');
    expect(response.body.switchedModule).toBe(false);
  });

  it('stores conversation history', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });

    const history = await ConversationHistory.find({ userId: 'user1' });
    expect(history).toHaveLength(1);
    expect(history[0].questionId).toBe('a1');
    expect(history[0].selectedOptionId).toBe('a1-opt1');
  });

  it('returns flowComplete when the module ends', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a2',
      optionId: 'a2-opt1',
    });

    const response = await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a3',
      optionId: 'a3-opt1',
    });

    expect(response.body.flowComplete).toBe(true);
  });

  it('rejects answers for stale questions', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });

    const response = await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });
});

describe('Checkpoint and deep link handling', () => {
  beforeEach(seedModules);

  it('sets checkpointQuestionId when a checkpoint is answered', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a2',
      optionId: 'a2-opt1',
    });

    const state = await UserState.findOne({ userId: 'user1', moduleId: 'mod-a' });
    expect(state.checkpointQuestionId).toBe('a2');
  });

  it('resolves stale links to the current question', async () => {
    await UserState.create({
      userId: 'user1',
      moduleId: 'mod-a',
      currentQuestionId: 'a3',
      checkpointQuestionId: 'a2',
      questionStack: ['a2'],
    });

    const response = await request(app).get(
      '/api/users/user1/question?moduleId=mod-a&questionId=a1'
    );

    expect(response.status).toBe(200);
    expect(response.body.staleLinkResolved).toBe(true);
    expect(response.body.question.id).toBe('a3');
  });
});

describe('Module switching and history', () => {
  beforeEach(seedModules);

  it('switches modules and returns the new module question', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');

    const response = await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt2',
    });

    expect(response.status).toBe(200);
    expect(response.body.moduleId).toBe('mod-b');
    expect(response.body.question.id).toBe('b1');
    expect(response.body.switchedModule).toBe(true);
  });

  it('returns full history across modules', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt2',
    });
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-b',
      questionId: 'b1',
      optionId: 'b1-opt1',
    });

    const response = await request(app).get('/api/users/user1/history');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
  });

  it('returns the preserved target-module state when switching back to a visited module', async () => {
    await UserState.create({
      userId: 'user1',
      moduleId: 'mod-a',
      currentQuestionId: 'a3',
      checkpointQuestionId: 'a2',
      questionStack: ['a2'],
    });

    await request(app).get('/api/modules/mod-b/start?userId=user1');

    const response = await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-b',
      questionId: 'b1',
      optionId: 'b1-opt2',
    });

    expect(response.status).toBe(200);
    expect(response.body.moduleId).toBe('mod-a');
    expect(response.body.question.id).toBe('a3');
  });

  it('preserves completed target-module state when switching back into it', async () => {
    await UserState.create({
      userId: 'user1',
      moduleId: 'mod-a',
      currentQuestionId: null,
      checkpointQuestionId: 'a2',
      questionStack: ['a2', 'a3'],
    });

    await request(app).get('/api/modules/mod-b/start?userId=user1');

    const response = await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-b',
      questionId: 'b1',
      optionId: 'b1-opt2',
    });
    const preservedState = await UserState.findOne({ userId: 'user1', moduleId: 'mod-a' });

    expect(response.status).toBe(200);
    expect(response.body.flowComplete).toBe(true);
    expect(response.body.switchedModule).toBe(true);
    expect(response.body.moduleId).toBe('mod-a');
    expect(response.body.question).toBeNull();
    expect(preservedState.currentQuestionId).toBeNull();
  });
});

describe('Validation and back navigation', () => {
  beforeEach(seedModules);

  it('returns 400 for an invalid option', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');

    const response = await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'invalid-option',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('goes back to the previous question', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });

    const response = await request(app).post('/api/users/user1/back').send({
      moduleId: 'mod-a',
    });

    expect(response.status).toBe(200);
    expect(response.body.question.id).toBe('a1');
  });

  it('stops back navigation at the first question in the current state', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });

    const firstBack = await request(app).post('/api/users/user1/back').send({
      moduleId: 'mod-a',
    });
    const secondBack = await request(app).post('/api/users/user1/back').send({
      moduleId: 'mod-a',
    });

    expect(firstBack.status).toBe(200);
    expect(secondBack.status).toBe(400);
  });

  it('resets back-navigation context after a checkpoint', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a2',
      optionId: 'a2-opt1',
    });

    const backToCheckpoint = await request(app).post('/api/users/user1/back').send({
      moduleId: 'mod-a',
    });
    const blockedPastCheckpoint = await request(app).post('/api/users/user1/back').send({
      moduleId: 'mod-a',
    });

    expect(backToCheckpoint.status).toBe(200);
    expect(backToCheckpoint.body.question.id).toBe('a2');
    expect(blockedPastCheckpoint.status).toBe(400);
  });

  it('returns flowComplete instead of restarting a completed module', async () => {
    await request(app).get('/api/modules/mod-a/start?userId=user1');
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a1',
      optionId: 'a1-opt1',
    });
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a2',
      optionId: 'a2-opt1',
    });
    await request(app).post('/api/users/user1/answer').send({
      moduleId: 'mod-a',
      questionId: 'a3',
      optionId: 'a3-opt1',
    });

    const response = await request(app).get('/api/modules/mod-a/start?userId=user1');

    expect(response.status).toBe(200);
    expect(response.body.flowComplete).toBe(true);
    expect(response.body.question).toBeNull();
  });
});
