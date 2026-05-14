// insurance_officer.js

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();

// =====================================
// CONFIG
// =====================================

const PORT = 3000;

const MONGO_URL =
  "mongodb+srv://insurance:liki%4028@fsd.rt9eyun.mongodb.net/insurance?retryWrites=true&w=majority&appName=fsd";

const JWT_SECRET = "mysecretkey";

// =====================================
// MIDDLEWARE
// =====================================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// =====================================
// MONGODB CONNECTION
// =====================================

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.log("MongoDB Connection Error");
    console.log(err);
  });

// =====================================
// USER SCHEMA
// =====================================

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("User", userSchema);

// =====================================
// CLAIM SCHEMA
// =====================================

const claimSchema = new mongoose.Schema(
  {
    patientName: String,

    hospitalName: String,

    amount: Number,

    status: {
      type: String,
      default: "Pending",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "claims",
  }
);

const Claim = mongoose.model("Claim", claimSchema);

// =====================================
// AUTH MIDDLEWARE
// =====================================

function auth(req, res, next) {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.redirect("/login");
    }

    const verified = jwt.verify(token, JWT_SECRET);

    req.user = verified;

    next();
  } catch (err) {
    console.log(err);
    res.redirect("/login");
  }
}

// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {
  res.redirect("/login");
});

// =====================================
// REGISTER PAGE
// =====================================

app.get("/register", (req, res) => {
  res.send(`

  <html>

  <head>

    <title>Register</title>

    <style>

      body{
        font-family:Arial;
        background:#f4f4f4;
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
      }

      .box{
        width:350px;
        background:white;
        padding:30px;
        border-radius:10px;
        box-shadow:0px 0px 10px rgba(0,0,0,0.2);
      }

      input{
        width:100%;
        padding:10px;
        margin-top:10px;
      }

      button{
        width:100%;
        padding:10px;
        margin-top:15px;
        background:#007bff;
        color:white;
        border:none;
        cursor:pointer;
      }

      a{
        text-decoration:none;
      }

    </style>

  </head>

  <body>

    <div class="box">

      <h2>Register</h2>

      <form method="POST" action="/register">

        <input
          type="text"
          name="username"
          placeholder="Enter Username"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Enter Email"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          required
        />

        <button type="submit">
          Register
        </button>

      </form>

      <br>

      <a href="/login">
        Already have account? Login
      </a>

    </div>

  </body>

  </html>

  `);
});

// =====================================
// REGISTER
// =====================================

app.post("/register", async (req, res) => {
  try {

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.send("All fields are required");
    }

    const existingUser = await User.findOne({
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return res.send("Username or Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: username,
      email: email,
      password: hashedPassword,
    });

    await newUser.save();

    console.log("User Registered Successfully");

    res.redirect("/login");

  } catch (err) {

    console.log("REGISTER ERROR:");
    console.log(err);

    res.send(err.message);
  }
});

// =====================================
// LOGIN PAGE
// =====================================

app.get("/login", (req, res) => {
  res.send(`

  <html>

  <head>

    <title>Login</title>

    <style>

      body{
        font-family:Arial;
        background:#f4f4f4;
        display:flex;
        justify-content:center;
        align-items:center;
        height:100vh;
      }

      .box{
        width:350px;
        background:white;
        padding:30px;
        border-radius:10px;
        box-shadow:0px 0px 10px rgba(0,0,0,0.2);
      }

      input{
        width:100%;
        padding:10px;
        margin-top:10px;
      }

      button{
        width:100%;
        padding:10px;
        margin-top:15px;
        background:#28a745;
        color:white;
        border:none;
        cursor:pointer;
      }

      a{
        text-decoration:none;
      }

    </style>

  </head>

  <body>

    <div class="box">

      <h2>Insurance Officer Login</h2>

      <form method="POST" action="/login">

        <input
          type="text"
          name="username"
          placeholder="Enter Username"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Enter Password"
          required
        />

        <button type="submit">
          Login
        </button>

      </form>

      <br>

      <a href="/register">
        Create New Account
      </a>

    </div>

  </body>

  </html>

  `);
});

