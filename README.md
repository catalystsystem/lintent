# LI.FI Intent Demo

The LI.FI intent demo is hosted at lintent.org. It demonstrates the entire intent flow from resource lock mangement, intent issuance, and solving intents.

## Project

This project uses SvelteKit and `npm`. It is configured for a deployment to Cloudflare workers, to change the deployment target modify [/svelte.config.js](/svelte.config.js) with another [adapter](https://svelte.dev/docs/kit/adapters).

### Development

To start development copy `.env.example` to `.env`. Then fill in the env variables by creating a [WalletConnect](https://walletconnect.com) project and [Polymer](https://polymerlabs.org) api keys.

Install dependencies `npm install` and start `npm run dev`.

## Structure

Lintent is built around a single page [/src/routes/+page.svelte](/src/routes/+page.svelte).

The app consists of a series of screens that are displayed in a scrollable container. Each screen can be found in [/src/lib/screens/](/src/lib/screens/).

### Libraries

Several helper classes that acts as wrappers for external endpoints can be found in [/src/lib/libraries/](/src/lib/libraries/).

## License

This project is licensed under the **[MIT License](/LICENSE)**. Any contributions to this repository is provided with a MIT License.
