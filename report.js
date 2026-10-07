

const masterData = window.CEAIO_MASTER_DATA;
if (!masterData) throw new Error("CE(AI)O Masterdaten fehlen. Bitte data/ceaio_masterdata.js vor report.js laden.");

const categoryMeta = {
  "ST": ["strategy", "Gesamtunternehmensstrategie, Kapitalallokation und Geschäftsmodell-Innovation."],
  "TI": ["technical_ai", "Technologisches Grundverständnis, Daten-Infrastruktur und Bewertungskompetenz."],
  "GO": ["governance", "Kontrollstrukturen, Board-Level-Prozesse und Gesamtverantwortung."],
  "DA": ["data_analytics", "KPIs, Management-Dashboards und datenbasierte Unternehmenssteuerung."],
  "CO": ["compliance", "Regulatorik, EU AI Act, ESG, Haftung und Vendor-Risiken."],
  "TL": ["team_leadership", "Führung, Organisationsdesign, Talent-Pipeline und Upskilling."],
  "PT": ["platform_tools", "Enterprise-Plattformen, Skalierbarkeit, TCO und Make-or-Buy-Entscheidungen."],
  "SS": ["soft_skills", "Resilienz, Kommunikation, psychologische Sicherheit und ethische Positionierung."],
  "CT": ["change_transformation", "AI-Transformation, Change Governance, Workforce Planning und Transformationsmessung."],
  "HW": ["hybrid_work", "Hybride Arbeit, digitale Zusammenarbeit, Output-Steuerung und virtuelle Führung."],
  "FC": ["future_capability", "Human-AI Workforce, adaptive Lernpfade, Organisationsdesign und future-ready Leadership."]
};
const categoryOrder = ["ST","TI","GO","DA","CO","TL","PT","SS","CT","HW","FC"];
const groupedQuestions = Object.groupBy ? Object.groupBy(masterData.questions, q => q.id.split("-")[0]) : masterData.questions.reduce((a,q)=>{const k=q.id.split("-")[0];(a[k]??=[]).push(q);return a;},{});
const surveyData = categoryOrder.map((code,index) => {
  const qs = groupedQuestions[code] || [];
  const meta = categoryMeta[code];
  return {id:meta[0], number:index+1, code, title:qs[0]?.competencyArea || code, focus:meta[1], questions:qs.map(q=>[q.id,q.question])};
});
const recommendationGroups = [
  {id:"strategy_gap", title:"Konzeptionelle Defizite & Strategie-Vakuum", category_ids:["strategy","platform_tools"], category_label:"Kategorien 1 & 7", provider:"Tier-1 Business Schools", examples:"z. B. INSEAD, IMD, Harvard Business School, HSG St. Gallen", method:"Wissens- & Framework-Aufbau: Strukturierte Executive-Education-Programme für strategische Neuausrichtung und globale Marktperspektiven."},
  {id:"tech_gap", title:"Technologische Blindheit & Compliance-Risiko", category_ids:["technical_ai","data_analytics","compliance"], category_label:"Kategorien 2, 4 & 5", provider:"Fach-Akademien, Big-4 Audit-Firmen & Tech-Boutiquen", examples:"z. B. PwC/EY/KPMG-Akademien, Fraunhofer, McKinsey/BCG Digital Labs", method:"Fakten, Regulatorik & Systematik: Deep-Dive-Programme zu Datenarchitektur, Cyber-Security, EU AI Act, ESG-Reporting und Technologie-Risikomanagement."},
  {id:"leadership_gap", title:"Führungs-Blockaden & Kultureller Stillstand", category_ids:["governance","team_leadership","soft_skills"], category_label:"Kategorien 3, 6 & 8", provider:"Top-Tier Executive Coaches & Leadership Advisory", examples:"z. B. Egon Zehnder, Heidrick & Struggles, spezialisierte C-Level-Coaches", method:"Verhaltens- & Transformations-Coaching: 1:1-Sparring, Reflexion der Leadership-Persona, Auflösung von C-Suite-Konflikten und Begleitung des kulturellen Wandels."},
  {id:"transformation_future_gap", title:"Transformation, Hybrid Work & Zukunftsfähigkeit", category_ids:["change_transformation","hybrid_work","future_capability"], category_label:"Kategorien 9, 10 & 11", provider:"Executive Education & spezialisierte Transformationsprogramme", examples:"Programme zu AI Transformation, Hybrid Leadership, Workforce Design und Future Skills", method:"Umsetzungs- & Zukunftskompetenz: Transformation skalieren, hybride Zusammenarbeit gestalten und Human-AI-Arbeit zukunftsfähig organisieren."}
];
const courseCatalog = masterData.courses;

const STORAGE_KEY = "executiveSelfAssessment55_v3";
const SAVED_KEY = "executiveSelfAssessment55_savedAt_v3";
const PROFILE_KEY = "executiveSelfAssessment55_profile_v3";

