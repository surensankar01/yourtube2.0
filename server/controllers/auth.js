import mongoose from "mongoose";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import otpModel from "../Modals/otp.js";
import { sendOtpEmail } from "../utils/emailSender.js";

export const sendOtp = async (req, res) => {
  const { identifier } = req.body; // email or phone number
  if (!identifier) {
    return res.status(400).json({ message: "Identifier is required" });
  }

  // Determine method: email or phone
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    // Delete any existing OTPs for this identifier
    await otpModel.deleteMany({ identifier });

    // Save new OTP
    await otpModel.create({ identifier, otpHash, expiresAt });

    if (isEmail) {
      const emailResult = await sendOtpEmail({ email: identifier, otp });
      if (emailResult.success) {
        return res.status(200).json({
          success: true,
          method: "email",
          message: "OTP has been sent to your email address.",
          etherealUrl: emailResult.etherealUrl || null,
        });
      } else {
        return res.status(500).json({ message: "Failed to send email OTP." });
      }
    } else {
      // Mobile OTP: Mock via console logging
      console.log(`\n=================== [SMS MOCK OTP] ===================`);
      console.log(`To Mobile Number: ${identifier}`);
      console.log(`OTP Code        : ${otp}`);
      console.log(`======================================================\n`);
      
      return res.status(200).json({
        success: true,
        method: "sms",
        message: "OTP sent successfully (mocked). Check the server console for the OTP code.",
        // Note: otp is intentionally NOT returned in the response for security.
        // In development, the OTP is printed to the server terminal.
      });
    }
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyOtp = async (req, res) => {
  const { identifier, otp } = req.body;
  if (!identifier || !otp) {
    return res.status(400).json({ message: "Identifier and OTP are required" });
  }

  try {
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpDoc = await otpModel.findOne({
      identifier,
      otpHash,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Delete OTP once verified to prevent replay attacks
    await otpModel.deleteOne({ _id: otpDoc._id });

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    let user;

    if (isEmail) {
      user = await users.findOne({ email: identifier });
      if (!user) {
        // Create a new user for this email
        user = await users.create({
          email: identifier,
          name: identifier.split("@")[0],
          planType: "free",
        });
      }
    } else {
      user = await users.findOne({ phoneNumber: identifier });
      if (!user) {
        // Create a new user for this phone number
        // Generates placeholder email since it is required in the DB schema
        const dummyEmail = `${identifier}@phone.yourtube.com`;
        
        // Also check if a user happens to have this placeholder email already
        const existingEmailUser = await users.findOne({ email: dummyEmail });
        if (existingEmailUser) {
          user = existingEmailUser;
          user.phoneNumber = identifier;
          await user.save();
        } else {
          user = await users.create({
            email: dummyEmail,
            phoneNumber: identifier,
            name: `User_${identifier.slice(-4)}`,
            planType: "free",
          });
        }
      }
    }

    return res.status(200).json({ result: user });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    } else {
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

