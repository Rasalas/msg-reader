import DataStream from "./DataStream";
/**
 * StandardDate
 *
 * A SYSTEMTIME structure that contains a date and local time when the transition from daylight saving time to standard time occurs on this operating system. If the time zone does not support daylight saving time or if the caller needs to disable daylight saving time, the wMonth member in the SYSTEMTIME structure must be zero. If this date is specified, the DaylightDate member of this structure must also be specified.
 *
 * Otherwise, the system assumes the time zone data is invalid and no changes will be applied.
 *
 * To select the correct day in the month, set the wYear member to zero, the wHour and wMinute members to the transition time, the wDayOfWeek member to the appropriate weekday, and the wDay member to indicate the occurrence of the day of the week within the month (1 to 5, where 5 indicates the final occurrence during the month if that day of the week does not occur 5 times).
 *
 * Using this notation, specify 02:00 on the first Sunday in April as follows: wHour = 2, wMonth = 4, wDayOfWeek = 0, wDay = 1. Specify 02:00 on the last Thursday in October as follows: wHour = 2, wMonth = 10, wDayOfWeek = 4, wDay = 5.
 *
 * If the wYear member is not zero, the transition date is absolute; it will only occur one time. Otherwise, it is a relative date that occurs yearly.
 *
 * @see [TIME_ZONE_INFORMATION (timezoneapi.h) - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/api/timezoneapi/ns-timezoneapi-time_zone_information)
 */
export interface TransitionSystemTime {
    year: number;
    month: number;
    dayOfWeek: number;
    day: number;
    hour: number;
    minute: number;
}
/**
 *
 * @see [TZRULE | Microsoft Learn](https://learn.microsoft.com/en-us/office/client-developer/outlook/auxiliary/tzrule)
 * @see [TZREG | Microsoft Learn](https://learn.microsoft.com/en-us/office/client-developer/outlook/auxiliary/tzreg)
 */
export interface TzDefinitionRule {
    /**
     * The flags set for this member identify specific details for this time zone rule. The possible flags are as follows:
     *
     * - TZRULE_FLAG_EFFECTIVE_TZREG (2) — Identifies the rule as the one that should be used currently. Only one rule can be marked as the effective rule. All other rules are for comparison purposes only.
     * - TZRULE_FLAG_RECUR_CURRENT_TZREG (1) — On recurring meetings, identifies the rule as matching the rule in PidLidTimeZoneStruct. This can be used to detect whether PidLidTimeZoneStruct has been modified significantly by a legacy client, which would be otherwise unaware of the new, more complete property.
     *
     * @see [Constants (Outlook exported APIs) | Microsoft Learn](https://learn.microsoft.com/en-us/office/client-developer/outlook/auxiliary/constants-outlook-exported-apis)
     */
    flags: number;
    /**
     * The time in Coordinated Universal Time (UTC) that the time zone rule started.
     */
    start: string | null;
    /**
     * The offset from Greenwich Mean Time (GMT).
     */
    bias: number;
    /**
     * The offset from bias during standard time.
     */
    standardBias: number;
    /**
     * The offset from bias during daylight saving time.
     */
    daylightBias: number;
    /**
     * The time to switch to standard time.
     */
    standardDate: TransitionSystemTime;
    /**
     * The time to switch to daylight saving time.
     */
    daylightDate: TransitionSystemTime;
}
/**
 *
 * @see [TZDEFINITION | Microsoft Learn](https://learn.microsoft.com/en-us/office/client-developer/outlook/auxiliary/tzdefinition)
 */
export interface TzDefinition {
    /**
     * The name of the key for this time zone in the Windows registry. This name must not be localized.
     *
     * e.g. `Tokyo Standard Time`
     */
    keyName?: string;
    /**
     * An array of rules that describe when shifts occur.
     */
    rules: TzDefinitionRule[];
}
/**
 * @internal
 */
export declare function parse(ds: DataStream): TzDefinition | null;
