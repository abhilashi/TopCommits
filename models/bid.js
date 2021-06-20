var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BidSchema = new Schema({
  txHash: String,
  userPublicKey: String,
  nftPublicKey: Number,
  amountInWei: Number,
  metaData : Object
});

const BidModel = mongoose.model('BidModel', BidSchema );

async function getBids(nftPublicKey){
  return await BidModel.find({ nftPublicKey }).sort({ amountInWei : -1});
}

async function createBid(txHash, userPublicKey, nftPublicKey, amountInWei) {
  await (new BidModel({
    txHash, userPublicKey, nftPublicKey, amountInWei
  })).save()
}

module.exports.getBids = getBids;
module.exports.createBid = createBid;
