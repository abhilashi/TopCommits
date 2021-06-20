var express = require('express');
var router = express.Router();
var { createAuction, getOpenAuctions, getLatestAuctions, getAuction, getUserAuctions } = require('../models/auction');
const { getBids } = require('../models/bid');
const Crypto = require('crypto');
const moment = require('moment');
const { getUserFromUsername } = require('../models/user');
const { signMessage, signMessageMulti } = require('../models/blockchain');

/* GET home page. */
router.get('/', async function(req, res, next) {
  let { feed, start } = req.query;
  let user = null;
  let auctions = [];
  let feedTitle = "Ongoing Auctions";
  if(feed === "open" || !feed){
    auctions = await getOpenAuctions();
    feedTitle = "Ongoing Auctions";
    feed = "open";
  }
  else if(feed === "latest"){
    auctions = await getLatestAuctions();
    feedTitle = "Newest Auctions";
  }
  else if(feed.startsWith("creator$$")){
    auctions = await getUserAuctions(feed.split("creator$$")[1]);
    feedTitle = feed.split("creator$$")[1]+"'s Commits";
  }
  else {
    auctions = await getOpenAuctions();
    feed = "open"
  }
  console.log(auctions);
  let bids = [];
  if(auctions.length > 0){
    bids = await getBids(auctions[0].nftPublicKey);
  }
  if(req.session.github){
    user = await getUserFromUsername(req.session.github.login)
  }
  if(feed!=='latest' && auctions.length == 0){
    return res.redirect('/?feed=latest');
  }
  res.render('index', { title: 'Express', auctions,  feedTitle, feed, bids, user});
});

router.post('/create_auction', async function(req, res){
  res.send(await createAuction(req.body.commitUrl));
});

router.get('/auctions/:auctionId', async function(req, res){
  const auction = await getAuction(req.params.auctionId);
  if(!auction)
    return res.render('error404');
  let bids = await getBids(auction.nftPublicKey);
  let user = null;
  let show = "placebid";
  let claimSignature = "";
  if(req.session.github){
    user = await getUserFromUsername(req.session.github.login)
    claimSignature = signMessageMulti(auction.nftPublicKey, user.publicKey);
    console.log(auction.nftPublicKey + user.publicKey, claimSignature);
  }
  
  if(auction.endsAt === -1){
    show = "placebid";
  }
  else if(auction.endsAt < Date.now() && user && auction.commitOwnerUsername === user.githubUsername && !auction.claimed){
    show = "claim"
  }
  else if(auction.endsAt < Date.now() && user && auction.lastBidderPublicKey === user.publicKey && !auction.withdrawn){
    show = "withdraw"
  }
  else if(auction.endsAt < Date.now() && user && auction.lastBidderPublicKey === user.publicKey && auction.withdrawn){
    show = "withdrawn"
  }
  else if(auction.endsAt < Date.now()){
    show = "ended"
  }

  const bidSignature = signMessage(auction.nftMetadataUrl);
  res.render('auction', {auction, bids, Crypto, moment, user, bidSignature, claimSignature, show});
})

module.exports = router;
