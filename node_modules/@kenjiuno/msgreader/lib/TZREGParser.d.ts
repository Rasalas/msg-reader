import DataStream from "./DataStream";
import { TransitionSystemTime } from "./TZDEFINITIONParser";
/**
 * Contains a stream that maps to the persisted format of a TZREG structure,
 * which describes the time zone to be used for the start and end time of a
 * recurring appointment or meeting request.
 *
 * @see [PidLidTimeZoneStruct Canonical Property | Microsoft Learn](https://learn.microsoft.com/en-us/office/client-developer/outlook/mapi/pidlidtimezonestruct-canonical-property)
 */
export interface TzReg {
    /**
     * offset from GMT
     *
     * Unit: in minutes
     *
     * e.g. `-540` for JST (TZ=JST-9)
     */
    bias: number;
    /**
     * offset from bias during standard time
     */
    standardBias: number;
    /**
     * offset from bias during daylight time
     *
     * Unit: in minutes
     *
     * e.g. `-60` for Japanese. In Japan there is no summer time. This value may be generic value over worldwide.
     */
    daylightBias: number;
    /**
     * matches the stStandardDate's wYear member
     */
    standardYear: number;
    /**
     * time to switch to standard time
     */
    standardDate: TransitionSystemTime;
    /**
     * matches the stDaylightDate's wYear field
     */
    daylightYear: number;
    /**
     * time to switch to daylight time
     */
    daylightDate: TransitionSystemTime;
}
/**
 * @internal
 */
export declare function parse(ds: DataStream): TzReg | null;