const SUPABASE_URL = "https://yfdacrcmonfjvlswbmui.supabase.co";
const SUPABASE_KEY = "sb_publishable_EljKhLofFSi0HAU6vxz5Tg_ttD7au7m";

const assessmentView = document.getElementById("assessmentView");
const resultsView = document.getElementById("resultsView");
const form = document.getElementById("surveyForm");
const nav = document.getElementById("categoryNav");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const overallEl = document.getElementById("overall");
const completeCategoriesEl = document.getElementById("completeCategories");
const savedAtEl = document.getElementById("savedAt");
const saveStatus = document.getElementById("saveStatus");
const toast = document.getElementById("toast");

const profileFields = {
  name: document.getElementById("participantName"),
  position: document.getElementById("participantPosition"),
  company: document.getElementById("participantCompany"),
  email: document.getElementById("participantEmail")
};

let answers = loadJson(STORAGE_KEY, {});
let profile = loadJson(PROFILE_KEY, {});
let latestResult = null;
let resultSubmissionInProgress = false;

function createResultToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
}

function buildPersonalResultUrl(token) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("result", token);
  return url.toString();
}

function getRequestedResultUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("result");
  return token ? buildPersonalResultUrl(token) : null;
}

function renderPersonalResultLink(resultUrl) {
  let box = document.getElementById("personalResultLinkBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "personalResultLinkBox";
    box.className = "consulting-card screen-only";
    box.style.margin = "18px 0";
    box.innerHTML = `
      <span class="card-kicker">PERSÖNLICHER ERGEBNIS-LINK</span>
      <h3>Dieses Ergebnis jederzeit wieder aufrufen</h3>
      <p>Bewahren Sie diesen persönlichen Link sicher auf. Jeder, der den Link kennt, kann das Ergebnis öffnen.</p>
      <div class="field">
        <label for="personalResultLink">Persönlicher Link</label>
        <input id="personalResultLink" type="text" readonly>
      </div>
      <div class="actions">
        <a class="btn btn-secondary" id="openPersonalResultLink" target="_blank" rel="noopener">Ergebnis-Link öffnen</a>
        <button class="btn btn-gold" id="copyPersonalResultLink" type="button">Link kopieren</button>
      </div>
    `;
    const actions = document.querySelector("#resultsView .report-actions");
    actions.parentNode.insertBefore(box, actions);
  }

  const input = document.getElementById("personalResultLink");
  const openLink = document.getElementById("openPersonalResultLink");
  const copyButton = document.getElementById("copyPersonalResultLink");
  input.value = resultUrl;
  openLink.href = resultUrl;
  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(resultUrl);
      showToast("Persönlicher Ergebnis-Link kopiert.");
    } catch (error) {
      input.focus();
      input.select();
      document.execCommand("copy");
      showToast("Persönlicher Ergebnis-Link kopiert.");
    }
  };
}

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch (error) { return fallback; }
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function avg(values) {
  return values.reduce((sum,value)=>sum+value,0) / values.length;
}

function allQuestionCodes() {
  return surveyData.flatMap(category => category.questions.map(question => question[0]));
}

function buildSurvey() {
  nav.innerHTML = surveyData.map(category =>
    `<a href="#cat-${category.id}">${category.number}. ${esc(category.title)}</a>`
  ).join("");

  form.innerHTML = surveyData.map(category => {
    const questions = category.questions.map(([code,text]) => {
      const options = [1,2,3,4,5].map(value => {
        const id = `${code}-${value}`;
        const checked = Number(answers[code]) === value ? "checked" : "";
        return `<div class="opt">
          <input type="radio" id="${id}" name="${code}" value="${value}" data-category="${category.id}" ${checked}>
          <label for="${id}" aria-label="${value} von 5">${value}</label>
        </div>`;
      }).join("");

      return `<div class="question">
        <p class="q-text"><span class="q-code">[${esc(code)}]</span>${esc(text)}</p>
        <div class="scale" role="radiogroup" aria-label="${esc(text)}">${options}</div>
      </div>`;
    }).join("");

    return `<section class="category" id="cat-${category.id}" data-category="${category.id}">
      <div class="category-head">
        <div>
          <span class="category-number">${category.number}</span><h2>${esc(category.title)}</h2>
          <p class="focus"><strong>Fokus:</strong> ${esc(category.focus)}</p>
        </div>
        <div class="score-box"><span>Ø Kategorie</span><strong id="avg-${category.id}">–</strong></div>
      </div>
      ${questions}
      <div class="category-foot">
        <span id="meta-${category.id}">0 von ${category.questions.length} beantwortet</span>
        <span>1 = Nie · 5 = Immer</span>
      </div>
    </section>`;
  }).join("");
}

