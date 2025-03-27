
// praytime.js - Prayer Times Calculator (v3.1)
// Copyright (c) 2007-2025 Hamid Zarrabi-Zadeh
// License: MIT
// https://praytime.info


//------------------------- User Interface ------------------------
/*
    method(method)          // set calculation method
    location(coordinates)   // set location
    utcOffset(number)       // set UTC offset in minutes or hours
    adjust(parameters)      // adjust calculation parameters
    tune(mins)              // tune times by given minutes
    format(format)          // options: 24h, 12h, 12H, x, X
    round(method)           // options: nearest, up, down, none
    times(date)             // options: date, array, timestamp


//------------------------- Sample Usage --------------------------

    const praytime = new PrayTime('ISNA');
    praytime.location([43, -80]).utcOffset(-5);
    console.log(praytime.times());

*/
//------------------------- PrayTime Class ------------------------

class PrayTime {

    constructor(method) {

        this.methods = {
            MWL: { fajr: 18, isha: 17 },
            ISNA: { fajr: 15, isha: 15 },
            Egypt: { fajr: 19.5, isha: 17.5 },
            Makkah: { fajr: 18.5, isha: '90 min' },
            Karachi: { fajr: 18, isha: 18 },
            Tehran: { fajr: 17.7, maghrib: 4.5, midnight: 'Jafari' },
            Jafari: { fajr: 16, maghrib: 4, midnight: 'Jafari' },
            defaults: { isha: 14, maghrib: '1 min', midnight: 'Standard' }
        };

        this.settings = {
            dhuhr: '0 min',
            asr: 'Standard',
            highLats: 'NightMiddle',
            tune: {},
            format: '24h',
            rounding: 'nearest',
            utcOffset: 'auto',
            location: [0, -(new Date()).getTimezoneOffset() / 4],
            iterations: 1
        };

        this.labels = [
            'Fajr', 'Sunrise', 'Dhuhr', 'Asr',
            'Sunset', 'Maghrib', 'Isha', 'Midnight'
        ];

        this.method(method || 'MWL');
    }


    //---------------------- Setters ------------------------

    // set calculation method
    method(method) {
        return this.set(this.methods.defaults).set(this.methods[method]);
    }

    // set calculating parameters
    adjust(params) {
        return this.set(params);
    }

    // set location
    location(location) {
        return this.set({ location });
    }

    // set tuning minutes
    tune(tune) {
        return this.set({ tune });
    }

    // set rounding method
    round(rounding = 'nearest') {
        return this.set({ rounding });
    }

    // set time format
    format(format) {
        return this.set({ format });
    }

    // set settings parameters
    set(settings) {
        Object.assign(this.settings, settings);
        return this;
    }

    // set utc offset
    utcOffset(utcOffset = 'auto') {
        if (typeof utcOffset === 'number' && Math.abs(utcOffset) < 16)
            utcOffset *= 60;
        return this.set({ utcOffset });
    }


    //---------------------- Getters ------------------------

    // get prayer times
    times(date = 0) {
        if (typeof date === 'number')
            date = new Date((date < 1000) ? Date.now() + date * 864e5 : date);
        if (date.constructor === Date)
            date = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
        this.utcTime = Date.UTC(date[0], date[1] - 1, date[2]);

        let times = this.computeTimes();
        this.formatTimes(times);
        return times;
    }


    //---------------------- Deprecated -------------------------

    // deprecated: get prayer times
    getTimes(date, location, timezone = 'auto', dst = 0, format = '24h') {
        const utcOffset = (timezone == 'auto') ? timezone : timezone + dst;
        this.location(location).utcOffset(utcOffset).format(format);
        return this.times(date);
    }

    // deprecated: set calculation method
    setMethod(method) {
        this.method(method);
    }


    //---------------------- Compute Times -----------------------

