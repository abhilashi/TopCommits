//const topCommitNfts = artifacts.require("TopCommitsNFTs");
const topCommitMarketplace = artifacts.require("TopCommitMarketplace");

module.exports = function (deployer) {
  //deployer.deploy(topCommitNfts);
  deployer.deploy(topCommitMarketplace);
};