function restoreProfile() {
  Object.entries(profileFields).forEach(([key,field]) => {
    field.value = profile[key] || "";
    field.addEventListener("input", () => {
      profile[key] = field.value.trim();
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    });
  });
}

function getCategoryResults(requireComplete = false) {
  return surveyData.map(category => {
    const values = category.questions
      .map(([code]) => Number(answers[code]))
      .filter(value => value >= 1 && value <= 5);

    return {
      ...category,
      answered: values.length,
      complete: values.length === category.questions.length,
      score: values.length && (!requireComplete || values.length === category.questions.length)
        ? avg(values)
        : null
    };
  });
}

function updateStats() {
  const codes = allQuestionCodes();
  const values = codes.map(code => Number(answers[code])).filter(value => value >= 1 && value <= 5);
  const categoryResults = getCategoryResults();

  progressText.textContent = `${values.length} von ${codes.length}`;
  progressBar.style.width = `${codes.length ? values.length / codes.length * 100 : 0}%`;
  overallEl.textContent = values.length ? avg(values).toFixed(2) : "–";
  completeCategoriesEl.textContent = `${categoryResults.filter(item => item.complete).length} / ${surveyData.length}`;

  categoryResults.forEach(category => {
    document.getElementById(`avg-${category.id}`).textContent =
      category.score !== null ? category.score.toFixed(2) : "–";
    document.getElementById(`meta-${category.id}`).textContent =
      `${category.answered} von ${category.questions.length} beantwortet`;

    if (category.complete) {
      document.getElementById(`cat-${category.id}`).classList.remove("needs-attention");
    }
  });
}

function saveAnswers() {
  saveStatus.textContent = "Wird gespeichert …";
  try {
    const now = new Date();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    localStorage.setItem(SAVED_KEY, now.toISOString());
    showSavedAt(now);
    setTimeout(() => saveStatus.textContent = "Antworten gespeichert", 180);
  } catch (error) {
    saveStatus.textContent = "Speichern fehlgeschlagen";
  }
}

