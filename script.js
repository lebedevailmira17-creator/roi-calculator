function parseNumber(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
}

function formatCurrency(value) {
    if (!Number.isFinite(value)) return "0 ₽";
    return value.toLocaleString("ru-RU", {
        maximumFractionDigits: 0,
    }) + " ₽";
}

function formatMonths(value) {
    if (!Number.isFinite(value) || value <= 0) return "—";
    return value.toLocaleString("ru-RU", {
        maximumFractionDigits: 1,
    });
}

function updateBriefStatus() {
    const selects = document.querySelectorAll(".criterion-select");
    const allFilled = Array.from(selects).every((s) => s.value !== "");
    const chip = document.getElementById("briefStatus");
    if (!chip) return;
    chip.classList.remove("brief-status-ready", "brief-status-pending");
    if (allFilled) {
        chip.textContent = "✅ Готов к оценке";
        chip.classList.add("brief-status-ready");
    } else {
        chip.textContent = "⏳ Требует заполнения";
        chip.classList.add("brief-status-pending");
    }
}

function getCriterionScore(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    return parseNumber(el.value);
}

function getAdminNumber(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const val = parseNumber(el.value);
    return val > 0 ? val : fallback;
}

const ROLE_RATE_MAPPING = {
    "analyst": "rateAnalyst",
    "designer": "rateDesigner",
    "frontend": "rateFrontend",
    "backend": "rateBackend",
    "system-analyst": "rateSystemAnalyst",
    "integration-dev": "rateIntegrationDev",
    "architect": "rateArchitect",
};

function getRateForRow(row) {
    const roleKey = row.dataset.roleKey;
    if (!roleKey) return 0;
    const adminId = ROLE_RATE_MAPPING[roleKey];
    if (!adminId) return 0;
    return getAdminNumber(adminId, 0);
}

function calculateAnnualBenefit() {
    // Оценки
    const scoreRevenue = getCriterionScore("scoreRevenue");
    const scoreUx = getCriterionScore("scoreUx");
    const scoreRisk = getCriterionScore("scoreRisk");
    const scoreCare = getCriterionScore("scoreCare");
    
    // Коэффициенты и конверсии (можно настраивать в админ-панели)
    const coefRevenue = getAdminNumber("coefRevenue", 3);
    const convRevenue = getAdminNumber("convRevenue", 10000);
    const coefUx = getAdminNumber("coefUx", 2.5);
    const convUx = getAdminNumber("convUx", 15000);
    const coefRisk = getAdminNumber("coefRisk", 2);
    const convRisk = getAdminNumber("convRisk", 2000);
    const coefCare = getAdminNumber("coefCare", 1.5);
    const convCare = getAdminNumber("convCare", 5000);
    
    const revenuePart = scoreRevenue * coefRevenue * convRevenue;
    const uxPart = scoreUx * coefUx * convUx;
    const riskPart = scoreRisk * coefRisk * convRisk;
    const carePart = scoreCare * coefCare * convCare;
    
    const total = revenuePart + uxPart + riskPart + carePart;
    const annualBenefitEl = document.getElementById("annualBenefit");
    if (annualBenefitEl) {
        annualBenefitEl.textContent = formatCurrency(total);
    }
    return total;
}

function calculateTotalCost() {
    const rows = document.querySelectorAll(".role-row");
    let total = 0;
    rows.forEach((row) => {
        const daysInput = row.querySelector(".effort-days");
        const costCell = row.querySelector(".effort-cost");
        const days = parseNumber(daysInput?.value ?? "");
        const rate = getRateForRow(row);
        const cost = days * rate;
        if (costCell) {
            costCell.textContent = cost.toLocaleString("ru-RU", {
                maximumFractionDigits: 0,
            });
        }
        total += cost;
    });
    
    const totalCostCell = document.getElementById("totalCostCell");
    if (totalCostCell) {
        totalCostCell.textContent = total.toLocaleString("ru-RU", {
            maximumFractionDigits: 0,
        });
    }
    
    const totalCost = document.getElementById("totalCost");
    if (totalCost) {
        totalCost.textContent = formatCurrency(total);
    }
    return total;
}

function updatePaybackAndRecommendation() {
    const cost = calculateTotalCost();
    const annualBenefit = calculateAnnualBenefit();
    const paybackEl = document.getElementById("paybackPeriod");
    const recommendationEl = document.getElementById("recommendation");
    
    if (!paybackEl || !recommendationEl) return;
    
    let months = Infinity;
    if (annualBenefit > 0) {
        const monthlyBenefit = annualBenefit / 12;
        if (monthlyBenefit > 0) {
            months = cost / monthlyBenefit;
        }
    }
    
    paybackEl.textContent = formatMonths(months);
    recommendationEl.classList.remove(
        "recommendation-good",
        "recommendation-medium",
        "recommendation-bad",
        "roi-value-muted"
    );
    
    if (!Number.isFinite(months) || months <= 0 || cost <= 0 || annualBenefit <= 0) {
        recommendationEl.textContent = "Недостаточно данных";
        recommendationEl.classList.add("roi-value-muted");
        return;
    }
    
    if (months < 3) {
        recommendationEl.textContent = "🟢 Реализовать";
        recommendationEl.classList.add("recommendation-good");
    } else if (months <= 6) {
        recommendationEl.textContent = "🟡 Рассмотреть";
        recommendationEl.classList.add("recommendation-medium");
    } else {
        recommendationEl.textContent = "🔴 Отклонить";
        recommendationEl.classList.add("recommendation-bad");
    }
}

