/**
 * Seed Claimable Documents
 *
 * Populates the requirements system with sample claimable document requirements and HTML templates.
 * This is idempotent - can be run multiple times without creating duplicates.
 *
 * Usage:
 *   node backend/services/business-service/src/seed/seedClaimableDocumentsClean.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const ClaimableDocument = require("../../../../shared/models/ClaimableDocument");
const Fee = require("../../../../shared/models/Fee");

// HTML template for Fire Safety Inspection Certificate
const FIRE_SAFETY_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Fire Safety Inspection Certificate</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      padding: 40px;
      background: #f5f5f5;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border: 3px solid #1a1a1a;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 80px;
      height: auto;
    }
    .republic-text {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin: 25px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #dc2626;
    }
    .label {
      font-weight: bold;
      color: #1a1a1a;
      display: inline-block;
      min-width: 180px;
    }
    .value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      width: 200px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logos">
        <img src="{{republicLogo}}" alt="Republic of the Philippines" class="logo">
        <img src="{{bfpLogo}}" alt="BFP Logo" class="logo">
        <img src="{{bfpSeal}}" alt="BFP Seal" class="logo">
      </div>
      <div class="republic-text">Republic of the Philippines</div>
      <div class="title">Fire Safety Inspection Certificate</div>
      <div class="subtitle">Bureau of Fire Protection</div>
    </div>

    <div class="content">
      <div class="section">
        <div><span class="label">Certificate Number:</span> <span class="value">{{certificateNumber}}</span></div>
        <div><span class="label">Date Issued:</span> <span class="value">{{dateIssued}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Establishment Name:</span> <span class="value">{{establishmentName}}</span></div>
        <div><span class="label">Address:</span> <span class="value">{{address}}</span></div>
        <div><span class="label">Owner:</span> <span class="value">{{owner}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Type of Occupancy:</span> <span class="value">{{occupancyType}}</span></div>
        <div><span class="label">Inspection Result:</span> <span class="value">{{inspectionResult}}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">{{validUntil}}</span></div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div style="margin-top: 10px; font-weight: bold;">Fire Marshal</div>
      <div style="font-size: 12px; color: #666;">BFP</div>
    </div>

    <div class="footer">
      This certificate is issued in compliance with the Fire Code of the Philippines (RA 9514)
    </div>
  </div>
</body>
</html>
`;

// HTML template for Sanitary Permit
const SANITARY_PERMIT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sanitary Permit</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      padding: 40px;
      background: #f5f5f5;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border: 3px solid #1a1a1a;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 80px;
      height: auto;
    }
    .republic-text {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin: 25px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #16a34a;
    }
    .label {
      font-weight: bold;
      color: #1a1a1a;
      display: inline-block;
      min-width: 180px;
    }
    .value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      width: 200px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logos">
        <img src="{{republicLogo}}" alt="Republic of the Philippines" class="logo">
        <img src="{{healthLogo}}" alt="Health Department Logo" class="logo">
        <img src="{{dohSeal}}" alt="DOH Seal" class="logo">
      </div>
      <div class="republic-text">Republic of the Philippines</div>
      <div class="title">Sanitary Permit</div>
      <div class="subtitle">Department of Health</div>
    </div>

    <div class="content">
      <div class="section">
        <div><span class="label">Permit Number:</span> <span class="value">{{permitNumber}}</span></div>
        <div><span class="label">Date Issued:</span> <span class="value">{{dateIssued}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Establishment Name:</span> <span class="value">{{establishmentName}}</span></div>
        <div><span class="label">Address:</span> <span class="value">{{address}}</span></div>
        <div><span class="label">Owner:</span> <span class="value">{{owner}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Type of Establishment:</span> <span class="value">{{establishmentType}}</span></div>
        <div><span class="label">Sanitary Inspection Result:</span> <span class="value">{{inspectionResult}}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">{{validUntil}}</span></div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div style="margin-top: 10px; font-weight: bold;">Sanitary Inspector</div>
      <div style="font-size: 12px; color: #666;">DOH</div>
    </div>

    <div class="footer">
      This permit is issued in compliance with the Sanitation Code of the Philippines (PD 856)
    </div>
  </div>
</body>
</html>
`;

// HTML template for Zoning Clearance
const ZONING_CLEARANCE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Zoning Clearance</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      padding: 40px;
      background: #f5f5f5;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border: 3px solid #1a1a1a;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 80px;
      height: auto;
    }
    .republic-text {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin: 25px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #f59e0b;
    }
    .label {
      font-weight: bold;
      color: #1a1a1a;
      display: inline-block;
      min-width: 180px;
    }
    .value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      width: 200px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logos">
        <img src="{{republicLogo}}" alt="Republic of the Philippines" class="logo">
        <img src="{{zoningLogo}}" alt="Zoning Office Logo" class="logo">
        <img src="{{hlurbSeal}}" alt="HLURB Seal" class="logo">
      </div>
      <div class="republic-text">Republic of the Philippines</div>
      <div class="title">Zoning Clearance</div>
      <div class="subtitle">HLURB / Zoning Office</div>
    </div>

    <div class="content">
      <div class="section">
        <div><span class="label">Clearance Number:</span> <span class="value">{{clearanceNumber}}</span></div>
        <div><span class="label">Date Issued:</span> <span class="value">{{dateIssued}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Applicant:</span> <span class="value">{{applicant}}</span></div>
        <div><span class="label">Property Location:</span> <span class="value">{{propertyLocation}}</span></div>
        <div><span class="label">Lot/Block Number:</span> <span class="value">{{lotBlockNumber}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Zoning Classification:</span> <span class="value">{{zoningClassification}}</span></div>
        <div><span class="label">Permitted Use:</span> <span class="value">{{permittedUse}}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">{{validUntil}}</span></div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div style="margin-top: 10px; font-weight: bold;">Zoning Administrator</div>
      <div style="font-size: 12px; color: #666;">HLURB</div>
    </div>

    <div class="footer">
      This clearance is issued in compliance with local zoning ordinances
    </div>
  </div>
</body>
</html>
`;

// HTML template for Unified Business Permit
const UNIFIED_BUSINESS_PERMIT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Unified Business Permit</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      padding: 40px;
      background: #f5f5f5;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border: 3px solid #1a1a1a;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 80px;
      height: auto;
    }
    .republic-text {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin: 25px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #2563eb;
    }
    .label {
      font-weight: bold;
      color: #1a1a1a;
      display: inline-block;
      min-width: 180px;
    }
    .value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      width: 200px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logos">
        <img src="{{republicLogo}}" alt="Republic of the Philippines" class="logo">
        <img src="{{lguLogo}}" alt="LGU Logo" class="logo">
        <img src="{{bploSeal}}" alt="BPLO Seal" class="logo">
      </div>
      <div class="republic-text">Republic of the Philippines</div>
      <div class="title">Unified Business Permit</div>
      <div class="subtitle">Business Permit and Licensing Office</div>
    </div>

    <div class="content">
      <div class="section">
        <div><span class="label">Permit Number:</span> <span class="value">{{permitNumber}}</span></div>
        <div><span class="label">Date Issued:</span> <span class="value">{{dateIssued}}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">{{validUntil}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Business Name:</span> <span class="value">{{businessName}}</span></div>
        <div><span class="label">Owner:</span> <span class="value">{{ownerName}}</span></div>
        <div><span class="label">Address:</span> <span class="value">{{address}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Line of Business:</span> <span class="value">{{lineOfBusiness}}</span></div>
        <div><span class="label">Permit Type:</span> <span class="value">{{permitType}}</span></div>
        <div><span class="label">Status:</span> <span class="value">{{status}}</span></div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div style="margin-top: 10px; font-weight: bold;">BPLO Officer</div>
      <div style="font-size: 12px; color: #666;">Business Permit and Licensing Office</div>
    </div>

    <div class="footer">
      This permit is issued in compliance with local business permit regulations
    </div>
  </div>
</body>
</html>
`;

// HTML template for Real Property Tax Clearance
const REAL_PROPERTY_TAX_CLEARANCE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Real Property Tax Clearance</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      padding: 40px;
      background: #f5f5f5;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border: 3px solid #1a1a1a;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 80px;
      height: auto;
    }
    .republic-text {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin: 25px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #dc2626;
    }
    .label {
      font-weight: bold;
      color: #1a1a1a;
      display: inline-block;
      min-width: 180px;
    }
    .value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      width: 200px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logos">
        <img src="{{republicLogo}}" alt="Republic of the Philippines" class="logo">
        <img src="{{treasuryLogo}}" alt="Treasury Logo" class="logo">
        <img src="{{lguSeal}}" alt="LGU Seal" class="logo">
      </div>
      <div class="republic-text">Republic of the Philippines</div>
      <div class="title">Real Property Tax Clearance</div>
      <div class="subtitle">Local Treasury Office</div>
    </div>

    <div class="content">
      <div class="section">
        <div><span class="label">Clearance Number:</span> <span class="value">{{clearanceNumber}}</span></div>
        <div><span class="label">Date Issued:</span> <span class="value">{{dateIssued}}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">{{validUntil}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Property Owner:</span> <span class="value">{{propertyOwner}}</span></div>
        <div><span class="label">Property Location:</span> <span class="value">{{propertyLocation}}</span></div>
        <div><span class="label">Tax Declaration Number:</span> <span class="value">{{taxDeclarationNumber}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Tax Year:</span> <span class="value">{{taxYear}}</span></div>
        <div><span class="label">Assessed Value:</span> <span class="value">{{assessedValue}}</span></div>
        <div><span class="label">Tax Status:</span> <span class="value">{{taxStatus}}</span></div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div style="margin-top: 10px; font-weight: bold;">Treasurer</div>
      <div style="font-size: 12px; color: #666;">Local Treasury Office</div>
    </div>

    <div class="footer">
      This clearance certifies that all real property taxes have been paid
    </div>
  </div>
</body>
</html>
`;

// HTML template for Account Clearance
const ACCOUNT_CLEARANCE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account Clearance</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      padding: 40px;
      background: #f5f5f5;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border: 3px solid #1a1a1a;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 80px;
      height: auto;
    }
    .republic-text {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin: 25px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #16a34a;
    }
    .label {
      font-weight: bold;
      color: #1a1a1a;
      display: inline-block;
      min-width: 180px;
    }
    .value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      width: 200px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logos">
        <img src="{{republicLogo}}" alt="Republic of the Philippines" class="logo">
        <img src="{{accountingLogo}}" alt="Accounting Office Logo" class="logo">
        <img src="{{lguSeal}}" alt="LGU Seal" class="logo">
      </div>
      <div class="republic-text">Republic of the Philippines</div>
      <div class="title">Account Clearance</div>
      <div class="subtitle">Municipal Accounting Office</div>
    </div>

    <div class="content">
      <div class="section">
        <div><span class="label">Clearance Number:</span> <span class="value">{{clearanceNumber}}</span></div>
        <div><span class="label">Date Issued:</span> <span class="value">{{dateIssued}}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">{{validUntil}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Entity Name:</span> <span class="value">{{entityName}}</span></div>
        <div><span class="label">Account Number:</span> <span class="value">{{accountNumber}}</span></div>
        <div><span class="label">Account Type:</span> <span class="value">{{accountType}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Period Covered:</span> <span class="value">{{periodCovered}}</span></div>
        <div><span class="label">Account Status:</span> <span class="value">{{accountStatus}}</span></div>
        <div><span class="label">Outstanding Balance:</span> <span class="value">{{outstandingBalance}}</span></div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div style="margin-top: 10px; font-weight: bold;">Municipal Accountant</div>
      <div style="font-size: 12px; color: #666;">Municipal Accounting Office</div>
    </div>

    <div class="footer">
      This clearance certifies that all accounts are in good standing
    </div>
  </div>
</body>
</html>
`;

// Generic temporary permit template (will be customized for each type)
const TEMPORARY_PERMIT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{permitType}}</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      padding: 40px;
      background: #f5f5f5;
      line-height: 1.6;
    }
    .certificate {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      border: 3px solid #1a1a1a;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 20px;
    }
    .logos {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
      margin-bottom: 20px;
    }
    .logo {
      max-width: 80px;
      height: auto;
    }
    .republic-text {
      font-size: 14px;
      font-weight: bold;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1a1a1a;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .subtitle {
      font-size: 16px;
      color: #666;
      margin-bottom: 30px;
    }
    .content {
      margin: 30px 0;
    }
    .section {
      margin: 25px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #f59e0b;
    }
    .label {
      font-weight: bold;
      color: #1a1a1a;
      display: inline-block;
      min-width: 180px;
    }
    .value {
      color: #333;
      font-weight: 500;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .signature {
      margin-top: 40px;
      text-align: right;
    }
    .signature-line {
      border-top: 1px solid #1a1a1a;
      width: 200px;
      margin-top: 50px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logos">
        <img src="{{republicLogo}}" alt="Republic of the Philippines" class="logo">
        <img src="{{lguLogo}}" alt="LGU Logo" class="logo">
        <img src="{{bploSeal}}" alt="BPLO Seal" class="logo">
      </div>
      <div class="republic-text">Republic of the Philippines</div>
      <div class="title">{{permitType}}</div>
      <div class="subtitle">Business Permit and Licensing Office</div>
    </div>

    <div class="content">
      <div class="section">
        <div><span class="label">Permit Number:</span> <span class="value">{{permitNumber}}</span></div>
        <div><span class="label">Date Issued:</span> <span class="value">{{dateIssued}}</span></div>
        <div><span class="label">Valid Until:</span> <span class="value">{{validUntil}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Applicant Name:</span> <span class="value">{{applicantName}}</span></div>
        <div><span class="label">Address:</span> <span class="value">{{address}}</span></div>
        <div><span class="label">Contact Number:</span> <span class="value">{{contactNumber}}</span></div>
      </div>

      <div class="section">
        <div><span class="label">Permit Type:</span> <span class="value">{{permitType}}</span></div>
        <div><span class="label">Purpose:</span> <span class="value">{{purpose}}</span></div>
        <div><span class="label">Status:</span> <span class="value">{{status}}</span></div>
      </div>
    </div>

    <div class="signature">
      <div class="signature-line"></div>
      <div style="margin-top: 10px; font-weight: bold;">BPLO Officer</div>
      <div style="font-size: 12px; color: #666;">Business Permit and Licensing Office</div>
    </div>

    <div class="footer">
      This permit is issued in compliance with local business permit regulations
    </div>
  </div>
</body>
</html>
`;

// Basic requirement examples with HTML templates and image attributes
// NOTE: Only BPLO-issued documents or those coordinated through BPLO one-stop shop
// External agency documents (DTI, SEC, DENR, etc.) are tracked as post requirements, not documents
const REQUIREMENTS_SEED_DATA = [
  {
    customId: "unified-business-permit",
    name: "Unified Business Permit",
    description:
      "Official business permit document issued by BPLO for year-round business operations. Valid for one calendar year and requires annual renewal.",
    notes:
      "Admin: Official permit document for businesses with ongoing operations. Includes permit number, business details, line of business, and validity period.",
    templateHtml: UNIFIED_BUSINESS_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "BPLO-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "businessName",
        name: "Business Name",
        previewText: "Sample Business Name",
        sourceType: "business_profile",
        sourceKey: "businessTradeName",
      },
      {
        attributeName: "owner",
        name: "Owner Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Owner Information",
            fieldKey: "ownerName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Business Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "lineOfBusiness",
        name: "Line of Business",
        previewText: "Retail Trade",
        sourceType: "business_profile",
        sourceKey: "primaryLineOfBusiness",
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "New",
        sourceType: "static",
        staticValue: "New",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 500,
  },
  {
    customId: "real-property-tax-clearance",
    name: "Real Property Tax Clearance",
    description:
      "Local treasury office clearance certifying that all real property taxes have been paid. Required for property-based business permits.",
    notes:
      "Admin: Required for businesses owning or leasing property. Verify tax clearance from local treasury office. Check tax declaration number and payment status.",
    templateHtml: REAL_PROPERTY_TAX_CLEARANCE_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "treasuryLogo",
        name: "Treasury Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "lguSeal",
        name: "LGU Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "clearanceNumber",
        name: "Clearance Number",
        previewText: "RPT-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "clearanceNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "propertyOwner",
        name: "Property Owner",
        previewText: "Juan Dela Cruz",
        sourceType: "business_profile",
        sourceKey: "ownerName",
      },
      {
        attributeName: "propertyLocation",
        name: "Property Location",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "taxDeclarationNumber",
        name: "Tax Declaration Number",
        previewText: "TD-12345",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Property Information",
            fieldKey: "taxDeclarationNumber",
          },
        ],
      },
      {
        attributeName: "taxYear",
        name: "Tax Year",
        previewText: "2024",
        sourceType: "static",
        staticValue: "2024",
      },
      {
        attributeName: "assessedValue",
        name: "Assessed Value",
        previewText: "₱100,000.00",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Tax Information",
            fieldKey: "assessedValue",
          },
        ],
      },
      {
        attributeName: "taxStatus",
        name: "Tax Status",
        previewText: "Paid",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Tax Information",
            fieldKey: "taxStatus",
          },
        ],
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 500,
  },
  {
    customId: "account-clearance",
    name: "Account Clearance",
    description:
      "Municipal accounting office clearance certifying that all accounts are in good standing. Required for business permit applications.",
    notes:
      "Admin: Required for all business types. Verify account clearance from municipal accounting office. Check account status and outstanding balance.",
    templateHtml: ACCOUNT_CLEARANCE_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "accountingLogo",
        name: "Accounting Office Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "lguSeal",
        name: "LGU Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "clearanceNumber",
        name: "Clearance Number",
        previewText: "ACCT-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "clearanceNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
      {
        attributeName: "businessName",
        name: "Business Name",
        previewText: "Sample Business Name",
        sourceType: "business_profile",
        sourceKey: "businessTradeName",
      },
      {
        attributeName: "entityName",
        name: "Entity Name",
        previewText: "Sample Business Name",
        sourceType: "business_profile",
        sourceKey: "registeredBusinessName",
      },
      {
        attributeName: "accountNumber",
        name: "Account Number",
        previewText: "ACC-12345",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Account Information",
            fieldKey: "accountNumber",
          },
        ],
      },
      {
        attributeName: "accountType",
        name: "Account Type",
        previewText: "Business Tax Account",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Account Information",
            fieldKey: "accountType",
          },
        ],
      },
      {
        attributeName: "periodCovered",
        name: "Period Covered",
        previewText: "Calendar Year 2024",
        sourceType: "static",
        staticValue: "Calendar Year 2024",
      },
      {
        attributeName: "accountStatus",
        name: "Account Status",
        previewText: "Good Standing",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Account Information",
            fieldKey: "accountStatus",
          },
        ],
      },
      {
        attributeName: "outstandingBalance",
        name: "Outstanding Balance",
        previewText: "₱0.00",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Account Information",
            fieldKey: "outstandingBalance",
          },
        ],
      },
    ],
    feeAmount: 300,
  },
  {
    customId: "cooperative-permit",
    name: "Cooperative Permit",
    description:
      "Temporary permit document for cooperatives registered with CDA applying for business permit renewal or new registration.",
    notes:
      "Admin: For agricultural, consumer, marketing, service, and multi-purpose cooperatives operating within the city.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "COOP-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "cooperativeName",
        name: "Cooperative Name",
        previewText: "Sample Cooperative",
        sourceType: "business_profile",
        sourceKey: "registeredBusinessName",
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Cooperative Permit",
        sourceType: "static",
        staticValue: "Cooperative Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Business permit renewal",
        sourceType: "static",
        staticValue: "Business permit renewal",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "association-foundation-permit",
    name: "Association/Foundation Permit",
    description:
      "Temporary permit document for non-profit associations and foundations registered with SEC or DOLE applying for business permit.",
    notes:
      "Admin: For civic organizations, foundations, trade associations, labor unions, and other non-profit entities operating within the city.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "ASSOC-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "organizationName",
        name: "Organization Name",
        previewText: "Sample Association",
        sourceType: "business_profile",
        sourceKey: "registeredBusinessName",
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Association/Foundation Permit",
        sourceType: "static",
        staticValue: "Association/Foundation Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Business permit renewal",
        sourceType: "static",
        staticValue: "Business permit renewal",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "chainsaw-permit",
    name: "Chainsaw Permit",
    description:
      "Temporary permit document for chainsaw operators and owners applying for permit to use chainsaws for logging, land clearing, or tree cutting activities.",
    notes:
      "Admin: Required for all chainsaw operations within city jurisdiction per DENR regulations.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "CS-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "operatorName",
        name: "Operator Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Operator Information",
            fieldKey: "operatorName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Chainsaw Permit",
        sourceType: "static",
        staticValue: "Chainsaw Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Logging and land clearing activities",
        sourceType: "static",
        staticValue: "Logging and land clearing activities",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "firecrackers-stallholders-permit",
    name: "Firecrackers Stallholders Permit",
    description:
      "Temporary permit document for individuals or businesses applying to sell firecrackers and pyrotechnic products during the designated holiday period.",
    notes:
      "Admin: Required for all temporary firecrackers retail stalls in authorized selling zones during December to January.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "FC-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "stallholderName",
        name: "Stallholder Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Stallholder Information",
            fieldKey: "stallholderName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Firecrackers Stallholders Permit",
        sourceType: "static",
        staticValue: "Firecrackers Stallholders Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Selling firecrackers during holiday season",
        sourceType: "static",
        staticValue: "Selling firecrackers during holiday season",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "bazaar-festival-vendors-permit",
    name: "Bazaar/Festival Vendors Permit",
    description:
      "Temporary permit document for vendors applying to operate temporary selling stalls during city-sponsored bazaars, festivals, trade fairs, or special events.",
    notes:
      "Admin: Covers food stalls, merchandise booths, and temporary retail spaces in designated event areas.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "BZ-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "vendorName",
        name: "Vendor Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Vendor Information",
            fieldKey: "vendorName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Bazaar/Festival Vendors Permit",
        sourceType: "static",
        staticValue: "Bazaar/Festival Vendors Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Selling at City Festival Bazaar 2024",
        sourceType: "static",
        staticValue: "Selling at City Festival Bazaar 2024",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "peddlers-permit",
    name: "Peddlers Permit",
    description:
      "Temporary permit document for mobile vendors (itinerant sellers) applying to sell goods while moving from place to place within the city.",
    notes:
      "Admin: Covers street vendors, hawkers, and ambulant sellers of food, merchandise, or other products.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "PD-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "peddlerName",
        name: "Peddler Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Peddler Information",
            fieldKey: "peddlerName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Peddlers Permit",
        sourceType: "static",
        staticValue: "Peddlers Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Selling food items while moving from place to place",
        sourceType: "static",
        staticValue: "Selling food items while moving from place to place",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "promotions-exhibitors-permit",
    name: "Promotions/Exhibitors Permit",
    description:
      "Temporary permit document for businesses or organizations applying to conduct promotional activities, product launches, sales promotions, or exhibitions in public or private spaces.",
    notes:
      "Admin: Covers roadshows, mall activations, product demonstrations, and temporary promotional displays.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "PX-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "companyName",
        name: "Company Name",
        previewText: "Sample Company Inc.",
        sourceType: "business_profile",
        sourceKey: "registeredBusinessName",
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Promotions/Exhibitors Permit",
        sourceType: "static",
        staticValue: "Promotions/Exhibitors Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Product launch at City Mall",
        sourceType: "static",
        staticValue: "Product launch at City Mall",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "cemetery-stallholders-permit",
    name: "Cemetery Stallholders Permit",
    description:
      "Temporary permit document for vendors applying to operate temporary selling stalls within public or private cemeteries during All Saints Day and All Souls Day observance period.",
    notes:
      "Admin: Covers flower, candle, food, and merchandise stalls in designated cemetery areas during November 1-2.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "CS-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "stallholderName",
        name: "Stallholder Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Stallholder Information",
            fieldKey: "stallholderName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Cemetery Stallholders Permit",
        sourceType: "static",
        staticValue: "Cemetery Stallholders Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Selling flowers and candles at City Public Cemetery",
        sourceType: "static",
        staticValue: "Selling flowers and candles at City Public Cemetery",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "November 3, 2024",
        sourceType: "static",
        staticValue: "November 3, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "fish-trap-fish-pen-permit",
    name: "Fish Trap/Fish Pen Permit",
    description:
      "Temporary permit document for fishery operators seeking to establish fish traps or fish pens in designated water areas.",
    notes:
      "Admin: Regulates aquaculture activities to ensure sustainable fishing practices and environmental protection.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "FP-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "operatorName",
        name: "Operator Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Operator Information",
            fieldKey: "operatorName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Fish Trap/Fish Pen Permit",
        sourceType: "static",
        staticValue: "Fish Trap/Fish Pen Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Fish trap/fish pen operation at Laguna de Bay",
        sourceType: "static",
        staticValue: "Fish trap/fish pen operation at Laguna de Bay",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "fish-pond-permit",
    name: "Fish Pond Permit",
    description:
      "Temporary permit document for fishery operators seeking to establish or operate fish ponds for aquaculture purposes.",
    notes:
      "Admin: Regulates fish pond operations to ensure sustainable aquaculture practices and environmental compliance.",
    templateHtml: TEMPORARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "lguLogo",
        name: "LGU Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bploSeal",
        name: "BPLO Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "FPP-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "operatorName",
        name: "Operator Name",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Operator Information",
            fieldKey: "operatorName",
          },
        ],
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "contactNumber",
        name: "Contact Number",
        previewText: "09123456789",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Contact Information",
            fieldKey: "contactNumber",
          },
        ],
      },
      {
        attributeName: "permitType",
        name: "Permit Type",
        previewText: "Fish Pond Permit",
        sourceType: "static",
        staticValue: "Fish Pond Permit",
      },
      {
        attributeName: "purpose",
        name: "Purpose",
        previewText: "Fish pond operation for aquaculture",
        sourceType: "static",
        staticValue: "Fish pond operation for aquaculture",
      },
      {
        attributeName: "status",
        name: "Status",
        previewText: "Active",
        sourceType: "static",
        staticValue: "Active",
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 200,
  },
  {
    customId: "fire-safety-inspection-certificate",
    name: "Fire Safety Inspection Certificate",
    description:
      "BFP fire safety inspection clearance document. Required for all business establishments to ensure compliance with the Fire Code of the Philippines (RA 9514).",
    notes:
      "Admin: Verify that the establishment has a valid Fire Safety Inspection Certificate from the Bureau of Fire Protection. Check the certificate number and validity period. Required for all business types.",
    templateHtml: FIRE_SAFETY_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "bfpLogo",
        name: "BFP Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "bfpSeal",
        name: "BFP Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "certificateNumber",
        name: "Certificate Number",
        previewText: "FSIC-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "certificateNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Certificate Information",
            fieldKey: "dateIssued",
          },
        ],
      },
      {
        attributeName: "establishmentName",
        name: "Establishment Name",
        previewText: "Sample Business Name",
        sourceType: "business_profile",
        sourceKey: "businessTradeName",
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "owner",
        name: "Owner",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Owner Information",
            fieldKey: "ownerName",
          },
        ],
      },
      {
        attributeName: "occupancyType",
        name: "Type of Occupancy",
        previewText: "Business",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Inspection Information",
            fieldKey: "occupancyType",
          },
        ],
      },
      {
        attributeName: "inspectionResult",
        name: "Inspection Result",
        previewText: "Compliant",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Inspection Information",
            fieldKey: "inspectionResult",
          },
        ],
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Certificate Information",
            fieldKey: "validUntil",
          },
        ],
      },
    ],
    feeAmount: 500,
  },
  {
    customId: "sanitary-permit",
    name: "Sanitary Permit",
    description:
      "Health department sanitary permit document. Required for establishments handling food, healthcare, or public services to ensure compliance with the Sanitation Code of the Philippines (PD 856).",
    notes:
      "Admin: Required for food establishments, healthcare facilities, and public service businesses. Verify permit from local health office. Check compliance with sanitation standards.",
    templateHtml: SANITARY_PERMIT_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "dohLogo",
        name: "DOH Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "lguSeal",
        name: "LGU Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "permitNumber",
        name: "Permit Number",
        previewText: "SP-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "permitNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "establishmentName",
        name: "Establishment Name",
        previewText: "Sample Business Name",
        sourceType: "business_profile",
        sourceKey: "businessTradeName",
      },
      {
        attributeName: "address",
        name: "Address",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "owner",
        name: "Owner",
        previewText: "Juan Dela Cruz",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Owner Information",
            fieldKey: "ownerName",
          },
        ],
      },
      {
        attributeName: "establishmentType",
        name: "Establishment Type",
        previewText: "Food Establishment",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Establishment Information",
            fieldKey: "establishmentType",
          },
        ],
      },
      {
        attributeName: "inspectionResult",
        name: "Sanitary Inspection Result",
        previewText: "Compliant",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Inspection Information",
            fieldKey: "inspectionResult",
          },
        ],
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 500,
  },
  {
    customId: "zoning-clearance",
    name: "Zoning Clearance",
    description:
      "HLURB zoning clearance document. Ensures the business location is properly zoned for the intended operations. Required for compliance with local zoning ordinances.",
    notes:
      "Admin: Verify zoning clearance from local zoning office or HLURB. Check that business type is permitted in the location. Required for all new business applications.",
    templateHtml: ZONING_CLEARANCE_TEMPLATE,
    templateImages: [
      {
        attributeName: "republicLogo",
        name: "Republic of the Philippines Logo",
        path: "/government-logos/republic-of-philippines.png",
      },
      {
        attributeName: "hlurbLogo",
        name: "HLURB Logo",
        path: "/government-logos/bagong-pilipinas.png",
      },
      {
        attributeName: "lguSeal",
        name: "LGU Seal",
        path: "/government-logos/republic-of-philippines.png",
      },
    ],
    templateTexts: [
      {
        attributeName: "clearanceNumber",
        name: "Clearance Number",
        previewText: "ZC-2024-0001",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "General",
            fieldKey: "clearanceNumber",
          },
        ],
      },
      {
        attributeName: "dateIssued",
        name: "Date Issued",
        previewText: "January 15, 2024",
        sourceType: "static",
        staticValue: "January 15, 2024",
      },
      {
        attributeName: "applicant",
        name: "Applicant",
        previewText: "Juan Dela Cruz",
        sourceType: "business_profile",
        sourceKey: "ownerName",
      },
      {
        attributeName: "propertyLocation",
        name: "Property Location",
        previewText: "123 Main St, Barangay 1, City",
        sourceType: "business_profile",
        sourceKey: "businessAddress",
      },
      {
        attributeName: "lotBlockNumber",
        name: "Lot/Block Number",
        previewText: "Lot 1, Block 5",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Property Information",
            fieldKey: "lotBlockNumber",
          },
        ],
      },
      {
        attributeName: "zoningClassification",
        name: "Zoning Classification",
        previewText: "Commercial",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Zoning Information",
            fieldKey: "zoningClassification",
          },
        ],
      },
      {
        attributeName: "permittedUse",
        name: "Permitted Use",
        previewText: "Retail Trade",
        sourceType: "form_field",
        bindings: [
          {
            formId: "",
            sectionIndex: 0,
            sectionName: "Zoning Information",
            fieldKey: "permittedUse",
          },
        ],
      },
      {
        attributeName: "validUntil",
        name: "Valid Until",
        previewText: "December 31, 2024",
        sourceType: "static",
        staticValue: "December 31, 2024",
      },
    ],
    feeAmount: 500,
  },
];

/**
 * Seed requirements if the collections are empty.
 * Safe to call during startup — assumes mongoose is already connected.
 *
 * @returns {{ seeded: boolean, count?: number, error?: string }}
 */
