const express = require("express");
const { authMiddleware } = require("../middleware");
const { Account, User } = require("../db");
const router  = express.Router();
const mongoose = require("mongoose");

router.get("/balance",authMiddleware,async (req,res)=>{
    const account = await Account.findOne({
        userId:req.userId
    });
    res.json({
        balance:account.balance
    })
})

router.post("/transfer", authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { amount, to } = req.body;
        const account = await Account.findOne({ userId: req.userId }).session(session);
        if (!account) {
            await session.abortTransaction();
            return res.status(400).json({ msg: "Account not found" });
        }

        if (account.balance < amount) {
            await session.abortTransaction();
            return res.status(400).json({ msg: "Insufficient balance" });
        }
        if (!mongoose.Types.ObjectId.isValid(to)) {
            await session.abortTransaction();
            return res.status(400).json({ msg: "Invalid recipient account ID" });
        }
        const newAmount = account.balance - req.body.amount;
        const name = await User.findOne({_id: req.userId});
        const userName = name.username;
        const toAccount = await Account.findOne({ userId: to }).session(session);
        if (!toAccount) {
            await session.abortTransaction();
            return res.status(400).json({ msg: "Recipient account not found" });
        }

        await Account.updateOne({ userId: req.userId }, {
            $inc: { balance: -amount }
        }).session(session);

        await Account.updateOne({ userId: to }, {
            $inc: { balance: amount }
        }).session(session);
        await session.commitTransaction();
        res.json({ 
            msg: "Transfer successful",
            newAmount,
            userName
         });
    } catch (error) {
        await session.abortTransaction();
        console.error("Transfer error: ", error);
        res.status(500).json({ msg: "Internal server error" });
    } finally {
        session.endSession();
    }
});


module.exports = router;