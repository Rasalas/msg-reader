"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.OverrideFlags = exports.EndType = exports.CalendarType = exports.PatternType = exports.RecurFrequency = void 0;
/**
 * RecurFrequency
 *
 * @see [[MS-OXOCAL]: RecurrencePattern Structure | Microsoft Learn](https://learn.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxocal/cf7153b4-f8b5-4cb6-bf14-e78d21f94814)
 */
var RecurFrequency;
(function (RecurFrequency) {
    RecurFrequency[RecurFrequency["Daily"] = 8202] = "Daily";
    RecurFrequency[RecurFrequency["Weekly"] = 8203] = "Weekly";
    RecurFrequency[RecurFrequency["Monthly"] = 8204] = "Monthly";
    RecurFrequency[RecurFrequency["Yearly"] = 8205] = "Yearly";
})(RecurFrequency = exports.RecurFrequency || (exports.RecurFrequency = {}));
/**
 * PatternType
 *
 * @see [[MS-OXOCAL]: RecurrencePattern Structure | Microsoft Learn](https://learn.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxocal/cf7153b4-f8b5-4cb6-bf14-e78d21f94814)
 */
var PatternType;
(function (PatternType) {
    /**
     * The event has a daily recurrence.
     */
    PatternType[PatternType["Day"] = 0] = "Day";
    /**
     * The event has a weekly recurrence.
     */
    PatternType[PatternType["Week"] = 1] = "Week";
    /**
     * The event has a monthly recurrence.
     */
    PatternType[PatternType["Month"] = 2] = "Month";
    /**
     * The event has a month-end recurrence.
     */
    PatternType[PatternType["MonthEnd"] = 4] = "MonthEnd";
    /**
     * The event has an every nth month pattern.
     */
    PatternType[PatternType["MonthNth"] = 3] = "MonthNth";
    /**
     * The event has a monthly recurrence in the Hijri calendar.
     * For this value in the PatternType field, the value of the CalendarType field SHOULD be set to 0x0000.
     */
    PatternType[PatternType["HjMonth"] = 10] = "HjMonth";
    /**
     * The event has an every nth month pattern in the Hijri calendar.
     * For this value in the PatternType field, the value of the CalendarType field MUST be set to 0x0000.
     */
    PatternType[PatternType["HjMonthNth"] = 11] = "HjMonthNth";
    /**
     * The event has a month end recurrence in the Hijri calendar.
     * For this value in the PatternType field, the value of the CalendarType field MUST be set to 0x0000.
     */
    PatternType[PatternType["HjMonthEnd"] = 12] = "HjMonthEnd";
})(PatternType = exports.PatternType || (exports.PatternType = {}));
var CalendarType;
(function (CalendarType) {
    /**
     * The default value for the calendar type is Gregorian.
     */
    CalendarType[CalendarType["Default"] = 0] = "Default";
    /**
     * Gregorian (localized) calendar
     */
    CalendarType[CalendarType["CAL_GREGORIAN"] = 1] = "CAL_GREGORIAN";
    /**
     * Gregorian (U.S.) calendar
     */
    CalendarType[CalendarType["CAL_GREGORIAN_US"] = 2] = "CAL_GREGORIAN_US";
    /**
     * Japanese Emperor era calendar
     */
    CalendarType[CalendarType["CAL_JAPAN"] = 3] = "CAL_JAPAN";
    /**
     * Taiwan calendar
     */
    CalendarType[CalendarType["CAL_TAIWAN"] = 4] = "CAL_TAIWAN";
    /**
     * Korean Tangun era calendar
     */
    CalendarType[CalendarType["CAL_KOREA"] = 5] = "CAL_KOREA";
    /**
     * Hijri (Arabic Lunar) calendar
     */
    CalendarType[CalendarType["CAL_HIJRI"] = 6] = "CAL_HIJRI";
    /**
     * Thai calendar
     */
    CalendarType[CalendarType["CAL_THAI"] = 7] = "CAL_THAI";
    /**
     * Hebrew lunar calendar
     */
    CalendarType[CalendarType["CAL_HEBREW"] = 8] = "CAL_HEBREW";
    /**
     * Gregorian Middle East French calendar
     */
    CalendarType[CalendarType["CAL_GREGORIAN_ME_FRENCH"] = 9] = "CAL_GREGORIAN_ME_FRENCH";
    /**
     * Gregorian Arabic calendar
     */
    CalendarType[CalendarType["CAL_GREGORIAN_ARABIC"] = 10] = "CAL_GREGORIAN_ARABIC";
    /**
     * Gregorian transliterated English calendar
     */
    CalendarType[CalendarType["CAL_GREGORIAN_XLIT_ENGLISH"] = 11] = "CAL_GREGORIAN_XLIT_ENGLISH";
    /**
     * Gregorian transliterated French calendar
     */
    CalendarType[CalendarType["CAL_GREGORIAN_XLIT_FRENCH"] = 12] = "CAL_GREGORIAN_XLIT_FRENCH";
    /**
     * Japanese lunar calendar
     */
    CalendarType[CalendarType["CAL_LUNAR_JAPANESE"] = 14] = "CAL_LUNAR_JAPANESE";
    /**
     * Chinese lunar calendar
     */
    CalendarType[CalendarType["CAL_CHINESE_LUNAR"] = 15] = "CAL_CHINESE_LUNAR";
    /**
     * Saka era calendar
     */
    CalendarType[CalendarType["CAL_SAKA"] = 16] = "CAL_SAKA";
    /**
     * Lunar ETO Chinese calendar
     */
    CalendarType[CalendarType["CAL_LUNAR_ETO_CHN"] = 17] = "CAL_LUNAR_ETO_CHN";
    /**
     * Lunar ETO Korean calendar
     */
    CalendarType[CalendarType["CAL_LUNAR_ETO_KOR"] = 18] = "CAL_LUNAR_ETO_KOR";
    /**
     * Lunar Rokuyou calendar
     */
    CalendarType[CalendarType["CAL_LUNAR_ROKUYOU"] = 19] = "CAL_LUNAR_ROKUYOU";
    /**
     * Korean lunar calendar
     */
    CalendarType[CalendarType["CAL_LUNAR_KOREAN"] = 20] = "CAL_LUNAR_KOREAN";
    /**
     * Um Al Qura calendar
     */
    CalendarType[CalendarType["CAL_UMALQURA"] = 23] = "CAL_UMALQURA";
})(CalendarType = exports.CalendarType || (exports.CalendarType = {}));
var EndType;
(function (EndType) {
    EndType[EndType["EndAfterDate"] = 8225] = "EndAfterDate";
    EndType[EndType["EndAfterNOccurrences"] = 8226] = "EndAfterNOccurrences";
    EndType[EndType["NeverEnd"] = 8227] = "NeverEnd";
    EndType[EndType["NeverEnd2"] = 4294967295] = "NeverEnd2";
})(EndType = exports.EndType || (exports.EndType = {}));
/**
 * OverrideFlags
 *
 * @see [[MS-OXOCAL]: ExceptionInfo Structure | Microsoft Learn](https://learn.microsoft.com/en-us/openspecs/exchange_server_protocols/ms-oxocal/0980d033-3bf1-43e9-a1e6-af51c564e24a)
 */