function showSavedAt(date) {
  if (!date || Number.isNaN(date.getTime())) {
    savedAtEl.textContent = "–";
    return;
  }
  savedAtEl.textContent = new Intl.DateTimeFormat("de-DE", {
    day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"
  }).format(date);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function validateComplete() {
  const missing = [];
  surveyData.forEach(category => {
    const missingCodes = category.questions
      .map(question => question[0])
      .filter(code => !(Number(answers[code]) >= 1 && Number(answers[code]) <= 5));

    const section = document.getElementById(`cat-${category.id}`);
    section.classList.toggle("needs-attention", missingCodes.length > 0);

    if (missingCodes.length) {
      missing.push({category, codes: missingCodes});
    }
  });

  if (missing.length) {
    const totalMissing = missing.reduce((sum,item)=>sum+item.codes.length,0);
    showToast(`Bitte beantworten Sie noch ${totalMissing} Frage${totalMissing === 1 ? "" : "n"}.`);
    document.getElementById(`cat-${missing[0].category.id}`).scrollIntoView({behavior:"smooth",block:"start"});
    return false;
  }
  return true;
}

function classify(score) {
  if (score < 2.5) return {text:"Akuter Handlungsbedarf",className:"gap"};
  if (score < 3.8) return {text:"Skill-Lücke / Entwicklungsfeld",className:"gap"};
  if (score < 4.5) return {text:"Stark ausgeprägt",className:"mid"};
  return {text:"Best Practice / Meisterschaft",className:"strong"};
}

function overallNarrative(overall, sorted, gaps) {
  let title;
  let intro;

  if (overall >= 4.5) {
    title = "Außergewöhnlich starkes Executive-Profil";
    intro = "Ihr Gesamtbild zeigt eine sehr hohe Zukunfts- und Transformationskompetenz. Die Herausforderung liegt weniger im Aufbau grundlegender Fähigkeiten als in der konsequenten Skalierung und institutionellen Verankerung Ihrer Stärken.";
  } else if (overall >= 3.8) {
    title = "Solides und zukunftsfähiges Kompetenzprofil";
    intro = "Ihr Ergebnis liegt insgesamt auf einem starken Niveau. Mehrere Dimensionen sind belastbar ausgeprägt; gleichzeitig zeigen einzelne Kategorien, wo eine gezielte Weiterentwicklung den größten strategischen Hebel erzeugt.";
  } else if (overall >= 3.0) {
    title = "Gemischtes Profil mit klaren Entwicklungshebeln";
    intro = "Ihr Assessment zeigt eine tragfähige Basis, aber auch erkennbare Skill-Lücken. Priorität sollte auf wenigen, geschäftskritischen Feldern liegen, statt alle Themen gleichzeitig zu bearbeiten.";
  } else {
    title = "Deutlicher und zeitkritischer Handlungsbedarf";
    intro = "Mehrere geschäftskritische Fähigkeiten sind aktuell nicht ausreichend institutionalisiert. Eine fokussierte Roadmap mit klaren Verantwortlichkeiten, externem Sparring und überprüfbaren Meilensteinen ist empfehlenswert.";
  }

  const strongest = sorted.slice(0,2).map(item => item.title).join(" und ");
  const weakest = sorted.slice(-2).reverse().map(item => item.title).join(" und ");
  const gapSentence = gaps.length
    ? `Unter der Markt-Schwelle von 3,8 liegen ${gaps.length} von 11 Kategorien.`
    : "Alle elf Kategorien liegen mindestens auf der definierten Markt-Schwelle von 3,8.";

  return {
    title,
    text: `${intro} Ihre stärksten Dimensionen sind ${strongest}. Die größte Entwicklungswirkung ist aktuell in ${weakest} zu erwarten. ${gapSentence}`
  };
}

function createResult() {
  const categories = getCategoryResults(true);
  const scores = categories.map(category => category.score);
  const overall = avg(scores);
  const sorted = [...categories].sort((a,b)=>b.score-a.score);
  const gaps = categories.filter(category => category.score < 3.8);
  const narrative = overallNarrative(overall, sorted, gaps);

  return {
    createdAt: new Date(),
    profile: {
      name: profileFields.name.value.trim(),
      position: profileFields.position.value.trim(),
      company: profileFields.company.value.trim(),
      email: profileFields.email.value.trim()
    },
    categories,
    overall,
    sorted,
    gaps,
    narrative
  };
}

function renderResultPage(result) {
  const displayName = result.profile.name || "Teilnehmer/in";
  document.getElementById("resultLead").textContent =
    `${displayName}, Ihr persönlicher Bericht fasst die Ergebnisse aus allen 55 Fragen und elf Kategorien zusammen.`;

  const meta = [
    result.profile.name && `Name: ${result.profile.name}`,
    result.profile.position && `Position: ${result.profile.position}`,
    result.profile.company && `Unternehmen: ${result.profile.company}`,
    `Erstellt: ${new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short"}).format(result.createdAt)}`
  ].filter(Boolean);

  document.getElementById("resultMeta").innerHTML = meta.map(item => `<span>${esc(item)}</span>`).join(" &nbsp;·&nbsp; ");
  document.getElementById("finalOverall").textContent = result.overall.toFixed(2);
  document.getElementById("scoreCircle").style.setProperty("--score-angle", `${result.overall / 5 * 360}deg`);
  document.getElementById("summaryTitle").textContent = result.narrative.title;
  document.getElementById("summaryText").textContent = result.narrative.text;

  document.getElementById("strengthText").textContent = result.sorted.slice(0,3)
    .map(item => `${item.title} (${item.score.toFixed(2)})`).join(", ");

  document.getElementById("developmentText").textContent = result.gaps.length
    ? result.gaps.sort((a,b)=>a.score-b.score).map(item => `${item.title} (${item.score.toFixed(2)})`).join(", ")
    : "Aktuell keine Kategorie unter der Schwelle von 3,8.";

  document.getElementById("categoryChart").innerHTML = result.categories.map(category => `
    <div class="chart-row">
      <div class="chart-name">${category.number}. ${esc(category.title)}</div>
      <div class="chart-track" aria-label="${esc(category.title)}: ${category.score.toFixed(2)} von 5">
        <div class="chart-fill" style="width:${category.score / 5 * 100}%"></div>
        <div class="chart-threshold" aria-hidden="true"></div>
      </div>
      <div class="chart-score">${category.score.toFixed(2)}</div>
    </div>
  `).join("");

  document.getElementById("resultTableBody").innerHTML = result.categories.map(category => {
    const classification = classify(category.score);
    return `<tr>
      <td>${category.number}</td>
      <td><strong>${esc(category.title)}</strong><br><small>${esc(category.focus)}</small></td>
      <td><strong>${category.score.toFixed(2)}</strong></td>
      <td><span class="score-status ${classification.className}">${classification.text}</span></td>
    </tr>`;
  }).join("");

  document.getElementById("recommendationGrid").innerHTML = recommendationGroups.map(group => {
    const affected = group.category_ids
      .map(id => result.categories.find(category => category.id === id))
      .filter(category => category && category.score < 3.8);

    const active = affected.length > 0;
    return `<article class="recommendation-card ${active ? "active" : ""}">
      <h3>${esc(group.title)}</h3>
      <p><strong>${active ? "Handlungsfeld erkannt" : "Kein akuter Gap"}</strong></p>
      <p>${active
        ? `<strong>Betroffen:</strong> ${affected.map(category => `${esc(category.title)} (${category.score.toFixed(2)})`).join(", ")}`
        : `Die zugeordneten Kategorien liegen aktuell mindestens bei 3,8.`}</p>
      <p><strong>Anbieter-Typ:</strong> ${esc(group.provider)}</p>
      <p>${esc(group.examples)}</p>
      <p><strong>Methodik:</strong> ${esc(group.method)}</p>
    </article>`;
  }).join("");

  renderCourseRecommendations(result);
  document.getElementById("emailBtn").disabled = !result.profile.email;
  buildExecutiveReportEnhancements(result);
}

async function saveResultToSupabase(result) {
  const categoryScores = Object.fromEntries(
    result.categories.map((category) => [category.id, category.score])
  );

  const recommendations = getCourseRecommendations(result);

  const resultUrl = buildPersonalResultUrl(createResultToken());

  const payload = {
    name: result.profile.name || null,
    position: result.profile.position || null,
    company: result.profile.company || null,
    email: result.profile.email || null,
    answers: answers,
    category_scores: categoryScores,
    total_score: result.overall,
    result_level: result.narrative.title,
    recommendations: recommendations,
    pdf_status: "pending",
    result_url: resultUrl
  };

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/assessment_results`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      console.error("Supabase Fehler:", await response.text());
      return null;
    }

    return resultUrl;
  } catch (error) {
    console.error("Supabase Verbindung fehlgeschlagen:", error);
    return null;
  }
}

async function loadResultFromPersonalUrl() {
  const resultUrl = getRequestedResultUrl();
  if (!resultUrl) return false;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/assessment_results?select=created_at,name,position,company,email,answers&limit=1`,
      {
        method: "GET",
        headers: {
          "apikey": SUPABASE_KEY,
          "x-result-url": resultUrl
        }
      }
    );

    if (!response.ok) {
      console.error("Ergebnis konnte nicht geladen werden:", await response.text());
      showToast("Der persönliche Ergebnis-Link konnte nicht geladen werden.");
      return false;
    }

    const rows = await response.json();
    if (!rows.length) {
      showToast("Für diesen persönlichen Link wurde kein Ergebnis gefunden.");
      return false;
    }

    const row = rows[0];
    answers = row.answers || {};
    profile = {
      name: row.name || "",
      position: row.position || "",
      company: row.company || "",
      email: row.email || ""
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    buildSurvey();
    restoreProfile();
    updateStats();

    latestResult = createResult();
    latestResult.createdAt = row.created_at ? new Date(row.created_at) : new Date();
    latestResult.personalResultUrl = resultUrl;

    renderResultPage(latestResult);
    renderPersonalResultLink(resultUrl);
    assessmentView.hidden = true;
    resultsView.hidden = false;
    window.scrollTo({top: 0});
    return true;
  } catch (error) {
    console.error("Persönlicher Ergebnis-Link konnte nicht geladen werden:", error);
    showToast("Der persönliche Ergebnis-Link konnte nicht geladen werden.");
    return false;
  }
}

