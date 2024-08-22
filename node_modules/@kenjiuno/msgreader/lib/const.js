"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
exports.default = {
    FILE_HEADER: (0, utils_1.uInt2int)([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]),
    MSG: {
        UNUSED_BLOCK: -1,
        END_OF_CHAIN: -2,
        S_BIG_BLOCK_SIZE: 0x0200,
        S_BIG_BLOCK_MARK: 9,
        L_BIG_BLOCK_SIZE: 0x1000,
        L_BIG_BLOCK_MARK: 12,
        SMALL_BLOCK_SIZE: 0x0040,
        BIG_BLOCK_MIN_DOC_SIZE: 0x1000,
        HEADER: {
            PROPERTY_START_OFFSET: 0x30,
            BAT_START_OFFSET: 0x4c,
            BAT_COUNT_OFFSET: 0x2C,
            SBAT_START_OFFSET: 0x3C,
            SBAT_COUNT_OFFSET: 0x40,
            XBAT_START_OFFSET: 0x44,
            XBAT_COUNT_OFFSET: 0x48
        },
        PROP: {
            NO_INDEX: -1,
            PROPERTY_SIZE: 0x0080,
            NAME_SIZE_OFFSET: 0x40,
            MAX_NAME_LENGTH: ( /*NAME_SIZE_OFFSET*/0x40 / 2) - 1,
            TYPE_OFFSET: 0x42,
            PREVIOUS_PROPERTY_OFFSET: 0x44,
            NEXT_PROPERTY_OFFSET: 0x48,
            CHILD_PROPERTY_OFFSET: 0x4C,
            START_BLOCK_OFFSET: 0x74,
            SIZE_OFFSET: 0x78,
            TYPE_ENUM: {
                DIRECTORY: 1,
                DOCUMENT: 2,
                ROOT: 5
            }
        },
        FIELD: {
            PREFIX: {
                ATTACHMENT: '__attach_version1.0',
                RECIPIENT: '__recip_version1.0',
                DOCUMENT: '__substg1.',
                NAMEID: '__nameid_version1.0'
            },
            // example (use fields as needed)
            NAME_MAPPING: {
                // email specific
                '001a': 'messageClass',
                '0037': 'subject',
                '0c1a': 'senderName',
                '0c1e': 'senderAddressType',
                '0c1f': 'senderEmail',
                '5d01': 'senderSmtpAddress',
                '5d02': 'sentRepresentingSmtpAddress',
                '5d0a': 'creatorSMTPAddress',
                '5d0b': 'lastModifierSMTPAddress',
                '1000': 'body',
                '007d': 'headers',
                '1009': 'compressedRtf',
                '3ffa': 'lastModifierName',
                '0039': 'clientSubmitTime',
                '0e06': 'messageDeliveryTime',
                '3fde': 'internetCodepage',
                '3ffd': 'messageCodepage',
                '3ff1': 'messageLocaleId',
                '0e07': 'messageFlags',
                '1035': 'messageId',
                // attachment specific
                '3007': 'creationTime',
                '3008': 'lastModificationTime',
                '3703': 'extension',
                '3704': 'fileNameShort',
                '3707': 'fileName',
                '3712': 'pidContentId',
                '7ffe': 'attachmentHidden',
                '370e': 'attachMimeTag',
                // recipient specific
                '0c15': 'recipType',
                '3001': 'name',
                '3002': 'addressType',
                '3003': 'email',
                '39fe': 'smtpAddress',
                // contact specific
                '3a18': 'departmentName',
                '3a44': 'middleName',
                '3a05': 'generation',
                '3a11': 'surname',
                '3a27': 'addressCity',
                '3a16': 'companyName',
                '3a24': 'businessFaxNumber',
                '3a29': 'streetAddress',
                '3a51': 'businessHomePage',
                '3a06': 'givenName',
                '3a09': 'homeTelephoneNumber',
                '3a15': 'postalAddress',
                '3a17': 'title',
                '3a1c': 'mobileTelephoneNumber',
                '3a26': 'country',
                '3a28': 'stateOrProvince',
                '3a2a': 'postalCode',
                '3a45': 'displayNamePrefix',
                '0070': 'conversationTopic',
                '0e1d': 'normalizedSubject',
                '3a08': 'businessTelephoneNumber',
                '3a0d': 'location',
            },
            FULL_NAME_MAPPING: {
                '1013001f': 'bodyHtml',
                '10130102': 'html',
            },
            PIDLID_MAPPING: {
                // PSETID_Common
                "00062008-0000-0000-c000-000000000046": {
                    0x00008520: { id: "PidLidVerbStream", },
                    0x00008524: { id: "PidLidVerbResponse", dispid: "votingResponse", },
                    0x00008580: { id: "PidLidInternetAccountName", dispid: "inetAcctName", },
                },
                // PSETID_Appointment
                "00062002-0000-0000-c000-000000000046": {
                    0x0000820D: { id: "PidLidAppointmentStartWhole", dispid: "apptStartWhole", },
                    0x0000820E: { id: "PidLidAppointmentEndWhole", dispid: "apptEndWhole", },
                    0x00008235: { id: "PidLidClipStart", dispid: "clipStart", },
                    0x00008236: { id: "PidLidClipEnd", dispid: "clipEnd", },
                    0x00008233: { id: "PidLidTimeZoneStruct", dispid: "timeZoneStruct" },
                    0x00008234: { id: "PidLidTimeZoneDescription", dispid: "timeZoneDesc" },
                    0x0000825E: { id: "PidLidAppointmentTimeZoneDefinitionStartDisplay", dispid: "apptTZDefStartDisplay" },
                    0x0000825F: { id: "PidLidAppointmentTimeZoneDefinitionEndDisplay", dispid: "apptTZDefEndDisplay" },
                    0x00008260: { id: "PidLidAppointmentTimeZoneDefinitionRecur", dispid: "apptTZDefRecur" },
                    0x00008216: { id: "PidLidAppointmentRecur", dispid: "apptRecur" },
                    0x00008208: { id: "PidLidLocation", dispid: "apptLocation", },
                },
                // PSETID_Address
                "00062004-0000-0000-c000-000000000046": {
                    0x0000802c: { id: "dispidYomiFirstName", dispid: "yomiFirstName", },
                    0x00008083: { id: "dispidEmail1EmailAddress", dispid: "email1EmailAddress", },
                    0x0000802e: { id: "dispidYomiCompanyName", dispid: "yomiCompanyName", },
                    0x000080d2: { id: "PidLidFax3AddressType", dispid: "fax3AddrType", },
                    0x00008080: { id: "PidLidEmail1DisplayName", dispid: "email1DisplayName", },
                    0x00008084: { id: "PidLidEmail1OriginalDisplayName", dispid: "email1OriginalDisplayName", },
                    0x00008005: { id: "PidLidFileUnder", dispid: "fileUnder", },
                    0x0000802d: { id: "PidLidYomiLastName", dispid: "yomiLastName", },
                    0x000080b2: { id: "PidLidFax1AddressType", dispid: "fax1AddrType", },
                    0x000080c3: { id: "PidLidFax2EmailAddress", dispid: "fax2EmailAddress", },
                    0x00008046: { id: "PidLidWorkAddressCity", dispid: "workAddressCity", },
                    0x000080dd: { id: "PidLidAddressCountryCode", dispid: "addressCountryCode", },
                    0x000080c2: { id: "PidLidFax2AddressType", dispid: "fax2AddrType", },
                    0x000080c4: { id: "PidLidFax2OriginalDisplayName", dispid: "fax2OriginalDisplayName", },
                    0x00008048: { id: "PidLidWorkAddressPostalCode", dispid: "workAddressPostalCode", },
                    0x00008045: { id: "PidLidWorkAddressStreet", dispid: "workAddressStreet", },
                    0x00008047: { id: "PidLidWorkAddressState", dispid: "workAddressState", },
                    0x000080db: { id: "PidLidWorkAddressCountryCode", dispid: "workAddressCountryCode", },
                    0x00008049: { id: "PidLidWorkAddressCountry", dispid: "workAddressCountry", },
                    0x0000802b: { id: "PidLidHtml", dispid: "contactHtml", },
                    0x0000801b: { id: "PidLidWorkAddress", dispid: "workAddress", },
                    0x000080b4: { id: "PidLidFax1OriginalDisplayName", dispid: "fax1OriginalDisplayName", },
                    0x00008062: { id: "PidLidInstantMessagingAddress", dispid: "instMsg", },
                    0x00008010: { id: "PidLidDepartment", dispid: "department", },
                    0x000080b3: { id: "PidLidFax1EmailAddress", dispid: "fax1EmailAddress", },
                    0x000080d4: { id: "PidLidFax3OriginalDisplayName", dispid: "fax3OriginalDisplayName", },
                    0x000080d3: { id: "PidLidFax3EmailAddress", dispid: "fax3EmailAddress", },
                },
                // PSETID_Meeting
                "6ed8da90-450b-101b-98da-00aa003f1305": {
                    0x00000003: { id: "PidLidGlobalObjectId", dispid: "globalAppointmentID", },
                    0x00000028: { id: "PidLidOldLocation", dispid: "apptOldLocation", },
                },
            },
            CLASS_MAPPING: {
                ATTACHMENT_DATA: '3701'
            },
            TYPE_MAPPING: {
                '001e': 'string',
                '001f': 'unicode',
                '0040': 'time',
                '0102': 'binary',
                '0003': 'integer',
                '000b': 'boolean',
            },
            DIR_TYPE: {
                INNER_MSG: '000d'
            }
        }
    }
};
