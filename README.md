# Civ Sim

A side project I've been tinkering with: it's a companion app for **Civilization VI**. You feed it the details of a game you're actually playing—your empire, its provinces and counties, religions, yields, all that—and it gives the data a bit of simulated "life," mostly by running elections across your civ and watching how the politics shake out.

Think of it as an atlas for your current Civ game. You're not playing a second game here; you're taking the numbers you already have and seeing them turn into regions, representatives, and a national assembly.

If you like poking at the stats in Civ (or just enjoy mapping out fictional countries), you might have some fun with it.

## What it actually does

- **The Builder:** Lay out your civ's whole structure—regions down to provinces and counties—and track things like religions, yields, and local improvements. The main editor is a live spreadsheet-style grid, with a deeper recursive JSON editor underneath for when you want to get into the weeds.
- **Calculations:** It handles the math for you—population rollups, regional stats, representation—and complains (gently) if you leave a province unassigned.
- **Dashboards:** I wired up ECharts so you're not just staring at spreadsheets. You get visual breakdowns of your province data and your civ's national vitals.
- **Elections:** Simulate elections and see the breakdown at every level (national, regional, provincial), plus a full representative directory. It tracks chamber control and the popular vote, and you can tweak trends and scenarios to see how different political climates swing the results.
- **Election Climate:** Randomize the political climate, hand it to a local LLM (LM Studio) to name and describe, or just describe the story you want the election to tell and let the app pick matching trends and jitter settings.
- **Multiple civs:** You can keep several worlds loaded at once and switch between them from the sidebar.

## Data and privacy

Everything runs right in your browser—there's no backend server involved. Autosaves just live in your browser's IndexedDB, and if you want to keep a world around permanently or share it, you can export and import it as a plain JSON file.

---

*Technical notes: it's built with Vue 3, Vite, Pinia, and Tailwind. To run it locally it's the usual Node setup (`npm ci`, then `npm run dev`); `npm test` runs the Vitest suite.*

The local-LLM bits (election climate naming, narrative planning, broadcasts, and ticker copy) are all optional—the app calls LM Studio's native streaming chat endpoint right from the browser so the UI can react to model-load, prompt-processing, reasoning, and message events. Defaults are `http://localhost:1234/api/v1/chat`, model `liquid/lfm2-24b-a2b`, and a `131072` token context length; override them with `VITE_LMSTUDIO_ENDPOINT`, `VITE_LMSTUDIO_MODEL`, and `VITE_LMSTUDIO_CONTEXT_LENGTH` if you're running something else.
