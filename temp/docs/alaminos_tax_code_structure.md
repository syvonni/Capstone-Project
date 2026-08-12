# Alaminos Tax Code Structure

> **Status:** Placeholder — awaiting official data from BPLO Alaminos.

## Overview

Alaminos, Pangasinan uses LGU-specific tax codes (e.g., C, D, C-D) for classifying business activities. The exact mapping of these codes to lines of business and fee schedules must be obtained from the BPLO office.

## Placeholder Mapping

Until the official Alaminos tax codes are provided, the system uses the **General Trias, Cavite** business classification structure as a placeholder. This structure is based on the General Trias Citizens Charter (OCBPLO 2025) and RA 7160 Section 143 categories.

### Current Tax Codes (General Trias Placeholder)

| Tax Code | Category         | Description                                      |
| -------- | ---------------- | ------------------------------------------------ |
| RET      | Retail           | Sari-sari, convenience, general merchandise, etc |
| WHL      | Wholesale        | Agricultural, food, household goods, etc         |
| FDS      | Food Service     | Restaurant, catering, food cart, bakery, etc     |
| MFG      | Manufacturing    | Food processing, garments, metal, etc            |
| SVC      | Services         | Salon, laundry, IT/BPO, medical, legal, etc      |
| FIN      | Financial        | Lending, pawnshop, insurance, cooperative, etc   |
| RES      | Real Estate      | Brokerage, leasing, subdivision, etc             |
| TRN      | Transportation   | Trucking, passenger, courier, freight, etc       |
| AGR      | Agriculture      | Crop farming, livestock, aquaculture, etc        |
| CON      | Construction     | General contractor, specialty trade, etc         |
| MIN      | Mining           | Sand & gravel, stone quarrying, etc              |
| UTL      | Utilities        | Water, electric, waste, sewerage                 |

## Alaminos-Specific Codes (To Be Filled)

When the BPLO provides the official tax codes, update the following:

| Alaminos Code | Category | Lines of Business | Mayor's Permit Fee | Tax Brackets |
| ------------- | -------- | ----------------- | ------------------ | ------------ |
| C             | TBD      | TBD               | TBD                | TBD          |
| D             | TBD      | TBD               | TBD                | TBD          |
| C-D           | TBD      | TBD               | TBD                | TBD          |

## Fee Configuration Seed Data

The `FeeConfiguration` collection is seeded with placeholder rates and business tax brackets based on the **General Trias Citizens Charter (OCBPLO 2025)** and **RA 7160 Section 143**. See the seed script at `backend/services/business-service/src/seed/seedFeeConfiguration.js`.

Reference: [Citizen's Charter - OCBPLO 2025 (General Trias)](https://www.generaltrias.gov.ph/storage/pdf_files/Citizen%27s%20Charter%20-%20OCBPLO%202025..pdf)

## Action Items

1. Contact BPLO Alaminos for official tax code list
2. Map each Alaminos code to the corresponding line-of-business categories
3. Update `backend/shared/constants/industryCategories.js` with Alaminos-specific codes
4. Update `web/src/shared/constants/industryCategories.js` (frontend mirror)
5. Re-seed `FeeConfiguration` collection with Alaminos-specific rates (update the seed script)
