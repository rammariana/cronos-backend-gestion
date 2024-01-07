import dotenv from "dotenv";
import mongoose from "mongoose";
import { Schema, model } from "mongoose";
import { storage } from "./firebaseConfig.js";
import {
  ref,
  getDownloadURL,
  uploadBytesResumable,
  deleteObject,
} from "firebase/storage";

// bd-audios-firebase-adminsdk-8fla7-f3659418c0.json

dotenv.config();
const mongoURI = process.env.API_KEY;

// 657a03edefb1bc5fc37586a1   657a53ae9e58a89a0eb632a0   idUsers

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
});

const userSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  date: { type: Date, default: new Date().toLocaleDateString() },
});

const taskSchema = new Schema({
  task_name: { type: String, required: true },
  task_days: { type: [String] }, // Esto va a depender de donde se haga click
  task_hour: { type: String }, // Esto va a depender de donde se haga click
  task_priority: { type: String, required: true },
  task_completed: { type: Boolean, default: false },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // FK(foreign key)
  username: { type: String, ref: "User" },
});

// Crear schema de notas y audios
const audioSchema = new Schema({
  audio_url: { type: String, required: true },
  audio_date: { type: String, required: true },
  audio_emoji: { type: String },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
});

const noteSchema = new Schema({
  note_title: { type: String, required: true },
  note_description: { type: String, required: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  note_date: { type: String, default: new Date().toLocaleDateString() },
});

const Person = model("Person", userSchema);
const Task = model("Task", taskSchema);
const Audio = model("Audio", audioSchema);
const Note = model("Note", noteSchema);

const getUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const userToFind = await Person.findOne({ _id: userId });
    res.json({ userToFind });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server" });
  }
};
const getAllUsers = async (req, res) => {
  try {
    const users = await Person.find().sort({ _id: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server" });
  }
};

const addUser = async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  try {
    const person = new Person({ username, email, password });
    const data = await person.save();
    res.json({ username: data.username, _id: data._id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server" });
  }
};

const addTaskToUser = async (req, res) => {
  const userId = req.params.id;

  const taskName = req.body.task_name;
  const taskDays = req.body.task_days;
  const taskHour = req.body.task_hour;
  const taskCompleted = req.body.task_completed;
  const taskPriority = req.body.task_priority;

  const userData = await Person.findOne({ _id: userId }).select("username");
  if (!userData) {
    return res.status(404).json({ error: "User not found" });
  }
  const userName = userData.username;

  try {
    const task = new Task({
      task_name: taskName,
      task_days: taskDays,
      task_hour: taskHour,
      task_priority: taskPriority,
      task_completed: taskCompleted,
      user_id: userId,
      username: userName,
    });

    const data = await task.save();
    res.json({
      task_id: data._id,
      task_name: data.task_name,
      task_days: data.task_days,
      task_hour: data.task_hour,
      task_priority: data.task_priority,
      task_completed: data.task_completed,
      user_id: data.user_id,
      username: data.username,
    });
  } catch (err) {
    console.log(err);
    res.status(404).json({ error: "Not Found" });
  }
};

const getAllTasksByUser = async (req, res) => {
  const userId = req.params.id;

  const userTasks = await Task.find({ user_id: userId });

  try {
    res.json(userTasks);
  } catch (err) {
    res.status(500).json({ error: "Internal server" });
  }
};

const editTask = async (req, res) => {
  const taskId = req.params.id;
  const { task_name, task_days, task_hour, task_priority, task_completed } =
    req.body;
  console.log(taskId);
  try {
    const taskInfo = await Task.findById(taskId);
    console.log(taskInfo);
    if (!taskInfo) {
      res.status(404).json({ error: "Task not found" });
    }

    taskInfo.task_name = task_name || taskInfo.task_name;
    taskInfo.task_days = task_days || taskInfo.task_days;
    taskInfo.task_hour = task_hour || taskInfo.task_hour;
    taskInfo.task_priority = task_priority || taskInfo.task_priority;
    taskInfo.task_completed = task_completed || taskInfo.task_completed;

    const updateTask = await taskInfo.save();
    //console.log(updateTask);
    res.json(updateTask);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal error" });
  }
};

const deleteTask = async (req, res) => {
  const taskId = req.params.id;

  try {
    taskToDelete = await Task.findByIdAndDelete(taskId);

    if (!taskToDelete) {
      return res.status(400).json({ error: "Not found" });
    }
    res.json({ message: "Tarea Eliminada exitosamente" });
  } catch (err) {
    res.status(500).json({ error: "Internal server" });
  }
};

const addAudio = async (req, res) => {
  const userId = req.params.id;
  const userData = await Person.findById(userId);
  const date = new Date().toLocaleDateString();

  try {
    if (!req.file) {
      return res
        .status(400)
        .send({ error: "Debes subir un archivo de audio." });
    }

    let fileBuffer = await req.file.buffer;
    const fileRef = ref(
      storage,
      `files/${req.file.originalname} ${Date.now()}`
    );

    const fileMetada = {
      contenteType: req.file.mimetype,
    };
    const fileUploadPromise = uploadBytesResumable(
      fileRef,
      fileBuffer,
      fileMetada
    );
    await fileUploadPromise;
    const url = await getDownloadURL(fileRef);

    // Almacenar la URL en MongoDB
    const audio = new Audio({
      audio_url: url,
      audio_date: date,
      user_id: userId,
      user_name: userData.username,
    });
    const data = await audio.save();
    res.status(200).json(data);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Error interno al subir el archivo.");
  }
};
const getAudios = async (req, res) => {
  const userId = req.params.id;

  try {
    const userAudios = await Audio.find({ user_id: userId });
    res.json(userAudios);
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: "internal server" });
  }
};
const editAudio = async (req, res) => {
  const audioId = req.params.id;
  const { audio_emoji } = req.body;
  try {
    const data = await Audio.findById(audioId);

    if (!data) {
      res.status(404).json({ error: "audio not found" });
    }
    data.audio_emoji = audio_emoji;
    const uploadAudio = await data.save();
    res.status(200).json({ message: "audio editado!" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: "Internal srever" });
  }
};
const deleteAudio = async (req, res) => {
  const audioId = req.params.id;

  try {
    const audioData = await Audio.findById(audioId);
    const audioURL = audioData.audio_url;

    if (!audioData) {
      res.status(404).json({ error: "audio not found" });
    }
    // Firebase
    const storageRef = ref(storage, audioURL);
    await deleteObject(storageRef);
    // Mongo
    await Audio.findByIdAndDelete(audioId);

    res.status(200).json({ message: "audio eliminado con éxito" });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: "Internal server" });
  }
};

