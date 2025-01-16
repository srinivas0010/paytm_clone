require('dotenv').config();
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const zod = require("zod");
const {User, Account} = require("../db");
const { authMiddleware } = require("../middleware");
const signupSchema = zod.object({
    username:zod.string().email(),
    password:zod.string(),
    firstName:zod.string(),
    lastName:zod.string()
})

router.post("/signup",async(req,res)=>{
    const body = req.body;
    const {success} = signupSchema.safeParse(req.body);
    if(!success){
        return res.json({
            msg:"Invalid inputs"
        })
    }
    const user = await User.findOne({
        username:body.username
    })
    if(user){
        return res.json({
            msg:"Email already taken or Invalid inputs"
        })
    }

    const dbUser = await User.create(body);
    const userId = dbUser._id;
    const intialAmount =  Math.round(1 + Math.random() * 10000);
    await Account.create({
        userId,
        balance:intialAmount
    })

    const token = jwt.sign({
        userId:userId
    },process.env.JWT_SECRET)
    res.json({
        msg:"User created successfully",
        intialAmount,
        token:token
    })
})
const signinSchema = zod.object({
    username: zod.string().email(),
    password: zod.string().min(6)
});
router.post('/signin', async (req, res) => {

    if (!(signinSchema.safeParse(req.body).success)) {
        res.status(411).json({
            msg: "Incorrect inputs"
        });
    }
    else {
        try {

            const user = await User.findOne({
                username: req.body.username
            });

            if(!user || user.password!=req.body.password){
                return res.status(400).json({
                    msg:"user not found"
                })
            }

            const account = await Account.findOne({
                userId: user._id
            });

            const intialAmount = account.balance;

            if (true) {

                const token = jwt.sign({
                    userId: user._id
                }, process.env.JWT_SECRET);

                res.status(200).json({
                    token,
                    intialAmount
                });

                return;

            }
        } catch (error) {
            console.log(error);
            res.status(500).json({
                msg: "Internal server error"
            })
        }
    }

});

const updateBody = zod.object({
    password:zod.string().optional(),
    firstName:zod.string().optional(),
    lastName:zod.string().optional()
})
router.put("/",authMiddleware,async (req,res)=>{
    const {success} = updateBody.safeParse(req.body)
    if(!success){
        return res.status(411).json({
            msg:"Error while updating information"
        })
    }
    await User.updateOne({
        _id:req.userId
    },req.body)
    res.json({
        message:"Updated successfully"
    })
})
router.get("/bulk",async (req,res)=>{
    const filter = req.query.filter || "";

    const users =await User.find({
        $or:[{
            firstName:{
                "$regex":filter
            }
        },{
            lastName:{
                "$regex":filter
            }
        }]
    })
    res.json({
        user: users.map(user =>({
            username:user.username,
            firstName:user.firstName,
            lastName:user.lastName,
            _id:user._id
        }))
    })
})

module.exports = router;