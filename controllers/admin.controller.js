import prisma from "../DB/config.js";
import { ethers } from "ethers";
import { ApiResponse } from "../utils/ApiResponse.js";
import { contractInstance } from "../Web3/Provider/provider.js";
import { warnEnvConflicts } from "@prisma/client/runtime/library";


// console.log(`contractInstance ----------->`, contractInstance);


export const makeAmbassdorHandle = async (req, res) => {
  try {
    console.log(`req.params ----------------> ${req.query.id}`);
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(req.query.id),
      },
    });

    if (!user)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `User does not exists`));
    const checkAdmin = await prisma.user.findUnique({
      where: {
        id: req.user.id,
        roll: "ADMIN",
      },
    });

    console.log(`checkAdmin ------------->`, checkAdmin);

    if (!checkAdmin)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `Unauthorized request`));

    const ambassadorExists = await prisma.ambassador.findFirst({
      where: {
        userId: parseInt(req.query.id),
      },
    });

    if (ambassadorExists)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `Ambassador already exists`));

    await prisma.ambassador.create({
      data: {
        userId: parseInt(req.query.id),
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Ambassador added successfully`));
  } catch (error) {
    console.log(`error while making ambassador ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};

export const makeCoreTeamHandle = async (req, res) => {
  try {
    console.log(`req.params ----------------> ${req.query.id}`);
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(req.query.id),
      },
    });

    if (!user)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `User does not exists`));


    const checkAdmin = await prisma.user.findUnique({
      where: {
        id: req.user.id,
        roll: "ADMIN",
      },
    });

    console.log(`checkAdmin ------------->`, checkAdmin);

    if (!checkAdmin)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `Unauthorized request`));

    const ambassadorExists = await prisma.coreTeamMembers.findFirst({
      where: {
        userId: parseInt(req.query.id),
      },
    });

    if (ambassadorExists)
      return res
        .status(404)
        .json(new ApiResponse(400, {}, `core team member already exists`));

    await prisma.coreTeamMembers.create({
      data: {
        userId: parseInt(req.query.id),
      },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Core team members added successfully`));
  } catch (error) {
    console.log(`error while making core member ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};


export const getAllTransactions=async(req, res)=>{
  try {
    const allTxns = await prisma.transaction.findMany({})

    if(allTxns.length <= 0) return res.status(404).json(new ApiResponse(400, {}, `No transaction found in the database`))

    console.log(`allTxns ----------------->`, allTxns)

    return res.status(200).json(new ApiResponse(200, allTxns, `All transactions fetched successfully`))
  } catch (error) {
    console.log(`error while getting all transactions ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
    
  }
}


export const getContractOwner= async(req, res)=>{
  try {
    const contract = await contractInstance()
    const owner = await contract.owner();
    console.log(`owner  --------------->`, owner);
    

    return res.status(201).json(new ApiResponse(200, owner, `owner fetched successfully`))
  } catch (error) {
    console.log(`error while getting contract owner ${error.message}`);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
    
    
  }
}



export const stakingRewardHandle = async(req, res)=>{
  try {
    const { address} = req.body;
    let contract;
    // console.log(`address ------------->  ${req.body}`)
    
    contract = await contractInstance()



    // const address = `0xf24fC8305408C55a09Ac115DA5Eb406Fe3058d07`
    // const value = await ethers.parseUnits("2", 18)
    // const timestamp = 600

     contract = await contractInstance()
    const tx = await contract.TransferRewards(address, value, timestamp);
    tx.wait()

    console.log(`tx ---------------->`, tx);
    
    
    return res.status(201).json(new ApiResponse(200, tx, `reward transfer successfully`))
  } catch (error) {
      console.log(`error while giving staking reward`, error)
      return res.status(501).json(new ApiResponse(500, {}, `Internal server error`));
    
  }
}


// export const claimRewards = async(req, res)=>{
//   try {
//     const contract = await contractInstance()
//     const tx = await contract.
      
//     }

//   } catch (error) {
//     console.log(`error while claiming  reward`, error)
//     return res.status(501).json(new ApiResponse(500, {}, `Internal server error`));
    
//   }
// }


export const priceOfToken = async(req, res)=>{
  try {
    const contract = await contractInstance();

    // const tx = await contract.icoStart();

    // const date = new Date(Number(tx) * 1000);
    // return res.status(200).json(new ApiResponse(200, date, 'token price fetched successfully'))

    const tx = await contract.tokenPrice()

      
    console.log(`tx ------------>`, Number(tx))

    return res.status(200).json(new ApiResponse(200,  `${Number(tx)/Number(10**18)} USDT`, 'token price fetched successfully'))
    
  } catch (error) {
    console.log(error)

    return res.status(501).json(new ApiResponse(500, {}, `Internal server error`))
  }
}




// round 25%
// round 15%
// round 10%
// round 3 %