async function openResults() {
  if (resultSubmissionInProgress || !validateComplete()) return;
  resultSubmissionInProgress = true;

  profile = {
    name: profileFields.name.value.trim(),
    position: profileFields.position.value.trim(),
    company: profileFields.company.value.trim(),
    email: profileFields.email.value.trim()
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  latestResult = createResult();
  renderResultPage(latestResult);
  assessmentView.hidden = true;
  resultsView.hidden = false;
  window.scrollTo({top:0,behavior:"smooth"});

  const resultUrl = await saveResultToSupabase(latestResult);
  if (resultUrl) {
    latestResult.personalResultUrl = resultUrl;
    renderPersonalResultLink(resultUrl);
  } else {
    showToast("Ergebnis angezeigt, persönlicher Link konnte aber nicht gespeichert werden.");
  }

  resultSubmissionInProgress = false;
}

function backToSurvey() {
  resultsView.hidden = true;
  assessmentView.hidden = false;
  window.scrollTo({top:document.getElementById("submissionPanel").offsetTop - 20,behavior:"smooth"});
}

function reportRecommendations(result) {
  const activeGroups = recommendationGroups.map(group => {
    const affected = group.category_ids
      .map(id => result.categories.find(category => category.id === id))
      .filter(category => category && category.score < 3.8);
    return {...group, affected};
  }).filter(group => group.affected.length);

  if (!activeGroups.length) {
    return `<p>Alle Kategorien liegen mindestens auf der definierten Markt-Schwelle von 3,8. Der Fokus sollte auf Skalierung, Nachweisbarkeit und institutioneller Verankerung der bestehenden Stärken liegen.</p>`;
  }

  return activeGroups.map(group => `
    <h3>${esc(group.title)}</h3>
    <p><strong>Betroffene Kategorien:</strong> ${group.affected.map(category => `${esc(category.title)} (${category.score.toFixed(2)})`).join(", ")}</p>
    <p><strong>Passender Anbieter-Typ:</strong> ${esc(group.provider)} – ${esc(group.examples)}</p>
    <p>${esc(group.method)}</p>
  `).join("");
}


function getCourseRecommendations(result) {
  const courseById = new Map(courseCatalog.map(course => [course.id, course]));
  const selected = new Map();

  masterData.questions.forEach(question => {
    const score = Number(answers[question.id]);
    if (!(score >= 1 && score <= 4)) return;
    const needLevel = score <= 3 ? "training_need" : "optional_refresh";

    question.courseIds.forEach(id => {
      const course = courseById.get(id);
      if (!course) return;
      if (!selected.has(id)) selected.set(id, {...course, matchedSkills: [], needLevel});
      const item = selected.get(id);
      item.matchedSkills.push({
        questionId: question.id,
        skill: question.skill,
        competencyArea: question.competencyArea,
        score,
        needLevel
      });
      // If a course matches at least one clear gap (1–3), it is a training need.
      if (needLevel === "training_need") item.needLevel = "training_need";
    });
  });

  return [...selected.values()].sort((a,b) => {
    const aMin = Math.min(...a.matchedSkills.map(x => x.score));
    const bMin = Math.min(...b.matchedSkills.map(x => x.score));
    return aMin - bMin || a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name);
  });
}

