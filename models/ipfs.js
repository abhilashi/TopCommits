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

async function storeIfps(obj){
    return "https://ipfs.io/ipfs/"+(await storable.store(obj));
}

module.exports.storeIfps = storeIfps;