// =====================================
// LOGIN
// =====================================

app.post("/login", async (req, res) => {
  try {

    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.send("User Not Found");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.send("Invalid Password");
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("token", token);

    res.redirect("/dashboard");

  } catch (err) {

    console.log("LOGIN ERROR:");
    console.log(err);

    res.send("Login Failed");
  }
});

// =====================================
// DASHBOARD
// =====================================

app.get("/dashboard", auth, async (req, res) => {
  try {

    const claims = await Claim.find().sort({ createdAt: -1 });

    let rows = "";

    claims.forEach((claim) => {

      let color = "orange";

      if (claim.status === "Approved") {
        color = "green";
      }

      if (claim.status === "Rejected") {
        color = "red";
      }

      rows += `

      <tr>

        <td>${claim.patientName || "N/A"}</td>

        <td>${claim.hospitalName || "N/A"}</td>

        <td>₹${claim.amount || 0}</td>

        <td style="color:${color};font-weight:bold;">
          ${claim.status || "Pending"}
        </td>

        <td>

          <form method="POST" action="/update-status/${claim._id}">

            <select name="status">

              <option value="Pending">
                Pending
              </option>

              <option value="Approved">
                Approved
              </option>

              <option value="Rejected">
                Rejected
              </option>

            </select>

            <button type="submit">
              Update
            </button>

          </form>

        </td>

      </tr>

      `;
    });

    res.send(`

    <html>

    <head>

      <title>Dashboard</title>

      <style>

        body{
          font-family:Arial;
          background:#f5f5f5;
          padding:20px;
        }

        .top{
          display:flex;
          justify-content:space-between;
          align-items:center;
        }

        table{
          width:100%;
          border-collapse:collapse;
          background:white;
          margin-top:20px;
        }

        th, td{
          border:1px solid #ddd;
          padding:12px;
          text-align:center;
        }

        th{
          background:#007bff;
          color:white;
        }

        button{
          padding:8px 12px;
          border:none;
          cursor:pointer;
        }

        .logout{
          background:red;
          color:white;
        }

        .card{
          background:white;
          padding:20px;
          border-radius:10px;
          margin-top:20px;
        }

      </style>

    </head>

    <body>

      <div class="top">

        <h2>
          Insurance Officer Dashboard
        </h2>

        <a href="/logout">

          <button class="logout">
            Logout
          </button>

        </a>

      </div>

      <div class="card">

        <h3>
          Claim Summary
        </h3>

        <p>
          Total Claims:
          <b>${claims.length}</b>
        </p>

        <p>
          Approved:
          <b style="color:green;">
            ${claims.filter(c => c.status === "Approved").length}
          </b>
        </p>

        <p>
          Pending:
          <b style="color:orange;">
            ${claims.filter(c => c.status === "Pending").length}
          </b>
        </p>

        <p>
          Rejected:
          <b style="color:red;">
            ${claims.filter(c => c.status === "Rejected").length}
          </b>
        </p>

      </div>

      <h3>
        Claim History
      </h3>

      <table>

        <tr>

          <th>Patient Name</th>
          <th>Hospital</th>
          <th>Amount</th>
          <th>Status</th>
          <th>Update Status</th>

        </tr>

        ${rows}

      </table>

    </body>

    </html>

    `);

  } catch (err) {

    console.log("DASHBOARD ERROR:");
    console.log(err);

    res.send(err.message);
  }
});

// =====================================
// UPDATE STATUS
// =====================================

app.post("/update-status/:id", auth, async (req, res) => {
  try {

    await Claim.findByIdAndUpdate(req.params.id, {
      status: req.body.status,
    });

    res.redirect("/dashboard");

  } catch (err) {

    console.log("UPDATE ERROR:");
    console.log(err);

    res.send("Status Update Failed");
  }
});

// =====================================
// LOGOUT
// =====================================

app.get("/logout", (req, res) => {

  res.clearCookie("token");

  res.redirect("/login");
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
  console.log(`Server Running On http://localhost:${PORT}`);
});