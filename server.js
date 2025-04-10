require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const mongoose = require('mongoose');
const Appointment = require('./models/appointment');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Connect to MongoDB (replace with your connection string)
mongoose.connect('mongodb://localhost:27017/calendar-app', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Google Maps API key
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

// Function to calculate travel time using Google Maps Directions API
async function getTravelTime(origin, destination) {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${googleMapsApiKey}`;
    try {
        const response = await axios.get(url);
        const travelTime = response.data.routes[0].legs[0].duration.value; // duration in seconds
        return travelTime;
    } catch (error) {
        console.error('Error fetching travel time:', error);
        return null;
    }
}

// Define Routes

// Get all appointments
app.get('/api/appointments', async (req, res) => {
    try {
      const appointments = await Appointment.find();
      const events = appointments.map(app => ({
        id: app._id.toString(), // Include the MongoDB ID
        title: app.description,
        start: app.dateTime.toISOString()
      }));
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch appointments' });
    }
  });
  
  

// Add a new appointment
app.post('/api/appointments', async (req, res) => {
    const { dateTime, location, description } = req.body;

    // Retrieve all existing appointments to check for conflicts
    const appointments = await Appointment.find();

    // Check for time conflicts and travel time
    for (let appointment of appointments) {
        console.log(`description = ${appointment.description}`);
        console.log(`appointment location = ${appointment.location}`);
        console.log(`location = ${location}`);
        const travelTime = await getTravelTime(appointment.location, location);
        console.log(`travelTime = ${travelTime}`);
        const appointmentEnd = new Date(appointment.dateTime).getTime() + (appointment.duration * 60000); // Convert duration to milliseconds
        console.log(`appointmentEnd = ${appointmentEnd}`);
        const newAppointmentStart = new Date(dateTime).getTime();
        console.log(`newAppointmentStart = ${newAppointmentStart}`);
        if (newAppointmentStart - (appointmentEnd + travelTime * 1000) < 0) {
            return res.status(400).json({ message: 'Not enough time to travel to this appointment.' });
        }
    }

    try {
        const newAppointment = new Appointment({
            dateTime,
            location,
            description,
            duration: 30 // Default duration in minutes (can be customized)
        });
        await newAppointment.save();
        res.status(200).json(newAppointment);
    } catch (err) {
        res.status(500).json({ message: 'Error saving appointment' });
    }
});

// Delete an appointment by ID
app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const deletedAppointment = await Appointment.findByIdAndDelete(id);
  
      if (!deletedAppointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
  
      res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Error deleting appointment' });
    }
  });
  

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
