
// PrayTime Test
// By Hamid Zarrabi-Zadeh

const praytime = require('praytime');


// ----------------------- Initialize Test Data ---------------------

// Test Location: Waterloo, ON, Canada
const latitude = 43.4643;
const longitude = -80.5204;

// Test Date: March 21, 2025
const date = [2025, 3, 21];
const timezone = -4;  // Eastern Daylight Time (GMT-4)


// ----------------------- Run Test and Validate --------------------

// Get Prayer Times
const times = praytime.method('ISNA')
    .location([latitude, longitude])
    .utcOffset(timezone)
    .times(date);

// Log Output
for (let label of ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'])
    console.log(times[label.toLowerCase()], label);

// Check Validity
if (times.fajr === '06:04' && times.dhuhr === '13:29' && times.maghrib === '19:37') {
    console.log('Prayer times are correctly calculated.');
} else {
    console.log('Error: There was an issue with the calculation.');
}

