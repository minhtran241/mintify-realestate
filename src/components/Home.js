import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

import close from '../assets/close.svg';

const Home = ({ home, provider, account, escrow, togglePop }) => {
	const [hasBought, setHasBought] = useState(false);
	const [hasSold, setHasSold] = useState(false);
	const [hasInspected, setHasInspected] = useState(false);
	const [hasLent, setHasLent] = useState(false);

	const [buyer, setBuyer] = useState(null);
	const [seller, setSeller] = useState(null);
	const [inspector, setInspector] = useState(null);
	const [lender, setLender] = useState(null);

	const [owner, setOwner] = useState(null);

	// Determine user role.
	const fetchDetails = async () => {
		// -- Buyer
		const buyer = await escrow.buyer(home.id);
		setBuyer(buyer);

		const hasBought = await escrow.approval(home.id, buyer);
		setHasBought(hasBought);

		// -- Seller
		const seller = await escrow.seller();
		setSeller(seller);

		const hasSold = await escrow.approval(home.id, seller);
		setHasSold(hasSold);

		// -- Inspector
		const inspector = await escrow.inspector();
		setInspector(inspector);

		const hasInspected = await escrow.approval(
			home.id,
			inspector
		);
		setHasInspected(hasInspected);

		// -- Lender
		const lender = await escrow.lender();
		setLender(lender);

		const hasLent = await escrow.approval(home.id, lender);
		setHasLent(hasLent);
	};

	// Fetch house owner.
	const fetchOwner = async () => {
		if (await escrow.isListed(home.id)) return;

		const owner = await escrow.buyer(home.id);
		setOwner(owner);
	};

	const buyHandler = async () => {
		const escrowAmount = await escrow.escrowAmount(home.id); // escrow amount
		const signer = await provider.getSigner(); // current signer

		// Buyer Deposit Earnest.
		let transaction = await escrow
			.connect(signer)
			.depositEarnest(home.id, { value: escrowAmount });
		await transaction.wait();

		// Buyer Approves...
		transaction = await escrow
			.connect(signer)
			.approveSale(home.id);
		await transaction.wait();

		// Update hasBought.
		setHasBought(true);
	};

	const sellHandler = async () => {
		const signer = await provider.getSigner(); // current signer

		// Seller Approves...
		let transaction = await escrow
			.connect(signer)
			.approveSale(home.id);
		await transaction.wait();

		// Seller Finalize...
		transaction = await escrow
			.connect(signer)
			.finalizeSale(home.id);
		await transaction.wait();

		// Update hasSold.
		setHasSold(true);
	};

	const inspectHandler = async () => {
		const signer = await provider.getSigner(); // current signer

		// Inspector Updates Status.
		const transaction = await escrow
			.connect(signer)
			.updateInspectionStatus(home.id, true);
		await transaction.wait();

		// Update hasInspected.
		setHasInspected(true);
	};

	const lendHandler = async () => {
		const signer = await provider.getSigner(); // current signer

		// Lender Approves...
		const transaction = await escrow
			.connect(signer)
			.approveSale(home.id);
		await transaction.wait();

		// Lender sends funds to contract...
		// -> Lend Amount: purchasePrice (total price) - escrowAmount (amount buyer need to pay).
		const lendAmount =
			(await escrow.purchasePrice(home.id)) -
			(await escrow.escrowAmount(home.id));
		// -> Send money: {from: lender, to: Escrow contract, value: lendAmount, gasLimit: 60000}.
		await signer.sendTransaction({
			to: escrow.address,
			value: lendAmount.toString(),
			gasLimit: 60000,
		});

		// Update hasLent
		setHasLent(true);
	};

	useEffect(() => {
		fetchDetails();
		fetchOwner();
	}, [hasSold]);

	return (
		<div className="home">
			<div className="home__details">
				<div className="home__image">
					<img src={home.image} alt="Home" />
				</div>
				<div className="home__overview">
					<h1>{home.name}</h1>
					<p>
						<strong>{home.attributes[2].value}</strong>{' '}
						bds |
						<strong>{home.attributes[3].value}</strong> ba
						|<strong>{home.attributes[4].value}</strong>{' '}
						sqft
					</p>
					<p>{home.address}</p>
					<h2>{home.attributes[0].value} ETH</h2>
					{owner ? (
						<div className="home__owned">
							Owned by{' '}
							{owner.slice(0, 6) +
								'...' +
								owner.slice(38, 42)}
						</div>
					) : (
						<div>
							{account === inspector ? (
								<button
									className="home__buy"
									onClick={inspectHandler}
									disabled={hasInspected}
								>
									Approve Inspection
								</button>
							) : account === lender ? (
								<button
									className="home__buy"
									onClick={lendHandler}
									disabled={hasLent}
								>
									Approve & Lend
								</button>
							) : account === seller ? (
								<button
									className="home__buy"
									onClick={sellHandler}
									disabled={hasSold}
								>
									Approve & Sell
								</button>
							) : (
								<button
									className="home__buy"
									onClick={buyHandler}
									disabled={hasBought}
								>
									Buy
								</button>
							)}
							<button className="home__contact">
								Contact agent
							</button>
						</div>
					)}
					<hr />
					<h2>Overview</h2>
					<p>{home.description}</p>
					<hr />
					<h2>Facts and Features</h2>
					<ul>
						{home.attributes.map((attribute, index) => (
							<li key={index}>
								<strong>
									{attribute.trait_type}
								</strong>{' '}
								: {attribute.value}
							</li>
						))}
					</ul>
				</div>
				<button onClick={togglePop} className="home__close">
					<img src={close} alt="Close" />
				</button>
			</div>
		</div>
	);
};

export default Home;
