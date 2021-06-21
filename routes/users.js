var express = require('express');
const { getUserAuctionsHighestBidder, getUserOwnedAuctions } = require('../models/auction');
const { signingPublicKey } = require('../models/blockchain');
const { getUserFromUsername, createUser } = require('../models/user');
var router = express.Router();


/* GET users listing. */
router.get('/my_profile', async function(req, res, next) {
  if(!req.session.github) {
    return res.redirect('/oauth-any/github/login?state=/users/new_profile');
  }
  const user = await getUserFromUsername(req.session.github.login);
  if(!user)
    return res.redirect('/users/new_profile');
  
  const winningAuctions = await getUserAuctionsHighestBidder(req.session.github.login, false);
  const withdrawnAuctions = await getUserAuctionsHighestBidder(req.session.github.login, true);
  const unclaimedAuctions = await getUserOwnedAuctions(req.session.github.login, false);
  const claimedAuctions = await getUserOwnedAuctions(req.session.github.login, true);
  console.log(winningAuctions);
  return res.render('profile', { winningAuctions, withdrawnAuctions, unclaimedAuctions, claimedAuctions, user });
});

router.get('/new_profile', async function(req, res, next) {
  console.log(req.session.github, req.session);
  if(!req.session.github) {
    return res.redirect('/oauth-any/github/login?state=/users/new_profile');
  }
  return res.render('new_profile', { githubUser: req.session.github });  
});

router.get('/new_profile/:signature', async function(req, res, next) {
  console.log(req.session.github, req.session);
  if(!req.session.github) {
    return res.redirect('/oauth-any/github/login?state=/users/new_profile');
  }
  const publicKey = signingPublicKey(req.session.github.login, req.params.signature);
  await createUser(req.session.github.login, publicKey);
  res.redirect('/users/my_profile');
});

router.get('/logout', async function(req, res){
  delete req.session.github;
  res.render('logout');
});

module.exports = router;