function initCriterionListeners() {
    const selects = document.querySelectorAll(".criterion-select");
    selects.forEach((select) => {
        select.addEventListener("change", () => {
            updateBriefStatus();
            updatePaybackAndRecommendation();
        });
    });
}

function initEffortListeners() {
    const body = document.getElementById("effortBody");
    if (!body) return;
    body.addEventListener("input", (event) => {
        const target = event.target;
        if (
            target instanceof HTMLInputElement &&
            target.classList.contains("effort-days")
        ) {
            updatePaybackAndRecommendation();
        }
    });
}

function initAdminPanel() {
    const form = document.getElementById("adminLoginForm");
    const passwordInput = document.getElementById("adminPassword");
    const adminSection = document.getElementById("adminSection");
    const errorEl = document.getElementById("adminError");
    if (!form || !passwordInput || !adminSection) return;
    
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = passwordInput.value || "";
        if (value === "admin2026") {
            adminSection.classList.remove("hidden");
            adminSection.setAttribute("aria-hidden", "false");
            form.classList.add("hidden");
            if (errorEl) {
                errorEl.textContent = "";
            }
        } else {
            if (errorEl) {
                errorEl.textContent = "Неверный пароль. Попробуйте ещё раз.";
            }
        }
    });
    
    // Пересчитывать при изменении коэффициентов и ставок
    const adminInputs = adminSection.querySelectorAll("input[type='number']");
    adminInputs.forEach((input) => {
        input.addEventListener("input", () => {
            updatePaybackAndRecommendation();
        });
    });
}

function initRecalculateButton() {
    const btn = document.getElementById("recalculateBtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
        updatePaybackAndRecommendation();
    });
}

function buildPrefilledUrl(requesterEmail) {
    const base = window.location.href.split("#")[0].split("?")[0];
    const params = new URLSearchParams();
    function setFromInput(id, key) {
        const el = document.getElementById(id);
        if (!el) return;
        const value = el.value || "";
        if (value) params.set(key, value);
    }
    
    setFromInput("taskTitle", "t");
    setFromInput("taskOwner", "o");
    setFromInput("taskDate", "d");
    setFromInput("taskStatus", "st");
    setFromInput("taskDescription", "desc");
    setFromInput("scoreRevenue", "sr");
    setFromInput("scoreUx", "su");
    setFromInput("scoreRisk", "sk");
    setFromInput("scoreCare", "sc");
    setFromInput("reasonRevenue", "rr");
    setFromInput("reasonUx", "ru");
    setFromInput("reasonRisk", "rk");
    setFromInput("reasonCare", "rc");
    
    if (requesterEmail) {
        params.set("req", requesterEmail);
    }
    
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
}

function collectBriefSummary(requesterEmail, prefilledUrl) {
    const title = document.getElementById("taskTitle")?.value || " ";
    const owner = document.getElementById("taskOwner")?.value || " ";
    const date = document.getElementById("taskDate")?.value || " ";
    const status = document.getElementById("taskStatus")?.value || " ";
    const description = document.getElementById("taskDescription")?.value || " ";
    const scoreRevenue = document.getElementById("scoreRevenue")?.value || " ";
    const scoreUx = document.getElementById("scoreUx")?.value || " ";
    const scoreRisk = document.getElementById("scoreRisk")?.value || " ";
    const scoreCare = document.getElementById("scoreCare")?.value || " ";
    const annualBenefit = document.getElementById("annualBenefit")?.textContent || " ";
    const totalCost = document.getElementById("totalCost")?.textContent || " ";
    const payback = document.getElementById("paybackPeriod")?.textContent || " ";
    const recommendation = document.getElementById("recommendation")?.textContent || " ";
    const briefStatus = document.getElementById("briefStatus")?.textContent || "";
    
    let lines = [];
    lines.push("Бриф на оценку ROI");
    lines.push(" ");
    lines.push(`E-mail заказчика: ${requesterEmail || "- "}`);
    lines.push(`Название задачи: ${title || "- "}`);
    lines.push(`Инициатор: ${owner || "- "}`);
    lines.push(`Дата: ${date || "- "}`);
    lines.push(`Статус: ${status || "- "}`);
    lines.push(" ");
    lines.push("Ссылка на калькулятор с предзаполненным брифом: ");
    lines.push(prefilledUrl || "-");
    lines.push(" ");
    lines.push("Краткое описание задачи: ");
    lines.push(description || "-");
    lines.push(" ");
    lines.push("Критерии ценности (оценки 0–5): ");
    lines.push(`- Влияние на доход: ${scoreRevenue || "- "}`);
    lines.push(`- Улучшение UX: ${scoreUx || "- "}`);
    lines.push(`- Снижение рисков: ${scoreRisk || "- "}`);
    lines.push(`- Забота о клиенте: ${scoreCare || "- "}`);
    lines.push(" ");
    lines.push("Расчёт окупаемости: ");
    lines.push(`- Стоимость разработки: ${totalCost || "- "}`);
    lines.push(`- Годовая выгода: ${annualBenefit || "- "}`);
    lines.push(`- Срок окупаемости (мес.): ${payback || "- "}`);
    lines.push(`- Рекомендация: ${recommendation || "- "}`);
    lines.push(" ");
    lines.push(`Текущий статус брифа в системе: ${briefStatus || "- "}`);
    
    return lines.join("\n");
}