function renderCourseRecommendations(result) {
  const courses = getCourseRecommendations(result);
  const needs = courses.filter(c => c.needLevel === "training_need");
  const optional = courses.filter(c => c.needLevel === "optional_refresh");
  const affectedSkills = new Set(courses.flatMap(c => c.matchedSkills.map(m => m.questionId)));

  document.getElementById("courseIntro").textContent = courses.length
    ? `${affectedSkills.size} Skill${affectedSkills.size===1?"":"s"} führen zu Kursempfehlungen. ${needs.length} Kurs${needs.length===1?"":"e"} decken mindestens einen klaren Weiterbildungsbedarf (Antwort 1–3) ab; ${optional.length} Kurs${optional.length===1?"":"e"} dienen ausschließlich der optionalen Vertiefung (Antwort 4). Antwort 5 erzeugt keine Kursempfehlung.`
    : "Alle 55 Fragen wurden mit 5 bewertet. Aktuell besteht kein Weiterbildungsbedarf.";

  document.getElementById("courseRecommendations").innerHTML = courses.map(course => `
    <article class="course-card">
      <h4>${esc(course.name)}</h4><p class="course-provider">${esc(course.provider)}</p>
      <p><strong>${course.needLevel === "training_need" ? "Weiterbildungsbedarf" : "Optionale Vertiefung"}</strong></p>
      <p class="course-why"><strong>Passend zu:</strong> ${course.matchedSkills.map(m => `${esc(m.questionId)} – ${esc(m.skill)} (Antwort ${m.score})`).join("<br>")}</p>
      ${course.note ? `<p class="course-why">${esc(course.note)}</p>` : ""}
      <div class="course-meta">
        <span><strong>Format:</strong> ${esc(course.delivery)}</span>
        <span><strong>Verfügbarkeit:</strong> ${esc(course.availability)}</span>
        <span><strong>Zugang:</strong> ${esc(course.booking)}</span>
        <span><strong>Geprüft:</strong> ${esc(course.checkedAt)}</span>
      </div>
      ${course.url ? `<a class="course-link" href="${esc(course.url)}" target="_blank" rel="noopener noreferrer">Kurs öffnen</a>` : ""}
    </article>`).join("");
}

