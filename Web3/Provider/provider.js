import { ethers } from "ethers";
import CHAINSPHERE_CONTRACT_ABI from "../ABI/chainsphereABI.json"  with { type: "json" };



const address = process.env.CONTRACT_ADDRESS
const privateKey = process.env.PRIVATE_KEY



// console.log(`addresss ------------->`, CHAINSPHERE_CONTRACT_ABI);
// console.log(`privateKey ------------->`, privateKey);

export const contractInstance = async () => {
    try {
      const wallet = new ethers.Wallet(privateKey);
      const provider = new ethers.JsonRpcProvider(
        process.env.INFURA_PROVIDER_URL
      );
      const connectedWallet = wallet.connect(provider);
      const contract = new ethers.Contract(address, CHAINSPHERE_CONTRACT_ABI, connectedWallet);
  
      return contract;
    } catch (error) {
      console.log(error);
      return res
        .status(501)
        .json(new ApiResponse(500, error, `Internal server error`));
    }
};