var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  githubUsername: String,
  publicKey: String,
  createdAt: { type: Number, default: Date.now},
  totalAuction: { type: Number, default: 0 }
});
const UserModel = mongoose.model('UserModel', UserSchema );

async function getUserFromUsername(githubUsername) {
  return await UserModel.findOne({ githubUsername });
}

async function getUserFromPublicKey(publicKey) {
  return await UserModel.findOne({ publicKey });
}

async function getUsers( start=0, end=100) {
  return await UserModel.find({}).sort({ totalAuction: -1 });
}

async function createUser(githubUsername, publicKey) {
  const existingUser = await UserModel.findOne({ githubUsername });
  if(existingUser){
    await UserModel.updateOne({ githubUsername }, { publicKey });
  }
  else {
    await ((new UserModel({ githubUsername, publicKey })).save());
  }
}

async function createPlaceHolderUser(githubUsername) {
  const existingUser = await UserModel.findOne({ githubUsername });
  if(existingUser){
  }
  else {
    await ((new UserModel({ githubUsername })).save());
  }
}

async function incrementTotalAuction(githubUsername, amount) {
  await createPlaceHolderUser(githubUsername);
  await UserModel.updateOne({ githubUsername}, { $inc : { totalAuctions: amount }});
}

module.exports.getUserFromPublicKey = getUserFromPublicKey;
module.exports.getUserFromUsername = getUserFromUsername;
module.exports.createUser = createUser;
module.exports.createPlaceHolderUser = createPlaceHolderUser;
module.exports.incrementTotalAuction = incrementTotalAuction;