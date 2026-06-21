import Room from "../Modals/room.js";

/** POST /room – create a new room */
export const createRoom = async (req, res) => {
  const { roomId, hostId } = req.body;
  if (!roomId || !hostId) {
    return res.status(400).json({ message: "roomId and hostId are required" });
  }
  try {
    // Check if room already exists
    const existing = await Room.findOne({ roomId });
    if (existing && existing.isActive) {
      return res.status(409).json({ message: "Room already exists" });
    }
    const room = new Room({ roomId, hostId, isActive: true });
    await room.save();
    return res.status(201).json({ room });
  } catch (error) {
    console.error("createRoom error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/** GET /room/:id – check if a room exists and is active */
export const getRoom = async (req, res) => {
  const { id } = req.params;
  try {
    const room = await Room.findOne({ roomId: id });
    if (!room || !room.isActive) {
      return res.status(404).json({ message: "Room not found or inactive" });
    }
    return res.status(200).json({ room });
  } catch (error) {
    console.error("getRoom error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/** DELETE /room/:id – host closes the room */
export const closeRoom = async (req, res) => {
  const { id } = req.params;
  try {
    await Room.findOneAndUpdate({ roomId: id }, { isActive: false });
    return res.status(200).json({ message: "Room closed" });
  } catch (error) {
    console.error("closeRoom error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
