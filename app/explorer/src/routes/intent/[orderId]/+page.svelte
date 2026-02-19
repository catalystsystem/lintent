<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<section>
  <a href="/">Back to intents</a>
  <h2>Intent {data.detail.orderId}</h2>
  <p>Status: <strong>{data.detail.status}</strong></p>

  <h3>Components</h3>
  <ul>
    <li>Input settler: {data.detail.componentAddresses.inputSettler ?? '-'}</li>
    <li>Input oracle: {data.detail.componentAddresses.inputOracle ?? '-'}</li>
    <li>Output oracle: {data.detail.componentAddresses.outputOracle ?? '-'}</li>
    <li>Output settler: {data.detail.componentAddresses.outputSettler ?? '-'}</li>
  </ul>

  <h3>Timeline</h3>
  <table>
    <thead>
      <tr>
        <th>Event</th>
        <th>Time</th>
        <th>Tx</th>
      </tr>
    </thead>
    <tbody>
      {#each data.detail.timeline as event}
        <tr>
          <td>{event.label}</td>
          <td>{event.timestamp ?? '-'}</td>
          <td>{event.txHash ?? '-'}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  <details>
    <summary>Raw payload</summary>
    <pre>{JSON.stringify(data.detail.raw, null, 2)}</pre>
  </details>
</section>

<style>
  section {
    background: #fff;
    border: 1px solid #dbe4ee;
    border-radius: 12px;
    padding: 1rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  th,
  td {
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.45rem 0;
  }

  pre {
    background: #0f172a;
    color: #e2e8f0;
    border-radius: 10px;
    padding: 0.75rem;
    overflow: auto;
  }
</style>
