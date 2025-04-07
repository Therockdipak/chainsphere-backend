import prisma from "../DB/config.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { contractInstance } from "../Web3/Provider/provider.js";


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
    const { address, value} = req.body;
    console.log(`address ------------->  ${req.body}`)
   
    
    return res.status(201).json(new ApiResponse(200, {}, `reward transfer successfully`))
  } catch (error) {
      console.log(`error while giving staking reward`, error)
      return res.status(501).json(new ApiResponse(500, {}, `Internal server error`));
    
  }
}
