import { ethers } from 'ethers';
import Web3 from 'web3';

// Define common ABIs
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
];

// Dex router ABI (simplified for our needs)
const DEX_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
];

// Known DEX addresses
const DEX_ADDRESSES = {
  uniswap: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  sushiswap: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  // Add more as needed
};

// Provider setup (read-only for now)
let provider: ethers.providers.BaseProvider | null = null;
let web3: Web3 | null = null;

// Initialize provider
export async function initializeProvider() {
  try {
    // If in a browser environment with an injected provider
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      provider = new ethers.providers.Web3Provider((window as any).ethereum);
      web3 = new Web3((window as any).ethereum);
      console.log('Using injected provider');
      return { provider, web3 };
    }
    
    // Otherwise use a public provider for read-only access
    const chainId = 1; // Ethereum Mainnet
    const network = ethers.providers.getNetwork(chainId);
    const publicProvider = ethers.getDefaultProvider(network);
    provider = publicProvider;
    web3 = new Web3('https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'); // Infura public endpoint
    
    console.log('Using public provider for read-only access');
    return { provider, web3 };
  } catch (error) {
    console.error('Failed to initialize provider:', error);
    throw error;
  }
}

// Get current gas price
export async function getCurrentGasPrice() {
  if (!provider) await initializeProvider();
  try {
    const gasPrice = await provider!.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, 'gwei');
  } catch (error) {
    console.error('Failed to get gas price:', error);
    throw error;
  }
}

// Get pending transaction count
export async function getPendingTransactionCount() {
  if (!web3) await initializeProvider();
  try {
    // This requires an Ethereum node with pending transaction support
    const txCount = await web3!.eth.getBlockTransactionCount('pending');
    return txCount;
  } catch (error) {
    console.error('Failed to get pending transaction count:', error);
    // Return a default or mock value for demo
    return 347;
  }
}

// Calculate network congestion level
export function calculateNetworkCongestion(gasPrice: number): string {
  if (gasPrice < 15) return 'Low';
  if (gasPrice < 30) return 'Medium';
  if (gasPrice < 60) return 'High';
  return 'Very High';
}

// Get token price from DEX
export async function getTokenPriceFromDex(
  tokenAddress: string,
  baseTokenAddress: string = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
  dex: string = 'uniswap'
) {
  if (!provider) await initializeProvider();
  
  const router = new ethers.Contract(
    DEX_ADDRESSES[dex as keyof typeof DEX_ADDRESSES],
    DEX_ROUTER_ABI,
    provider!
  );
  
  try {
    // Amount in with 18 decimals (1 token)
    const amountIn = ethers.utils.parseEther('1');
    const path = [tokenAddress, baseTokenAddress];
    
    const amounts = await router.getAmountsOut(amountIn, path);
    return ethers.utils.formatEther(amounts[1]);
  } catch (error) {
    console.error(`Failed to get price from ${dex}:`, error);
    throw error;
  }
}

// Simulate a transaction
export async function simulateTransaction(txData: any) {
  if (!provider) await initializeProvider();
  
  try {
    // This would actually need access to an archive node or simulation service
    // like Tenderly for proper simulation
    console.log('Simulating transaction:', txData);
    
    // For demo purposes, we'll just return a mock result
    const gasEstimate = Math.floor(Math.random() * 300000) + 100000;
    const isSuccessful = Math.random() > 0.2; // 80% success rate
    
    return {
      success: isSuccessful,
      gasUsed: gasEstimate,
      error: isSuccessful ? null : 'Simulation failed - potential revert'
    };
  } catch (error) {
    console.error('Transaction simulation failed:', error);
    throw error;
  }
}

// Listen to mempool transactions (simplified)
export function listenToMempool(callback: (tx: any) => void) {
  if (!provider) {
    initializeProvider().then(() => {
      provider!.on('pending', (txHash) => {
        provider!.getTransaction(txHash).then((tx) => {
          if (tx) callback(tx);
        });
      });
    });
  } else {
    provider.on('pending', (txHash) => {
      provider!.getTransaction(txHash).then((tx) => {
        if (tx) callback(tx);
      });
    });
  }
  
  return () => {
    if (provider) {
      provider.removeAllListeners('pending');
    }
  };
}

// Submit a transaction (requires a signer)
export async function submitTransaction(txData: any, privateKey?: string) {
  if (!provider) await initializeProvider();
  
  try {
    let signer;
    
    // If private key is provided, use it
    if (privateKey) {
      signer = new ethers.Wallet(privateKey, provider!);
    } else if ((window as any).ethereum) {
      // Otherwise try to get signer from injected provider
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      await ethersProvider.send("eth_requestAccounts", []);
      signer = ethersProvider.getSigner();
    } else {
      throw new Error('No signer available - cannot submit transaction');
    }
    
    const tx = await signer.sendTransaction(txData);
    return {
      hash: tx.hash,
      wait: () => tx.wait()
    };
  } catch (error) {
    console.error('Failed to submit transaction:', error);
    throw error;
  }
}

// For demo: create mock transaction data
export function createMockTransactionData(from: string, to: string, value: string) {
  return {
    from,
    to,
    value: ethers.utils.parseEther(value),
    gasLimit: ethers.utils.hexlify(100000),
    gasPrice: ethers.utils.parseUnits('20', 'gwei'),
    nonce: Math.floor(Math.random() * 1000)
  };
}

// Monitor blockchain status (for dashboard updates)
export async function getBlockchainStatus() {
  try {
    if (!provider || !web3) await initializeProvider();
    
    const gasPrice = await getCurrentGasPrice();
    const pendingTransactions = await getPendingTransactionCount();
    const networkCongestion = calculateNetworkCongestion(parseFloat(gasPrice));
    
    return {
      pendingTransactions,
      gasPrice: parseFloat(gasPrice),
      networkCongestion
    };
  } catch (error) {
    console.error('Failed to get blockchain status:', error);
    // Return default values for demo
    return {
      pendingTransactions: 347,
      gasPrice: 23.4,
      networkCongestion: 'Medium'
    };
  }
}
