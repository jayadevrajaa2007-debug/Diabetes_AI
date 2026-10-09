/**
 * Medical Lab Report Text, PDF & Image Parser for Diabetes Risk Metrics
 * =================================================================
 * Extracts 8 clinical features (Glucose, Blood Pressure, BMI, Insulin,
 * Age, Pregnancies, Skin Thickness, Diabetes Pedigree Function) from
 * unstructured lab report text & OCR image text using fuzzy regex pattern matching.
 */

(function (global) {
    "use strict";

    const PDFMedicalParser = {
        /**
         * Parse raw text extracted from a medical PDF, Image OCR, or webpage
         * @param {string} text - Raw text string
         * @returns {Object} Extracted metrics object & confidence details
         */
        parseText: function (text) {
            if (!text || typeof text !== "string") {
                return { metrics: {}, details: {}, extractedCount: 0, textLength: 0 };
            }

            // Normalize OCR text: replace common OCR character glitches
            const cleanText = text
                .replace(/[|\\]/g, " ")
                .replace(/\s+/g, " ")
                .replace(/G[l1i]uc[o0]se/gi, "Glucose")
                .replace(/B[l1i][o0][o0]d\s*Pressure/gi, "Blood Pressure")
                .replace(/lnsulin|lmsulin|Insu[l1i]n/gi, "Insulin");

            const results = {};
            const details = {};

            // 1. Glucose (mg/dL)
            const glucoseMatch = cleanText.match(/(?:Fasting\s*(?:Blood\s*)?Sugar|Fasting\s*Glucose|Plasma\s*Glucose|Blood\s*Glucose|Serum\s*Glucose|FBS|Glucose|Sugar)[^\d\n\r]{0,35}?(\d{2,3}(?:\.\d+)?)/i);
            if (glucoseMatch) {
                const val = parseFloat(glucoseMatch[1]);
                if (val >= 40 && val <= 400) {
                    results.Glucose = Math.round(val);
                    details.Glucose = { value: results.Glucose, raw: glucoseMatch[0], confidence: "High" };
                }
            }

            // 2. Blood Pressure (Diastolic in mm Hg)
            const bpSlashMatch = cleanText.match(/(?:Blood\s*Pressure|BP|B\.P\.)[^\d\n\r]{0,25}?(\d{2,3})\s*[\/\\]\s*(\d{2,3})/i);
            if (bpSlashMatch) {
                const diastolic = parseInt(bpSlashMatch[2], 10);
                if (diastolic >= 40 && diastolic <= 150) {
                    results.BloodPressure = diastolic;
                    details.BloodPressure = { value: diastolic, raw: bpSlashMatch[0], confidence: "High" };
                }
            } else {
                const diastolicOnly = cleanText.match(/(?:Diastolic|Diastolic\s*BP)[^\d\n\r]{0,20}?(\d{2,3})/i);
                if (diastolicOnly) {
                    const val = parseInt(diastolicOnly[1], 10);
                    if (val >= 40 && val <= 150) {
                        results.BloodPressure = val;
                        details.BloodPressure = { value: val, raw: diastolicOnly[0], confidence: "Medium" };
                    }
                }
            }

            // 3. BMI (kg/m²)
            const bmiMatch = cleanText.match(/(?:Body\s*Mass\s*Index|BMI|B\.M\.I\.)[^\d\n\r]{0,25}?(\d{1,2}(?:\.\d+)?)/i);
            if (bmiMatch) {
                const val = parseFloat(bmiMatch[1]);
                if (val >= 10 && val <= 70) {
                    results.BMI = parseFloat(val.toFixed(1));
                    details.BMI = { value: results.BMI, raw: bmiMatch[0], confidence: "High" };
                }
            }

            // 4. Insulin (μU/mL)
            const insulinMatch = cleanText.match(/(?:Serum\s*Insulin|Fasting\s*Insulin|Insulin\s*Level|Insulin)[^\d\n\r]{0,25}?(\d{1,3}(?:\.\d+)?)/i);
            if (insulinMatch) {
                const val = parseFloat(insulinMatch[1]);
                if (val >= 0 && val <= 900) {
                    results.Insulin = Math.round(val);
                    details.Insulin = { value: results.Insulin, raw: insulinMatch[0], confidence: "High" };
                }
            }

            // 5. Age (Years)
            const ageMatch = cleanText.match(/(?:Patient\s*Age|Age\s*[\/:]|Age)[^\d\n\r]{0,15}?(\d{1,3})\s*(?:years|yrs|y\/o)?/i);
            if (ageMatch) {
                const val = parseInt(ageMatch[1], 10);
                if (val >= 1 && val <= 120) {
                    results.Age = val;
                    details.Age = { value: val, raw: ageMatch[0], confidence: "High" };
                }
            }

            // 6. Pregnancies
            const pregMatch = cleanText.match(/(?:Pregnanc(?:ies|y)|Gravida|Parity)[^\d\n\r]{0,15}?(\d{1,2})/i);
            if (pregMatch) {
                const val = parseInt(pregMatch[1], 10);
                if (val >= 0 && val <= 20) {
                    results.Pregnancies = val;
                    details.Pregnancies = { value: val, raw: pregMatch[0], confidence: "High" };
                }
            } else if (/\b(?:Male|M)\b/i.test(cleanText) && !/\b(?:Female|F)\b/i.test(cleanText)) {
                results.Pregnancies = 0;
                details.Pregnancies = { value: 0, raw: "Inferred from Gender: Male", confidence: "Medium" };
            }

            // 7. Skin Thickness (mm)
            const skinMatch = cleanText.match(/(?:Triceps\s*Skinfold|Skin\s*Thickness|Skinfold)[^\d\n\r]{0,20}?(\d{1,2}(?:\.\d+)?)/i);
            if (skinMatch) {
                const val = parseFloat(skinMatch[1]);
                if (val >= 0 && val <= 99) {
                    results.SkinThickness = Math.round(val);
                    details.SkinThickness = { value: results.SkinThickness, raw: skinMatch[0], confidence: "High" };
                }
            }

            // 8. Diabetes Pedigree Function (DPF)
            const dpfMatch = cleanText.match(/(?:Diabetes\s*Pedigree(?:\s*Function)?|DPF|Pedigree\s*Score)[^\d\n\r]{0,20}?(\d(?:\.\d+)?)/i);
            if (dpfMatch) {
                const val = parseFloat(dpfMatch[1]);
                if (val >= 0.05 && val <= 3.0) {
                    results.DiabetesPedigreeFunction = parseFloat(val.toFixed(3));
                    details.DiabetesPedigreeFunction = { value: results.DiabetesPedigreeFunction, raw: dpfMatch[0], confidence: "High" };
                }
            }

            const extractedKeys = Object.keys(results);

            return {
                metrics: results,
                details: details,
                extractedCount: extractedKeys.length,
                missingCount: 8 - extractedKeys.length,
                rawTextSnippet: text.substring(0, 300) + (text.length > 300 ? "..." : "")
            };
        },

        /**
         * Extract text from PDF using PDF.js
         */
        extractTextFromPDF: async function (arrayBuffer, pdfjsLib) {
            if (!pdfjsLib) {
                throw new Error("PDF.js library is not loaded.");
            }
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += `\n--- Page ${pageNum} ---\n` + pageText;
            }

            return fullText;
        },

        /**
         * Extract text from Image / Screenshot using Tesseract.js OCR
         */
        extractTextFromImage: async function (imageFileOrBlob) {
            if (typeof Tesseract === "undefined") {
                throw new Error("Tesseract.js OCR library is not loaded.");
            }
            
            // Perform OCR on image
            const result = await Tesseract.recognize(imageFileOrBlob, "eng", {
                logger: m => console.log("[OCR Progress]", m)
            });

            return result.data.text;
        }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = PDFMedicalParser;
    } else {
        global.PDFMedicalParser = PDFMedicalParser;
    }
})(typeof self !== "undefined" ? self : this);
