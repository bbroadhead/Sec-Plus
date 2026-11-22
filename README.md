# Sec+ Study Hub

Responsive, browser-based CompTIA Security+ (SY0-701) study tracker and practice quiz.

## Current features
- Five exam domains with topic/subtopic completion and review flags
- Exam tips and domain weighting
- Randomized question order and randomized answer choices
- Configurable quiz length and immediate/deferred answer feedback
- Per-domain correct/incorrect performance bars
- Persistent quiz history and weak-domain practice mode
- CSV export of answer-level quiz results
- Browser localStorage; no login or backend required

## Run locally
Open `index.html` in a modern browser, or serve the repository with any static HTTP server.

## Deploy
GitHub repository Settings → Pages → Deploy from a branch → choose the default branch and `/ (root)`. GitHub Pages will serve `index.html`.

## Educational content status
This is an initial working prototype, **not a complete exam-preparation curriculum**. It includes 20 original example questions and a topic outline. It does not yet parse or incorporate uploaded source documents. Questions are shuffled and their answer positions change; dynamically reworded or newly generated questions are not implemented. Before publishing, expand and validate the study lessons, explanations, and question pool against authorized source materials and current official exam objectives.

## Privacy
Progress and quiz results are stored only in the current browser via localStorage. Clearing site data removes them. Export CSV to keep a backup. There is no cross-device sync.

Independent study tool; not affiliated with CompTIA.
