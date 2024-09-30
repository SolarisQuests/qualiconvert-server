const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

// Create a schema for the form data that allows any field
const formDataSchema = new mongoose.Schema({}, { strict: false, timestamps: true });

// Create a model based on the schema, specifying the collection name
const FormData = mongoose.model('FormData', formDataSchema, 'Qualiconvert_onboarding_submissions');

app.post('/api/submit-form', async (req, res) => {
  try {
    const formData = req.body;
    console.log('Received form data:', formData);

    // Create a new document in MongoDB with all received fields
    const newFormData = new FormData(formData);
    const savedData = await newFormData.save();

    console.log('Form data saved successfully:', savedData);

    res.status(200).json({ message: 'Form submitted successfully', savedData });

  } catch (error) {
    console.error('Error in submit-form route:', error);
    res.status(500).json({ message: 'Error submitting form', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
