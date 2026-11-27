import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'kreation.agent@gmail.com',
        pass: 'uowo slrf shyf qhvu'
    }
});

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

const otpStore={}
let otp;
app.post("/send-otp",async(req,res)=>{
    const {email}=req.body;
    otp=Math.floor(100000 + Math.random() * 900000);
    otpStore[email]=otp;
    console.log(otpStore)
    await transporter.sendMail({
        from:"kreation.agent@gmail.com",
        to:email,
        subject:"OTP for verification",
        html:`<p>Your OTP for verification is <b>${otp}</b></p>` 
    })
    res.json({message:"OTP sent successfully",otp:otp})
})

app.post("/verify-otp",async(req,res)=>{
    const {email,enteredOtp}=req.body;

    if(enteredOtp===otpStore[email]){
        await transporter.sendMail({
            from:"kreation.agent@gmail.com",
            to:email,
            subject:"OTP Verified",
            html:`<p>Your OTP has been verified successfully.</p>`
        })
        const token=jwt.sign({email:email},"ecommerce_secret_key",{expiresIn:"1h"})
        res.json({message:"OTP verified successfully",token:token})
    
    }else{
        res.json({message:"Invalid OTP"})
    }
})


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});