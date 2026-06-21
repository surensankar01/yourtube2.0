import express from "express";
import { createRoom, getRoom, closeRoom } from "../controllers/room.js";

const routes = express.Router();

routes.post("/", createRoom);
routes.get("/:id", getRoom);
routes.delete("/:id", closeRoom);

export default routes;
