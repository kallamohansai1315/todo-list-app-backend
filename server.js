
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Task = require("./models/Task");

const app = express();

app.use(cors());
app.use(express.json());

// Check whether the API is running
app.get("/", (req, res) => {
  res.json({
    message: "To-Do List Backend API is running"
  });
});

// CREATE a new task
app.post("/api/tasks", async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "A valid task title is required"
      });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate: dueDate || null
    });

    res.status(201).json({
      message: "Task created successfully",
      task
    });
  } catch (error) {
    next(error);
  }
});

// READ all tasks
app.get("/api/tasks", async (req, res, next) => {
  try {
    const { status, priority, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i"
      };
    }

    const tasks = await Task.find(filter).sort({
      createdAt: -1
    });

    res.json({
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
});

// READ one task by ID
app.get("/api/tasks/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// UPDATE a task
app.put("/api/tasks/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(updates, "title") &&
      (typeof updates.title !== "string" || !updates.title.trim())
    ) {
      return res.status(400).json({
        message: "Task title cannot be empty"
      });
    }

    if (updates.title) updates.title = updates.title.trim();

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({
      message: "Task updated successfully",
      task
    });
  } catch (error) {
    next(error);
  }
});

// DELETE a task
app.delete("/api/tasks/:id", async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.message);

  if (err.name === "ValidationError" ||
      err.name === "CastError") {
    return res.status(400).json({
      message: err.message
    });
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    return res.status(409).json({
      message: "Duplicate value"
    });
  }

  res.status(500).json({
    message: "Internal server error"
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();