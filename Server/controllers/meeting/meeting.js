const MeetingHistory = require("../../model/schema/meeting");
const mongoose = require("mongoose");

const add = async (req, res) => {
  try {
    const {
      agenda,
      attendes = [],
      attendesLead = [],
      related,
      location,
      dateTime,
      notes,
      createBy,
    } = req.body;

    // Validation
    const isValidObjectIds = (ids) =>
      Array.isArray(ids) &&
      ids.every((id) => mongoose.Types.ObjectId.isValid(id));

    // Check if attendes is a valid ObjectId if provided and not empty
    if (attendes && !isValidObjectIds(attendes)) {
      res.status(400).json({ error: "Invalid attendes value" });
    }
    if (attendesLead && !isValidObjectIds(attendesLead)) {
      res.status(400).json({ error: "Invalid attendesLead value" });
    }
    // Create meeting document
    const meeting = new MeetingHistory({
      agenda,
      attendes,
      attendesLead,
      location,
      related,
      dateTime,
      notes,
      createBy,
      createdBy: new Date(),
    });

    if (attendes.leng) {
      meeting.attendes = attendes;
    }
    if (attendesLead) {
      meeting.attendesLead = attendesLead;
    }

    const result = new MeetingHistory(meeting);
    await result.save();
    res.status(201).json(result);
  } catch (err) {
    console.log("Failed to create meeting:", err);
    res.status(400).json({ error: "Failed to create meeting : ", err });
  }
};

const index = async (req, res) => {
  query = req.query;
  query.deleted = false;
  if (query.createBy) {
    query.createBy = new mongoose.Types.ObjectId(query.createBy);
  }

  try {
    let result = await MeetingHistory.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "Contacts",
          localField: "attendes",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "Leads",
          localField: "attendesLead",
          foreignField: "_id",
          as: "Lead",
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "createBy",
          foreignField: "_id",
          as: "users",
        },
      },
      { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$contact", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$Lead", preserveNullAndEmptyArrays: true } },
      { $match: { "users.deleted": false } },
      {
        $addFields: {
          assignToName: {
            $cond: [
              { $ne: ["$contact", null] },
              {
                $concat: [
                  "$contact.title",
                  " ",
                  "$contact.firstName",
                  " ",
                  "$contact.lastName",
                ],
              },
              {
                $cond: [{ $ne: ["$Lead", null] }, "$Lead.leadName", ""],
              },
            ],
          },
        },
      },
      { $project: { users: 0, contact: 0, Lead: 0 } },
    ]);
    res.send(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const view = async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid meeting ID" });
    }

    let response = await MeetingHistory.findOne({ _id: req.params.id });
    if (!response) return res.status(404).json({ message: "no Data Found." });
    let result = await MeetingHistory.aggregate([
      { $match: { _id: response._id } },
      {
        $lookup: {
          from: "Contacts",
          localField: "attendes",
          foreignField: "_id",
          as: "contact",
        },
      },
      {
        $lookup: {
          from: "Leads",
          localField: "attendesLead",
          foreignField: "_id",
          as: "Lead",
        },
      },
      {
        $lookup: {
          from: "User",
          localField: "createBy",
          foreignField: "_id",
          as: "users",
        },
      },
      { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$contact", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$Lead", preserveNullAndEmptyArrays: true } },
      { $match: { "users.deleted": false } },
      {
        $addFields: {
          assignToName: {
            $cond: [
              { $ne: ["$contact", null] },
              {
                $concat: [
                  "$contact.title",
                  " ",
                  "$contact.firstName",
                  " ",
                  "$contact.lastName",
                ],
              },
              {
                $cond: [{ $ne: ["$Lead", null] }, "$Lead.leadName", ""],
              },
            ],
          },
          createByName: "$users.username",
        },
      },
      { $project: { users: 0, contact: 0, Lead: 0 } },
    ]);
    res.status(200).json(result[0]);
  } catch (err) {
    console.log("Error:", err);
    res.status(400).json({ Error: err });
  }
};

const deleteData = async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid meeting ID" });
    }

    const result = await MeetingHistory.findByIdAndUpdate(req.params.id, {
      deleted: true,
    });
    res.status(200).json({ message: "done", result });
  } catch (err) {
    res.status(404).json({ message: "error", err });
  }
};

const deleteMany = async (req, res) => {
  try {
    const result = await MeetingHistory.updateMany(
      { _id: { $in: req.body } },
      { $set: { deleted: true } }
    );

    if (result?.matchedCount > 0 && result?.modifiedCount > 0) {
      return res
        .status(200)
        .json({ message: "Tasks Removed successfully", result });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Failed to remove Meetings" });
    }
  } catch (err) {
    return res.status(404).json({ success: false, message: "error", err });
  }
};

module.exports = { add, index, view, deleteData, deleteMany };
