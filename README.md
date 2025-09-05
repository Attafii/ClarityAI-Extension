PRD: Clarity — A Prompt Improver for VS Code Copilot Chat

1. Overview

Clarity is a Visual Studio Code extension that integrates into the Copilot Chat system via the Chat Participant API.
Its goal: improve developer prompts by automatically fixing grammar, spelling, and clarity issues before Copilot processes them.

It supports two modes:

Instant Mode: User types @clarity …, Clarity cleans the text, then automatically re-sends the improved prompt to Copilot for a final answer.

Confirmation Mode: User types @clarity …, Clarity cleans the text, shows the improved version in chat, and provides a button for the user to confirm and forward it to Copilot.



---

2. Goals & Non-Goals

Goals

Provide seamless prompt correction inside Copilot Chat.

Improve user productivity by reducing misunderstandings due to typos or vague phrasing.

Allow users to choose between automatic forwarding (Instant Mode) and manual confirmation (Confirmation Mode).


Non-Goals

Direct modification of Copilot’s input box (not possible via VS Code APIs).

Acting as a full replacement for Copilot’s language model (Clarity is a pre-processor, not the AI itself).



---

3. User Flow

Instant Mode

1. User enters:

@clarity plese writ a functoin taht caluclates fibonnaci


2. VS Code routes this to Clarity’s Chat Participant.


3. Clarity autocorrects:
→ "Please write a function that calculates Fibonacci."


4. Clarity programmatically forwards this improved prompt to Copilot.


5. Copilot answers with the corrected request’s result.



Confirmation Mode

1. User enters:

@clarity check this prompt for me: writ a sript taht opens url


2. Clarity autocorrects:
→ "Write a script that opens a URL."


3. Clarity responds in chat:

Shows the improved version.

Provides a button: “Send to Copilot”.



4. If clicked, Clarity sends the improved prompt to Copilot.


5. Copilot answers with the result.




---

4. Technical Design

4.1 Core APIs

Chat Participant API (vscode.chat.createChatParticipant)

Register Clarity as @clarity.

Handle incoming user messages.


Chat Response Streaming API (stream.markdown, stream.button, stream.followup)

Output corrected prompts, confirmation buttons, and follow-ups.


VS Code Command API (vscode.commands.executeCommand)

To forward prompts to Copilot programmatically.

Likely command: workbench.action.chat.sendMessage or equivalent Copilot Chat command. (Confirm exact ID by inspecting Copilot extension contribution points.)


Text Processing (Autocorrect)

Implement a lightweight prompt-cleaning function (spellcheck, grammar rules).

Optionally call an external LLM API (OpenAI, Anthropic, etc.) for higher-quality correction.




---

4.2 Extension Structure

clarity/
 ├─ package.json
 ├─ src/
 │   ├─ extension.ts
 │   ├─ autocorrect.ts   // logic for prompt cleanup
 │   └─ forward.ts       // handles forwarding to Copilot
 └─ README.md


---

4.3 Mode Handling

Instant Mode (default):

After correction, call executeCommand("workbench.action.chat.sendMessage", improvedPrompt, { target: "@copilot" }).


Confirmation Mode:

Respond in chat:

stream.markdown(`Improved prompt:\n\n${improvedPrompt}`);
stream.button({ title: "Send to Copilot", command: "clarity.forward", arguments: [improvedPrompt] });

Command clarity.forward triggers executeCommand with the improved text.




---

5. UX / UI Details

Chat Identity: Appears in Copilot Chat as @clarity.

Response Types:

Markdown (for displaying improved prompts).

Buttons (for confirmation mode).

Follow-ups (optional: e.g., “Improve further”, “Explain my prompt”).


Settings (via contributes.configuration):

clarity.mode: "instant" | "confirmation" (default: "confirmation").

clarity.useExternalLLM: boolean (default: false).




---

6. Edge Cases

Empty input → respond with “No prompt detected.”

Already clear prompt → show: “Looks good, nothing to change.”

User disables Copilot → Clarity can still clean text, but cannot forward.

Offline (if using external LLM for cleaning) → fallback to local heuristics.



---

7. Future Enhancements

Inline corrections in editor (via code actions).

“Prompt linting” sidebar for editing prompts before sending.

Support for multi-turn improvements (Clarity remembers last correction and adjusts based on user feedback).



---

8. Deliverables

MVP: Chat participant @clarity with Instant + Confirmation mode.

Configurable settings in VS Code.

Command palette commands:

Clarity: Switch to Instant Mode

Clarity: Switch to Confirmation Mode




---

9. Risks / Constraints

Forwarding to Copilot relies on internal Copilot commands. If they change, Clarity must adapt.

No direct input interception: Users always need to call @clarity explicitly.

External API dependency: If used, introduces latency and requires API key handling.

