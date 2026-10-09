/**
 * Diabetes Prediction & PDF/Image OCR Scanner — Frontend Logic
 * =============================================================
 * Handles form validation, PDF & Image OCR text parsing via PDF.js + Tesseract.js,
 * clipboard screenshot paste (Ctrl+V), API communication, result rendering, and themes.
 */

(function () {
    "use strict";

    // Set PDF.js worker path
    if (typeof pdfjsLib !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";
    }

    // ── DOM References ────────────────────────────────────────────
    const form           = document.getElementById("predictionForm");
    const btnPredict     = document.getElementById("btnPredict");
    const btnClear       = document.getElementById("btnClear");
    const spinnerOverlay = document.getElementById("spinnerOverlay");
    const spinnerText    = document.getElementById("spinnerText");
    const resultSection  = document.getElementById("resultSection");
    const themeToggle    = document.getElementById("themeToggle");
    const errorToast     = document.getElementById("errorToast");
    const toastMessage   = document.getElementById("toastMessage");
    const toastClose     = document.getElementById("toastClose");
    const genderSelect   = document.getElementById("gender");
    const pregnanciesInput = document.getElementById("pregnancies");

    // PDF & Extension Modal Elements
    const webPdfDropZone  = document.getElementById("webPdfDropZone");
    const webPdfInput     = document.getElementById("webPdfInput");
    const webScanAlert    = document.getElementById("webScanAlert");
    const webAlertTitle   = document.getElementById("webAlertTitle");
    const webAlertDesc    = document.getElementById("webAlertDesc");
    const btnSampleDiabetic = document.getElementById("btnWebLoadSampleDiabetic");
    const btnSampleHealthy  = document.getElementById("btnWebLoadSampleHealthy");

    const btnExtensionGuide = document.getElementById("btnExtensionGuide");
    const extModalOverlay   = document.getElementById("extModalOverlay");
    const btnCloseModal     = document.getElementById("btnCloseModal");

    const API_URL = "/predict";

    // ── Field Definitions ─────────────────────────────────────────
    const FIELDS = [
        { id: "pregnancies",  key: "Pregnancies",              min: 0,   max: 20,  step: 1,     label: "Pregnancies" },
        { id: "glucose",      key: "Glucose",                  min: 0,   max: 300, step: 1,     label: "Glucose" },
        { id: "bloodpressure",key: "BloodPressure",            min: 0,   max: 200, step: 1,     label: "Blood Pressure" },
        { id: "skinthickness",key: "SkinThickness",            min: 0,   max: 100, step: 1,     label: "Skin Thickness" },
        { id: "insulin",      key: "Insulin",                  min: 0,   max: 900, step: 1,     label: "Insulin" },
        { id: "bmi",          key: "BMI",                      min: 0,   max: 80,  step: 0.1,   label: "BMI" },
        { id: "dpf",          key: "DiabetesPedigreeFunction", min: 0,   max: 3,   step: 0.001, label: "Diabetes Pedigree Function" },
        { id: "age",          key: "Age",                      min: 1,   max: 120, step: 1,     label: "Age" },
    ];

    // ── Theme Management ──────────────────────────────────────────
    function getStoredTheme() {
        return localStorage.getItem("diabetesai-theme") || "light";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("diabetesai-theme", theme);
    }

    applyTheme(getStoredTheme());

    themeToggle.addEventListener("click", function () {
        const current = document.documentElement.getAttribute("data-theme");
        applyTheme(current === "dark" ? "light" : "dark");
    });

    // ── Modal Handlers ────────────────────────────────────────────
    if (btnExtensionGuide && extModalOverlay) {
        btnExtensionGuide.addEventListener("click", () => extModalOverlay.classList.remove("hidden"));
        btnCloseModal.addEventListener("click", () => extModalOverlay.classList.add("hidden"));
        extModalOverlay.addEventListener("click", (e) => {
            if (e.target === extModalOverlay) extModalOverlay.classList.add("hidden");
        });
    }

    // ── Toast Notifications ───────────────────────────────────────
    let toastTimer = null;

    function showToast(message, durationMs) {
        durationMs = durationMs || 5000;
        toastMessage.textContent = message;
        errorToast.classList.add("visible");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(hideToast, durationMs);
    }

    function hideToast() {
        errorToast.classList.remove("visible");
        clearTimeout(toastTimer);
    }

    toastClose.addEventListener("click", hideToast);

    // ── Gender → Pregnancies Logic ────────────────────────────────
    function updatePregnanciesState() {
        var gender = genderSelect.value;
        if (gender === "Male") {
            pregnanciesInput.value = "0";
            pregnanciesInput.disabled = true;
            var group = pregnanciesInput.closest(".form-group");
            group.classList.remove("has-error");
            document.getElementById("error-pregnancies").textContent = "";
        } else {
            pregnanciesInput.disabled = false;
        }
    }

    genderSelect.addEventListener("change", function () {
        updatePregnanciesState();
        var group = genderSelect.closest(".form-group");
        group.classList.remove("has-error");
        document.getElementById("error-gender").textContent = "";
    });

    // ── Drag & Drop PDF & Image File Scanner ─────────────────────
    if (webPdfDropZone) {
        webPdfDropZone.addEventListener("dragover", function (e) {
            e.preventDefault();
            webPdfDropZone.classList.add("dragover");
        });

        webPdfDropZone.addEventListener("dragleave", function () {
            webPdfDropZone.classList.remove("dragover");
        });

        webPdfDropZone.addEventListener("drop", function (e) {
            e.preventDefault();
            webPdfDropZone.classList.remove("dragover");
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processWebFile(e.dataTransfer.files[0]);
            }
        });
    }

    if (webPdfInput) {
        webPdfInput.addEventListener("change", function (e) {
            if (e.target.files && e.target.files[0]) {
                processWebFile(e.target.files[0]);
            }
        });
    }

    // Clipboard Paste Listener for Screenshots (Ctrl+V)
    window.addEventListener("paste", function (e) {
        const items = e.clipboardData && e.clipboardData.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const blob = items[i].getAsFile();
                    processWebFile(blob, "Pasted Screenshot");
                    break;
                }
            }
        }
    });

    async function processWebFile(file, labelOverride) {
        const filename = file.name || labelOverride || "Uploaded Document";
        const isPdf = file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
        const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp|bmp)$/i.test(filename);

        if (!isPdf && !isImage) {
            showToast("Unsupported file format. Please upload a PDF or Image (PNG, JPG, WEBP).");
            return;
        }

        if (isPdf) {
            showSpinner("Extracting text from PDF document...");
            try {
                const arrayBuffer = await file.arrayBuffer();
                const rawText = await PDFMedicalParser.extractTextFromPDF(arrayBuffer, pdfjsLib);
                hideSpinner();
                applyExtractedMedicalData(rawText, `Scanned PDF: ${filename}`);
            } catch (err) {
                hideSpinner();
                showToast("Failed to parse PDF file: " + err.message);
            }
        } else if (isImage) {
            showSpinner("Running OCR image text recognition on screenshot...");
            try {
                const rawText = await PDFMedicalParser.extractTextFromImage(file);
                hideSpinner();
                applyExtractedMedicalData(rawText, `OCR Scanned Image: ${filename}`);
            } catch (err) {
                hideSpinner();
                showToast("OCR processing failed: " + err.message);
            }
        }
    }

    function applyExtractedMedicalData(text, label) {
        if (typeof PDFMedicalParser === "undefined") {
            showToast("PDF & Image Medical Parser module not loaded.");
            return;
        }

        const parsed = PDFMedicalParser.parseText(text);

        if (parsed.extractedCount === 0) {
            showToast("No medical lab parameters detected in this file/screenshot.");
            return;
        }

        const m = parsed.metrics;

        // Auto fill form
        if (m.Glucose !== undefined) document.getElementById("glucose").value = m.Glucose;
        if (m.BloodPressure !== undefined) document.getElementById("bloodpressure").value = m.BloodPressure;
        if (m.BMI !== undefined) document.getElementById("bmi").value = m.BMI;
        if (m.Insulin !== undefined) document.getElementById("insulin").value = m.Insulin;
        if (m.Age !== undefined) document.getElementById("age").value = m.Age;
        if (m.Pregnancies !== undefined) document.getElementById("pregnancies").value = m.Pregnancies;
        if (m.SkinThickness !== undefined) document.getElementById("skinthickness").value = m.SkinThickness;
        if (m.DiabetesPedigreeFunction !== undefined) document.getElementById("dpf").value = m.DiabetesPedigreeFunction;

        // Provide smart defaults for any missing parameters so prediction can run instantly
        if (!document.getElementById("age").value) document.getElementById("age").value = 35;
        if (!document.getElementById("bmi").value) document.getElementById("bmi").value = 25.0;
        if (!document.getElementById("bloodpressure").value) document.getElementById("bloodpressure").value = 75;
        if (!document.getElementById("skinthickness").value) document.getElementById("skinthickness").value = 20;
        if (!document.getElementById("insulin").value) document.getElementById("insulin").value = 80;
        if (!document.getElementById("dpf").value) document.getElementById("dpf").value = 0.35;

        // Auto select gender
        if (!genderSelect.value) {
            genderSelect.value = (m.Pregnancies && m.Pregnancies > 0) ? "Female" : "Female";
            updatePregnanciesState();
        }

        // Display success banner
        webScanAlert.classList.remove("hidden");
        webAlertTitle.textContent = `${parsed.extractedCount} Lab Parameter(s) Extracted! Running AI Prediction...`;
        webAlertDesc.textContent = `${label} — Auto-evaluating diabetes risk model.`;

        // Automatically trigger AI model prediction immediately!
        var payload = validateAll();
        if (payload) {
            sendPrediction(payload);
        }
    }

    // Sample buttons
    if (btnSampleDiabetic) {
        btnSampleDiabetic.addEventListener("click", function () {
            const diabeticText = `
                =======================================================
                CITY GENERAL DIAGNOSTICS LAB - PATIENT MEDICAL REPORT
                =======================================================
                Patient Name: Jane Doe            Age: 48 Yrs
                Gender: Female                    Gravida/Pregnancies: 4
                
                TEST NAME                         RESULT      REFERENCE RANGE
                -------------------------------------------------------
                Fasting Blood Glucose             154 mg/dL   (70 - 99 mg/dL) [HIGH]
                Blood Pressure (Diastolic)        85 mmHg     (60 - 80 mmHg) [ELEVATED]
                Serum Insulin                     175 uIU/mL  (15 - 110 uIU/mL) [HIGH]
                Body Mass Index (BMI)             34.2 kg/m2  (18.5 - 24.9) [OBESE]
                Triceps Skin Thickness            32 mm       (10 - 30 mm)
                Diabetes Pedigree Function (DPF)  0.72        (0.1 - 0.4)
                -------------------------------------------------------
                Notes: High Fasting Glucose and Elevated Insulin noted.
            `;
            applyExtractedMedicalData(diabeticText, "Sample Diabetic Patient PDF Report");
        });
    }

    if (btnSampleHealthy) {
        btnSampleHealthy.addEventListener("click", function () {
            const healthyText = `
                =======================================================
                CITY GENERAL DIAGNOSTICS LAB - PATIENT MEDICAL REPORT
                =======================================================
                Patient Name: Sarah Smith         Age: 29 Yrs
                Gender: Female                    Gravida/Pregnancies: 1
                
                TEST NAME                         RESULT      REFERENCE RANGE
                -------------------------------------------------------
                Fasting Blood Glucose             88 mg/dL    (70 - 99 mg/dL) [NORMAL]
                Blood Pressure (Diastolic)        68 mmHg     (60 - 80 mmHg) [NORMAL]
                Serum Insulin                     45 uIU/mL   (15 - 110 uIU/mL) [NORMAL]
                Body Mass Index (BMI)             22.4 kg/m2  (18.5 - 24.9) [NORMAL]
                Triceps Skin Thickness            18 mm       (10 - 30 mm)
                Diabetes Pedigree Function (DPF)  0.24        (0.1 - 0.4)
                -------------------------------------------------------
                Notes: Normal medical checkup results.
            `;
            applyExtractedMedicalData(healthyText, "Sample Healthy Patient PDF Report");
        });
    }

    // ── Form Validation & Submission ──────────────────────────────
    function validateField(field) {
        var input = document.getElementById(field.id);
        var group = input.closest(".form-group");
        var errorEl = document.getElementById("error-" + field.id);
        var value = input.value.trim();

        group.classList.remove("has-error");
        errorEl.textContent = "";

        if (value === "") {
            group.classList.add("has-error");
            errorEl.textContent = field.label + " is required.";
            return null;
        }

        var num = parseFloat(value);
        if (isNaN(num)) {
            group.classList.add("has-error");
            errorEl.textContent = "Please enter a valid number.";
            return null;
        }

        if (num < field.min || num > field.max) {
            group.classList.add("has-error");
            errorEl.textContent = "Value must be between " + field.min + " and " + field.max + ".";
            return null;
        }

        return num;
    }

    function validateAll() {
        var payload = {};
        var isValid = true;
        var firstError = null;

        var genderGroup = genderSelect.closest(".form-group");
        var genderError = document.getElementById("error-gender");
        genderGroup.classList.remove("has-error");
        genderError.textContent = "";

        if (!genderSelect.value) {
            genderGroup.classList.add("has-error");
            genderError.textContent = "Please select a gender.";
            isValid = false;
            firstError = genderSelect;
        }

        FIELDS.forEach(function (field) {
            if (field.id === "pregnancies" && pregnanciesInput.disabled) {
                payload[field.key] = 0;
                return;
            }
            var val = validateField(field);
            if (val === null) {
                isValid = false;
                if (!firstError) {
                    firstError = document.getElementById(field.id);
                }
            } else {
                payload[field.key] = val;
            }
        });

        if (!isValid && firstError) {
            firstError.focus();
        }

        return isValid ? payload : null;
    }

    FIELDS.forEach(function (field) {
        var input = document.getElementById(field.id);
        input.addEventListener("blur", function () {
            if (input.value.trim() !== "") {
                validateField(field);
            }
        });
        input.addEventListener("input", function () {
            var group = input.closest(".form-group");
            group.classList.remove("has-error");
        });
    });

    // ── Spinner ───────────────────────────────────────────────────
    function showSpinner(text) {
        if (spinnerText) spinnerText.textContent = text || "Analyzing health metrics…";
        spinnerOverlay.classList.add("active");
        spinnerOverlay.setAttribute("aria-hidden", "false");
    }

    function hideSpinner() {
        spinnerOverlay.classList.remove("active");
        spinnerOverlay.setAttribute("aria-hidden", "true");
    }

    // ── API Call ──────────────────────────────────────────────────
    function sendPrediction(payload) {
        showSpinner("Evaluating AI prediction model...");
        resultSection.innerHTML = "";

        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })
        .then(function (res) {
            if (!res.ok) {
                return res.json().then(function (data) {
                    throw new Error(data.error || "Server returned status " + res.status);
                });
            }
            return res.json();
        })
        .then(function (data) {
            hideSpinner();
            renderResult(data);
        })
        .catch(function (err) {
            hideSpinner();
            var msg = err.message || "Unable to reach the server.";
            if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
                msg = "Cannot connect to the server. Make sure the Flask backend is running on http://127.0.0.1:5000";
            }
            showToast(msg);
        });
    }

    // ── Render Result ─────────────────────────────────────────────
    function renderResult(data) {
        var isDiabetic = data.prediction_code === 1;
        var cardClass  = isDiabetic ? "danger" : "success";
        var iconSVG    = isDiabetic
            ? '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
            : '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

        var confidenceHTML = "";
        if (data.confidence !== null && data.confidence !== undefined) {
            confidenceHTML =
                '<div class="detail-item confidence" style="--i:2">' +
                    '<div class="detail-label">Confidence</div>' +
                    '<div class="detail-value">' + data.confidence + '%</div>' +
                    '<div class="confidence-bar">' +
                        '<div class="confidence-fill" id="confidenceFill"></div>' +
                    '</div>' +
                '</div>';
        }

        var html =
            '<div class="result-card ' + cardClass + '">' +
                '<div class="result-header">' +
                    '<div class="result-icon">' + iconSVG + '</div>' +
                    '<div>' +
                        '<div class="result-label">Prediction Result</div>' +
                        '<div class="result-value">' + data.prediction + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="result-details">' +
                    '<div class="detail-item prediction" style="--i:0">' +
                        '<div class="detail-label">Prediction</div>' +
                        '<div class="detail-value">' + data.prediction + '</div>' +
                    '</div>' +
                    '<div class="detail-item status" style="--i:1">' +
                        '<div class="detail-label">Status</div>' +
                        '<div class="detail-value">' + data.risk + '</div>' +
                    '</div>' +
                    confidenceHTML +
                '</div>' +
            '</div>';

        resultSection.innerHTML = html;

        if (data.confidence !== null && data.confidence !== undefined) {
            requestAnimationFrame(function () {
                var fill = document.getElementById("confidenceFill");
                if (fill) {
                    fill.style.width = data.confidence + "%";
                }
            });
        }

        resultSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    // ── Form Submit ───────────────────────────────────────────────
    form.addEventListener("submit", function (e) {
        e.preventDefault();
        var payload = validateAll();
        if (payload) {
            sendPrediction(payload);
        }
    });

    // ── Clear Form ────────────────────────────────────────────────
    btnClear.addEventListener("click", function () {
        form.reset();

        FIELDS.forEach(function (field) {
            var group = document.getElementById(field.id).closest(".form-group");
            group.classList.remove("has-error");
            document.getElementById("error-" + field.id).textContent = "";
        });

        var genderGroup = genderSelect.closest(".form-group");
        genderGroup.classList.remove("has-error");
        document.getElementById("error-gender").textContent = "";

        pregnanciesInput.disabled = false;
        webScanAlert.classList.add("hidden");
        resultSection.innerHTML = "";
        hideSpinner();
        hideToast();
        genderSelect.focus();
    });

    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
    });

})();
