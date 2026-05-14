// This file acts as a bridge between the Node.js backend and the Python AI module.

// Its main job is:

// Send uploaded insurance document to Python AI
// ↓
// Receive extracted fraud analysis result
// ↓
// Return cleaned structured data to backend


const { spawn } = require('child_process');

const path = require('path');

function runPythonOCR(filePath) {

  return new Promise((resolve, reject) => {

    const scriptPath = path.join(
      __dirname,
      '..',
      'ai-module',
      'main.py'
    );

    const absFilePath = path.resolve(filePath);

    const py = spawn('python', [
      scriptPath,
      absFilePath
    ]);

    let output = '';

    let errorOutput = '';

    py.stdout.on('data', (data) => {
      output += data.toString();
    });

    py.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('[PYTHON]', data.toString());
    });

    py.on('close', () => {

      if (!output.trim()) {

        reject(
          new Error(
            'No output from Python script'
          )
        );

        return;
      }

      try {

        const parsed = JSON.parse(output);

        if (parsed.error) {

          reject(
            new Error(parsed.error)
          );

        } else {

          resolve(parsed);
        }

      } catch (err) {

        reject(
          new Error(
            'Invalid JSON returned from Python'
          )
        );
      }
    });

    py.on('error', (err) => {

      reject(
        new Error(
          'Python execution failed: ' + err.message
        )
      );
    });

  });
}

async function analyzeClaimDocument(filePath) {

  try {

    const result = await runPythonOCR(filePath);

    const fields = result.fields || {};

    return {

      extractedText: result.raw_text || '',

      extractedData: {

        policyNumber :
          fields.policy_number
            ? String(fields.policy_number)
            : "N/A",

        claimAmount:
          fields.claim_amount || null,

        claimDate:
          fields.admission_date ||
          fields.date_of_injury ||
          null,

        incidentDetails:
          fields.incident_description || null,

        insuredName:
          fields.patient_name || null,

        hospitalName:
          fields.hospital_name || null,

        treatingDoctor:
          fields.doctor_name || null,

        bankDetails:
          fields.bank_account || null
      },

      missingFields:
        result.missing || [],

      fraudFlag:
        result.fraud || false,

      riskScore:
        result.score || 0,

      riskLevel:
        result.risk_level || 'Low',

      justification:
        result.justification || ''
    };

  } catch (err) {

    console.error(
      'AI ANALYSIS ERROR:',
      err.message
    );

    return {

      extractedText: '',

      extractedData: {},

      missingFields: [
        'AI analysis failed'
      ],

      fraudFlag: false,

      riskScore: 0,

      riskLevel: 'Low',

      justification: err.message
    };
  }
}

module.exports = {
  analyzeClaimDocument
};