    // compute prayer times
    computeTimes() {
        let times = {
            fajr: 5,
            sunrise: 6,
            dhuhr: 12,
            asr: 13,
            sunset: 18,
            maghrib: 18,
            isha: 18,
            midnight: 24
        };

        for (let i = 0; i < this.settings.iterations; i++)
            times = this.processTimes(times);

        this.adjustHighLats(times);
        this.updateTimes(times);
        this.tuneTimes(times);
        this.convertTimes(times);
        return times;
    }

    // process prayer times
    processTimes(times) {
        const params = this.settings;
        const horizon = 0.833;

        return {
            fajr: this.angleTime(params.fajr, times.fajr, -1),
            sunrise: this.angleTime(horizon, times.sunrise, -1),
            dhuhr: this.midDay(times.dhuhr),
            asr: this.angleTime(this.asrAngle(params.asr, times.asr), times.asr),
            sunset: this.angleTime(horizon, times.sunset),
            maghrib: this.angleTime(params.maghrib, times.maghrib),
            isha: this.angleTime(params.isha, times.isha),
            midnight: this.midDay(times.midnight) + 12
        }
    }

    // update times
    updateTimes(times) {
        const params = this.settings;

        if (this.isMin(params.maghrib))
            times.maghrib = times.sunset + this.value(params.maghrib) / 60;
        if (this.isMin(params.isha))
            times.isha = times.maghrib + this.value(params.isha) / 60;
        if (params.midnight == 'Jafari') {
            const nextFajr = this.angleTime(params.fajr, 29, -1) + 24;
            times.midnight = (times.sunset + (this.adjusted ? times.fajr + 24 : nextFajr)) / 2;
        }
        times.dhuhr += this.value(params.dhuhr) / 60;
    }

    // tune times
    tuneTimes(times) {
        const mins = this.settings.tune
        for (let i in times)
            if (i in mins)
                times[i] += mins[i] / 60;
    }

    // convert times
    convertTimes(times) {
        const lng = this.settings.location[1];
        for (let i in times) {
            const time = times[i] - lng / 15;
            const timestamp = this.utcTime + Math.floor(time * 36e5);
            times[i] = this.roundTime(timestamp);
        }
    }

    // round time
    roundTime(timestamp) {
        const rounding = {
            up: 'ceil',
            down: 'floor',
            nearest: 'round'
        }[this.settings.rounding];
        if (!rounding)
            return timestamp;
        const OneMinute = 6e4;
        return Math[rounding](timestamp / OneMinute) * OneMinute;
    }


    //---------------------- Calculation Functions -----------------------

    // compute sun position
    sunPosition(time) {
        const lng = this.settings.location[1];
        const D = this.utcTime / 864e5 - 10957.5 + this.value(time) / 24 - lng / 360;

        const g = this.mod(357.529 + 0.98560028 * D, 360);
        const q = this.mod(280.459 + 0.98564736 * D, 360);
        const L = this.mod(q + 1.915 * this.sin(g) + 0.020 * this.sin(2 * g), 360);
        const e = 23.439 - 0.00000036 * D;
        const RA = this.mod(this.arctan2(this.cos(e) * this.sin(L), this.cos(L)) / 15, 24);

        return {
            declination: this.arcsin(this.sin(e) * this.sin(L)),
            equation: q / 15 - RA,
        }
    }

    // compute mid-day
    midDay(time) {
        const eqt = this.sunPosition(time).equation;
        const noon = this.mod(12 - eqt, 24);
        return noon;
    }

    // compute the time when sun reaches a specific angle below horizon
    angleTime(angle, time, direction = 1) {
        const lat = this.settings.location[0];
        const decl = this.sunPosition(time).declination;
        const numerator = -this.sin(angle) - this.sin(lat) * this.sin(decl);
        const diff = this.arccos(numerator / (this.cos(lat) * this.cos(decl))) / 15;
        return this.midDay(time) + diff * direction;
    }