async function seedIfEmpty() {
  try {
    const existingDocuments = await ClaimableDocument.countDocuments();
    let createdDocuments = [];

    if (existingDocuments === 0) {
      console.log("Seeding documents...");

      for (const reqData of REQUIREMENTS_SEED_DATA) {
        // Create associated fee if feeAmount is provided
        let feeId = null;
        if (
          reqData.feeAmount !== undefined &&
          reqData.feeAmount !== null &&
          reqData.feeAmount !== ""
        ) {
          const fee = await Fee.create({
            name: String(reqData.name).trim(),
            description: `Fee for ${String(reqData.name).trim()}`,
            amount: Number(reqData.feeAmount),
            category: "claimable_document",
            isActive: true,
            version: 1,
          });
          feeId = fee._id;
        }

        const created = await ClaimableDocument.create({
          ...reqData,
          feeId: feeId,
          isActive: true,
          version: 1,
        });
        createdDocuments.push(created);
      }

      console.log(`Created ${REQUIREMENTS_SEED_DATA.length} documents`);
    } else {
      console.log(
        `Documents already exist (${existingDocuments} found), checking for missing fees...`,
      );
      createdDocuments = await ClaimableDocument.find({});

      // Force recreate all fees to ensure they exist
      for (const reqData of REQUIREMENTS_SEED_DATA) {
        const existingDoc = createdDocuments.find(
          (doc) => doc.customId === reqData.customId,
        );
        if (
          existingDoc &&
          reqData.feeAmount !== undefined &&
          reqData.feeAmount !== null &&
          reqData.feeAmount !== ""
        ) {
          console.log(`Creating fee for ${reqData.name}...`);
          const fee = await Fee.create({
            name: String(reqData.name).trim(),
            description: `Fee for ${String(reqData.name).trim()}`,
            amount: Number(reqData.feeAmount),
            category: "claimable_document",
            isActive: true,
            version: 1,
          });
          console.log(`Fee created with _id: ${fee._id}`);
          await ClaimableDocument.updateOne(
            { _id: existingDoc._id },
            { $set: { feeId: fee._id } },
          );
          console.log(`Updated document ${reqData.name} with feeId ${fee._id}`);
        } else if (!existingDoc) {
          console.log(`Document not found for customId: ${reqData.customId}`);
        }
      }
    }

    // Seed document violations, inspection items, and checklists
    console.log("\nSeeding document-related data...");
    const { seedDocumentViolations } = require("./seedDocumentViolations");
    const {
      seedDocumentInspectionItems,
    } = require("./seedDocumentInspectionItems");
    const { seedDocumentChecklists } = require("./seedDocumentChecklists");

    await seedDocumentViolations();
    await seedDocumentInspectionItems();
    await seedDocumentChecklists();

    console.log("Seeding completed successfully");
    return { seeded: true };
  } catch (error) {
    console.error("Seeding failed:", error);
    return { seeded: false, error: error.message };
  }
}

module.exports = { seedIfEmpty, REQUIREMENTS_SEED_DATA };

// Run seed if called directly
if (require.main === module) {
  const mongoose = require("mongoose");
  const dotenv = require("dotenv");
  const path = require("path");

  dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
  dotenv.config({
    path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
  });

  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/capstone_project";

  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("Connected to MongoDB");
      seedIfEmpty().then(() => {
        mongoose.disconnect();
        console.log("Disconnected from MongoDB");
      });
    })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}
