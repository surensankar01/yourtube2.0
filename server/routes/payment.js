import express from "express";
import { createOrder, verifyPayment, handleWebhook } from "../controllers/payment.js";

const routes = express.Router();

routes.post("/order", createOrder);
routes.post("/verify", verifyPayment);
routes.post("/webhook", handleWebhook);

export default routes;
