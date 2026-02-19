<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<section>
  <h2>Intents</h2>

  <form method="GET" class="filters">
    <label>
      Status
      <input name="status" value={data.query.status} placeholder="Delivered" />
    </label>
    <label>
      User
      <input name="user" value={data.query.user} placeholder="0x..." />
    </label>
    <label>
      Order Id
      <input name="orderId" value={data.query.orderId} placeholder="0x..." />
    </label>
    <button type="submit">Apply</button>
  </form>

  {#if data.items.length === 0}
    <p>No intents found.</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Order</th>
          <th>Status</th>
          <th>Path</th>
          <th>User</th>
          <th>Solver</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {#each data.items as item}
          <tr>
            <td><a href={`/intent/${item.orderId}`}>{item.orderId}</a></td>
            <td>{item.status}</td>
            <td>{item.sourceChain} to {item.destinationChain}</td>
            <td>{item.user ?? '-'}</td>
            <td>{item.solver ?? '-'}</td>
            <td>{item.updatedAt ?? '-'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  {#if data.nextCursor}
    <p><a href={`/?cursor=${data.nextCursor}`}>Next page</a></p>
  {/if}
</section>

<style>
  section {
    background: #fff;
    border: 1px solid #dbe4ee;
    border-radius: 12px;
    padding: 1rem;
  }

  h2 {
    margin-top: 0;
  }

  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
  }

  input {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 0.45rem 0.6rem;
  }

  button {
    align-self: end;
    border: 1px solid #0f172a;
    background: #0f172a;
    color: #fff;
    border-radius: 8px;
    padding: 0.5rem 0.8rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    text-align: left;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.5rem 0;
    font-size: 0.92rem;
  }
</style>
