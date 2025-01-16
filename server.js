const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mailgun = require('mailgun-js');

const PDFDocument = require('pdfkit'); // Added for PDF generation
const fs = require('fs'); // File system for handling files

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

/*app.post('/api/submit-form', async (req, res) => {
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
*/
// Initialize Mailgun
const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});

app.post('/api/submit-form', async (req, res) => {
  try {
    const formData = req.body;
    console.log('Received form data:', formData);

    // Create a new document in MongoDB with all received fields
    const newFormData = new FormData(formData);
    const savedData = await newFormData.save();

    console.log('Form data saved successfully:', savedData);

    /* Start PDF geenration code */
     // Generate PDF
     const pdfPath = './OnBoarding_form.pdf';
     const doc = new PDFDocument();
     const pdfStream = fs.createWriteStream(pdfPath);
     doc.pipe(pdfStream);
 
    // Add a title with styling
    doc.fontSize(16).font('Helvetica-Bold').text('Onboarding Form Submission From Client', {
      underline: true,
      align: 'center',
    });
    doc.moveDown(2); // Add some vertical spacing
 
     /*Object.entries(savedData.toObject()).forEach(([key, value]) => {
       doc.text(`${key}: ${value}`, { lineGap: 2 });
     });*/
     // Filter out unwanted fields

     const fieldMapping = {
        name: 'Primary Contact name',
        phone: 'Phone number',
        email : 'Primary Contact email', 
        position : 'Position',
        leadName : 'Lead Name',
        leadEmail : 'Lead Email',
        leadPhone : 'Lead Phone number',
        locations : 'Business Locations',
        businessName : 'Business Name',
        streetAddress : 'Street Address',
        streetAddress2 : 'Street Address2',
        domain : 'Domain',
        googleAccount : 'Google Account'        
        // Add other mappings as needed
      };


    //const excludedFields = ['_id', 'createdAt', 'updatedAt', '__v'];
    const excludedFields = ['_id', 'createdAt', 'updatedAt', '__v','_doc','$___'];
    const filteredData = Object.entries(savedData.toObject()).filter(
      ([key]) => !excludedFields.includes(key)
    );

    
    
    filteredData.forEach(([key, value]) => {
      const displayName = fieldMapping[key] || key.replace(/_/g, ' '); // If no mapping, use the original key name
    
      if (Array.isArray(value)) {
        // Handle arrays (e.g., locations)
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`${displayName}:`, { lineGap: 4 });
    
        value.forEach((item, index) => {
          doc
            .fontSize(10)
            .font('Helvetica')
            .text(`  Location ${index + 1}:`, { indent: 10, lineGap: 4 });
    
          Object.entries(item).forEach(([subKey, subValue]) => {
            const subDisplayName = fieldMapping[subKey] || subKey.replace(/_/g, ' ');
            doc
              .fontSize(10)
              .font('Helvetica')
              .text(`    ${subDisplayName}: `, { continued: true })
              .font('Helvetica-Bold')
              .text(`${subValue}`, { indent: 20, lineGap: 2 });
          });
        });
      } else {
        // Handle other fields
        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`${displayName}: `, { continued: true }) // Bold key
          .font('Helvetica-Bold')
          .text(`${value}`, { indent: 20, lineGap: 4 }); // Regular value with spacing
      }
    });


    // Add footer for branding or additional notes
    doc.moveDown(2);
    doc
      .fontSize(10)
      .font('Helvetica-Oblique')
      .text('All rights reserved @Qualiconvert', { align: 'center' });
 
     doc.end();

     await new Promise((resolve, reject) => {
       pdfStream.on('finish', resolve);
       pdfStream.on('error', reject);
     });
 
     console.log('PDF generated successfully.');
    /* End PDF generation code */

    // Prepare email content
   /* const emailContent = Object.entries(formData)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

      */

   /*  const emailContent = Object.entries(savedData)
          .map(([key, value]) => {
            console.log('key124 ',key);
            if (key === 'locations' && Array.isArray(value)) {
              return value
                .map((location, index) => {
                  return `Location ${index + 1}:\n` +
                    Object.entries(location)
                      .map(([locKey, locValue]) => `  ${locKey}: ${locValue}`)
                      .join('\n');
                })
                .join('\n\n');
            } else if (typeof value === 'object' && value !== null) {
             // return `${key}: [object]`; // Handle other objects that might be in formData
              if (['$__', '_doc', '$errors', '$isNew'].includes(key)) {
                 return ''; // Skip unwanted keys
              } else {
                return `${key}: [object]`; // Handle other objects that might be in formData
              }
            } else if (['$__', '_doc', '$errors', '$isNew'].includes(key)) {
              return ''; // Skip unwanted keys
            } else {
              return `${key}: ${value}`;
            }
          })
          .filter(Boolean) // Remove empty strings from the array
          .join('\n\n');
  */

     // Function to map keys to their respective labels
       function formatKeyLabel(key, value) {
        switch (key) {
          case 'name':
            return `Primary Contact Name: ${value}`;
          case 'email':
            return `Primary Contact Email: ${value}`;
          case 'phone':
            return `Phone Number: ${value}`;
          case 'position':
            return `Position: ${value}`;
          case 'leadName':
            return `Lead Name: ${value}`;
          case 'leadEmail':
            return `Lead Email: ${value}`;
          case 'leadPhone':
            return `Lead Phone Number: ${value}`;
          case 'businessName':
            return `Business Name: ${value}`;
          case 'streetAddress':
            return `Street Address: ${value}`;
          case 'streetAddress2':
            return `Street Address2: ${value}`;
          case 'city':
            return `City: ${value}`;
          case 'state':
            return `State: ${value}`;
          case 'zip':
            return `Zip: ${value}`;
          case 'phone':
            return `Phone Number: ${value}`;
          case 'website':
            return `Website: ${value}`;
          case 'domain':
            return `Domain: ${value}`;
          case 'googleAccount':
            return `Google Account Email: ${value}`;
          case 'logo':
            return `Logo: ${value || 'None'}`;
          default:
            return `${key}: ${value}`;
        }
      }

        // Process emailContent
        const emailContent = Object.entries(savedData)
          .map(([key, value]) => {
            if (key === 'locations' && Array.isArray(value)) {
              return value
                .map((location, index) => {
                  return `Location ${index + 1}:\n` +
                    Object.entries(location)
                      .map(([locKey, locValue]) => formatKeyLabel(locKey, locValue))
                      .join('\n');
                })
                .join('\n\n');
            } else if (typeof value === 'object' && value !== null) {
              if (['$__', '_doc', '$errors', '$isNew'].includes(key)) {
                return ''; // Skip unwanted keys
              } else {
                return `${key}: [object]`; // Handle other objects
              }
            } else if (['$__', '_doc', '$errors', '$isNew'].includes(key)) {
              return ''; // Skip unwanted keys
            } else {
              return formatKeyLabel(key, value);
            }
          })
          .filter(Boolean) // Remove empty strings
          .join('\n');
    
    console.log('Preparing to send email to:', formData.email);

    // Send email using Mailgun
    const data = {
      from: 'Qualiconvert <noreply@qualiconvert.com>',
     to : 'sriram@legaciestechno.com',
      // to: formData.email,
     // cc: 'sheldon@auxoinnovation.com', 
      //   bcc:'noreply@auxoinnovations.com,anthony@auxoinnovations.com,sheldon@auxoinnovations.com', 
      subject: 'New Onboarding Form Submission',
      text: `Thank you for submitting your onboarding form. Here are the details you provided:\n\n${emailContent}`,
      attachment: pdfPath, // Attached the generated PDF
    };

    mg.messages().send(data, function (error, body) {
       // Clean up the PDF file after email is sent
      fs.unlink(pdfPath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting PDF file:', unlinkErr);
        else console.log('Temporary PDF file deleted.');
      });
      
      if (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Error sending email', error: error.message });
      } else {
        console.log('Email sent successfully. Mailgun response:', body);
        res.status(200).json({ message: 'Form submitted successfully', savedData });
      }
    });

  } catch (error) {
    console.error('Error in submit-form route:', error);
    res.status(500).json({ message: 'Error submitting form', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
