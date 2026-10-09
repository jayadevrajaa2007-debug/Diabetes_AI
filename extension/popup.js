/**
 * Diabetes AI Browser Extension — Popup Controller & PDF/Image Scanner Logic
 * ===========================================================================
 * Handles PDF file parsing via PDF.js, Image/Screenshot OCR via Tesseract.js,
 * clipboard paste (Ctrl+V), activeTab DOM scanning, API prediction calls, and offline logic.
 */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const API_BASE_URL = "http://127.0.0.1:5000";

    // Set PDF.js worker path
    if (typeof pdfjsLib !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";
    }

    // ── DOM References ────────────────────────────────────────────────
    const apiStatusDot   = document.getElementById("apiStatusDot");
    const apiStatusText  = document.getElementById("apiStatusText");
    const tabBtns        = document.querySelectorAll(".tab-btn");
    const tabPanes       = document.querySelectorAll(".tab-pane");

    const dropZone       = document.getElementById("dropZone");
    const pdfFileInput   = document.getElementById("pdfFileInput");
    const btnLoadSample  = document.getElementById("btnLoadSamplePdf");
    const btnScanPage    = document.getElementById("btnScanPage");

    const popupForm      = document.getElementById("popupMetricsForm");
    const scanBanner     = document.getElementById("scanSummaryBanner");
    const scanTitle      = document.getElementById("scanSummaryTitle");
    const scanDesc       = document.getElementById("scanSummaryDesc");

    const loadingState   = document.getElementById("loadingState");
    const loadingMsg     = document.getElementById("loadingMsg");
    const resultContainer = document.getElementById("resultContainer");
    const resultBadgeCard = document.getElementById("resultBadgeCard");
    const resultIcon     = document.getElementById("resultIcon");
    const resultOutcome  = document.getElementById("resultOutcome");
    const resultConfText = document.getElementById("resultConfidenceText");
    const meterFill      = document.getElementById("meterFill");
    const factorsList    = document.getElementById("factorsList");
    const btnResetScan   = document.getElementById("btnResetScan");
    const btnOpenWebDashboard = document.getElementById("btnOpenWebDashboard");

    // Form inputs
    const extGender      = document.getElementById("extGender");
    const extAge         = document.getElementById("extAge");
    const extGlucose     = document.getElementById("extGlucose");
    const extBloodPressure = document.getElementById("extBloodPressure");
    const extBMI         = document.getElementById("extBMI");
    const extInsulin     = document.getElementById("extInsulin");
    const extPregnancies = document.getElementById("extPregnancies");
    const extSkinThickness = document.getElementById("extSkinThickness");
    const extDPF         = document.getElementById("extDPF");

    let isApiOnline = false;

    // ── Check Flask Backend Health ─────────────────────────────────────
    async function checkApiHealth() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            
            const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.status === "ok") {
                    isApiOnline = true;
                    apiStatusDot.className = "status-dot online";
                    apiStatusText.textContent = "API Ready";
                    return;
                }
            }
        } catch (e) {
            // API unreachable
        }
        isApiOnline = false;
        apiStatusDot.className = "status-dot offline";
        apiStatusText.textContent = "Offline Model";
    }

    checkApiHealth();
    setInterval(checkApiHealth, 15000);

    // ── Tab Navigation ─────────────────────────────────────────────────
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.getAttribute("data-tab");
            switchTab(target);
        });
    });

    function switchTab(tabId) {
        tabBtns.forEach(b => b.classList.toggle("active", b.getAttribute("data-tab") === tabId));
        tabPanes.forEach(p => p.classList.toggle("active", p.id === tabId));
    }

    // ── Gender Change Handler ──────────────────────────────────────────
    extGender.addEventListener("change", () => {
        if (extGender.value === "Male") {
            extPregnancies.value = 0;
            extPregnancies.disabled = true;
        } else {
            extPregnancies.disabled = false;
        }
    });

    // ── Drag & Drop & Paste Handling ──────────────────────────────────
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("dragover");
    });

    dropZone.addEventListener("dragleave", () => {
        dropZone.classList.remove("dragover");
    });

    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUploadedFile(e.dataTransfer.files[0]);
        }
    });

    pdfFileInput.addEventListener("change", (e) => {
        if (e.target.files && e.target.files[0]) {
            handleUploadedFile(e.target.files[0]);
        }
    });

    // Clipboard paste event (Ctrl+V)
    window.addEventListener("paste", (e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    handleUploadedFile(blob, "Pasted Screenshot");
                    break;
                }
            }
        }
    });

    // ── Process PDF or Image File ──────────────────────────────────────
    async function handleUploadedFile(file, overrideName) {
        const filename = file.name || overrideName || "Document";
        const isPdf = file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
        const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(filename);

        if (!isPdf && !isImage) {
            alert("Please select a valid PDF, PNG, JPG, or WEBP document.");
            return;
        }

        if (isPdf) {
            showLoading("Extracting medical text from PDF...");
            try {
                const arrayBuffer = await file.arrayBuffer();
                const rawText = await PDFMedicalParser.extractTextFromPDF(arrayBuffer, pdfjsLib);
                processExtractedText(rawText, `Scanned PDF: ${filename}`);
            } catch (err) {
                hideLoading();
                alert("Error parsing PDF file: " + err.message);
            }
        } else if (isImage) {
            showLoading("Running OCR text recognition on image screenshot...");
            try {
                const rawText = await PDFMedicalParser.extractTextFromImage(file);
                processExtractedText(rawText, `OCR Scanned Image: ${filename}`);
            } catch (err) {
                hideLoading();
                alert("Error running image OCR: " + err.message);
            }
        }
    }

    // ── Process Extracted Text via Regex Parser ─────────────────────────
    function processExtractedText(text, sourceLabel) {
        const parsed = PDFMedicalParser.parseText(text);
        hideLoading();

        if (parsed.extractedCount === 0) {
            alert("No medical lab metrics were found in this document/screenshot. Please enter metrics manually.");
            switchTab("tab-manual");
            return;
        }

        // Populate fields
        const m = parsed.metrics;
        if (m.Glucose !== undefined) extGlucose.value = m.Glucose;
        if (m.BloodPressure !== undefined) extBloodPressure.value = m.BloodPressure;
        if (m.BMI !== undefined) extBMI.value = m.BMI;
        if (m.Insulin !== undefined) extInsulin.value = m.Insulin;
        if (m.Age !== undefined) extAge.value = m.Age;
        if (m.Pregnancies !== undefined) extPregnancies.value = m.Pregnancies;
        if (m.SkinThickness !== undefined) extSkinThickness.value = m.SkinThickness;
        if (m.DiabetesPedigreeFunction !== undefined) extDPF.value = m.DiabetesPedigreeFunction;

        // Provide defaults for any missing parameters
        if (!extAge.value) extAge.value = 35;
        if (!extBMI.value) extBMI.value = 25.0;
        if (!extBloodPressure.value) extBloodPressure.value = 75;
        if (!extSkinThickness.value) extSkinThickness.value = 20;
        if (!extInsulin.value) extInsulin.value = 80;
        if (!extDPF.value) extDPF.value = 0.35;

        // Show banner
        scanBanner.classList.remove("hidden");
        scanTitle.textContent = `${parsed.extractedCount} Medical Metric(s) Extracted!`;
        scanDesc.textContent = `${sourceLabel} — Auto-running prediction...`;

        switchTab("tab-manual");

        // Auto run prediction immediately!
        runPrediction();
    }

    // ── Load Sample PDF Test Report Button ─────────────────────────────
    btnLoadSample.addEventListener("click", () => {
        showLoading("Loading Sample Diabetes Lab Report...");
        setTimeout(() => {
            const sampleText = `
                =======================================================
                CITY GENERAL DIAGNOSTICS LAB - PATIENT MEDICAL REPORT
                =======================================================
                Patient Name: Jane Doe            Age: 45 Yrs
                Gender: Female                    Gravida/Pregnancies: 3
                
                TEST NAME                         RESULT      REFERENCE RANGE
                -------------------------------------------------------
                Fasting Blood Glucose             148 mg/dL   (70 - 99 mg/dL) [HIGH]
                Blood Pressure (BP)               135/82 mmHg (90/60 - 120/80)
                Serum Insulin                     160 uIU/mL  (15 - 110 uIU/mL) [HIGH]
                Body Mass Index (BMI)             33.6 kg/m2  (18.5 - 24.9) [OBESE]
                Triceps Skin Thickness            35 mm       (10 - 30 mm)
                Diabetes Pedigree Function (DPF)  0.627       (0.1 - 0.4)
                -------------------------------------------------------
                Notes: High Fasting Glucose and Elevated Insulin noted.
            `;
            processExtractedText(sampleText, "Sample Diagnostic Lab Report");
        }, 500);
    });

    // ── Scan Active Webpage ────────────────────────────────────────────
    btnScanPage.addEventListener("click", () => {
        showLoading("Scanning active webpage for medical text...");

        if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs || !tabs[0]) {
                    hideLoading();
                    alert("Could not access current browser tab.");
                    return;
                }

                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        func: () => document.body.innerText
                    },
                    (results) => {
                        hideLoading();
                        if (results && results[0] && results[0].result) {
                            processExtractedText(results[0].result, `Webpage: ${tabs[0].title}`);
                        } else {
                            alert("Could not extract readable text from the current page.");
                        }
                    }
                );
            });
        } else {
            hideLoading();
            alert("Web scanning is only available inside Chrome extension.");
        }
    });

    // ── Submit Metrics & Predict ───────────────────────────────────────
    popupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        runPrediction();
    });

    async function runPrediction() {
        const payload = {
            Pregnancies: extGender.value === "Male" ? 0 : parseFloat(extPregnancies.value || 0),
            Glucose: parseFloat(extGlucose.value || 0),
            BloodPressure: parseFloat(extBloodPressure.value || 0),
            SkinThickness: parseFloat(extSkinThickness.value || 0),
            Insulin: parseFloat(extInsulin.value || 0),
            BMI: parseFloat(extBMI.value || 0),
            DiabetesPedigreeFunction: parseFloat(extDPF.value || 0.35),
            Age: parseFloat(extAge.value || 30)
        };

        if (!payload.Glucose || !payload.Age || !payload.BMI) {
            alert("Please enter at least Glucose, BMI, and Age to run prediction.");
            return;
        }

        showLoading("Evaluating AI Model...");

        let resultData = null;

        if (isApiOnline) {
            try {
                const res = await fetch(`${API_BASE_URL}/predict`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    resultData = await res.json();
                }
            } catch (err) {
                console.warn("Backend API request failed, falling back to local model logic.", err);
            }
        }

        // Fallback offline prediction calculation if backend offline
        if (!resultData) {
            resultData = calculateOfflinePrediction(payload);
        }

        hideLoading();
        renderResult(resultData, payload);
    }

    // ── Local Fallback Prediction Math ─────────────────────────────────
    function calculateOfflinePrediction(p) {
        const z = -8.4
            + (p.Pregnancies * 0.123)
            + (p.Glucose * 0.035)
            + (p.BloodPressure * -0.013)
            + (p.SkinThickness * 0.0006)
            + (p.Insulin * -0.0011)
            + (p.BMI * 0.089)
            + (p.DiabetesPedigreeFunction * 0.94)
            + (p.Age * 0.014);

        const proba = 1.0 / (1.0 + Math.exp(-z));
        const isDiabetic = proba >= 0.5;
        const confidence = Math.round((isDiabetic ? proba : 1.0 - proba) * 1000) / 10;

        return {
            prediction: isDiabetic ? "Diabetic" : "Non-Diabetic",
            prediction_code: isDiabetic ? 1 : 0,
            confidence: confidence,
            risk: isDiabetic ? "High Risk" : "Low Risk"
        };
    }

    // ── Render Prediction Result Card ──────────────────────────────────
    function renderResult(data, payload) {
        const isDiabetic = data.prediction_code === 1;

        resultBadgeCard.className = `result-badge-card ${isDiabetic ? "diabetic" : "non-diabetic"}`;
        
        resultIcon.innerHTML = isDiabetic
            ? `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
            : `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

        resultOutcome.textContent = isDiabetic ? "Diabetic Risk Detected" : "Low Risk (Non-Diabetic)";
        resultConfText.textContent = `${data.confidence || 90}% Confidence`;

        meterFill.style.width = `${data.confidence || 85}%`;

        // Render Clinical Findings
        factorsList.innerHTML = "";
        const findings = [
            { label: "Fasting Glucose", val: `${payload.Glucose} mg/dL`, isHigh: payload.Glucose >= 120 },
            { label: "Body Mass Index", val: `${payload.BMI} kg/m²`, isHigh: payload.BMI >= 25 },
            { label: "Serum Insulin", val: `${payload.Insulin} μU/mL`, isHigh: payload.Insulin >= 140 },
            { label: "Diastolic BP", val: `${payload.BloodPressure} mm Hg`, isHigh: payload.BloodPressure >= 80 },
        ];

        findings.forEach(f => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span><strong>${f.label}:</strong> ${f.val}</span>
                <span class="flag-tag ${f.isHigh ? "tag-high" : "tag-normal"}">${f.isHigh ? "ELEVATED" : "NORMAL"}</span>
            `;
            factorsList.appendChild(li);
        });

        resultContainer.classList.remove("hidden");
        resultContainer.scrollIntoView({ behavior: "smooth" });
    }

    btnResetScan.addEventListener("click", () => {
        resultContainer.classList.add("hidden");
        scanBanner.classList.add("hidden");
        popupForm.reset();
        switchTab("tab-pdf");
    });

    btnOpenWebDashboard.addEventListener("click", (e) => {
        e.preventDefault();
        if (typeof chrome !== "undefined" && chrome.tabs) {
            chrome.tabs.create({ url: API_BASE_URL });
        } else {
            window.open(API_BASE_URL, "_blank");
        }
    });

    function showLoading(msg) {
        loadingMsg.textContent = msg || "Processing...";
        loadingState.classList.remove("hidden");
    }

    function hideLoading() {
        loadingState.classList.add("hidden");
    }
});
