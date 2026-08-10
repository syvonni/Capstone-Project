const mongoose = require("mongoose");
const TaxBracket = require("../models/TaxBracket");
const Lob = require("../models/Lob");

// Tax bracket templates by category
const TAX_BRACKET_TEMPLATES = {
  RTL: {
    categoryName: "Retail",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱673 for micro enterprises with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱2,000 for cottage enterprises with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 140000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱673 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 40000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱40,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 48771,
        excessRate: 0.00495,
        excessRateType: "percentage_of_percentage",
        notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
      },
    ],
  },
  FDS: {
    categoryName: "Food Service",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱673 for micro food establishments with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱2,000 for cottage food establishments with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 140000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱673 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 40000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱40,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 48771,
        excessRate: 0.00495,
        excessRateType: "percentage_of_percentage",
        notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
      },
    ],
  },
  MFG: {
    categoryName: "Manufacturing",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱500 for micro manufacturers with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱1,500 for cottage manufacturers with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 75000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱75,000 + 1% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱500 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 25000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱25,000 + 1% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 30000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱50M",
      },
    ],
  },
  SVC: {
    categoryName: "Services",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱673 for micro service providers with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱2,000 for cottage service providers with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 140000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱673 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 40000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱40,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 48771,
        excessRate: 0.00495,
        excessRateType: "percentage_of_percentage",
        notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
      },
    ],
  },
  FIN: {
    categoryName: "Financial",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 1000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱1,000 for micro financial institutions with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 3000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱3,000 for cottage financial institutions with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 10000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱10,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 250000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱250,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 400000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱400,000 + 30% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 1000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱1,000 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 3000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱3,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 10000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱10,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 60000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱60,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 70000,
        excessRate: 0.004,
        excessRateType: "percentage_of_percentage",
        notes: "₱70,000 + 40% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 400000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱400,000 + 30% of 1% in excess of ₱50M",
      },
    ],
  },
  RES: {
    categoryName: "Real Estate",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱673 for micro real estate businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱2,000 for cottage real estate businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 140000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱673 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 40000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱40,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 48771,
        excessRate: 0.00495,
        excessRateType: "percentage_of_percentage",
        notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
      },
    ],
  },
  TRN: {
    categoryName: "Transportation",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱673 for micro transportation businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱2,000 for cottage transportation businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 140000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱673 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 40000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱40,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 48771,
        excessRate: 0.00495,
        excessRateType: "percentage_of_percentage",
        notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
      },
    ],
  },
  AGR: {
    categoryName: "Agriculture",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱500 for micro agricultural businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱1,500 for cottage agricultural businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 75000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱75,000 + 1% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱500 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 25000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱25,000 + 1% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 30000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱50M",
      },
    ],
  },
  CON: {
    categoryName: "Construction",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱500 for micro construction businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱1,500 for cottage construction businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 75000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱75,000 + 1% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱500 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 25000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱25,000 + 1% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 30000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱50M",
      },
    ],
  },
  MIN: {
    categoryName: "Mining",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱500 for micro mining operations with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱1,500 for cottage mining operations with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 75000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱75,000 + 1% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱500 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 25000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱25,000 + 1% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 30000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱50M",
      },
    ],
  },
  WHL: {
    categoryName: "Wholesale",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱673 for micro wholesale businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱2,000 for cottage wholesale businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 140000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱673 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 40000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱40,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 48771,
        excessRate: 0.00495,
        excessRateType: "percentage_of_percentage",
        notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
      },
    ],
  },
  ACM: {
    categoryName: "Apartment/Condominium Management",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱500 for micro apartment/condominium businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱1,500 for cottage apartment/condominium businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 75000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱75,000 + 1% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱500 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 25000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱25,000 + 1% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 30000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱50M",
      },
    ],
  },
  RET: {
    categoryName: "Real Estate/Rental",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱673 for micro real estate/rental businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱2,000 for cottage real estate/rental businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 140000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱140,000 + 1.5% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 673,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱673 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 2000,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱2,000 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 5000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱5,000 + 1% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 40000,
        excessRate: 0.015,
        excessRateType: "direct",
        notes: "₱40,000 + 1.5% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 48771,
        excessRate: 0.00495,
        excessRateType: "percentage_of_percentage",
        notes: "₱48,771 + 49.5% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 249246,
        excessRate: 0.00275,
        excessRateType: "percentage_of_percentage",
        notes: "₱249,246 + 27.5% of 1% in excess of ₱50M",
      },
    ],
  },
  UTL: {
    categoryName: "Utilities",
    capitalizationBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 150000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱500 for micro utility businesses with capitalization up to ₱150,000",
      },
      {
        name: "Cottage",
        minValue: 150001,
        maxValue: 1500000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes:
          "Fixed ₱1,500 for cottage utility businesses with capitalization ₱150,001 - ₱1,500,000",
      },
      {
        name: "Small",
        minValue: 1500001,
        maxValue: 15000000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱1,500,000",
      },
      {
        name: "Medium",
        minValue: 15000001,
        maxValue: 100000000,
        fixedAmount: 75000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱75,000 + 1% of excess over ₱15,000,000",
      },
      {
        name: "Large",
        minValue: 100000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱100,000,000",
      },
    ],
    grossSalesBrackets: [
      {
        name: "Micro",
        minValue: 0,
        maxValue: 30000,
        fixedAmount: 500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱500 for gross sales up to ₱30,000",
      },
      {
        name: "Cottage",
        minValue: 30001,
        maxValue: 100000,
        fixedAmount: 1500,
        excessRate: null,
        excessRateType: null,
        notes: "Fixed ₱1,500 for gross sales ₱30,001 - ₱100,000",
      },
      {
        name: "Small",
        minValue: 100001,
        maxValue: 500000,
        fixedAmount: 3000,
        excessRate: 0.005,
        excessRateType: "direct",
        notes: "₱3,000 + 0.5% of excess over ₱100,000",
      },
      {
        name: "Medium",
        minValue: 500001,
        maxValue: 9500000,
        fixedAmount: 25000,
        excessRate: 0.01,
        excessRateType: "direct",
        notes: "₱25,000 + 1% of excess over ₱500,000",
      },
      {
        name: "Large",
        minValue: 9500001,
        maxValue: 50000000,
        fixedAmount: 30000,
        excessRate: 0.003,
        excessRateType: "percentage_of_percentage",
        notes: "₱30,000 + 30% of 1% of excess over ₱9.5M",
      },
      {
        name: "Very Large",
        minValue: 50000001,
        maxValue: null,
        fixedAmount: 165000,
        excessRate: 0.002,
        excessRateType: "percentage_of_percentage",
        notes: "₱165,000 + 20% of 1% in excess of ₱50M",
      },
    ],
  },
};