var OverrideFlags;
(function (OverrideFlags) {
    /**
     * Indicates that the Subject, SubjectLength, and SubjectLength2 fields are present.
     */
    OverrideFlags[OverrideFlags["ARO_SUBJECT"] = 1] = "ARO_SUBJECT";
    /**
     * Indicates that the MeetingType field is present.
     */
    OverrideFlags[OverrideFlags["ARO_MEETINGTYPE"] = 2] = "ARO_MEETINGTYPE";
    /**
     * Indicates that the ReminderDelta field is present.
     */
    OverrideFlags[OverrideFlags["ARO_REMINDERDELTA"] = 4] = "ARO_REMINDERDELTA";
    /**
     * Indicates that the ReminderSet field is present.
     */
    OverrideFlags[OverrideFlags["ARO_REMINDER"] = 8] = "ARO_REMINDER";
    /**
     * Indicates that the Location, LocationLength, and LocationLength2 fields are present.
     */
    OverrideFlags[OverrideFlags["ARO_LOCATION"] = 16] = "ARO_LOCATION";
    /**
     * Indicates that the BusyStatus field is present.
     */
    OverrideFlags[OverrideFlags["ARO_BUSYSTATUS"] = 32] = "ARO_BUSYSTATUS";
    /**
     * Indicates that the attachment field is present.
     */
    OverrideFlags[OverrideFlags["ARO_ATTACHMENT"] = 64] = "ARO_ATTACHMENT";
    /**
     * Indicates that the SubType field is present.
     */
    OverrideFlags[OverrideFlags["ARO_SUBTYPE"] = 128] = "ARO_SUBTYPE";
    /**
     * Indicates that the AppointmentColor field is present.
     */
    OverrideFlags[OverrideFlags["ARO_APPTCOLOR"] = 256] = "ARO_APPTCOLOR";
    /**
     * Indicates that the Exception Embedded Message object has the PidTagRtfCompressed property
     * ([MS-OXCMSG] section 2.2.1.56.4) set on it.
     */
    OverrideFlags[OverrideFlags["ARO_EXCEPTIONAL_BODY"] = 512] = "ARO_EXCEPTIONAL_BODY";
})(OverrideFlags = exports.OverrideFlags || (exports.OverrideFlags = {}));
;
function parseRecurrencePattern(ds) {
    var ReaderVersion = ds.readUint16();
    if (ReaderVersion !== 0x3004) {
        throw new Error("ReaderVersion not supported");
    }
    var WriterVersion = ds.readUint16();
    if (WriterVersion !== 0x3004) {
        throw new Error("WriterVersion not supported");
    }
    var recurFrequency = ds.readUint16();
    var patternType = ds.readUint16();
    var calendarType = ds.readUint16();
    var firstDateTime = ds.readUint32();
    var period = ds.readUint32();
    var slidingFlag = ds.readUint32();
    var patternTypeWeek = undefined;
    var patternTypeMonth = undefined;
    var patternTypeMonthNth = undefined;
    if (false) { }
    else if (false
        || patternType === PatternType.Week) {
        patternTypeWeek = {
            dayOfWeekBits: ds.readUint32(),
        };
    }
    else if (false
        || patternType === PatternType.Month
        || patternType === PatternType.MonthEnd
        || patternType === PatternType.HjMonth
        || patternType === PatternType.HjMonthEnd) {
        patternTypeMonth = {
            day: ds.readUint32(),
        };
    }
    else if (false
        || patternType === PatternType.MonthNth
        || patternType === PatternType.HjMonthNth) {
        patternTypeMonthNth = {
            dayOfWeekBits: ds.readUint32(),
            n: ds.readUint32(),
        };
    }
    var endType = ds.readUint32();
    var occurrenceCount = ds.readUint32();
    var firstDOW = ds.readUint32();
    var deletedInstanceCount = ds.readUint32();
    var deletedInstanceDates = Array.from(ds.readUint32Array(deletedInstanceCount));
    var modifiedInstanceCount = ds.readUint32();
    var modifiedInstanceDates = Array.from(ds.readUint32Array(modifiedInstanceCount));
    var startDate = ds.readUint32();
    var endDate = ds.readUint32();
    return Object.assign({
        recurFrequency: recurFrequency,
        patternType: patternType,
        calendarType: calendarType,
        firstDateTime: firstDateTime,
        period: period,
        slidingFlag: slidingFlag,
        endType: endType,
        occurrenceCount: occurrenceCount,
        firstDOW: firstDOW,
        deletedInstanceDates: deletedInstanceDates,
        modifiedInstanceDates: modifiedInstanceDates,
        startDate: startDate,
        endDate: endDate,
    }, patternTypeWeek ? { patternTypeWeek: patternTypeWeek } : {}, patternTypeMonth ? { patternTypeMonth: patternTypeMonth } : {}, patternTypeMonthNth ? { patternTypeMonthNth: patternTypeMonthNth } : {});
}
/**
 * @internal
 */
