// blueprint/template for how every insurance claim document should be stored inside MongoDB.


const mongoose = require("mongoose");

const ClaimSchema = new mongoose.Schema({

  /* ================= USER ================= */

  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  /* ================= CLAIM DETAILS ================= */

  policy_number: String,

  claim_amount: Number,

  incident_details: String,

  incident_date: String,

  insured_name: String,

  hospital_name: String,

  doctor_name: String,

  /* ================= FILE DETAILS ================= */

  file_path: String,

  upload_date: {
    type: Date,
    default: Date.now
  },

  /* ================= RISK ANALYSIS ================= */

  risk_score: {
    type: Number,
    default: 0
  },

  risk_level: {
    type: String,
    default: "Low"
  },
  status: {
  type: String,
  default: "Pending Review"
},
  justification: String,

  /* ================= DOCUMENTS ================= */

  documents: [
    {
      file_name: String,

      file_type: String,

      upload_time: {
        type: Date,
        default: Date.now
      }
    }
  ],

  /* ================= AI ANALYSIS ================= */

  analysis: {

    extracted_text: String,

    missing_fields: [String],

    fraud_flag: {
      type: Boolean,
      default: false
    },

    extracted_fields: {
      type: Object,
      default: {}
    },

    summary: String
  }

}, {
  timestamps: true
});


module.exports = mongoose.model("Claim", ClaimSchema);