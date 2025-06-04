import Onboard from '@web3-onboard/core'
import type { OnboardAPI } from '@web3-onboard/core'
import injectedWalletsModule from '@web3-onboard/injected-wallets'
import zealWalletModule from '@web3-onboard/zeal'
import coinbaseWalletModule from '@web3-onboard/coinbase'
import walletConnectModule from '@web3-onboard/walletconnect'
import { PUBLIC_WALLET_CONNECT_PROJECT_ID } from '$env/static/public';
import type { Readable } from 'svelte/store';
import type { Observable } from 'rxjs';

const injected = injectedWalletsModule()
const zealWalletSdk = zealWalletModule()
const coinbaseWalletSdk = coinbaseWalletModule()
const walletConnect = walletConnectModule({
    projectId: PUBLIC_WALLET_CONNECT_PROJECT_ID
})

const wallets = [injected, walletConnect, zealWalletSdk, coinbaseWalletSdk]

const INFURA_ID = ''

const chains = [
  {
    id: 1,
    token: 'ETH',
    label: 'Ethereum Mainnet',
    rpcUrl: `https://mainnet.infura.io/v3/${INFURA_ID}`
  },
  {
    id: 137,
    token: 'MATIC',
    label: 'Matic Mainnet',
    rpcUrl: 'https://matic-mainnet.chainstacklabs.com'
  },
  {
    id: '0x2105',
    token: 'ETH',
    label: 'Base',
    rpcUrl: 'https://mainnet.base.org'
  },
  {
    id: '0xa4ec',
    token: 'ETH',
    label: 'Celo',
    rpcUrl: 'https://1rpc.io/celo'
  },
  {
    id: 666666666,
    token: 'DEGEN',
    label: 'Degen',
    rpcUrl: 'https://rpc.degen.tips'
  }
]

const appMetadata = {
  name: 'Open Intents Framework Demo',
  icon: '<svg />',
  logo: '<svg />',
  description: 'A demo website showcasing using the Open Intents Framework. Built by LIFI.',
  recommendedInjectedWallets: [
    { name: 'Coinbase', url: 'https://wallet.coinbase.com/' },
    { name: 'MetaMask', url: 'https://metamask.io' }
  ]
}
let onboard: OnboardAPI | undefined;

if (!onboard) {
  onboard = Onboard({
    // wagmi,
    wallets,
    chains,
    appMetadata,
    connect: {
      autoConnectLastWallet: true
    }
  });
}

export default onboard as OnboardAPI