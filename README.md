# Wysa Conversation Flow Backend

A backend service that drives a modular, question-based conversation flow system for the Wysa take-home assignment.

---

## Tech stack

- **Node.js** + **Express** — API layer
- **MongoDB** + **Mongoose** — persistence
- **Jest** + **Supertest** + **mongodb-memory-server** — testing

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string for Atlas)

### Install

```bash
npm install
```

### Configure

```bash
cp .env.example .env
# Edit .env if your MongoDB URI differs from the default
```

By default the app tries `mongodb://localhost:27017/wysa-flow`.

- If local MongoDB is running, it will use that.
- If local MongoDB is not running and `MONGO_URI` is not set, the app falls back to an in-memory MongoDB instance for local development.
- Set `USE_IN_MEMORY_DB=false` if you want startup to fail instead of using the fallback.

### Seed sample data

```bash
npm run seed
```

This creates two modules — `mood-check` and `sleep-habits` — with a realistic cross-module flow including checkpoints.

### Run

```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server starts on `http://localhost:3000`.

### Test

```bash
npm test
```

Tests use an in-memory MongoDB instance — no external database needed.

---

## Submission files

- `README.md`
- `AI_USAGE.md`
- Full backend source under `Backend/`

---

## Project structure

```text
Backend/
  src/
    app.js
    server.js
    controllers/
    db/
    middlewares/
    models/
    routes/
    services/
  seed/
    sampleModules.js
  tests/
    flow.test.js
    setup.js
```

All runnable backend code now lives under `Backend/`, while the root-level `package.json` and Jest config point to that structure.

---

## API reference

All responses include `"success": true/false`.

### Modules

#### `POST /api/modules`
Seed or update a module.

```json
{
  "_id": "mood-check",
  "name": "Mood Check-In",
  "entryQuestionId": "q1",
  "questions": [
    {
      "id": "q1",
      "text": "How are you feeling?",
      "isCheckpoint": false,
      "options": [
        { "id": "q1-a", "text": "Good", "nextQuestionId": "q2" },
        { "id": "q1-b", "text": "Bad", "nextQuestionId": "q2" },
        { "id": "q1-c", "text": "Switch module", "nextModuleId": "sleep-habits", "nextModuleEntryQuestionId": "sq1" }
      ]
    }
  ]
}
```

#### `GET /api/modules`
List all modules.

#### `GET /api/modules/:moduleId/start?userId=xxx`
Start or resume a module for a user. Returns the current question.

---

### Users

#### `GET /api/users/:userId/question?moduleId=xxx[&questionId=yyy]`
Get the current question for a user.

- `questionId` is optional. Include it to resolve a **deep link or notification** pointing to a specific question.
- If the requested question is stale (behind a checkpoint or already answered), the response includes `"staleLinkResolved": true` and returns the actual current question.

#### `POST /api/users/:userId/answer`
Submit an answer and advance state.

```json
{
  "moduleId": "mood-check",
  "questionId": "q1",
  "optionId": "q1-a"
}
```

Response includes `switchedModule: true` if the answer moves the user to a different module, plus the next question.

#### `GET /api/users/:userId/history?moduleId=xxx`
Full conversation history. `moduleId` is optional — omit it to get history across all modules.

#### `POST /api/users/:userId/back`
Go back to the previous question within the current module (bonus feature).

```json
{ "moduleId": "mood-check" }
```

---

## Data model

### `modules`
Static content. Questions are embedded in the module document. Each option specifies:
- `nextQuestionId` — next question in the same module
- `nextModuleId` + `nextModuleEntryQuestionId` — switch to a different module

Questions can be marked `isCheckpoint: true`. After passing a checkpoint, deep links pointing to earlier questions in that module are treated as stale.

### `userState`
One document per `(userId, moduleId)` pair. Tracks:
- `currentQuestionId` — the question to show next
- `checkpointQuestionId` — the last checkpoint passed

State is never deleted when switching modules — the document is preserved so the user can return to a module and continue where they left off.

### `conversationHistory`
Append-only log. Every answer is recorded with the question text and selected option text (denormalised for readability). Never modified. Used for:
- Full history retrieval
- Back navigation (derived by reading the last two entries for a module)

---

## Edge cases handled

| Scenario | Handling |
|---|---|
| Invalid option submitted | 400 error with valid option list |
| Broken `nextQuestionId` reference in module data | 500 error with descriptive message |
| Deep link to question behind a checkpoint | Returns current question, `staleLinkResolved: true` |
| User re-enters a module they switched away from | Existing `userState` doc is reused via upsert |
| Multiple module switches back and forth | Each module keeps independent state; all history preserved |
| `currentQuestionId` in state no longer exists in module | Falls back to module entry point automatically |
| Back at first question, user tries to go back | 400 error: "Already at the first question" |
| End of flow reached | `flowComplete: true`, no question returned |