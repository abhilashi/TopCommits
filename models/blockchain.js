const Web3 = require('web3');
const { getAuction, updateLatestBid, setWithdrawn, setClaimed } = require('./auction');
const { createBid } = require('./bid');
const { incrementTotalAuction } = require('./user');
const web3 = new Web3(process.env.RPC_ENDPOINT)
const contract = new web3.eth.Contract(JSON.parse(process.env.ABI), process.env.CONTRACT_ADDRESS);
const IPFS = require('ipfs-core')

class Storable {
  ipfs = null;
  async init() {
    this.ipfs =  await IPFS.create();
    console.log("initiated");
  }
  async store(obj){
    const { cid } = await this.ipfs.add(JSON.stringify(obj))
    return cid;
  }
}

const storable = new Storable();
storable.init();



contract.events.BidMade(async function(err, event) {
    console.log(event.returnValues.nftPublicKey);
    await createBid(event.transactionHash, event.returnValues.user, event.returnValues.nftPublicKey, event.returnValues.amount);
    const auction = await getAuction(event.returnValues.nftPublicKey);
    await incrementTotalAuction(auction.commitOwnerUsername, event.returnValues.amount);
    await updateLatestBid(event.returnValues.nftPublicKey, event.returnValues.user, event.returnValues.amount);
});

contract.events.Withdrawn(async function(err, event) {
    await setWithdrawn(event.returnValues.nftPublicKey)
});

contract.events.Claimed(async function(err, event) {
    await setClaimed(event.returnValues.nftPublicKey)
});

function signingPublicKey(message, signature) {
    return web3.eth.accounts.recover(message, signature);
}

function signMessage(message) {
    return web3.eth.accounts.sign(web3.utils.sha3(message), process.env.PRIV_KEY);
}

function signMessageMulti(m1, m2) {
    return web3.eth.accounts.sign(web3.utils.soliditySha3(m1,m2), process.env.PRIV_KEY);
}


async function getCurrentBlock() {
    return await web3.eth.getBlockNumber();
}

async function storeIfps(obj){
    return "https://ipfs.io/ipfs/"+(await storable.store(obj));
}

module.exports.signingPublicKey = signingPublicKey;
module.exports.signMessage = signMessage;
module.exports.signMessageMulti = signMessageMulti;
module.exports.getCurrentBlock = getCurrentBlock;
module.exports.storeIfps = storeIfps;