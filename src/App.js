import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

// Components
import Navigation from './components/Navigation';
import Search from './components/Search';
import Home from './components/Home';

// ABIs
import RealEstate from './abis/RealEstate.json';
import Escrow from './abis/Escrow.json';

// Config
import config from './config.json';

function App() {
	const [provider, setProvider] = useState(null);
	const [escrow, setEscrow] = useState(null);
	const [account, setAccount] = useState(null);
	const [homes, setHomes] = useState([]);
	const [home, setHome] = useState({});
	const [toggle, setToggle] = useState(false);

	const loadBlockchainData = async () => {
		// Load the web3 Provider.
		const provider = new ethers.providers.Web3Provider(
			window.ethereum
		);
		setProvider(provider);

		// Get network from provider.
		const network = await provider.getNetwork();

		// Load the RealEstate (NFT) contract.
		const realEstate = new ethers.Contract(
			config[network.chainId].realEstate.address, // contract address
			RealEstate, // contract abi
			provider // web3 provider or signer
		);
		const totalSupply = await realEstate.totalSupply(); // amount of NFTs
		const homes = [];

		// fetch metadata from tokenURI.
		// tokenURIs is mapping => fetch one by one.
		for (let i = 1; i <= totalSupply; i++) {
			const uri = await realEstate.tokenURI(i);
			const response = await fetch(uri);
			const metadata = await response.json();
			homes.push(metadata);
		}
		setHomes(homes);

		// Load the Escrow contract.
		const escrow = new ethers.Contract(
			config[network.chainId].escrow.address, // contract address
			Escrow, // contract abi
			provider // web3 provider or signer
		);
		setEscrow(escrow);

		// If web3 provider's account changed => change current account.
		window.ethereum.on('accountsChanged', async () => {
			const accounts = await window.ethereum.request({
				method: 'eth_requestAccounts',
			});
			const account = ethers.utils.getAddress(accounts[0]);
			setAccount(account);
		});
	};

	useEffect(() => {
		loadBlockchainData();
	}, []);

	const togglePop = (home) => {
		setHome(home);
		setToggle(!toggle);
	};

	return (
		<div>
			<Navigation account={account} setAccount={setAccount} />
			<Search />

			<div className="cards__section">
				<h3>Homes for you</h3>
				<hr />
				<div className="cards">
					{homes.map((home, index) => (
						<div
							className="card"
							key={index}
							onClick={() => togglePop(home)}
						>
							<div className="card__image">
								<img
									src={home.image}
									alt={`Home ${index}`}
								/>
							</div>
							<div className="card__info">
								<h4>
									{home.attributes[0].value} ETH
								</h4>
								<p>
									<strong>
										{home.attributes[2].value}
									</strong>{' '}
									bds |
									<strong>
										{home.attributes[3].value}
									</strong>{' '}
									ba |
									<strong>
										{home.attributes[4].value}
									</strong>{' '}
									sqft
								</p>
								<p>{home.address}</p>
							</div>
						</div>
					))}
				</div>
			</div>
			{toggle && (
				<Home
					home={home}
					provider={provider}
					account={account}
					escrow={escrow}
					togglePop={togglePop}
				/>
			)}
		</div>
	);
}

export default App;