function collectFinalSummary(requesterEmail) {
    const link = buildPrefilledUrl(requesterEmail);
    const base = collectBriefSummary(requesterEmail, link);
    return [
        "Итоговая оценка по задаче (ROI-калькулятор Альфа Страхование Жизнь).",
        "",
        base,
    ].join("\n");
}

function initSendButton() {
    const btn = document.getElementById("sendToEmailBtn");
    const replyBtn = document.getElementById("sendToRequesterBtn");
    const emailInput = document.getElementById("requesterEmail");
    const errorEl = document.getElementById("sendError");
    const thankEl = document.getElementById("sendThankyou");
    const card = document.querySelector(".card-send");
    
    if (!btn || !replyBtn || !emailInput) return;
    
    btn.addEventListener("click", () => {
        const email = emailInput.value.trim();
        if (!email || !email.includes("@")) {
            if (errorEl) {
                errorEl.textContent = "Пожалуйста, укажите корректный e-mail заказчика.";
            }
            return;
        }
        
        if (errorEl) {
            errorEl.textContent = " ";
        }
        
        // Обновляем расчёты перед отправкой
        updatePaybackAndRecommendation();
        
        const subjectBase = document.getElementById("taskTitle")?.value || "Новая задача для оценки ROI ";
        const subject = `ROI-бриф: ${subjectBase}`;
        const link = buildPrefilledUrl(email);
        const body = collectBriefSummary(email, link);
        
        const mailto = `mailto:LebedevaIM@alfastrah.ru?subject=${encodeURIComponent(
            subject
        )}&body=${encodeURIComponent(body)}`;
        
        window.location.href = mailto;
        
        // Состояние "отправлено"
        emailInput.disabled = true;
        btn.disabled = true;
        btn.textContent = "Бриф подготовлен в почте";
        if (thankEl) {
            thankEl.classList.remove("hidden");
        }
        if (card) {
            card.classList.add("card-send-complete");
        }
    });
    
    replyBtn.addEventListener("click", () => {
        const email = emailInput.value.trim();
        if (!email || !email.includes("@")) {
            if (errorEl) {
                errorEl.textContent = "Пожалуйста, укажите корректный e-mail заказчика, чтобы отправить итоговую оценку.";
            }
            return;
        }
        
        if (errorEl) {
            errorEl.textContent = "";
        }
        
        updatePaybackAndRecommendation();
        
        const subjectBase = document.getElementById("taskTitle")?.value || "Задача";
        const subject = `Итоговая оценка ROI: ${subjectBase}`;
        const body = collectFinalSummary(email);
        
        const mailto = `mailto:${encodeURIComponent(email)}?cc=${encodeURIComponent(
            "LebedevaIM@alfastrah.ru"
        )}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        window.location.href = mailto;
    });
}

function applyPrefilledParamsFromUrl() {
    if (!window.location.search) return;
    const params = new URLSearchParams(window.location.search);
    function fillInput(id, key) {
        const el = document.getElementById(id);
        if (!el) return;
        const value = params.get(key);
        if (value === null) return;
        el.value = value;
    }
    
    fillInput("taskTitle", "t");
    fillInput("taskOwner", "o");
    fillInput("taskDate", "d");
    fillInput("taskStatus", "st");
    fillInput("taskDescription", "desc");
    fillInput("scoreRevenue", "sr");
    fillInput("scoreUx", "su");
    fillInput("scoreRisk", "sk");
    fillInput("scoreCare", "sc");
    fillInput("reasonRevenue", "rr");
    fillInput("reasonUx", "ru");
    fillInput("reasonRisk", "rk");
    fillInput("reasonCare", "rc");
    fillInput("requesterEmail", "req");
    
    updateBriefStatus();
    updatePaybackAndRecommendation();
}

document.addEventListener("DOMContentLoaded", () => {
    initCriterionListeners();
    initEffortListeners();
    initAdminPanel();
    initRecalculateButton();
    initSendButton();
    applyPrefilledParamsFromUrl();
    
    // Стартовое состояние
    updateBriefStatus();
    updatePaybackAndRecommendation();
});
