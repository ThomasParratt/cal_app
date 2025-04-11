const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    dateTime: { type: Date, required: true },
    location: { type: String, required: true },
    description: { type: String },
    duration: { type: Number, default: 90 } // duration in minutes
});

module.exports = mongoose.model('Appointment', appointmentSchema);
