# LOB Seeder Improvements Guide

**Last Updated:** July 23, 2026
**Prepared By:** Cascade AI Assistant

---

## Research Rules and Decisions

**IMPORTANT: These rules must be followed for any future LOB seeder research to maintain consistency and avoid duplicating work.**

### Rule 1: Universal Requirements vs LOB-Specific Requirements
- **Universal requirements** (Community Tax Certificate, Proof of Ownership/Lease, Occupancy Permit, Sketch of Location) are already handled in the business permit application form (seedFormDefinitions.js)
- These apply to ALL businesses regardless of LOB
- **DO NOT** add these to LOB-specific mappings (LOB_DOCUMENT_MAPPINGS)
- They are general business permit requirements, not LOB-specific

### Rule 3: Variable Fees - LOB-Specific Implementation
Variable fees based on floor area or other metrics exist in many LGUs and should be implemented as LOB-specific variable fee rules:

- **Employee Count Fee** - Not recommended (already collected for SSS/PhilHealth, not fee calculation)
- **Floor Area Fee** - Not recommended (too generic, applies to most businesses)
- **Storage Area Fee (variable)** - Recommended as LOB-specific for businesses with warehouse/storage facilities
- **Parking Space Fee (variable)** - Recommended as LOB-specific for businesses with dedicated parking

**Implementation approach:**
- Variable fees should be LOB-specific (mapped to LOBs that typically have those facilities)
- Use graduated sqm-based brackets for calculation (similar to tax brackets)
- Avoid facility-based questions - use LOB mappings instead
- Follow existing LGU rate schedules as reference

**Rationale:** Variable fees are legitimate LGU fees that exist in practice. They should be implemented as LOB-specific variable fee rules with sqm-based brackets, not as generic facility-based fees.

### Rule 4: Tax Bracket Differentials - LGU-Specific
The following tax policies are LGU-specific and vary widely:
- **Essential Commodities Rate Differential** (1.2% vs 2.4%) - Not all LGUs implement this
- **Barangay Tax Authority** (gross sales ≤₱30,000) - Not consistently implemented

**Rationale:** These are LGU-specific policies that vary widely. Implementing them would require complex system changes (flags, separate brackets, threshold checks) for policies that may not apply in many jurisdictions.

**Recommendation:** Keep current tax brackets as-is. They are based on capitalization and provide a reasonable approximation across different LGUs.

### Rule 5: Only Genuinely LOB-Specific Fees
Conditional fees should only be added if they are:
- **Genuinely unique** to a specific business type or industry
- **Based on regulatory requirements** from national agencies (FDA, DENR, etc.)
- **Not generic** to most businesses
- **Not already covered** by existing document fees

**Examples of acceptable conditional fees:**
- Pharmacy-specific FDA fees (Cold Storage, Controlled Substance, E-Pharmacy)
- Mining-specific safety fees (Safety Equipment, Extraction Equipment)
- Telecommunications tower fees (CB Radio, UHF/VHF, Cell Site)
- Entertainment-specific fees (Videoke, Swimming Pool, Billiard)

### Rule 6: Document Fees vs Conditional Fees
- **Document fees** are automatically created when documents are added to the system
- Each document has an associated fee (defined in claimableDocumentFees in comprehensiveFeeSeederReference.js)
- **DO NOT** create conditional fees that duplicate existing document fees
- Example: "Signage Permit" is a document with an associated fee - do not also create a "Signage Permit Fee" as a conditional fee

**Current document fees in claimableDocumentFees:**
- Fire Safety Inspection Certificate (₱500)
- Sanitary Permit (₱300)

**Note:** Many documents exist (Signage Permit, Building Permit, etc.) but may not have fees listed in claimableDocumentFees. This is intentional - fees can be added to claimableDocumentFees as needed.

### Rule 7: Research Verification
When researching new LOBs:
1. **Check existing conditional fees** in comprehensiveFeeSeederReference.js before suggesting new ones
2. **Check existing documents** in seedDocumentsClean.js before suggesting new ones
3. **Check existing requirement fees** in comprehensiveFeeSeederReference.js to avoid duplication
4. **Verify if a fee is genuinely LOB-specific** or just a generic retail fee
5. **Check if the fee is already handled** at the application form level (not LOB-specific)

### Rule 8: Priority Framework
When suggesting additions:
- **High Priority:** Genuinely LOB-specific fees based on national agency regulations (FDA, DENR, etc.)
- **Medium Priority:** Industry-specific fees that may duplicate existing environmental fees (review needed)
- **Low Priority:** Generic fees, variable fees, tax bracket differentials (not recommended)

### Rule 9: BPLO/LGU-Issued Documents Only
The system scope is business-centered: business owners apply, review, track application statuses, and manage business inspections. The documents in the seeder should be limited to documents that BPLO/BizClear or LGU departments actually issue or manage.

