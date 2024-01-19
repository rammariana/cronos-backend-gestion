import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";

import errorController from "./controllers/errorController.js";
import taskController from "./controllers/taskController.js";

const app = express();
const port = 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors()); // Protección de peticiones
app.use(helmet()); // Protege aplicaciones express
app.use(morgan("dev")); //Registra info de solicitudes http
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Indica: permite el análisis de datos?

app.get("/users", taskController.getAllUsers); // Get all users
app.get("/user/:id", taskController.getUser); // Get one user by id (authentications)
app.get("/user/:id/tasks", taskController.getAllTasksByUser); // Get all tasks by user
app.get("/user/:id/audios", taskController.getAudios); // Get all audios & delete audios expired
app.get("/user/:id/notes", taskController.getAllNotes); // Get all notes by user
app.get("/note/:id", taskController.getNote); // Get note by id
//POST
app.post("/user", taskController.addUser); // Add a new user (create new user)
app.post("/user/:id", taskController.addTaskToUser); // Add task to user
app.post("/user/:id/audio", upload.single("audio"), taskController.addAudio); // Upload/add audio & send to db
app.post("/user/:id/note", taskController.addNote); // Add note by user
//PUT
app.put("/audio/:id", taskController.editAudio); // Edit audio (add emoji to identify task)
app.put("/task/:id", taskController.editTask); // Edit a user´s task
app.put("/note/:id", taskController.editNote); // Edit a user´s note
// DELETE
app.delete("/audio/:id", taskController.deleteAudio); // Delete audio (user) delete in mongo and firebase
app.delete("/task/:id", taskController.deleteTask); // Delete a user´s task
app.delete("/user/:id", taskController.deleteAllTasks); // Delete all user's tasks
app.delete("/note/:id", taskController.deleteNote); // Delete a user´s note
/*
  EDIT DAYS
If you are going to add a day to the array of days, it is necessary to create a copy of the array, push on it and send the copy of the array, push and send the new array
  EDIT COMPLETED
  Send only the completed key (true or false)
*/

app.use(errorController);

app.listen(port, () => {
  console.log(`Iniciando app en http://localhost:${port}`);
});
