// This file is the main Express backend server that handles user authentication, 
// insurance claim uploads, AI-based OCR and fraud analysis integration,
//  and stores analyzed claim data into MongoDB.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const connectDB = require('./db');

const aiService = require('./aiService');
const upload = require('./upload');

const Claim = require('./models/Claim');
const User = require('./models/User');

const app = express();

/* ================= DATABASE ================= */

connectDB();

/* ================= MIDDLEWARE ================= */

app.use(cors());

app.use(express.json());

/* ================= REGISTER ================= */

app.post('/register', async (req, res) => {

  try {

    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {

      return res.status(400).json({
        msg: 'User already exists'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({

      name,
      email,

      password: hash,

      role: 'officer'
    });

    res.json({

      success: true,

      message: 'Registration successful',

      user
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Registration failed'
    });
  }
});

/* ================= LOGIN ================= */

app.post('/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {

      return res.status(400).json({
        msg: 'No user found'
      });
    }

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {

      return res.status(400).json({
        msg: 'Wrong password'
      });
    }

    const token = jwt.sign(

      {
        id: user._id
      },

      process.env.JWT_SECRET,

      {
        expiresIn: '1d'
      }
    );

    // res.json({

    //   success: true,

    //   token,

    //   user: {
    //     id: user._id,
    //     name: user.name,
    //     email: user.email
    //   }
    // });
    res.json({

  success: true,

  token,

  role: user.role,

  name: user.name,

  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  }
});

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Login failed'
    });
  }
});

/* ================= AUTH MIDDLEWARE ================= */

const auth = (req, res, next) => {

  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {

      return res.status(403).json({
        error: 'No token provided'
      });
    }

    const token =
      authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (err) {

    console.error(err);

    return res.status(401).json({
      error: 'Invalid token'
    });
  }
};

/* ================= FILE UPLOAD ================= */

app.post(
  '/upload',
  auth,
  upload.single('file'),

  async (req, res) => {

    try {

      const file = req.file;

      if (!file) {

        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      console.log('UPLOAD RECEIVED');

      /* ================= AI ANALYSIS ================= */

      const result =
        await aiService.analyzeClaimDocument(
          file.path
        );

      console.log(
        "OCR RESULT:",
        result.extractedData
      );

      /* ================= CLAIM AMOUNT CLEAN ================= */

      const rawAmount =
        result.extractedData.claimAmount;

      const cleanedAmount = rawAmount
        ? Number(
            String(rawAmount)
              .replace(/[^\d]/g, '')
          )
        : 0;

      /* ================= SAVE CLAIM ================= */

      const claim = await Claim.create({

        user_id: req.user.id,
        uploaded_by: req.user.id,

        status: "Pending Review",

        policy_number:
          result.extractedData.policyNumber || "N/A",

        hospital_name:
          result.extractedData.hospitalName || "N/A",

        insured_name:
          result.extractedData.insuredName || "N/A",

        doctor_name:
          result.extractedData.treatingDoctor || "N/A",

        incident_details:
          result.extractedData.incidentDetails || "N/A",

        incident_date:
          result.extractedData.claimDate || null,

        claim_amount:
          cleanedAmount,

        file_path:
          file.path,

        risk_score:
          result.riskScore || 0,

        risk_level:
          result.riskLevel || "Low",

        justification:
          result.justification || "",

        documents: [

          {
            file_name: file.originalname,

            file_type: file.mimetype
          }
        ],

        analysis: {

          extracted_text:
            result.extractedText || "",

          missing_fields:
            result.missingFields || [],

          fraud_flag:
            result.fraudFlag || false,

          extracted_fields:
            result.extractedData || {},

          summary:
            result.justification || ""
        }
      });

      /* ================= RESPONSE ================= */

      res.json({

        success: true,

        message:
          'Claim analyzed successfully',

        claim
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error: 'Upload failed'
      });
    }
  }
);

/* ================= CLAIM HISTORY ================= */

app.get('/claims', auth, async (req, res) => {

  try {

    const claims = await Claim.find({

      user_id: req.user.id

    }).sort({

      createdAt: -1
    });

    res.json(claims);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Failed to fetch claims'
    });
  }
});

/* ================= ROOT ================= */

app.get('/', (req, res) => {

  res.send(
    'Insurance Claim Analyzer Backend Running'
  );
});


  /* ================= UPDATE CLAIM STATUS ================= */

  app.put(
    "/claims/:id/status",

    async (req, res) => {

      try {

        const { status } = req.body;

        console.log("STATUS:", status);

        console.log("CLAIM ID:", req.params.id);

        const updatedClaim =
          await Claim.findByIdAndUpdate(

            req.params.id,

            {
              $set: {
                status: status
              }
            },

            {
              new: true
            }
          );

        console.log(
          "UPDATED CLAIM:",
          updatedClaim
        );

        res.json(updatedClaim);

      } catch (err) {

        console.error(err);

        res.status(500).json({
          error: "Failed to update status"
        });
      }
    }
  );
/* ================= START SERVER ================= */

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );
});