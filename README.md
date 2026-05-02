# Civ Sim

A side project I've been putting together that mashes up worldbuilding with political simulations. It's basically a tool to let you build a custom nation—breaking it down into regions, provinces, and counties—and then run simulated elections to see what happens. 

If you enjoy tinkering with stats in games like Civilization or just like mapping out fictional countries, you might find this fun to mess around with.

## What it actually does

- **The Builder:** You can define a country's entire structure, from high-level regions down to local counties. You can also track things like religions, yields, and local improvements. It uses a recursive JSON editor under the hood, so you can get as detailed as you want.
- **Calculations:** It handles the math for you, giving you automatic summaries for population, regional stats, and representation. It also complains (gently) if you leave a province unassigned.
- **Dashboards:** I plugged in ECharts so you don't just have to stare at spreadsheets. It gives you a nice visual breakdown of your province data.
- **Elections:** You can simulate elections and see the breakdown at every level (national, regional, provincial). It tracks chamber control and the popular vote, and you can tweak trends and scenarios to see how different political climates affect the results.
- **Election Climate:** You can randomize climate signals, ask LM Studio to name and describe them, or describe the story you want the election to tell and let the app pick matching trends and jitter settings.

## Data and privacy

Everything runs right in your browser. There's no backend server involved, so your autosaves just live in your browser's local storage. If you want to save a world permanently or share it, you can just export and import it as a plain JSON file.

---

*Technical notes: It's built with Vue 3, Vite, and Tailwind. If you want to run it locally, standard Node setup applies (`npm ci` then `npm run dev`).*

For election climate naming and the Election Narrative modal, the app calls LM Studio's OpenAI-compatible endpoint in the browser. Defaults are `http://localhost:1234/v1/chat/completions` and `google/gemma-4-e4b`; override them with `VITE_LMSTUDIO_ENDPOINT` and `VITE_LMSTUDIO_MODEL` if needed.