function reportCourseRecommendations(result) {
  return getCourseRecommendations(result).map(course => `
    <h3>${esc(course.name)} – ${esc(course.provider)}</h3>
    <p><strong>${course.needLevel === "training_need" ? "Weiterbildungsbedarf" : "Optionale Vertiefung"}</strong><br>
    ${course.matchedSkills.map(m => `${esc(m.questionId)} – ${esc(m.skill)} (Antwort ${m.score})`).join("<br>")}</p>
    <table><tbody>
      <tr><th>Format / Verfügbarkeit</th><td>${esc(course.delivery)}<br>${esc(course.availability)}</td></tr>
      <tr><th>Link</th><td>${course.url ? `<a href="${esc(course.url)}">${esc(course.url)}</a>` : "–"}</td></tr>
    </tbody></table>`).join("");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function openEmailDraft(result) {
  if (!result.profile.email) {
    showToast("Bitte tragen Sie zuerst eine E-Mail-Adresse ein.");
    return;
  }

  const personalResultUrl =
    result.personalResultUrl ||
    document.getElementById("personalResultLink")?.value ||
    getRequestedResultUrl();

  if (!personalResultUrl) {
    showToast("Der persönliche Ergebnis-Link konnte nicht ermittelt werden.");
    return;
  }

  const subject = `Executive Self-Assessment – Ergebnis ${result.profile.name || ""}`.trim();
  const lines = [
    `Guten Tag ${result.profile.name || ""},`,
    "",
    "wir bedanken uns im Namen des DCI und Volker Dahm dafür, dass Sie sich Zeit genommen haben, an unserer Umfrage teilzunehmen. Anbei finden Sie die kurze Zusammenfassung Ihrer Ergebnisse.",
    `Zum Nachlesen und zur direkten Verlinkung der Kurse geht es hier lang: ${personalResultUrl}`,
    "",
    `Gesamtscore: ${result.overall.toFixed(2)} von 5,00`,
    "",
    result.narrative.title,
    result.narrative.text,
    "",
    "Kategorien:",
    ...result.categories.map(category => `${category.number}. ${category.title}: ${category.score.toFixed(2)}`),
    "",
    "Empfohlene Kurse:",
    ...getCourseRecommendations(result).flatMap(group => [
      `${group.skill} (Antwort ${group.score}):`,
      ...group.courses.map(course => `- ${course.name} | ${course.provider}${course.url ? ` | ${course.url}` : ""}`)
    ]),
    "",
    "Hinweis: Den ausführlichen Executive PDF-Report können Sie auf der Ergebnisseite herunterladen.",
    "",
    "Beste Grüße | Best regards",
    "Volker Dahm | Dipl.Ing. | MBA",
    "Passion for People | Executive & Interim Search",
    "",
    "Book a meeting  👉  https://calendly.com/vdahm-1/meet-volkerday",
    "",
    "mobil: +49 152 389 30 962",
    "Mail: volker.dahm@passionforpeople.de",
    "LinkedIn: https://www.linkedin.com/in/volkerdahm/",
    "",
    "Internet: https://passionforpeople.de/Volker-Dahm"
  ];

  window.location.href = `mailto:${encodeURIComponent(result.profile.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

form.addEventListener("change", event => {
  if (event.target.matches('input[type="radio"]')) {
    answers[event.target.name] = Number(event.target.value);
    saveAnswers();
    updateStats();
  }
});

document.getElementById("submitBtn").addEventListener("click", function(event){ event.preventDefault(); openResults(); });
document.getElementById("backBtn").addEventListener("click", backToSurvey);

document.getElementById("emailBtn").addEventListener("click", () => {
  if (latestResult) openEmailDraft(latestResult);
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("Möchten Sie wirklich alle Antworten und Teilnehmerdaten löschen?")) return;

  answers = {};
  profile = {};
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SAVED_KEY);
  localStorage.removeItem(PROFILE_KEY);

  form.reset();
  Object.values(profileFields).forEach(field => field.value = "");
  document.querySelectorAll(".category").forEach(section => section.classList.remove("needs-attention"));
  showSavedAt(null);
  updateStats();
  saveStatus.textContent = "Antworten gelöscht";
  showToast("Alle Antworten und Teilnehmerdaten wurden gelöscht.");
});

buildSurvey();
restoreProfile();
updateStats();

const savedAt = localStorage.getItem(SAVED_KEY);
showSavedAt(savedAt ? new Date(savedAt) : null);

loadResultFromPersonalUrl();

// MOBILE INTERACTION FIX
(function(){
  const submitButton = document.getElementById("submitBtn");

  function safeOpenResults(event){
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    openResults();
  }

  if (submitButton) {
    submitButton.addEventListener("touchend", safeOpenResults, {passive:false});
  }

  document.querySelectorAll('.opt label').forEach(label => {
    label.addEventListener('touchend', function(event){
      event.preventDefault();
      const inputId = this.getAttribute('for');
      const input = document.getElementById(inputId);
      if (!input) return;
      input.checked = true;
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }, {passive:false});
  });
})();



function escapePdfFilename(value) {
  return (value || "Executive-Report").replace(/[^a-zA-Z0-9äöüÄÖÜß_-]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildExecutiveReportEnhancements(result) {
  document.querySelectorAll('.brand-logo-passion').forEach(img => img.src = PASSION_LOGO_DATA);
  document.querySelectorAll('.brand-logo-volker').forEach(img => img.src = VOLKER_LOGO_DATA);
  const donutOverall = document.getElementById('donutOverall');
  if (donutOverall) donutOverall.textContent = result.overall.toFixed(2);

  const cards = document.getElementById('competencyCards');
  if (cards) cards.innerHTML = result.categories.map(c => {
    const cl = classify(c.score);
    return `<article class="competency-card"><div class="competency-card-top"><span>${String(c.number).padStart(2,'0')}</span><strong>${esc(c.score.toFixed(2))}</strong></div><h3>${esc(c.title)}</h3><p>${esc(cl.text)}</p><div class="mini-meter"><i style="width:${Math.max(0,Math.min(100,c.score/5*100))}%"></i></div></article>`;
  }).join('');

  const sortedLow = [...result.categories].sort((a,b)=>a.score-b.score);
  const now = sortedLow.slice(0,1), next = sortedLow.slice(1,2), later = sortedLow.slice(2,3);
  const roadmap = document.getElementById('roadmapCards');
  const block = (label, arr, horizon) => `<article class="roadmap-card"><span>${label}</span><small>${horizon}</small><h3>${arr[0] ? esc(arr[0].title) : 'Kompetenz konsolidieren'}</h3><p>${arr[0] ? esc(arr[0].focus) : 'Bestehende Stärken systematisch sichern und in der Organisation skalieren.'}</p></article>`;
  if (roadmap) roadmap.innerHTML = block('NOW',now,'0–30 Tage')+block('NEXT',next,'30–90 Tage')+block('LATER',later,'3–12 Monate');

  const svg = document.getElementById('executiveDonut');
  if (svg) {
    const colors=['#183b56','#2f6b7c','#b08a4a','#718b9e','#91a8b5','#466d7d','#c4a76d','#8ca1aa','#38586b'];
    const cx=110,cy=110,r=82,total=result.categories.reduce((s,c)=>s+c.score,0)||1;
    let angle=-Math.PI/2;
    const polar=(a)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)];
    svg.innerHTML='';
    result.categories.forEach((c,i)=>{
      const sweep=(c.score/total)*Math.PI*2;
      const end=angle+sweep;
      const [x1,y1]=polar(angle),[x2,y2]=polar(end);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',`M ${x1} ${y1} A ${r} ${r} 0 ${sweep>Math.PI?1:0} 1 ${x2} ${y2}`);
      path.setAttribute('fill','none'); path.setAttribute('stroke',colors[i%colors.length]); path.setAttribute('stroke-width','24'); path.setAttribute('stroke-linecap','butt');
      svg.appendChild(path); angle=end;
    });
  }
}

async function generateProfessionalPdf() {
  if (!latestResult) return;
  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  const canvasFn = window.html2canvas;
  if (!jsPDFCtor || !canvasFn) {
    showToast('PDF-Modul konnte nicht geladen werden. Bitte Internetverbindung prüfen und erneut versuchen.');
    return;
  }
  buildExecutiveReportEnhancements(latestResult);
  const button=document.getElementById('pdfBtn');
  const old=button.textContent;
  button.disabled=true; button.textContent='PDF wird erstellt …';
  document.body.classList.add('pdf-exporting');
  try {
    const name=escapePdfFilename(latestResult.profile.name || 'Executive-Report');
    const pageEls = document.querySelectorAll('#pdfReport .report-page');
    const pdf = new jsPDFCtor({unit:'mm', format:'a4', orientation:'landscape'});
    const pageWidthMM = 297, pageHeightMM = 210;

    // Jede Report-Seite wird einzeln in ihrer tatsächlichen (variablen) Höhe
    // gerastert und danach in so viele A4-Seiten zerschnitten, wie der Inhalt
    // wirklich braucht. Das funktioniert unabhängig davon, ob jemand 0 oder 6
    // Kursempfehlungen bekommt, oder ob der Fließtext kurz oder lang ist – es
    // wird nie etwas abgeschnitten oder überlappt, ohne dass CSS-Werte für
    // jeden Einzelfall von Hand angepasst werden müssen.
    let isFirstPdfPage = true;
    for (let i=0;i<pageEls.length;i++){
      const sourceCanvas = await canvasFn(pageEls[i], {scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,letterRendering:true});
      const pxPerMM = sourceCanvas.width / pageWidthMM;
      const sliceHeightPx = Math.round(pageHeightMM * pxPerMM);
      let offsetY = 0;
      while (offsetY < sourceCanvas.height) {
        const thisSliceHeightPx = Math.min(sliceHeightPx, sourceCanvas.height - offsetY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = sourceCanvas.width;
        sliceCanvas.height = thisSliceHeightPx;
        const ctx = sliceCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0,0,sliceCanvas.width,sliceCanvas.height);
        ctx.drawImage(sourceCanvas, 0, offsetY, sourceCanvas.width, thisSliceHeightPx, 0, 0, sourceCanvas.width, thisSliceHeightPx);
        const imgData = sliceCanvas.toDataURL('image/jpeg',0.98);
        if (!isFirstPdfPage) pdf.addPage('a4','landscape');
        isFirstPdfPage = false;
        pdf.addImage(imgData,'JPEG',0,0,pageWidthMM, thisSliceHeightPx / pxPerMM);
        offsetY += thisSliceHeightPx;
      }
    }
    pdf.save(`${name}-Executive-Report.pdf`);
    showToast('Der Executive Report wurde als PDF erstellt.');
  } catch (error) {
    console.error(error);
    showToast('Die PDF konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
  } finally {
    document.body.classList.remove('pdf-exporting');
    button.disabled=false; button.textContent=old;
  }
}

document.getElementById('pdfBtn').addEventListener('click', generateProfessionalPdf);