function parse(ds, ansiEncoding) {
    var recurrencePattern = parseRecurrencePattern(ds);
    var readerVersion2 = ds.readUint32();
    if (readerVersion2 !== 0x3006) {
        throw new Error("ReaderVersion2 not supported");
    }
    var writerVersion2 = ds.readUint32();
    if (writerVersion2 < 0x3006) {
        throw new Error("WriterVersion2 not supported");
    }
    var startTimeOffset = ds.readUint32();
    var endTimeOffset = ds.readUint32();
    var exceptionCount = ds.readUint16();
    var exceptionInfo = [];
    for (var x = 0; x < exceptionCount; x++) {
        var startDateTime = ds.readUint32();
        var endDateTime = ds.readUint32();
        var originalStartTime = ds.readUint32();
        var overrideFlags = ds.readUint16();
        var subject = undefined;
        if (overrideFlags & OverrideFlags.ARO_SUBJECT) {
            var subjectLength = ds.readUint16();
            var subjectLength2 = ds.readUint16();
            if (subjectLength - 1 !== subjectLength2) {
                throw new Error("subjectLength ".concat(subjectLength, " and subjectLength2 ").concat(subjectLength2, " are not close!"));
            }
            subject = ds.readString(subjectLength2, ansiEncoding);
        }
        var meetingType = undefined;
        if (overrideFlags & OverrideFlags.ARO_MEETINGTYPE) {
            meetingType = ds.readUint32();
        }
        var reminderDelta = undefined;
        if (overrideFlags & OverrideFlags.ARO_REMINDERDELTA) {
            reminderDelta = ds.readUint32();
        }
        var reminderSet = undefined;
        if (overrideFlags & OverrideFlags.ARO_REMINDER) {
            reminderSet = ds.readUint32();
        }
        var location_1 = undefined;
        if (overrideFlags & OverrideFlags.ARO_LOCATION) {
            var locationLength = ds.readUint16();
            var locationLength2 = ds.readUint16();
            if (locationLength - 1 !== locationLength2) {
                throw new Error("locationLength ".concat(locationLength, " and locationLength2 ").concat(locationLength2, " are not close!"));
            }
            location_1 = ds.readString(locationLength2, ansiEncoding);
        }
        var busyStatus = undefined;
        if (overrideFlags & OverrideFlags.ARO_BUSYSTATUS) {
            busyStatus = ds.readUint32();
        }
        var attachment = undefined;
        if (overrideFlags & OverrideFlags.ARO_ATTACHMENT) {
            attachment = ds.readUint32();
        }
        var subType = undefined;
        if (overrideFlags & OverrideFlags.ARO_SUBTYPE) {
            subType = ds.readUint32();
        }
        var appointmentColor = undefined;
        if (overrideFlags & OverrideFlags.ARO_APPTCOLOR) {
            appointmentColor = ds.readUint32();
        }
        exceptionInfo.push(Object.assign({
            startDateTime: startDateTime,
            endDateTime: endDateTime,
            originalStartTime: originalStartTime,
            overrideFlags: overrideFlags,
        }, subject ? { subject: subject } : {}, meetingType ? { meetingType: meetingType } : {}, reminderDelta ? { reminderDelta: reminderDelta } : {}, reminderSet ? { reminderSet: reminderSet } : {}, location_1 ? { location: location_1 } : {}, busyStatus ? { busyStatus: busyStatus } : {}, attachment ? { attachment: attachment } : {}, subType ? { subType: subType } : {}, appointmentColor ? { appointmentColor: appointmentColor } : {}));
    }
    var reservedBlock1Size = ds.readUint32();
    if (reservedBlock1Size !== 0) {
        throw new Error("reservedBlock1Size ".concat(reservedBlock1Size, " is not zero, AppointmentRecur is broken"));
    }
    for (var x = 0; x < exceptionCount; x++) {
        var one = exceptionInfo[x];
        if (0x00003009 <= writerVersion2) {
            var changeHighlightSize = ds.readUint32();
            one.changeHighlight = ds.readUint32();
            ds.position += changeHighlightSize - 4;
        }
        var reservedBlockEE1Size = ds.readUint32();
        if (reservedBlockEE1Size !== 0) {
            throw new Error("reservedBlockEE1Size ".concat(reservedBlockEE1Size, " is not zero, AppointmentRecur is broken"));
        }
        if (one.overrideFlags & (OverrideFlags.ARO_SUBJECT | OverrideFlags.ARO_LOCATION)) {
            var startDateTime = ds.readUint32();
            var endDateTime = ds.readUint32();
            var originalStartDate = ds.readUint32();
            if (one.overrideFlags & (OverrideFlags.ARO_SUBJECT)) {
                var wideCharSubjectLength = ds.readUint16();
                one.subject = ds.readUCS2String(wideCharSubjectLength);
            }
            if (one.overrideFlags & (OverrideFlags.ARO_LOCATION)) {
                var wideCharLocationLength = ds.readUint16();
                one.location = ds.readUCS2String(wideCharLocationLength);
            }
            var reservedBlockEE2Size = ds.readUint32();
            if (reservedBlockEE2Size !== 0) {
                throw new Error("reservedBlockEE2Size ".concat(reservedBlockEE2Size, " is not zero, AppointmentRecur is broken"));
            }
        }
    }
    var reservedBlock2Size = ds.readUint32();
    if (reservedBlock2Size !== 0) {
        throw new Error("reservedBlock2Size ".concat(reservedBlock2Size, " is not zero, AppointmentRecur is broken"));
    }
    return {
        recurrencePattern: recurrencePattern,
        startTimeOffset: startTimeOffset,
        endTimeOffset: endTimeOffset,
        exceptionInfo: exceptionInfo,
    };
}
exports.parse = parse;