    // compute asr angle
    asrAngle(asrParam, time) {
        const shadowFactor = { Standard: 1, Hanafi: 2 }[asrParam] || this.value(asrParam);
        const lat = this.settings.location[0];
        const decl = this.sunPosition(time).declination;
        return -this.arccot(shadowFactor + this.tan(Math.abs(lat - decl)));
    }


    //---------------------- Higher Latitudes -----------------------

    // adjust times for higher latitudes
    adjustHighLats(times) {
        const params = this.settings;
        if (params.highLats == 'None')
            return;

        this.adjusted = false;
        const night = 24 + times.sunrise - times.sunset;

        Object.assign(times, {
            fajr: this.adjustTime(times.fajr, times.sunrise, params.fajr, night, -1),
            isha: this.adjustTime(times.isha, times.sunset, params.isha, night),
            maghrib: this.adjustTime(times.maghrib, times.sunset, params.maghrib, night)
        });
    }

    // adjust time in higher latitudes
    adjustTime(time, base, angle, night, direction = 1) {
        const factors = {
            NightMiddle: 1 / 2,
            OneSeventh: 1 / 7,
            AngleBased: 1 / 60 * this.value(angle)
        };
        const portion = factors[this.settings.highLats] * night;
        const timeDiff = (time - base) * direction;
        if (isNaN(time) || timeDiff > portion) {
            time = base + portion * direction;
            this.adjusted = true;
        }
        return time;
    }


    //---------------------- Formatting Functions ---------------------

    // format times
    formatTimes(times) {
        for (let i in times)
            times[i] = this.formatTime(times[i]);
    }

    // format time
    formatTime(timestamp) {
        const format = this.settings.format;
        const InvalidTime = '-----';
        if (isNaN(timestamp))
            return InvalidTime;
        if (typeof format === 'function')
            return format(timestamp);
        if (format.toLowerCase() == 'x')
            return Math.floor(timestamp / ((format == 'X') ? 1000 : 1));
        return this.timeToString(timestamp, format);
    }

    // convert time to string
    timeToString(timestamp, format) {
        const date = new Date(timestamp);
        const utcOffset = this.settings.utcOffset;
        const minsDiff = (utcOffset == 'auto') ? -date.getTimezoneOffset() : utcOffset;
        const mins = date.getUTCHours() * 60 + date.getUTCMinutes() + minsDiff;
        const hours = this.mod(Math.floor(mins / 60), 24);
        const hour = format.toLowerCase() == '12h' ? this.mod(hours - 1, 12) + 1 : this.twoDigits(hours);
        const minutes = this.twoDigits(Math.trunc(this.mod(mins, 60)));
        const suffix = (format == '12H') ? ['AM', 'PM'][hours < 12 ? 0 : 1] : '';
        return hour + ':' + minutes + (suffix ? ' ' + suffix : '');
    }


    //---------------------- Misc Functions -----------------------

    // add padding zero
    twoDigits(num) {
        return String(num).padStart(2, '0');
    }

    // convert string to number
    value(str) {
        return +String(str).split(/[^0-9.+-]/)[0];
    }

    // detect if input contains 'min'
    isMin(str) {
        return String(str).indexOf('min') != -1;
    }

    // positive modulo
    mod(a, b) {
        return ((a % b) + b) % b;
    }


    //--------------------- Degree-Based Trigonometry -----------------

    dtr = (d) => d * Math.PI / 180;
    rtd = (r) => r * 180 / Math.PI;

    sin = (d) => Math.sin(this.dtr(d));
    cos = (d) => Math.cos(this.dtr(d));
    tan = (d) => Math.tan(this.dtr(d));

    arcsin = (d) => this.rtd(Math.asin(d));
    arccos = (d) => this.rtd(Math.acos(d));
    arctan = (d) => this.rtd(Math.atan(d));

    arccot = (x) => this.rtd(Math.atan(1 / x));
    arctan2 = (y, x) => this.rtd(Math.atan2(y, x));
}


//------------------------- Node.js Export ------------------------

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PrayTime };
} 
