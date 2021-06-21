var Constants = require('./constants');
var Web3 = require('web3');
var web3 = new Web3(Constants.ethEndpoint);
var axios = require('axios');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var { getUserFromUsername } = require('./user');
const { storeIfps } = require('./ipfs');
const { exec } = require('child_process');


var AuctionSchema = new Schema({
  nftPublicKey: Number, //sha3(commitUrl)
  commitOwnerUsername : String,
  commitOwnerPictureUrl: String,
  commitUrl: String,
  commitArtUrl: String,
  commitTitle: String,
  commitDescription: String,
  createdAt: { type: Number, default: Date.now },
  endsAt: { type: Number, default: -1 },
  totalAuction: Number, 
  bids : [ String ], //bid signatures
  lastBidderPublicKey: String,
  isPublic: { type: Boolean, default: false },   
  withdrawn : {type: Boolean, default: false},
  claimed:  {type: Boolean, default: false },
  nftMetadataUrl : String,
});
const AuctionModel = mongoose.model('AuctionModel', AuctionSchema );

async function createAuction(commitUrlRaw, title, description) {
  try{
  let sanitizedCommitUrl = commitUrlRaw;
  sanitizedCommitUrl = sanitizedCommitUrl.replace("//www.github.com", "//github.com");
  sanitizedCommitUrl = sanitizedCommitUrl.replace("http://", "https://");
  sanitizedCommitUrl = sanitizedCommitUrl.replace("/commit/", "/commits/");
  if(sanitizedCommitUrl.startsWith("github.com"))
    sanitizedCommitUrl = "https://"+sanitizedCommitUrl;
  
  const apiUrl = sanitizedCommitUrl.replace("//github.com", "//api.github.com/repos");
  const nftPublicKey = Date.now();//web3.utils.sha3(sanitizedCommitUrl);

  const existingAuction = await AuctionModel.findOne({ nftPublicKey });
  console.log("existing", existingAuction);
  if(existingAuction)
    return existingAuction;

  const commitResponse = await axios.get(apiUrl, { headers : { Authorization: "token "+process.env.GITHUB_PERSONAL }});
  const commitOwnerUsername = commitResponse.data.author.login;
  const commitOwnerPictureUrl = commitResponse.data.author.avatar_url;
  const commitUrl = sanitizedCommitUrl;
  const commitTitle = title || commitResponse.data.commit.message;
  const commitDescription = description || "";
  //create art
  exec("python "+process.env.IMAGE_GENERATOR_DIR+"/generator.py "+apiUrl+" "+nftPublicKey+" "+process.env.ART_DIR, console.log);
  const commitArtUrl = "https://topcommits.com/art/"+nftPublicKey+".png";//"ipfs://topcommits/"+nftPublicKey;//todo
  const nftMetadataUrl = await storeIfps({
    name: "Top Commit #"+nftPublicKey,
    description: commitTitle,
    image: commitArtUrl
  });

  console.log(nftMetadataUrl);

  let endsAt = -1;
  const newAuction = new AuctionModel({
    nftPublicKey,
    commitTitle,
    commitOwnerUsername,
    commitOwnerPictureUrl,
    commitUrl,
    commitArtUrl,
    endsAt,
    totalAuction: 0,
    bids: [],
    nftMetadataUrl,
    commitDescription
  });
  console.log(newAuction)
  await newAuction.save();
  return newAuction;
  }
  catch(e){
    console.error(e);
  }
}

async function getAuction(nftPublicKey){
  return await AuctionModel.findOne({ nftPublicKey });
}

async function getOpenAuctions( start=0, end=100) {
  return await AuctionModel.find({endsAt : {$gt: Date.now()} }).sort({ totalAuction : -1 });
}

async function getWaitingAuctions( start=0, end=100) {
  return await AuctionModel.find({endsAt : -1 }).sort({ createdAt: 1 });
}

async function getLatestAuctions( start=0, end=100) {
  return await AuctionModel.find({}).sort({ createdAt : -1 }).limit(100);
}


async function getEndedAuctions( start=0, end=100){
  return await AuctionModel.find({ $and: [{endsAt : {$lt: Date.now()}}, { endsAt: {$gt : -1}}] }).sort({ totalAuction : -1 });
}

async function getUserAuctions(githubUsername) {
  return await AuctionModel.find({ commitOwnerUsername: githubUsername }).sort({ totalAuction : -1 });
}

async function getUserAuctionsHighestBidder(githubUsername, withdrawn=false){
  const user = await getUserFromUsername(githubUsername);
  console.log(user);
  if(!user)
    return [];
  return await AuctionModel.find({ lastBidderPublicKey: user.publicKey, withdrawn }).sort({ endsAt : -1});
}

async function getUserOwnedAuctions(githubUsername, claimed=false){
  return await AuctionModel.find({ commitOwnerUsername: githubUsername, claimed }).sort({ endsAt : -1});
}

async function updateLatestBid(nftPublicKey, userPublicKey, amount) {
  const auction = await AuctionModel.findOne({ nftPublicKey });
  let update = {lastBidderPublicKey: userPublicKey, totalAuction: amount};
  const NUMBER_OF_BLOCKS_AUCTION_LENGTH = 24*6; //24hrs 
  if(auction.endsAt == -1)
    update.endsAt = Date.now() + NUMBER_OF_BLOCKS_AUCTION_LENGTH * 10 * 60 * 1000; //1 block = 10 min
  await AuctionModel.updateOne({ nftPublicKey }, update);
}

async function setWithdrawn(nftPublicKey) {
  return await AuctionModel.updateOne({ nftPublicKey}, { withdrawn : true });
}

async function setClaimed(nftPublicKey) {
  return await AuctionModel.updateOne({ nftPublicKey}, { claimed : true });
}

module.exports.createAuction = createAuction;
module.exports.getOpenAuctions = getOpenAuctions;
module.exports.getWaitingAuctions = getWaitingAuctions;
module.exports.getLatestAuctions = getLatestAuctions;
module.exports.getEndedAuctions = getEndedAuctions;
module.exports.getUserAuctions = getUserAuctions;
module.exports.getAuction = getAuction;
module.exports.getUserAuctionsHighestBidder = getUserAuctionsHighestBidder;
module.exports.getUserOwnedAuctions = getUserOwnedAuctions;
module.exports.updateLatestBid = updateLatestBid;
module.exports.setClaimed = setClaimed;
module.exports.setWithdrawn = setWithdrawn;
