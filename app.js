const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const User = require("./models/user");
const MongoDBStore = require("connect-mongodb-session")(session);
const flash = require("connect-flash");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const fs = require("fs");
const cors = require("cors");
const { config } = require("dotenv");

const errorController = require("./controllers/error");

config();
app.use(
  cors({
    origin: ["https://himanshu-firefly-fork-frontend-9i86s4gsq.vercel.app","http://localhost:5173","http://localhost:5174"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const MONGODB_URI = process.env.MONGO_URL;

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
// const modelRoutes = require("./routes/model");

const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true, // Recommended for security reasons
      secure: false, // Keep as false for localhost HTTP, true for HTTPS in production
      maxAge: 1000 * 60 * 60 * 24, // Session cookie max age in milliseconds
    },
  })
);

const logStream = fs.createWriteStream(path.join(__dirname, "access.Log"), {
  flags: "a",
});

app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: logStream }));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch((err) => console.log(err));
});

app.use(flash());

app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn;
  res.locals.post = req.session.post;
  next();
});

app.use((error, req, res, next) => {
  console.log(error);
  const statusCd = error.statusCode || 500;
  const mess = error.message;
  res.status(statusCd).json({ message: mess });
  next();
});
app.use(express.json());
app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
// app.use(bodyParser.json({ limit: '100mb' }));
// app.use(modelRoutes);

app.get("/500", errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  res.status(500).send("Error 500 Internal Server Error");
});

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    console.log("Connected to MongoDB");
    app.listen(4000);
  })
  .catch((err) => {
    console.log(err);
  });
