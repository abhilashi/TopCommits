// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./ethereum-erc721/src/contracts/tokens/nf-token-metadata.sol";
import "./ethereum-erc721/src/contracts/ownership/ownable.sol";

contract TopCommitMarketplace is NFTokenMetadata, Ownable{
    uint32 transactionFeePercentage;
    address payable private marketplaceOwner;
    uint256 ownerBalance;
    struct Bid {
        address payable bidder;
        uint256 bidInWei;
        string uri;
        bool claimed;
        uint256 startBlockTimestamp;
        bool flag;
    }
    mapping(uint256 => Bid) private auctions;
    constructor () {
        marketplaceOwner = payable(msg.sender);
        transactionFeePercentage = 0;
        ownerBalance = 0;
        nftName = "Top Commits by Questbook";
        nftSymbol = "TCQ";

    }


  function getSigner(bytes32 hash, bytes memory sig) public pure returns (address) {
    bytes32 r;
    bytes32 s;
    uint8 v;

    if (sig.length != 65) {
      return address(0);
    }

    assembly {
      r := mload(add(sig, 32))
      s := mload(add(sig, 64))
      v := and(mload(add(sig, 65)), 255)
    }

    if (v < 27) {
      v += 27;
    }

    if (v != 27 && v != 28) {
      return address(0);
    }

    return ecrecover(hash, v, r, s);
  }

    event BidMade(uint256 nftPublicKey, uint256 amount, address user);
    function bid(uint256 nftPublicKey, string memory uri, bytes memory signature) public payable {
        bytes32 uriHash = keccak256(abi.encodePacked(uri));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", uriHash));
        address nftSigner = getSigner(messageHash, signature);
        require(nftSigner == marketplaceOwner, "NFT Bids need to be signed by contract owner");
        if(auctions[nftPublicKey].flag){
            require(auctions[nftPublicKey].startBlockTimestamp + (1 days) > block.timestamp, "Auction has ended");
            require(!auctions[nftPublicKey].claimed, "This auction has ended");
            require(msg.value > auctions[nftPublicKey].bidInWei * 11/10, "Bid should be more than 110% of prev bid");
            //refund
            auctions[nftPublicKey].bidder.transfer(auctions[nftPublicKey].bidInWei);
        }
        else {
            auctions[nftPublicKey].startBlockTimestamp = block.timestamp;
            auctions[nftPublicKey].uri = uri;
            auctions[nftPublicKey].claimed = false;
            auctions[nftPublicKey].flag = true;
        }
        auctions[nftPublicKey].bidder = payable(msg.sender);
        auctions[nftPublicKey].bidInWei = msg.value * (1 - transactionFeePercentage/100);
        emit BidMade(nftPublicKey, msg.value, msg.sender);
    }

    function getBid(uint256 nftPublicKey) public view  returns(uint256){
        return auctions[nftPublicKey].bidInWei;
    }

    function getAuctionStart(uint256 nftPublicKey) public view returns( uint256 ){
        return auctions[nftPublicKey].startBlockTimestamp;
    }

    function setTransactionFeesPercentage(uint32 percentage) public {
        require(payable(msg.sender) == marketplaceOwner, "Only owner allowed to change percentage");
        require(percentage <= 1, "Transaction fees percentage cannot be more than 1%");
        transactionFeePercentage = percentage;
    }

    function getTransactionFeesPercentage() public view returns(uint32){
        return transactionFeePercentage;
    }



    event Withdrawn(uint256 nftPublicKey, address user);
    function withdraw(uint256 nftPublicKey) public payable {
        ownerBalance += msg.value;
        require(msg.sender != address(0), "Unknown user");
        require(auctions[nftPublicKey].startBlockTimestamp + (1 days) < block.timestamp, "Can be withdrawn only after the auction has ended");
        require(auctions[nftPublicKey].bidder == msg.sender, "Can be withdrawn only by the winning bidder");
        super._mint(msg.sender, nftPublicKey);
        super._setTokenUri(nftPublicKey, auctions[nftPublicKey].uri);
        emit Withdrawn(nftPublicKey, msg.sender);
    }

    function getWinningBidAddress(uint256 nftPublicKey) public view returns(address payable) {
        return auctions[nftPublicKey].bidder;
    }

    function getWinningBidAmount(uint256 nftPublicKey) public view returns(uint256){
        return auctions[nftPublicKey].bidInWei;
    }

    event Claimed(uint256 nftPublicKey, address user, uint256 amount);
    function claim(uint256 nftPublicKey, bytes memory signature) public {
        bytes32 keyHash = keccak256(abi.encodePacked(nftPublicKey, msg.sender));
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keyHash));
        require(auctions[nftPublicKey].startBlockTimestamp + (1 days) < block.timestamp, "Can be claimed only after the auction has ended");
        require(getSigner(messageHash, signature) == owner, "Needs signature from owner to claim auction bids");
        auctions[nftPublicKey].claimed = true;
        payable(msg.sender).transfer(auctions[nftPublicKey].bidInWei);
        emit Claimed(nftPublicKey, msg.sender, auctions[nftPublicKey].bidInWei);
    }


    function getOwnerBalance() public view returns(uint256){
      return ownerBalance;
    }

    function withdrawOnwerBalance() public {
      payable(owner).transfer(ownerBalance);
      ownerBalance = 0;
    }

    function getOwner() public view returns(address payable){
      return marketplaceOwner;
    }

    function getCurrentTimestamp() public view returns(uint256){
      return block.timestamp;
    }

    function getAuctionEnd(uint256 nftPublicKey) public view returns(uint256) {
      return auctions[nftPublicKey].startBlockTimestamp + (1 days);
    }
}


