# AI Usage

## 1. AI Tools Used

* Codex (GPT-5 based coding assistant via desktop application)

---

## 2. Prompts Used

* "Convert the provided Wysa assignment files into a structured backend system following the given requirements."
* "Review the code after adding controllers, fix bugs, add database connection, and clean unnecessary files."
* "Validate whether the implementation satisfies all assignment requirements."
* "Refine the project to be submission-ready with proper structure and edge-case handling."

---

## 3. What I Modified / Improved

* Refactored the project into a clean `Backend/` structure with clear separation of concerns:

  * Controllers, Services, Models, Routes, Database layer, and Tests
* Enforced strict validation:

  * Users can only answer the **current active question**
* Implemented clear separation between:

  * **UserState (mutable current state)**
  * **ConversationHistory (immutable log)**
* Added checkpoint handling to reset module-specific context without affecting history
* Implemented module completion handling to prevent unintended restarts
* Designed back navigation using a `questionStack` to ensure correct state transitions
* Improved defensive handling for:

  * Invalid options
  * Stale requests
  * Broken or inconsistent flows
  * Module re-entry scenarios
* Used Codex to generate initial Jest test cases, then reviewed, refined, and extended them to ensure correctness and proper edge-case coverage

---

## 4. What AI Got Wrong

* Initially allowed answering stale or non-active questions
* Suggested using conversation history for back navigation, which caused incorrect repeated-back behavior
* Restarted modules after completion instead of preserving completion state
* Missed several defensive checks for invalid or inconsistent flows
* Suggested removing important files (e.g., `AI_USAGE.md`) during cleanup

---

## 5. How I Verified Correctness

* Cross-checked implementation against all assignment requirements
* Used AI-assisted (Codex-generated) test cases as a base, then manually validated and refined them for meaningful assertions and coverage
* Wrote additional Jest test cases for:

  * Checkpoint resets
  * Invalid and stale answers
  * Module switching
  * Back navigation behavior
* Performed manual API testing using Postman
* Verified correct state transitions and consistency between state and history

---

## 6. Limitations

* In the Codex sandbox environment, `mongodb-memory-server` fails to bind to a local port (`EPERM`), preventing full test execution
* The test suite is included and expected to pass in a standard local Node.js environment

---

## 7. Future Improvements

* Introduce caching (e.g., Redis) for faster state retrieval
* Implement event sourcing for more robust and auditable history tracking
* Add structured logging and monitoring for better observability
