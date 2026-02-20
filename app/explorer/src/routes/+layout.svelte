<svelte:head>
  <title>LI.FI Intent Explorer</title>
</svelte:head>

<div class="app-shell">
  <header>
    <h1>LI.FI Intent Explorer</h1>
    <p>Phase 0 scaffold: intent-api proxy</p>
  </header>

  <main>
    <slot />
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    background: linear-gradient(180deg, #f6f9fc 0%, #ffffff 100%);
    color: #0f172a;
  }

  .app-shell {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 1100px;
    margin: 0 auto;
  }

  header h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  header p {
    margin-top: 0.4rem;
    color: #334155;
  }
</style>
