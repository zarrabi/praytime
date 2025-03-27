
// PrayTime Test
// By Hamid Zarrabi-Zadeh


"use strict";

const { PrayTime } = require('../src/praytime');


// ----------------------- Initialize Test Data ---------------------

// Test Location: Waterloo, ON, Canada
const latitude = 43.4643;
const longitude = -80.5204;

// Test Date: Fab 21, 2025
const date = [2025, 2, 21];
const timezone = -5;


// ----------------------- Run Test and Validate --------------------

const praytime = new PrayTime();

praytime.method('ISNA')
    .location([latitude, longitude])
    .utcOffset(timezone);

test('Test prayer times', () => {
    const times = praytime.times(date);
    expect(times.fajr).toBe('05:52');
    expect(times.dhuhr).toBe('12:36');
    expect(times.asr).toBe('15:32');
    expect(times.maghrib).toBe('18:02');
});

test('Test time formats', () => {
    expect(praytime.format('x').times(date).asr).toBe(1740169920000);
    expect(praytime.format('X').times(date).asr).toBe(1740169920);
    expect(praytime.format('12h').times(date).asr).toBe('3:32');
    expect(praytime.format('12H').times(date).asr).toBe('3:32 PM');
    expect(praytime.format('24h').times(date).asr).toBe('15:32');
});

test('Test timezones', () => {
    expect(praytime.utcOffset(-4.5).times(date).fajr).toBe('06:22');
    expect(praytime.utcOffset(-300).times(date).fajr).toBe('05:52');
});

test('Test rounding method', () => {
    expect(praytime.round('down').times(date).asr).toBe('15:32');
    expect(praytime.round('up').times(date).asr).toBe('15:33');
    expect(praytime.round('nearest').times(date).asr).toBe('15:32');
});

test('Test adjust method', () => {
    const times = praytime.adjust({
        fajr: 19.7,
        dhuhr: "11 min",
    }).times(date);
    expect(times.fajr).toBe('05:26');
    expect(times.dhuhr).toBe('12:47');
});

test('Test tuning method', () => {
    const times = praytime.tune({
        asr: 11,
        maghrib: 4.5,
    }).times(date);
    expect(times.asr).toBe('15:43');
    expect(times.maghrib).toBe('18:07');
});