// Special monthly brackets for market stalls (applies to both capitalization and gross_sales)
const MONTHLY_MARKET_STALL_BRACKETS = {
  "Meat & poultry vendor": {
    fixedAmount: 350,
    notes: "₱350/month for meat & poultry market stalls",
  },
  "Fish vendor": {
    fixedAmount: 350,
    notes: "₱350/month for fish market stalls",
  },
  "Fruits & vegetables vendor": {
    fixedAmount: 350,
    notes: "₱350/month for fruits & vegetables market stalls",
  },
  "Grocery vendor": {
    fixedAmount: 300,
    notes: "₱300/month for grocery market stalls",
  },
  "Dry goods vendor": {
    fixedAmount: 300,
    notes: "₱300/month for dry goods market stalls",
  },
};

// LOB-specific tax bracket overrides (for special cases that differ from category templates)
const LOB_SPECIFIC_BRACKETS = {
  // Fuel / Gasoline Station - Tax-exempt per Supreme Court ruling (Section 133(h) of LGC)
  "Fuel / gasoline station": {
    type: "exempt",
    notes:
      "Tax-exempt per Supreme Court ruling - Section 133(h) of LGC prohibits local taxes on petroleum products",
  },
};

async function seedTaxBrackets() {
  try {
    // Check if already connected, if not connect
    if (mongoose.connection.readyState !== 1) {
      console.log("Connecting to MongoDB...");
      await mongoose.connect(
        "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin",
      );
      console.log("Connected to MongoDB");
    } else {
      console.log("Already connected to MongoDB");
    }

    // Clear existing tax brackets
    console.log("Clearing existing tax brackets...");
    await TaxBracket.deleteMany({});
    console.log("Cleared existing tax brackets");

    // Fetch all LOBs
    console.log("Fetching LOBs...");
    const lobs = await Lob.find({ isActive: true });
    console.log(`Found ${lobs.length} active LOBs`);

    let totalInserted = 0;

    for (const lob of lobs) {
      const category = lob.category;
      const lobName = lob.name;
      const template = TAX_BRACKET_TEMPLATES[category];

      if (!template) {
        console.log(
          `No template found for category ${category}, skipping LOB: ${lobName}`,
        );
        continue;
      }

      // Check if this LOB has special monthly brackets (highest priority)
      const monthlyStallBracket = MONTHLY_MARKET_STALL_BRACKETS[lobName];

      if (monthlyStallBracket) {
        // Create monthly bracket for market stall (both capitalization and gross_sales)
        for (const taxBasis of ["capitalization", "gross_sales"]) {
          await TaxBracket.create({
            lobId: lob._id,
            taxBasis: taxBasis,
            name: "Monthly Rate",
            minValue: 0,
            maxValue: null,
            fixedAmount: monthlyStallBracket.fixedAmount,
            excessRate: null,
            excessRateType: null,
            notes: monthlyStallBracket.notes,
            paymentFrequency: "monthly",
            isActive: true,
            version: 1,
          });
          totalInserted++;
        }
        console.log(`Created monthly brackets for ${lobName}`);
        continue;
      }

      // Check if this LOB has specific override brackets
      const lobSpecificOverride = LOB_SPECIFIC_BRACKETS[lobName];

      if (lobSpecificOverride) {
        if (lobSpecificOverride.type === "exempt") {
          console.log(
            `Skipping tax brackets for ${lobName} - ${lobSpecificOverride.notes}`,
          );
          continue;
        }

        if (lobSpecificOverride.type === "custom") {
          // Create custom brackets for this LOB
          const bracketsToUse = lobSpecificOverride;

          // Capitalization brackets
          if (
            bracketsToUse.capitalizationBrackets &&
            bracketsToUse.capitalizationBrackets.length > 0
          ) {
            for (const bracket of bracketsToUse.capitalizationBrackets) {
              await TaxBracket.create({
                lobId: lob._id,
                taxBasis: "capitalization",
                name: bracket.name,
                minValue: bracket.minValue,
                maxValue: bracket.maxValue,
                fixedAmount: bracket.fixedAmount,
                excessRate: bracket.excessRate,
                excessRateType: bracket.excessRateType,
                notes: bracket.notes,
                paymentFrequency: "annual",
                isActive: true,
                version: 1,
              });
              totalInserted++;
            }
          }

          // Gross sales brackets
          if (
            bracketsToUse.grossSalesBrackets &&
            bracketsToUse.grossSalesBrackets.length > 0
          ) {
            for (const bracket of bracketsToUse.grossSalesBrackets) {
              await TaxBracket.create({
                lobId: lob._id,
                taxBasis: "gross_sales",
                name: bracket.name,
                minValue: bracket.minValue,
                maxValue: bracket.maxValue,
                fixedAmount: bracket.fixedAmount,
                excessRate: bracket.excessRate,
                excessRateType: bracket.excessRateType,
                notes: bracket.notes,
                paymentFrequency: "annual",
                isActive: true,
                version: 1,
              });
              totalInserted++;
            }
          }
          console.log(`Created custom brackets for ${lobName}`);
          continue;
        }
      }

      // Create standard annual brackets from template (default)
      // Capitalization brackets
      if (
        template.capitalizationBrackets &&
        template.capitalizationBrackets.length > 0
      ) {
        for (const bracket of template.capitalizationBrackets) {
          await TaxBracket.create({
            lobId: lob._id,
            taxBasis: "capitalization",
            name: bracket.name,
            minValue: bracket.minValue,
            maxValue: bracket.maxValue,
            fixedAmount: bracket.fixedAmount,
            excessRate: bracket.excessRate,
            excessRateType: bracket.excessRateType,
            notes: bracket.notes,
            paymentFrequency: "annual",
            isActive: true,
            version: 1,
          });
          totalInserted++;
        }
      }

      // Gross sales brackets
      if (
        template.grossSalesBrackets &&
        template.grossSalesBrackets.length > 0
      ) {
        for (const bracket of template.grossSalesBrackets) {
          await TaxBracket.create({
            lobId: lob._id,
            taxBasis: "gross_sales",
            name: bracket.name,
            minValue: bracket.minValue,
            maxValue: bracket.maxValue,
            fixedAmount: bracket.fixedAmount,
            excessRate: bracket.excessRate,
            excessRateType: bracket.excessRateType,
            notes: bracket.notes,
            paymentFrequency: "annual",
            isActive: true,
            version: 1,
          });
          totalInserted++;
        }
      }
    }

    console.log(`Successfully inserted ${totalInserted} tax brackets`);

    // Verify insertion
    const count = await TaxBracket.countDocuments();
    console.log(`Total tax brackets in database: ${count}`);

    // Group by LOB for summary
    const lobStats = await TaxBracket.aggregate([
      {
        $group: {
          _id: { lobId: "$lobId", taxBasis: "$taxBasis" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.lobId": 1, "_id.taxBasis": 1 } },
    ]);

    console.log(
      `\nTax brackets by LOB and basis: ${lobStats.length} combinations`,
    );
  } catch (error) {
    console.error("Error seeding tax brackets:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

/**
 * Seed tax brackets if the collection is empty.
 * Safe to call during startup — assumes mongoose is already connected.
 *
 * @returns {{ seeded: boolean, count?: number, error?: string }}
 */
async function seedIfEmpty() {
  try {
    const bracketCount = await TaxBracket.countDocuments({});

    if (bracketCount === 0) {
      let totalInserted = 0;

      const lobs = await Lob.find({ isActive: true });

      for (const lob of lobs) {
        const category = lob.category;
        const lobName = lob.name;
        const template = TAX_BRACKET_TEMPLATES[category];

        if (!template) continue;

        const monthlyStallBracket = MONTHLY_MARKET_STALL_BRACKETS[lobName];
        const monthlyApartmentBracket = MONTHLY_APARTMENT_BRACKETS[lobName];

        if (monthlyStallBracket) {
          await TaxBracket.create({
            lobId: lob._id,
            taxBasis: "capitalization",
            name: `${lobName} - Monthly`,
            minValue: 0,
            maxValue: null,
            fixedAmount: monthlyStallBracket.fixedAmount,
            excessRate: null,
            excessRateType: null,
            notes: monthlyStallBracket.notes,
            paymentFrequency: "monthly",
            taxExempt: false,
            isActive: true,
            version: 1,
          });
          totalInserted++;
        } else if (monthlyApartmentBracket) {
          await TaxBracket.create({
            lobId: lob._id,
            taxBasis: "capitalization",
            name: `${lobName} - Monthly`,
            minValue: 0,
            maxValue: null,
            fixedAmount: monthlyApartmentBracket.fixedAmount,
            excessRate: null,
            excessRateType: null,
            notes: monthlyApartmentBracket.notes,
            paymentFrequency: "monthly",
            taxExempt: false,
            isActive: true,
            version: 1,
          });
          totalInserted++;
        } else {
          if (
            template.capitalizationBrackets &&
            template.capitalizationBrackets.length > 0
          ) {
            for (const bracket of template.capitalizationBrackets) {
              await TaxBracket.create({
                lobId: lob._id,
                taxBasis: "capitalization",
                name: bracket.name,
                minValue: bracket.minValue,
                maxValue: bracket.maxValue,
                fixedAmount: bracket.fixedAmount,
                excessRate: bracket.excessRate,
                excessRateType: bracket.excessRateType,
                notes: bracket.notes,
                paymentFrequency: "annual",
                isActive: true,
                version: 1,
              });
              totalInserted++;
            }
          }

          if (
            template.grossSalesBrackets &&
            template.grossSalesBrackets.length > 0
          ) {
            for (const bracket of template.grossSalesBrackets) {
              await TaxBracket.create({
                lobId: lob._id,
                taxBasis: "gross_sales",
                name: bracket.name,
                minValue: bracket.minValue,
                maxValue: bracket.maxValue,
                fixedAmount: bracket.fixedAmount,
                excessRate: bracket.excessRate,
                excessRateType: bracket.excessRateType,
                notes: bracket.notes,
                paymentFrequency: "annual",
                isActive: true,
                version: 1,
              });
              totalInserted++;
            }
          }
        }
      }

      return { seeded: true, count: totalInserted };
    }

    return {
      seeded: false,
      bracketCount,
    };
  } catch (error) {
    return { seeded: false, error: error.message };
  }
}

module.exports = { seedTaxBrackets, seedIfEmpty };

// Run seed if called directly
if (require.main === module) {
  seedTaxBrackets();
}