**Documents that SHOULD be in the seeder:**
- Documents issued by BPLO/BizClear (Mayor's Permit, Business Plate)
- Documents issued by LGU departments that coordinate through BPLO one-stop shop (Sanitary Permit from City Health Office, Zoning Clearance from CPDO)
- Documents that business owners need to display physically after claiming from BPLO

**Documents that should NOT be in the seeder (external agency documents):**
- DTI/SEC Registration - DTI/SEC (national agency)
- Environmental Compliance Certificate - DENR (national agency)
- Building Permit, Plumbing Permit, Electrical Permit, Certificate of Occupancy - City Engineering Office (separate from BPLO)
- Excavation Permit, Heavy Equipment Permit, Signage Permit - City Engineering Office
- Delivery Vehicle Permit, Tricycle Filing Permit - Traffic/Transport Office
- Quarry Permit, Non-Metallic Mining Permit, Authorization to Haul - DENR/MGB
- Subdivision Development Permit, Condominium Project Approval - HLURB
- School Permit - DepEd
- CATV Annual Permit - NTC
- Delivery Clearance - LTFRB

**Rationale:** External agency documents are tracked and claimed from those agencies, not BPLO. The system should focus on BPLO-issued documents. However, business owners may still need to track when external agency documents are ready for claiming - this could be a separate feature.

**Borderline cases (coordinate through BPLO one-stop shop):**
- Fire Safety Inspection Certificate - BFP (but often processed through BPLO one-stop shop)
- Sanitary Permit - City Health Office (but often processed through BPLO one-stop shop)
- Zoning Clearance - CPDO (part of LGU, may coordinate through BPLO)

These are acceptable as they're typically part of the BPLO one-stop shop workflow.

### Rule 10: Post Requirements vs Inspection Requirements
**Post Requirements** are certificates, permits, and clearances that business owners need to obtain after their business permit is approved. These are checked during inspections to ensure compliance.

**Post requirements include:**
- External agency certificates (FDA LTO, PRC credentials, etc.) - claimed from external agencies
- Local government permits (Signage Permit, Building Permit, etc.) - claimed from City Engineering Office or other LGU departments
- Regulatory seals (Weights & Measures Seal) - obtained from DTI

**Conditional Post Requirements:**
Some post requirements are conditional based on business characteristics:
- **Signage Permit** - Only required if business has signage or outdoor advertising
- **Weights & Measures Seal** - Only required if business uses weighing scales or measuring devices
- **Medical Device Retailer LTO** - Only required if pharmacy sells medical devices
- **E-Pharmacy LTO** - Only required if pharmacy operates online

**NOT post requirements (these are inspection/internal documents):**
- Risk Management Plans
- Site Master Files
- Standard Operating Procedures (SOPs)
- Disaster Plans
- Photo of Establishment with Signage
- Internal policies and procedures

**Rationale:** Post requirements are external certificates/permits/seals that must be obtained after approval and checked during inspections. Conditional post requirements allow the system to adapt to business-specific circumstances (e.g., businesses with/without signage). Internal documents are inspection requirements, not post requirements.

### Rule 11: Conditional Post Requirements
Conditional post requirements should be used when a requirement only applies based on specific business characteristics or circumstances.

**When to use conditional post requirements:**
- Business has optional equipment/facilities (signage, weighing scales, CCTV, etc.)
- Business offers optional services (online operations, medical device sales, etc.)
- Business operates in optional modes (pure e-pharmacy vs physical store, etc.)

**Examples of valid conditional post requirements:**
- **Signage Permit** - Only if business has signage or outdoor advertising
- **Weights & Measures Seal** - Only if business uses weighing scales or measuring devices
- **Medical Device Retailer LTO** - Only if pharmacy sells medical devices
- **E-Pharmacy LTO** - Only if pharmacy operates online

**Implementation approach:**
- Add a `question` field to the post requirement definition in seedPostRequirements.js
- The question should be clear and answerable by the business owner
- Map the post requirement to the `conditional` array in LOB_POST_REQUIREMENT_MAPPINGS
- The system will display the question during application and only require the post requirement if answered "yes"

**Rationale:** Conditional post requirements allow the system to be flexible and adapt to different business configurations without requiring separate LOBs or manual overrides. This reduces administrative burden while ensuring compliance for businesses that actually need the requirement.

---

### Rule 12: Essential Commodities Tax Rate (50% Differential)

Businesses dealing in essential commodities qualify for a 50% tax rate reduction under RA 7160 Section 143(c). This applies to the **entire business** if classified as dealing with essential commodities, not just specific products.

**Essential Commodities (RA 7160):**
- Rice and corn
- Wheat/cassava flour, meat, dairy products, processed food, sugar, salt, agricultural/marine/freshwater products
- Cooking oil and cooking gas
- Laundry soap, detergents, medicines
- Agricultural implements, equipment, fertilizers, pesticides
- Poultry feeds
- School supplies
- Cement

**Prime Commodities (also qualify):**
- Flour, processed meat, dairy products, onions, garlic, vinegar, soy sauce
- Fertilizer, pesticides, herbicides
- Construction materials (cement, GI sheets, hollow blocks, etc.)
- School supplies
- Electrical supplies, batteries

**Implementation (Simplified Approach):**
Instead of creating custom tax brackets for each LOB, add an `essentialCommodity` boolean field to the LOB schema:
- Add `essentialCommodity: true` to LOB schema for LOBs that deal with essential/prime commodities
- Use Ant Design Select component in the UI for this field (options: Yes/No)
- Place the Select above the payment frequency field in the tax bracket form
- Tax calculation logic checks this flag
- If true, multiply calculated tax by 0.5 (50% discount)
- No need for manual `LOB_SPECIFIC_BRACKETS` overrides

**How 50% rate calculation works:**
- Calculate tax normally using standard category brackets
- If essentialCommodity is ON, multiply final tax by 0.5
- Example: Standard tax = ₱5,000 → With 50% rate = ₱2,500

**Example LOBs that qualify:**
- Sari-sari store (sells basic necessities)
- Grocery vendor (sells basic necessities)
- Rice retailer (rice is essential)
- Fish vendor (fish is essential)
- Fruits & vegetables vendor (produce is essential)
- Meat & poultry vendor (meat is essential)
- Agricultural supplies (fertilizers, pesticides)
- Hardware & construction supplies (cement, construction materials)

**Planned Implementation:**
- Add `essentialCommodity` field to LOB schema
- Update seedLobs.js to set `essentialCommodity: true` for qualifying LOBs
- Update tax calculation logic to apply 50% rate when flag is true
- Remove existing custom bracket overrides (Agricultural Supplies, Meat & Poultry Vendor) and use flag instead

**Key Principle:** If the LOB's primary business is dealing with essential/prime commodities, apply 50% rate to the entire business classification.

**Source:** RA 7160 Section 143(c), Mandaluyong Tax Code, CTA Ruling (Super Grocers vs Municipality of San Pedro)

### Rule 13: Tax Exemptions - Not Implemented
Tax exemptions (BMBE, entity-type, bracket-level) are not implemented in the current system.

**Rationale:**
- Tax exemptions are LGU-specific and vary widely across jurisdictions
- BMBE implementation is discretionary per LGU (not all LGUs grant BMBE exemptions)
- Entity-type exemptions (non-profit, charitable, cooperative) are business-level, not LOB-specific
- Bracket-level exemptions were researched and found to not be used by LGUs
- LGU exemptions are typically LOB-specific (e.g., Marikina's sari-sari store exemption) or certificate-based

**Current Implementation:**
- Tax brackets remain as baseline for all LOBs
- Essential commodity rate differential (50%) is implemented via `essentialCommodity` field on LOB schema (Rule 12)
- No tax exemption flags or logic are currently implemented

**Future Considerations:**
- If a specific LGU requires BMBE or entity-type exemptions, implement as business-level flags in BusinessProfile schema
- Do not implement bracket-level exemptions (not used by LGUs)
- Tax exemption implementation should be LGU-specific and added only when needed

---

## Implementation Summary

### Completed Enhancements
- **Variable Fee Rules**: Enhanced VariableFeeRule model to support graduated sqm-based brackets
- **Pharmacy-Specific**: Added conditional fees (cold storage, controlled substance, e-pharmacy) and documents
- **License Deprecation**: Removed license mappings/schema/UI; moved to post requirements
- **Document Cleanup**: Limited LOB_DOCUMENT_MAPPINGS to BPLO-produced documents only (Fire Safety, Sanitary Permit, Zoning Clearance)
- **Post Requirements**: Added Signage Permit and Weights & Measures Seal as conditional post requirements for inspection
- **FPA LTO**: Added as required post requirement for Agricultural Supplies and Chemicals & Fertilizers

### First 10 LOBs Status
All first 10 LOBs now have appropriate conditional post requirements mapped:
- Sari-sari store, Convenience store, General merchandise, Hardware & construction supplies, Pharmacy / drugstore, Clothing & apparel, Electronics & gadgets, Auto parts & accessories, Fuel / gasoline station, Agricultural supplies

### Next 10 LOBs Status
All next 10 LOBs now have appropriate conditional post requirements mapped:
- Meat & poultry vendor, Fish vendor, Fruits & vegetables vendor, Rice retailer, Grocery vendor, Dry goods vendor, Agricultural raw materials (wholesale), Food & beverages (wholesale), Household goods (wholesale), Industrial machinery (wholesale)

### Next 20 LOBs Status
All next 20 LOBs now have appropriate conditional post requirements mapped:
- Construction materials (wholesale), Chemicals & fertilizers, Restaurant / eatery, Catering services, Food cart / food stall, Bakery / pastry shop, Coffee shop / milk tea, Bar / nightclub, Canteen / commissary, Food processing, Garments & textiles, Furniture & woodworks, Metal fabrication, Plastics & rubber products, Printing & publishing, Chemical products, Electronics assembly, Hotel / resort, Boarding house / dormitory, Apartment / condominium rental

---

## Next 20 LOBs Implementation Summary

### New Post-Requirements Added to seedPostRequirements.js

The following post-requirements were added to support the next 20 LOBs:

**Trade Regulation (DTI):**
- `dti-gtido-registration` - DTI GTIDO Registration for export-oriented garments and textiles

**Tourism Regulation (DOT):**
- `dot-accreditation` - DOT Accreditation for tourism enterprises (hotels, resorts, travel agencies, tour operators)

**Investment Promotion (BOI/PEZA):**
- `boi-registration` - BOI Registration for export-oriented or priority projects
- `peza-registration` - PEZA Registration for economic zone locators

**Environmental Permits (DENR - Additional):**
- `denr-wood-processing-permit` - DENR Wood Processing Plant Permit for lumber/wood processing
- `denr-pmpin` - DENR PMPIN for new chemical substances
- `denr-pto-air` - DENR Permit to Operate for air pollution sources
- `denr-wwdp` - DENR Wastewater Discharge Permit for facilities with wastewater

**Publishing Regulation (NBDB):**
- `nbdb-publisher-registration` - NBDB Publisher Registration for ISBN issuance

**BIR Special Permits:**
- `bir-authority-to-print` - BIR Authority to Print for printing ORs/SIs

**Agriculture Regulation (FPA):**
- `fpa-lto` - FPA License to Operate for fertilizer and pesticide handlers

### LOB Post-Requirement Mappings Updated in seedLobs.js

**Conditional Fee Changes:**
- Construction materials (wholesale): Removed `cold-storage-equipment` (not applicable to construction materials)

**Post-Requirement Mappings:**
- Bakery / pastry shop: Added conditional `fda-lto` (for pre-packaged goods)
- Food processing: Added required `fda-lto`
- Garments & textiles: Added conditional `dti-gtido-registration` and `ecc`
- Furniture & woodworks: Added conditional `denr-wood-processing-permit` and `pcab-license`
- Metal fabrication: Added conditional `ecc` and `pcab-license`
- Plastics & rubber products: Added conditional `ecc`, `denr-pto-air`, and `denr-wwdp`
- Printing & publishing: Added conditional `nbdb-publisher-registration` and `bir-authority-to-print`
- Chemical products: Added required `fda-lto`, conditional `denr-pmpin`, `ecc`, and `denr-pto-air`
- Electronics assembly: Added conditional `boi-registration`, `peza-registration`, and `ecc`
- Hotel / resort: Added conditional `dot-accreditation`

**No Changes Needed:**
- Chemicals & fertilizers (FPA LTO already mapped correctly)
- Restaurant / eatery, Catering services, Food cart / food stall, Coffee shop / milk tea, Bar / nightclub, Canteen / commissary (no additional post-requirements identified)
- Boarding house / dormitory, Apartment / condominium rental (no additional post-requirements identified)

---

## Next 20 LOBs Research Findings

### Research Scope
This section covers the next 20 LOBs from "Fireworks / pyrotechnics" through "Pawnshop".

### Research Rules Applied
1. Only add post-requirements that are LOB-specific and mandatory for operation
2. General business requirements (DTI/SEC, BIR, Mayor's Permit, Barangay Clearance) are NOT post-requirements
3. Post-requirements are certificates, permits, licenses, and clearances that must be physically present in the business establishment
4. Conditional post-requirements are those that apply only under specific conditions (e.g., export-oriented, certain scale, specific activities)

### Important Rule: Government-Owned Businesses Are Out of Scope

**BizClear is designed for PRIVATE businesses only.** Government-owned and operated businesses cannot use the system because:

1. **Ownership**: They are owned by LGUs, national government agencies, or GOCCs - not by private individuals or corporations
2. **Legal framework**: They operate under special charters, government codes, and different permitting regimes
3. **Exemptions**: They are often exempt from local business taxes and mayor's permits entirely under:
   - Section 234(a) of RA 7160 (LGC) - government instrumentalities exempt from local taxes
   - PD 198 (Provincial Water Utilities Act) - water districts exempt from all taxes and fees
   - Special charters for GOCCs and government enterprises
4. **Process**: Their permitting is handled through internal government channels, not the standard business permit application process

**Government enterprises that should NOT use BizClear:**
- Public hospitals
- Public markets
- LGU slaughterhouses
- LGU water districts
- GOCC hospitals and utilities
- Public schools
- LGU-owned electric utilities

**Private businesses that CAN use BizClear:**
- Private hospitals (subject to bed capacity fees)
- Private water concessionaires (subject to business permits)
- Private schools (subject to business permits)
- Private electric cooperatives (subject to regulatory fees)
- Market vendors renting from public markets (private businesses)

**Note**: LOB names describe business activities, not ownership structures. Even when government-owned versions exist, private competitors can use BizClear. The system is scoped to private entities operating these business activities.

---

### LOB Research Findings

#### Retail Category LOBs (First 10)

#### 1. Sari-sari store
**Conditional Fees:** None identified
**Variable Fees:** Market stall fee based on floor area (some LGUs)
- Small (5-6 sqm): ₱1,200
- Medium (7-11 sqm): ₱1,320
- Big (12-12.5 sqm): ₱1,440
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 2. Convenience store
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 3. General merchandise
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 4. Hardware & construction supplies
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 5. Pharmacy / drugstore
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** FDA License to Operate
  - Issued by: Food and Drug Administration (FDA)
  - Governing Law: RA 9711 (FDA Act)
  - Notes: Required for all pharmacies; must have licensed pharmacist

#### 6. Clothing & apparel
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 7. Electronics & gadgets
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 8. Auto parts & accessories
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 9. Fuel / gasoline station
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** DOE Certificate of Compliance
  - Issued by: Department of Energy (DOE)
  - Notes: Required for gasoline stations; includes fuel dispenser calibration

#### 10. Agricultural supplies
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

---

#### 11. Fireworks / pyrotechnics
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** PNP-FEO License/Permit (Manufacturer's License, Dealer's License, Retailer's Permit, or Fireworks Display Operator's License depending on activity)
  - Governing Law: RA 7183 (Pyrotechnic Devices Law)
  - Issued by: Philippine National Police - Firearms and Explosives Office (PNP-FEO)
  - Required for: All businesses engaged in manufacture, sale, distribution, or display of fireworks/pyrotechnics
  - Notes: Must be 100% Filipino-owned for manufacturers and dealers

#### 12. Salon / barbershop
**Conditional Fees:** None identified
**Variable Fees:** Per chair/station fee (some LGUs)
- First chair: ₱500 (air-conditioned) / ₱400 (ordinary)
- Additional chairs: ₱300 (air-conditioned) / ₱200 (ordinary)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** Sanitary Permit / Health Clearance
  - Issued by: Local City/Municipal Health Office
  - Required by: Many LGUs (e.g., Mandaluyong requires MOA stamped by Health Dept)
  - Notes: Health certificates for staff may also be required

#### 13. Laundry services
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** Certificate of Non-Coverage (CNC) from DENR
  - Issued by: Department of Environment and Natural Resources (DENR-EMB)
  - Required for: Water discharge compliance
  - Notes: Some LGUs specifically require CNC for laundry shops (e.g., Imus City)
- **Conditional:** Sanitary Permit
  - Issued by: Local City/Municipal Health Office
  - Required for: Public health compliance
  - Notes: Required by many LGUs (e.g., Bacolod City categorizes under Public Laundry)

#### 14. Repair shop (electronics, appliances)
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** DTI Accreditation
  - Issued by: Department of Trade and Industry (DTI)
  - Required by: Some LGUs (e.g., Mandaluyong, Pasig)
  - Notes: Not universally required; depends on LGU ordinance

#### 15. Tutorial / review center
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** DepEd Permit/Recognition
  - Issued by: Department of Education (DepEd)
  - Required for: Centers offering formal, graded, or diploma-track instruction
  - Notes: Supplementary tutorial centers generally do NOT require DepEd accreditation; only if acting like a formal school

#### 16. School / educational institution
**Conditional Fees:** None identified
**Variable Fees:** Variable fees based on enrollment (some LGUs)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** DepEd Permit or Recognition
  - Issued by: Department of Education (DepEd)
  - Governing Law: RA 9155 (Governance of Basic Education Act)
  - Notes: Permit is valid for 1 school year; Recognition is valid for life of corporation
- **Conditional:** SEC Registration (for stock/non-stock educational corporations)
  - Required for: Private schools operating as corporations
  - Notes: Must incorporate as stock or non-stock educational corporation

#### 7. University / college
**Conditional Fees:** None identified
**Variable Fees:** Variable fees based on enrollment (some LGUs)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** CHED Recognition/Permit
  - Issued by: Commission on Higher Education (CHED)
  - Governing Law: RA 7722 (Higher Education Act)
  - Notes: Required for tertiary education institutions
- **Conditional:** DepEd Permit (for basic education components if any)
- **Conditional:** SEC Registration (for corporations)

#### 8. IT / BPO services
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** PEZA Registration
  - Issued by: Philippine Economic Zone Authority (PEZA)
  - Required for: Export-oriented BPOs locating in PEZA-accredited IT parks/buildings
  - Notes: Provides tax incentives (ITH, SCIT); not required for domestic-market BPOs
- **Conditional:** BOI Registration
  - Issued by: Board of Investments (BOI)
  - Required for: Non-PEZA locations seeking incentives
  - Notes: Alternative to PEZA for incentive eligibility
- **Conditional:** NPC Registration
  - Issued by: National Privacy Commission (NPC)
  - Required for: Businesses processing personal data as Personal Information Controllers
  - Governing Law: RA 10173 (Data Privacy Act)
  - Notes: Must appoint Data Protection Officer

#### 9. Legal services
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** PRC License
  - Issued by: Professional Regulation Commission (PRC)
  - Required for: Individual lawyers practicing profession
  - Notes: Law firms as business entities need standard permits; individual lawyers need PRC license and PTR

#### 10. Accounting / bookkeeping
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** PRC License
  - Issued by: Professional Regulation Commission (PRC)
  - Required for: CPAs offering professional accounting/auditing services
  - Notes: Bookkeeping services may not require PRC license if not offering attestation/audit services

#### 11. Medical / dental clinic
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** DOH License to Operate
  - Issued by: Department of Health (DOH)
  - Governing Law: RA 4226 (Hospital Licensure Act)
  - Required for: Clinics providing specific services (infirmary, diagnostic, dialysis, etc.)
  - Notes: Basic consultation clinics may not require DOH LTO in some LGUs
- **Conditional:** PhilHealth Accreditation
  - Issued by: Philippine Health Insurance Corporation (PhilHealth)
  - Required for: Clinics billing PhilHealth for services
  - Notes: Optional but practically essential for financial viability
- **Conditional:** PRC License
  - Issued by: Professional Regulation Commission (PRC)
  - Required for: Individual practitioners (doctors, dentists)
- **Conditional:** Certificate of Non-Coverage (CNC) from DENR
  - Required by: Some LGUs for medical/dental clinics
  - Notes: For water discharge compliance

#### 12. Hospital
**Conditional Fees:** None identified
**Variable Fees:** Sanitary fee based on bed capacity (some LGUs)
- <25 beds: ₱165
- 25-49 beds: ₱440
- 50-99 beds: ₱660
- 100+ beds: ₱880
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** DOH License to Operate
  - Issued by: Department of Health (DOH)
  - Governing Law: RA 4226 (Hospital Licensure Act)
  - Notes: Required for all hospitals; DOH-Permit to Construct also required for new construction/expansion
- **Conditional:** DOH Permit to Construct
  - Required for: New hospitals, substantial alterations, expansion, change in classification
- **Required:** PhilHealth Accreditation
  - Notes: Practically essential for hospital operations
- **Conditional:** ECC from DENR
  - Required for: Hospital construction (per DOH AO 150-2004)

#### 13. Veterinary clinic
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** BAI Registration
  - Issued by: Bureau of Animal Industry (BAI) - DA
  - Governing Law: RA 8485 (Animal Welfare Act)
  - Notes: Required for veterinary clinics, hospitals, and related animal facilities
- **Conditional:** PRC License
  - Issued by: Professional Regulation Commission (PRC)
  - Required for: Facility veterinarian
- **Conditional:** S2 License from PDEA
  - Issued by: Philippine Drug Enforcement Agency (PDEA)
  - Required for: Veterinary facilities handling controlled substances
- **Conditional:** Animal Welfare Seminar Certificate
  - Required for: Owner/facility veterinarian
- **Conditional:** DENR ECC/CNC
  - Required for: Environmental compliance

#### 14. Security agency
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** PNP-SOSIA License to Operate
  - Issued by: Philippine National Police - Supervisory Office for Security and Investigation Agencies (SOSIA)
  - Governing Law: RA 11917 (Private Security Services Industry Act)
  - Notes: Must be 100% Filipino-owned; minimum paid-up capital ₱500,000
- **Conditional:** Firearms License
  - Required for: Agencies with firearms
  - Issued by: PNP-FEO

#### 15. Manpower / recruitment agency
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** DOLE Registration (DO 174)
  - Issued by: Department of Labor and Employment (DOLE)
  - Required for: Local manpower contractors/subcontractors
  - Governing Law: Department Order No. 174-17
  - Notes: Minimum paid-up capital ₱5,000,000; net worth ≥ ₱3,000,000
- **Conditional:** DMW License
  - Issued by: Department of Migrant Workers (DMW, formerly POEA)
  - Required for: Overseas recruitment agencies
  - Governing Law: RA 8042 (Migrant Workers Act)
  - Notes: Minimum paid-up capital ₱5,000,000; 75% Filipino ownership; escrow deposit ₱1,500,000

#### 16. Advertising services
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- None identified beyond standard business permits

#### 17. Internet café
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** Anti-Piracy Compliance
  - Required for: Software licensing (Microsoft Office/Windows)
  - Notes: BSA compliance stickers should be displayed
- **Conditional:** NTC Registration
  - Issued by: National Telecommunications Commission (NTC)
  - Required for: Offering WiFi to public
  - Notes: Not always required for small operations

#### 18. Bank
**Conditional Fees:** None identified
**Variable Fees:** Bank Classification Fee (based on bank type)
- Rural, Thrift and Savings Banks: ₱2,000
- Commercial, Industrial and Development Banks: ₱3,000
- Universal Banks: ₱5,000
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** BSP Certificate of Authority
  - Issued by: Bangko Sentral ng Pilipinas (BSP)
  - Governing Law: RA 8791 (General Banking Law)
  - Notes: Primary license to operate as a bank

#### 19. Lending / financing company
**Conditional Fees:** None identified
**Variable Fees:** Lending Institution Classification Fee (based on financial institution type)
- Lending investors: ₱1,500
- Money shops: ₱1,500
- Investment companies: ₱1,500
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** SEC Certificate of Authority
  - Issued by: Securities and Exchange Commission (SEC)
  - Governing Law: RA 9474 (Lending Company Regulation Act) for lending companies; RA 8556 (Financing Company Act) for financing companies
  - Notes: Must be stock corporation; minimum paid-up capital ₱1,000,000 (may be higher per SEC)
- **Conditional:** AMLC Registration
  - Issued by: Anti-Money Laundering Council (AMLC)
  - Required for: Covered persons under AMLA
  - Notes: Must implement AML/CFT program

#### 20. Pawnshop
**Conditional Fees:** None identified
**Variable Fees:** Pawnshop Classification Fee
- Pawnshops: ₱1,500
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** BSP Authority to Operate
  - Issued by: Bangko Sentral ng Pilipinas (BSP)
  - Governing Law: PD 114 (Pawnshop Regulation Act)
  - Notes: Must register with BSP before operations; DTI/SEC registration also required

---

### Wholesale Category LOBs (Next 10)

#### 21. Agricultural raw materials
**Conditional Fees:** None identified
**Variable Fees:** None identified (wholesale fees are based on gross receipts, not per-unit measures)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** FPA License to Operate
  - Issued by: Fertilizer and Pesticide Authority (FPA)
  - Required for: Dealing in agricultural chemicals, fertilizers, pesticides
  - Governing Law: RA 6969 (Toxic Substances and Hazardous Wastes Act), PD 1144 (FPA Law)
  - Notes: Each product must also be registered with FPA
- **Conditional:** BPI License to Operate
  - Issued by: Bureau of Plant Industry (BPI)
  - Required for: Dealing in seeds, planting materials
  - Governing Law: RA 7307 (Seed Industry Development Act)
  - Notes: Required for seed dealers

#### 22. Food & beverages (wholesale)
**Conditional Fees:** None identified
**Variable Fees:** None identified (wholesale fees are based on gross receipts, not per-unit measures)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** FDA License to Operate
  - Issued by: Food and Drug Administration (FDA)
  - Required for: Dealing in food products
  - Governing Law: RA 9711 (FDA Act)
  - Notes: Required for food distributors
- **Conditional:** LTO from Local Health Office
  - Issued by: Local Health Office
  - Required for: Food handling and storage
  - Notes: License to Operate for food establishments

#### 23. Household goods (wholesale)
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 24. Industrial machinery & equipment (wholesale)
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 25. Construction materials (wholesale)
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 26. Chemicals & fertilizers (wholesale)
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance, Environmental Compliance Certificate
**Post-Requirements:**
- **Required:** FPA License to Operate
  - Issued by: Fertilizer and Pesticide Authority (FPA)
  - Governing Law: PD 1144 (FPA Law)
  - Notes: Required for dealers in fertilizers, pesticides, agricultural chemicals
- **Conditional:** DENR ECC
  - Issued by: Department of Environment and Natural Resources (DENR)
  - Required for: Large-scale chemical storage
  - Governing Law: RA 6969 (Toxic Substances Act)

#### 27. Meat & poultry vendor
**Conditional Fees:** None identified
**Variable Fees:** Market stall fee (same as sari-sari store)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** NMIS Accreditation
  - Issued by: National Meat Inspection Service (NMIS)
  - Governing Law: RA 9296 (Meat Inspection Code)
  - Notes: Required for meat vendors

#### 28. Fish vendor
**Conditional Fees:** None identified
**Variable Fees:** Market stall fee (same as sari-sari store)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** BFAR Registration
  - Issued by: Bureau of Fisheries and Aquatic Resources (BFAR)
  - Required for: Selling fish products
  - Governing Law: RA 8550 (Philippine Fisheries Code)

#### 29. Fruits & vegetables vendor
**Conditional Fees:** None identified
**Variable Fees:** Market stall fee (same as sari-sari store)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 30. Rice retailer
**Conditional Fees:** None identified
**Variable Fees:** Market stall fee (same as sari-sari store)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** NFA Accreditation
  - Issued by: National Food Authority (NFA)
  - Required for: Licensed rice retailers
  - Governing Law: RA 7581 (Price Act)
  - Notes: Not all rice retailers require NFA accreditation

---

### Food Service Category LOBs (Next 5)

#### 31. Restaurant / eatery
**Conditional Fees:** None identified
**Variable Fees:** None identified (fees based on floor area or gross receipts, not per seat)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance, Environmental Compliance Certificate
**Post-Requirements:**
- **Conditional:** Liquor License
  - Issued by: Local Government Unit
  - Required for: Serving alcoholic beverages
  - Notes: Separate permit with its own fee
- **Conditional:** LTO from Local Health Office
  - Issued by: Local Health Office
  - Required for: Food establishments
  - Notes: License to Operate

#### 32. Catering services
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** LTO from Local Health Office
  - Issued by: Local Health Office
  - Required for: Food establishments
  - Notes: License to Operate

#### 33. Food cart / food stall
**Conditional Fees:** None identified
**Variable Fees:** Market stall fee (if in public market)
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 34. Bakery / pastry shop
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** FDA License to Operate
  - Issued by: Food and Drug Administration (FDA)
  - Governing Law: RA 9711 (FDA Act)
  - Notes: Required for bakeries producing food products

#### 35. Coffee shop / milk tea
**Conditional Fees:** None identified
**Variable Fees:** None identified
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Conditional:** LTO from Local Health Office
  - Issued by: Local Health Office
  - Required for: Food establishments
  - Notes: License to Operate

---

### Real Estate Category LOBs (Next 3)

#### 36. Hotel / resort
**Conditional Fees:** None identified
**Variable Fees:** Hotel room fee (bracketed by number of rooms)
- <5 rooms: ₱600
- 5-12 rooms: ₱1,000
- 12-20 rooms: ₱1,500
- 20-30 rooms: ₱2,000
- 30-40 rooms: ₱2,500
- 40-50 rooms: ₱3,000
- >50 rooms: ₱3,500
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance, Environmental Compliance Certificate
**Post-Requirements:**
- **Required:** DOT Accreditation
  - Issued by: Department of Tourism (DOT)
  - Required for: Primary Tourism Enterprises (hotels, resorts)
  - Governing Law: RA 9593 (Tourism Act), Section 122 IRR
  - Notes: Mandatory for hotels/resorts under Tourism Act; LGUs must require DOT accreditation before issuing business permit
- **Conditional:** Liquor License
  - Issued by: Local Government Unit
  - Required for: Serving alcoholic beverages
  - Notes: Separate permit with its own fee

#### 37. Boarding house / dormitory
**Conditional Fees:** None identified
**Variable Fees:** Boarding house fee (bracketed by number of boarders)
- 5-10 boarders: ₱250
- 11-20 boarders: ₱500
- 21+ boarders: ₱750
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits

#### 38. Apartment / condominium rental
**Conditional Fees:** None identified
**Variable Fees:** Apartment unit fee (per unit)
- ₱100 per unit
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:** None identified beyond standard business permits
**Notes:** Single-unit rentals by natural persons may be exempt from business permit in some LGUs

---

### Transportation Category LOBs (Next 2)

#### 39. Trucking / hauling
**Conditional Fees:** None identified
**Variable Fees:** Trucking unit fee (per truck)
- ₱400 per truck
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** LTFRB CPC
  - Issued by: Land Transportation Franchising and Regulatory Board (LTFRB)
  - Governing Law: RA 9594 (LTFRB Charter)
  - Notes: Certificate of Public Convenience for trucking operations
- **Conditional:** LTO Registration
  - Issued by: Land Transportation Office (LTO)
  - Required for: Vehicle registration
  - Notes: Each truck must be registered

#### 40. Passenger transport (jeepney, bus, UV express)
**Conditional Fees:** None identified
**Variable Fees:** PUV unit fee (per vehicle)
- ₱200 per vehicle
**Required Documents:** Fire Safety Inspection Certificate, Sanitary Permit, Zoning Clearance
**Post-Requirements:**
- **Required:** LTFRB CPC
  - Issued by: Land Transportation Franchising and Regulatory Board (LTFRB)
  - Governing Law: RA 9594 (LTFRB Charter)
  - Notes: Certificate of Public Convenience for passenger transport
- **Conditional:** LTO Registration
  - Issued by: Land Transportation Office (LTO)
  - Required for: Vehicle registration
  - Notes: Each vehicle must be registered

---

### Variable Fee Implementation Recommendations for First 40 LOBs

Based on the research, the following variable fee rules should be implemented in `comprehensiveFeeSeederReference.js`:

**Already Implemented (First 20 LOBs):**
1. **salon-barber-chair-fee** - Bracketed by number of chairs (salon/barbershop)
2. **hospital-bed-fee** - Bracketed by bed capacity (hospital)
3. **printing-machine-fee** - Per unit for printing machines (printing & publishing)
4. **market-stall-fee** - Bracketed by floor area (sari-sari store, market vendors)

**Newly Implemented (LOBs 21-40):**
5. **hotel-room-fee** - Bracketed by number of rooms (hotel/resort)
6. **boarding-house-fee** - Bracketed by number of boarders (boarding house/dormitory)
7. **apartment-unit-fee** - Per unit for apartment rentals (apartment/condominium rental)
8. **trucking-unit-fee** - Per truck for trucking services (trucking/hauling)
9. **puv-unit-fee** - Per vehicle for public utility transport (passenger transport)

### Summary of New Post-Requirements Identified

The following new post-requirements were identified and should be added to `seedPostRequirements.js`:

**From First 20 LOBs:**
1. **pnp-feo-license** - PNP-FEO License/Permit for fireworks/pyrotechnics
2. **denr-cnc** - Certificate of Non-Coverage from DENR (for laundry, clinics, etc.)
3. **dti-accreditation** - DTI Accreditation for repair shops
4. **deped-permit** - DepEd Permit for schools
5. **deped-recognition** - DepEd Recognition for schools
6. **ched-recognition** - CHED Recognition for universities/colleges

**From LOBs 21-40:**
7. **fpa-license** - FPA License to Operate for agricultural chemicals/fertilizers
8. **bpi-license** - BPI License to Operate for seeds/planting materials
9. **fda-lto** - FDA License to Operate for food establishments
10. **health-lto** - LTO from Local Health Office for food establishments
11. **nmis-accreditation** - NMIS Accreditation for meat vendors
12. **bfar-registration** - BFAR Registration for fish vendors
13. **nfa-accreditation** - NFA Accreditation for rice retailers (conditional)
14. **dot-accreditation** - DOT Accreditation for hotels/resorts (mandatory for Primary Tourism Enterprises)
15. **liquor-license** - Liquor License from LGU for establishments serving alcohol
16. **ltfrb-cpc** - LTFRB Certificate of Public Convenience for transportation
17. **lto-registration** - LTO Vehicle Registration for trucks/PUVs

**Note:** Sanitary Permits, Fire Safety Inspection Certificates, and Zoning Clearances are already included in the form seeder as standard documents and should not be listed as post-requirements.

### LOB Variable Fee Mapping Recommendations for First 20 LOBs

Based on the research, the following LOB variable fee mappings should be updated in `seedLobs.js`:

- **Salon / barbershop**: Add `salon-barber-chair-fee`
- **Hospital**: Add `hospital-bed-fee`
- **Printing & publishing**: Add `printing-machine-fee`
- **Sari-sari store**: Add `market-stall-fee`

### LOB Post-Requirement Mapping Recommendations

Based on the research, the following LOB post-requirement mappings should be updated in `seedLobs.js`:

- **Fireworks / pyrotechnics**: Add conditional `pnp-feo-license`
- **Salon / barbershop**: Add conditional `sanitary-permit` (if not already present)
- **Laundry services**: Add conditional `denr-cnc`, `sanitary-permit`
- **Repair shop (electronics, appliances)**: Add conditional `dti-accreditation`
- **Tutorial / review center**: Add conditional `deped-permit` (if offering formal instruction)
- **School / educational institution**: Add required `deped-permit` or `deped-recognition`
- **University / college**: Add required `ched-recognition`, conditional `deped-permit`
- **IT / BPO services**: Add conditional `peza-registration`, `boi-registration`, `npc-registration`
- **Medical / dental clinic**: Add conditional `doh-lto`, `philhealth-accreditation`, `denr-cnc`
- **Hospital**: Add required `doh-lto`, conditional `doh-ptc`, required `philhealth-accreditation`, conditional `denr-ecc`
- **Veterinary clinic**: Add required `bai-registration`, conditional `pdea-s2-license`, `animal-welfare-seminar`
- **Security agency**: Add required `pnp-sosia-lto`
- **Manpower / recruitment agency**: Add conditional `dole-registration-do174` (local), `dmw-license` (overseas)
- **Internet café**: No specific post-requirements beyond standard
- **Bank**: Add required `bsp-certificate-authority`
- **Lending / financing company**: Add required `sec-ca-lending`, conditional `amlc-registration`
- **Pawnshop**: Add required `bsp-pawnshop-authority`

---

## Research for Next 20 LOBs (Real Estate Brokerage through Sewerage Services)

### LOBs Researched

1. **Real estate brokerage**
2. **Property leasing / rental**
3. **Subdivision developer**
4. **Boarding house / dormitory**
5. **Demolition services**
6. **Mining operations**
7. **Water supply**
8. **Electric power distribution**
9. **Telecommunications provider**
10. **Travel agency**
11. **Tour operator**
12. **Bus operations**
13. **Taxi services**
14. **School bus service**
15. **Trucking / hauling**
16. **Passenger transport (jeepney, etc.)**
17. **Delivery courier service**
18. **Freight forwarding**
19. **Warehouse storage**
20. **Parking lot operation**
21. **Sewerage services**

### Key Findings

#### Real Estate Brokerage
- **PRC License**: Required for brokers under RA 9646 (Real Estate Service Act)
- **DHSUD Registration**: Required for brokers dealing with subdivision/condo projects under PD 957
- **Requirements**: PRC ID, Certificate of Registration, ₱5,000 cash bond/surety bond, ₱720 renewal fee
- **Post-requirement key**: `prc-broker-license`, `dhsud-broker-registration`

#### Property Leasing / Rental
- **Standard Business Permit**: Required for commercial lessors under RA 7160
- **No specific sector license**: Beyond standard LGU and BIR requirements
- **Considerations**: May need separate permits per LGU if properties in multiple cities
- **Post-requirement key**: None beyond standard

#### Subdivision Developer
- **DHSUD License to Sell (LTS)**: Required before marketing under PD 957
- **Development Permit**: Required from LGU before construction
- **Environmental Compliance**: ECC or CNC from DENR depending on project size
- **PCAB License**: Required if developer acts as own contractor
- **Post-requirement keys**: `dhsud-license-to-sell`, `denr-ecc` (conditional), `pcab-license` (conditional)

#### Boarding House / Dormitory
- **Sanitary Permit**: Required under PD 856 (Sanitation Code)
- **Fire Safety Inspection Certificate**: Required under RA 9514
- **Zoning Clearance**: Required from LGU Planning Office
- **Building/Occupancy Permit**: Required under PD 1096
- **Post-requirement keys**: `sanitary-permit`, `fsic`, `zoning-clearance`

#### Demolition Services
- **Demolition Permit**: Required from OBO under National Building Code (PD 1096)
- **Requirements**: TCT, Tax Declaration, Barangay Clearance, demolition plan signed by licensed engineer/architect
- **PCAB License**: Required for demolition contractors under RA 4566
- **Post-requirement keys**: `demolition-permit`, `pcab-license`

#### Mining Operations
- **MGB Permits**: Required under RA 7942 (Philippine Mining Act)
- **Exploration Permit**: 2-year term, renewable up to 4-6 years
- **Mineral Agreement**: For production operations
- **Environmental Requirements**: ECC, Environmental Protection and Enhancement Program (EPEP)
- **Post-requirement keys**: `mgb-exploration-permit`, `mgb-mineral-agreement`, `denr-ecc`

#### Water Supply
- **NWRB Water Permit**: Required for water abstraction under PD 1067 (Water Code)
- **Certificate of Public Convenience (CPC)**: Required from NWRB for water utilities
- **Environmental Compliance**: ECC or CNC from DENR
- **Post-requirement keys**: `nwrb-water-permit`, `nwrb-cpc`, `denr-ecc` (conditional)

#### Electric Power Distribution
- **ERC CPCN**: Certificate of Public Convenience and Necessity required
- **Congressional Franchise**: Required for distribution utilities
- **Post-requirement keys**: `erc-cpcn`, `congressional-franchise`

#### Telecommunications Provider
- **NTC CPCN**: Certificate of Public Convenience and Necessity required
- **Congressional Franchise**: Required before NTC can issue CPCN
- **Post-requirement keys**: `ntc-cpcn`, `congressional-franchise`

#### Travel Agency
- **DOT Accreditation**: Required for primary tourism enterprises under RA 9593 (Tourism Act)
- **Progressive Accreditation System (PAS)**: Three levels - Basic Registration, Regular Accreditation, Premium Accreditation
- **Requirements**: Mayor's permit, office space, financial capability (₱500,000 minimum), managerial experience
- **Post-requirement key**: `dot-accreditation`

#### Tour Operator
- **DOT Accreditation**: Required for primary tourism enterprises under RA 9593
- **Similar requirements to travel agency**: Office space, financial capability, managerial experience
- **Post-requirement key**: `dot-accreditation`

#### Bus Operations
- **LTFRB CPC**: Certificate of Public Convenience required under Commonwealth Act 146
- **Route Rationalization**: Required under Omnibus Franchising Guidelines (DO 2017-011)
- **Consolidation**: Operators must consolidate into legal entity
- **Post-requirement key**: `ltfrb-cpc`

#### Taxi Services
- **LTFRB CPC**: Required for taxi operations
- **Provisional Authority**: Available as temporary permit while CPC processed
- **Post-requirement key**: `ltfrb-cpc`

#### School Bus Service
- **LTFRB CPC**: Required with school transport designation
- **School Accreditation**: Certificate from school administrator/PTA required
- **Vehicle Standards**: Steel-grilled windows, seatbelts, fire extinguisher, specific markings
- **Post-requirement keys**: `ltfrb-cpc`, `school-accreditation`

#### Trucking / Hauling
- **LTFRB CPC**: Required for truck-for-hire under MC 2004-043
- **Exemption**: Vehicles for exclusive use of owner's business may be exempt
- **Post-requirement key**: `ltfrb-cpc`

#### Passenger Transport (Jeepney, UV Express)
- **LTFRB CPC**: Required for all public utility vehicles
- **PUV Modernization Program**: Compliance with modernization requirements
- **Post-requirement key**: `ltfrb-cpc`

#### Delivery Courier Service
- **DICT PEMEDES Authority**: Required under PD 240 and RA 10844
- **PEMEDES Portal**: Online registration system for operators and riders
- **Requirements**: SEC/DTI registration, Mayor's permit, feasibility study, bank certificate
- **Post-requirement key**: `dict-pemedes-authority`

#### Freight Forwarding
- **DTI Accreditation**: Mandatory under Department Administrative Order No. 24-09
- **Categories**: NVOCC (₱4M capital), IFF (₱2M capital), DFF (₱250K capital)
- **Requirements**: Business permit, audited financial statement, liability insurance, list of agents/principals
- **Post-requirement key**: `dti-freight-forwarding-accreditation`

#### Warehouse Storage
- **Standard Business Permit**: Required for warehouse operations
- **Environmental Compliance**: ECC or CNC may be required depending on size and materials stored
- **Fire Safety**: FSIC required, especially for hazardous materials
- **Post-requirement keys**: `denr-ecc` (conditional), `fsic`

#### Parking Lot Operation
- **Standard Business Permit**: Classified as contractor/services in some LGUs
- **Building Code Compliance**: Must meet parking space requirements under National Building Code
- **Post-requirement key**: None beyond standard

#### Sewerage Services
- **LLDA Discharge Permit**: Required for Laguna de Bay Region under RA 4850
- **DENR WWDP**: Wastewater Discharge Permit required from EMB
- **LLDA Clearance**: Required for development projects in Laguna de Bay Region
- **Post-requirement keys**: `llda-discharge-permit`, `denr-wwdp`

### New Post-Requirements to Add

Based on the research, the following new post-requirements should be added to `seedPostRequirements.js`:

1. **prc-broker-license** - PRC Real Estate Broker License
2. **dhsud-broker-registration** - DHSUD Registration for Real Estate Brokers
3. **dhsud-license-to-sell** - DHSUD License to Sell for subdivision/condo projects
4. **demolition-permit** - Demolition Permit from OBO
5. **mgb-exploration-permit** - MGB Exploration Permit for mining
6. **mgb-mineral-agreement** - MGB Mineral Agreement for production
7. **nwrb-water-permit** - NWRB Water Permit for water abstraction
8. **nwrb-cpc** - NWRB Certificate of Public Convenience for water utilities
9. **erc-cpcn** - ERC Certificate of Public Convenience and Necessity
10. **ntc-cpcn** - NTC Certificate of Public Convenience and Necessity
11. **dot-accreditation** - DOT Accreditation for tourism enterprises
12. **ltfrb-cpc** - LTFRB Certificate of Public Convenience
13. **school-accreditation** - School accreditation for school transport services
14. **dict-pemedes-authority** - DICT PEMEDES Authority for delivery services
15. **dti-freight-forwarding-accreditation** - DTI Accreditation for freight forwarders
16. **llda-discharge-permit** - LLDA Discharge Permit for Laguna de Bay Region
17. **denr-wwdp** - DENR Wastewater Discharge Permit

### LOB Post-Requirement Mapping Recommendations

Based on the research, the following LOB post-requirement mappings should be updated in `seedLobs.js`:

- **Real estate brokerage**: Add required `prc-broker-license`, conditional `dhsud-broker-registration`
- **Property leasing / rental**: No specific post-requirements beyond standard
- **Subdivision developer**: Add required `dhsud-license-to-sell`, conditional `denr-ecc`, conditional `pcab-license`
- **Boarding house / dormitory**: Add conditional `sanitary-permit`, `fsic`, `zoning-clearance`
- **Demolition services**: Add required `demolition-permit`, required `pcab-license`
- **Mining operations**: Add required `mgb-exploration-permit` or `mgb-mineral-agreement`, conditional `denr-ecc`
- **Water supply**: Add required `nwrb-water-permit`, required `nwrb-cpc`, conditional `denr-ecc`
- **Electric power distribution**: Add required `erc-cpcn`, required `congressional-franchise`
- **Telecommunications provider**: Add required `ntc-cpcn`, required `congressional-franchise`
- **Travel agency**: Add conditional `dot-accreditation`
- **Tour operator**: Add conditional `dot-accreditation`
- **Bus operations**: Add required `ltfrb-cpc`
- **Taxi services**: Add required `ltfrb-cpc`
- **School bus service**: Add required `ltfrb-cpc`, required `school-accreditation`
- **Trucking / hauling**: Add required `ltfrb-cpc`
- **Passenger transport**: Add required `ltfrb-cpc`
- **Delivery courier service**: Add required `dict-pemedes-authority`
- **Freight forwarding**: Add required `dti-freight-forwarding-accreditation`
- **Warehouse storage**: Add conditional `denr-ecc`
- **Parking lot operation**: No specific post-requirements beyond standard
- **Sewerage services**: Add conditional `llda-discharge-permit`, conditional `denr-wwdp`

### Fee Structure for Next 20 LOBs

**Clarification:**
- **Conditional Fees** (in `conditionalFees` array): Conditionally applicable flat fees based on business characteristics (e.g., "if you have X, pay ₱Y")
- **Variable Fee Rules** (in `variableFeeRules` array): Calculated fees based on metrics using calculation methods (`linear`, `bracketed`, etc.)

#### Real Estate Brokerage
- **Conditional Fees**: None identified beyond standard business tax
- **Variable Fee Rules**: None identified

#### Property Leasing / Rental
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `building-storey-fee` (bracketed): Commercial/residential building lessors based on storeys
  - `apartment-door-fee` (linear): ₱1,000 per door for apartments
  - `house-rental-fee` (linear): ₱1,000 per door for houses

#### Subdivision Developer
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `subdivision-area-fee` (linear): ₱360-₱2,880/ha depending on housing type
  - `subdivision-lot-fee` (linear): ₱24-₱216 per saleable lot
  - `subdivision-floor-area-fee` (linear): ₱3-₱14.40/sqm of housing component
  - `subdivision-inspection-fee` (linear): ₱1,500/ha

#### Boarding House / Dormitory
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `boarding-capacity-fee` (bracketed): Based on number of boarders
    - 5-10 boarders: ₱250
    - 11-20 boarders: ₱500
    - 21+ boarders: ₱750

#### Demolition Services
- **Conditional Fees**: None identified
- **Variable Fee Rules**: None identified

#### Mining Operations
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `mining-hectare-fee` (bracketed): ₱3,000/ha for first 5 hectares + ₱1,000/succeeding hectares
  - `mining-extraction-fee` (linear): ₱10/cubic meter for metallic/non-metallic minerals
  - `mining-waste-fee` (linear): ₱100/ha (mineral reservation) or ₱75/ha (non-mineral reservation)
  - `mining-occupation-fee` (flat): ₱100.00

#### Water Supply
- **Conditional Fees**: None identified (primarily national regulation via NWRB)
- **Variable Fee Rules**: Not applicable to LGU business permits (water districts set their own tariffs)

#### Electric Power Distribution
- **Conditional Fees**: None identified (primarily national regulation)
- **Variable Fee Rules**: None identified

#### Telecommunications Provider
- **Conditional Fees**: None identified (primarily national regulation)
- **Variable Fee Rules**: None identified

#### Travel Agency
- **Conditional Fees**: None identified
- **Variable Fee Rules**: None identified (fixed permit fee)

#### Tour Operator
- **Conditional Fees**: None identified
- **Variable Fee Rules**: None identified (fixed permit fee)

#### Bus Operations
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `puv-unit-fee` (linear): ₱550 per unit (AC), ₱330 per unit (non-AC), ₱220 per unit (mini bus)

#### Taxi Services
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `puv-unit-fee` (linear): ₱110 per unit

#### School Bus Service
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `puv-unit-fee` (linear): Per unit (similar to other LTFRB vehicles)

#### Trucking / Hauling
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `trucking-unit-fee` (linear): ₱300-₱600 per unit based on vehicle type

#### Passenger Transport (Jeepney, UV Express)
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `puv-unit-fee` (linear): ₱82.50-₱110 per unit based on vehicle type

#### Delivery Courier Service
- **Conditional Fees**: None identified
- **Variable Fee Rules**: None identified

#### Freight Forwarding
- **Conditional Fees**: None identified
- **Variable Fee Rules**: None identified

#### Warehouse Storage
- **Conditional Fees**:
  - `cold-storage-fee` (flat): ₱750 for cold storage facilities
  - `lumberyard-fee` (flat): ₱1,000 for lumberyards
- **Variable Fee Rules**:
  - `warehouse-area-fee` (bracketed): Based on floor area
    - <100 sqm: ₱2,000
    - 100-300 sqm: ₱3,000
    - 300-500 sqm: ₱5,000
    - >500 sqm: ₱6,000

#### Parking Lot Operation
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `parking-area-fee` (bracketed): Based on floor area
    - <300 sqm: ₱750
    - 300-500 sqm: ₱1,000
    - 500-1,000 sqm: ₱2,000
    - >1,000 sqm: ₱5,000

#### Sewerage Services
- **Conditional Fees**: None identified
- **Variable Fee Rules**:
  - `sewerage-volume-fee` (bracketed): Based on discharge volume
    - Small scale (<30m³/day): ₱8,000
    - Medium scale (30-150m³/day): ₱16,000
    - Large scale (>150m³/day): ₱24,000
  - `sewerage-pollution-fee` (linear): ₱5/kg (within standards) or ₱30/kg (exceeding standards)

### Variable Fee Implementation Recommendations

Based on the research, the following variable fee rules should be implemented in `seedVariableFeeRules.js`:

1. **parking-area-fee** - Bracketed by square meter (parking lot operation)
2. **warehouse-area-fee** - Bracketed by square meter (warehouse storage)
3. **boarding-capacity-fee** - Bracketed by number of boarders (boarding house/dormitory)
4. **apartment-door-fee** - Per door (property leasing - apartments)
5. **building-storey-fee** - Bracketed by storeys (real estate lessors)
6. **subdivision-lot-fee** - Per lot (subdivision developer)
7. **subdivision-area-fee** - Per hectare (subdivision developer)
8. **subdivision-floor-area-fee** - Per sqm (subdivision developer)
9. **mining-hectare-fee** - Per hectare (mining operations)
10. **trucking-unit-fee** - Per vehicle (trucking/hauling)
11. **puv-unit-fee** - Per vehicle (bus, jeepney, taxi)

### Removed Variable Fees (Too Technical for LGU Business Permits)

The following variable fees were identified in research but **NOT implemented** because they require technical data that business owners cannot reasonably provide during standard business permit application:

1. **mining-extraction-fee** (removed) - Requires estimated extraction volume in cubic meters (geological survey data)
2. **sewerage-volume-fee** (removed) - Requires daily wastewater discharge volume (engineering analysis)
3. **sewerage-pollution-fee** (removed) - Requires BOD/TSS load in kilograms (laboratory testing)

These fees are handled by specialized agencies (MGB, LLDA, DENR) as part of their separate permitting processes (Mining Permits, Discharge Permits), not as LGU business permit fees.

### Important Rule: Variable Fee Question Appropriateness

When adding variable fee rules, the question must be answerable by business owners without requiring:
- Technical expertise
- Specialized equipment
- External agency data
- Laboratory testing
- Engineering analysis

**ACCEPTABLE questions:**
- "How many boarders does your boarding house accommodate?" (countable units)
- "What is the total floor area in square meters?" (standard business metric)
- "How many vehicles does your business operate?" (countable assets)

**UNACCEPTABLE questions:**
- "What is the daily wastewater discharge volume in cubic meters?" (requires engineering analysis)
- "What is the estimated BOD/TSS load in kilograms?" (requires laboratory testing)
- "What is the estimated volume of extraction in cubic meters?" (requires geological survey)

---

---

---

## Tax Bracket Research for First 20 LOBs

### Key Finding: Tax Brackets Are NOT LOB-Specific

After researching Philippine LGU business tax regulations, the critical finding is that **tax brackets are not specific to individual Lines of Business (LOBs)**. Instead, tax brackets are based on:

1. **Business Classification** (wholesale, retail, manufacturer, contractor, service, etc.)
2. **Gross Sales/Receipts** for the preceding calendar year
3. **Capitalization** for newly started businesses

### Legal Framework

**Republic Act No. 7160 (Local Government Code of 1991)** provides the statutory framework for LGU business taxation:

- **Section 143**: Authorizes municipalities to impose taxes on businesses with specific rate schedules
- **Section 151**: Authorizes cities to impose taxes at rates up to 50% higher than municipalities
- **Section 191**: Limits tax rate increases to 10% of the maximum rate every 5 years

### Tax Bracket Structure (RA 7160)

#### Wholesalers, Distributors, Dealers (Section 143(b))
Based on gross sales/receipts for preceding calendar year:
- Less than ₱1,000: ₱18
- ₱1,000 - ₱2,000: ₱33
- ₱2,000 - ₱3,000: ₱50
- ₱3,000 - ₱4,000: ₱72
- ₱4,000 - ₱5,000: ₱100
- ₱5,000 - ₱6,000: ₱121
- ₱6,000 - ₱7,000: ₱143
- ₱7,000 - ₱8,000: ₱165
- ₱8,000 - ₱10,000: ₱187
- ₱10,000 - ₱15,000: ₱220
- ₱15,000 - ₱20,000: ₱275
- ₱20,000 - ₱30,000: ₱330
- ₱30,000 - ₱40,000: ₱440
- ₱40,000 - ₱50,000: ₱660
- ₱50,000 - ₱75,000: ₱990
- ₱75,000 - ₱100,000: ₱1,320
- ₱100,000 - ₱150,000: ₱1,870
- ₱150,000 - ₱200,000: ₱2,420
- ₱200,000 - ₱300,000: ₱3,300
- ₱300,000 - ₱500,000: ₱4,400
- ₱500,000 - ₱750,000: ₱6,600
- ₱750,000 - ₱1,000,000: ₱8,800
- ₱1,000,000 - ₱2,000,000: ₱10,000
- Over ₱2,000,000: Not exceeding 50% of 1% of gross sales

#### Retailers (Section 143(d))
- Gross sales ≤ ₱400,000: Not exceeding 2% of gross sales
- Gross sales > ₱400,000: Not exceeding 1% of gross sales

#### Manufacturers (Section 143(a))
Based on gross sales/receipts with graduated brackets similar to wholesalers

### Special Tax Considerations

#### 1. Essential Commodities (Basic Necessities and Prime Commodities)
- **RA 7581 (Price Act)** and **RA 10623** define basic necessities and prime commodities
- Businesses dealing in essential commodities may be taxed at **50% of the standard rate** (Section 143(c))
- **Basic necessities include**: rice, corn, bread, fish, meat, eggs, milk, vegetables, coffee, sugar, cooking oil, salt, laundry soap, LPG, essential drugs
- **Prime commodities include**: flour, processed meat, dairy products, onions, garlic, vinegar, fertilizer, pesticides, construction materials, electrical supplies

**LOBs that may qualify for essential commodities differential:**
- Sari-sari store (if selling basic necessities)
- Grocery vendor
- Rice retailer
- Meat & poultry vendor
- Fish vendor
- Fruits & vegetables vendor
- Agricultural supplies (fertilizers, pesticides)
- Hardware & construction supplies (construction materials)

#### 2. BMBE (Barangay Micro Business Enterprises)
- **RA 9178 (BMBE Act)**: Businesses with total assets ≤ ₱3,000,000 (excluding land)
- **Incentives**:
  - Exempt from income tax on BMBE operational income
  - LGUs encouraged to reduce or exempt from local taxes, fees, and charges
- **Applicable to**: Small sari-sari stores, market vendors, small retailers

#### 3. Petroleum Products
- **Supreme Court rulings (G.R. No. 158881, G.R. No. 187631)**: LGUs cannot impose taxes on petroleum products themselves
- However, LGUs can impose business taxes on the business activity of selling petroleum products
- **Fuel / Gasoline Station**: Business tax applies to the business, not the petroleum products

#### 4. New Businesses
- **Based on capitalization** for first year (no prior gross sales)
- **Based on gross sales** for subsequent years
- **BLGF MC-001-2020**: Newly started businesses only pay Business Permit and regulatory fees, not initial LBT (except for printing/publication and franchise businesses)

### Implications for Seeder Design

#### Current System Issue
The current seeder does not have a `LOB_TAX_BRACKET_MAPPINGS` structure. Tax brackets are handled separately from LOB definitions.

#### Recommended Approach
1. **Do NOT create LOB-specific tax brackets** - this would be incorrect per Philippine law
2. **Create classification-based tax brackets**:
   - Wholesale/Distributor/Dealer brackets
   - Retailer brackets
   - Manufacturer brackets
   - Contractor brackets
   - Service brackets
3. **Map LOBs to classifications**:
   - All wholesale LOBs → use wholesale tax brackets
   - All retail LOBs → use retail tax brackets
   - All manufacturing LOBs → use manufacturer tax brackets
4. **Add essential commodities flag**:
   - LOBs dealing in basic necessities/prime commodities should have flag for 50% rate differential
5. **Add BMBE eligibility flag**:
   - Small LOBs (sari-sari store, market vendors) should have BMBE eligibility indicator

### LOB Classification for First 20 LOBs

**Retail LOBs (use retail tax brackets):**
1. Sari-sari store
2. Convenience store
3. General merchandise
4. Hardware & construction supplies
5. Pharmacy / drugstore
6. Clothing & apparel
7. Electronics & gadgets
8. Auto parts & accessories
9. Fuel / gasoline station
10. Agricultural supplies
11. Meat & poultry vendor
12. Fish vendor
13. Fruits & vegetables vendor
14. Rice retailer
15. Grocery vendor
16. Dry goods vendor

**Wholesale LOBs (use wholesale tax brackets):**
17. Agricultural raw materials
18. Food & beverages (wholesale)
19. Household goods (wholesale)
20. Industrial machinery & equipment (wholesale)

### Essential Commodities Eligibility

**May qualify for 50% rate differential:**
- Sari-sari store (if selling basic necessities)
- Grocery vendor
- Rice retailer
- Meat & poultry vendor
- Fish vendor
- Fruits & vegetables vendor
- Agricultural supplies (fertilizers, pesticides)
- Hardware & construction supplies (construction materials)

**Note**: Essential commodities differential applies to the specific products, not the entire business. This is complex to implement at LOB level. May need product-level tracking.

### Suggested Implementation

1. **Create tax bracket seeder** with classification-based brackets (wholesale, retail, manufacturer, contractor, service)
2. **Add classification field** to LOB schema (wholesale, retail, manufacturer, contractor, service)
3. **Map LOBs to classifications** in seeder
4. **Add essential commodities flag** to LOB schema (boolean)
5. **Tax calculation logic** should:
   - Use classification-based brackets
   - Apply 50% rate if essential commodities flag is true

### Sources
- RA 7160 (Local Government Code of 1991) - Sections 143, 151, 191
- RA 7581 (Price Act) - Basic necessities and prime commodities
- RA 10623 - Amended Price Act
- BLGF MC-001-2020 - Assessment of Local Business Tax for Newly Started Business
- G.R. No. 158881 - Petron Corporation v. Mayor Tobias M. Tiangco (petroleum products tax)
- G.R. No. 187631 - Batangas City v. Pilipinas Shell Petroleum Corporation
- G.R. No. 211093 - Davao City tax ordinance (wholesale vs retail rates)
- Respicio.ph articles on business tax rates and computation

---

## Comparison: Current Implementation vs RA 7160 Statutory Brackets

### Current Implementation (seedTaxBrackets.js)

**Structure:**
- Category-based templates: RTL, FDS, MFG, SVC, FIN, RES, TRN, AGR, CON, MIN, WHL, ACM, RET, UTL
- Each category has:
  - `capitalizationBrackets`: Micro, Cottage, Small, Medium, Large (Very Large for some)
  - `grossSalesBrackets`: Micro, Cottage, Small, Medium, Large, Very Large
- LOB-specific overrides for special cases
- Monthly market stall brackets

**Example - Wholesale (WHL) Gross Sales Brackets:**
- Micro: ₱0 - ₱30,000 → Fixed ₱673
- Cottage: ₱30,001 - ₱100,000 → Fixed ₱2,000
- Small: ₱100,001 - ₱500,000 → ₱5,000 + 1% of excess
- Medium: ₱500,001 - ₱9,500,000 → ₱40,000 + 1.5% of excess
- Large: ₱9,500,001 - ₱50,000,000 → ₱48,771 + 49.5% of 1% of excess
- Very Large: ₱50,000,001+ → ₱249,246 + 27.5% of 1% of excess

**Example - Retail (RTL) Gross Sales Brackets:**
- Same structure as Wholesale (Micro through Very Large)
- Same amounts as Wholesale

### RA 7160 Statutory Brackets (Maximum Rates)

**Wholesalers, Distributors, Dealers (Section 143(b)):**
- Less than ₱1,000 → ₱18
- ₱1,000 - ₱2,000 → ₱33
- ₱2,000 - ₱3,000 → ₱50
- ₱3,000 - ₱4,000 → ₱72
- ₱4,000 - ₱5,000 → ₱100
- ₱5,000 - ₱6,000 → ₱121
- ₱6,000 - ₱7,000 → ₱143
- ₱7,000 - ₱8,000 → ₱165
- ₱8,000 - ₱10,000 → ₱187
- ₱10,000 - ₱15,000 → ₱220
- ₱15,000 - ₱20,000 → ₱275
- ₱20,000 - ₱30,000 → ₱330
- ₱30,000 - ₱40,000 → ₱440
- ₱40,000 - ₱50,000 → ₱660
- ₱50,000 - ₱75,000 → ₱990
- ₱75,000 - ₱100,000 → ₱1,320
- ₱100,000 - ₱150,000 → ₱1,870
- ₱150,000 - ₱200,000 → ₱2,420
- ₱200,000 - ₱300,000 → ₱3,300
- ₱300,000 - ₱500,000 → ₱4,400
- ₱500,000 - ₱750,000 → ₱6,600
- ₱750,000 - ₱1,000,000 → ₱8,800
- ₱1,000,000 - ₱2,000,000 → ₱10,000
- Over ₱2,000,000 → Not exceeding 50% of 1% of gross sales

**Retailers (Section 143(d)):**
- Gross sales ≤ ₱400,000 → Not exceeding 2% of gross sales
- Gross sales > ₱400,000 → Not exceeding 1% of gross sales

### Key Differences

| Aspect | Current Implementation | RA 7160 Statutory |
|--------|----------------------|-------------------|
| **Wholesale structure** | 6 brackets (Micro to Very Large) with complex formulas | 23 brackets with fixed amounts, 1 percentage bracket |
| **Retail structure** | 6 brackets (Micro to Very Large) with complex formulas | 2-tier percentage system (2% or 1%) |
| **Wholesale range** | ₱0 - ₱50M+ | ₱0 - ₱2M+ |
| **Retail threshold** | Multiple thresholds | Single threshold at ₱400,000 |
| **Calculation method** | Fixed + excess rate | Fixed amounts or simple percentage |
| **Source** | Unknown (appears to be specific LGU ordinance) | National law (statutory maximums) |

### Analysis

**The current implementation appears to be based on a specific LGU's tax ordinance**, not the RA 7160 statutory framework. This is actually **correct** because:

1. **RA 7160 sets MAXIMUM rates** - LGUs can impose lower rates
2. **Each LGU has its own tax ordinance** - the actual rates vary by city/municipality
3. **The current brackets may reflect a specific LGU's ordinance** (possibly a particular city's Local Revenue Code)

**What this means:**
- The current category-based structure (RTL, WHL, etc.) is **appropriate**
- The bracket values may need to be **customized per LGU** if the system is meant to serve multiple municipalities
- If the system is for a **single LGU**, the current brackets may already be correct for that LGU
- If the system is for **multiple LGUs**, we need a way to store different bracket sets per LGU

### Recommendations

**Option 1: Single LGU System**
- Keep current implementation
- Verify brackets match the target LGU's ordinance
- Document which LGU ordinance the brackets are based on

**Option 2: Multi-LGU System**
- Add `lguId` field to TaxBracket model
- Allow multiple bracket sets per category (one per LGU)
- Each LGU can have its own bracket structure
- Default to RA 7160 statutory maximums if LGU-specific brackets not available

**Option 3: Hybrid Approach**
- Keep current implementation as default/base brackets
- Allow LGU-specific overrides
- RA 7160 statutory brackets as reference/fallback

### Current Implementation Strengths

1. **Category-based structure** - aligns with business classification concept
2. **LOB-specific overrides** - handles special cases (Fuel / Gasoline Station exempt, Agricultural Supplies 50% rate)
3. **Monthly market stall brackets** - handles small vendors appropriately
4. **Both capitalization and gross sales** - supports new and existing businesses

### What Needs Clarification

1. **Which LGU are the current brackets based on?** (Need to identify the source ordinance)
2. **Is the system for a single LGU or multiple LGUs?**
3. **Should the brackets be configurable per LGU?**

### Conclusion

**The current implementation is NOT wrong** - it's likely based on a specific LGU's ordinance. The RA 7160 brackets I found are statutory **maximums**, not the actual rates that LGUs impose. The current system is already using a classification-based approach (categories), which is the correct approach.

**No major changes needed** unless:
- The system needs to support multiple LGUs with different tax codes
- The current brackets don't match the target LGU's ordinance
- We want to add RA 7160 statutory brackets as a reference/fallback

---

**Document Version:** 4.9