const addNote = async (req, res) => {
  const userId = req.params.id;
  const { note_title, note_description } = req.body;
  const limitDescription = 200;
  const limitTitle = 25;

  try {
    const userData = await Person.findById(userId);

    // Settinglimits in words
    if (countWords(note_description) > limitDescription) {
      res.status(400).json({
        message: `note too long, should not exceed ${limitDescription} words`,
      });
    }
    if (countWords(note_title) > limitTitle) {
      res.status(400).json({
        message: `title too long, should not exceed ${limitTitle} words`,
      });
    }

    const note = new Note({
      note_title: note_title,
      note_description: note_description,
      user_id: userId,
      user_name: userData.username,
    });
    const data = await note.save();

    res.status(200).json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server" });
  }
};
const getAllNotes = async (req, res) => {
  const userId = req.params.id;

  try {
    const userNotes = await Note.find({ user_id: userId });
    if (userNotes.length === 0) {
      return res.status(404).json({ error: "there are no notes" });
    }
    res.json(userNotes);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server" });
  }
};
const getNote = async (req, res) => {
  const noteId = req.params.id;

  try {
    if (noteId.length === 0) {
      return res.status(404).json({ error: "note not found" });
    }
    const note = await Note.findById(noteId);
    res.json(note);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server" });
  }
};
const editNote = async (req, res) => {
  const noteId = req.params.id;
  const { note_description, note_title } = req.body;
  const limitDescription = 200;
  const limitTitle = 25;

  try {
    const noteData = await Note.findById(noteId);
    if (!noteData) {
      return res.status(404).json({ error: "not found" });
    }
    // Setting limit in words
    if (countWords(note_description) > limitDescription) {
      return res.status(400).json({
        message: `note too long, should not exceed ${limitDescription} words`,
      });
    }
    if (countWords(note_title) > limitTitle) {
      return res.status(400).json({
        message: `title too long, should not exceed ${limitTitle} words`,
      });
    }

    noteData.note_title = note_title || noteData.note_title;
    noteData.note_description = note_description || noteData.note_description;

    const updateNote = await noteData.save();
    res.json(updateNote);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server" });
  }
};

const deleteNote = async (req, res) => {
  const noteId = req.params.id;

  try {
    const noteToDelete = await Note.findByIdAndDelete(noteId);
    res.status(200).json({ message: "nota eliminada con éxito" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Internal server" });
  }
};

const countWords = (text) => {
  if (text && typeof text === "string") {
    const words = text.trim().split(/\s+/);
    return words.length;
  } else {
    console.log(typeof text);
  }
};

export default {
  addUser,
  getUser,
  getAudios,
  getAllUsers,
  addTaskToUser,
  editTask,
  getAllTasksByUser,
  deleteTask,
  addAudio,
  editAudio,
  deleteAudio,
  addNote,
  getAllNotes,
  getNote,
  editNote,
  deleteNote,
};
